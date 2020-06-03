import {
    isFunction,
    isObject,
    isString,
    TransformError,
    validateSchema,
    validateJsonApiDocument,
    assertIsDefined
} from './utils';
import {
    Attributes,
    DataObject,
    JsonapiDataDocument,
    JsonapiDocument,
    KVObject,
    Links,
    MetaObject,
    ResourceIdentifier,
    ResourceObject
} from './jsonapi';
import {
    Include,
    Options,
    Schema,
    State,
    TransformAttributesArgs,
    TransformLinkArgs,
    TransformMetaArgs,
    UntransformDataSchemaArgs,
    ValidatedSchema
} from './schema';

/**
 * Transformalizer factory function.
 * @param  {Object} [baseOptions={}]
 * @return {Object} transformalizer
 */
export default function createTransformalizer(baseOptions = {}): Transformalizer {
    return new Transformalizer(baseOptions);
}

interface SchemaContext {
    name: string;
    schema: ValidatedSchema;
    options?: KVObject;
}

/**
 * Transformalizer class
 */
export class Transformalizer {
    private registry: KVObject<SchemaContext> = {};

    constructor(private readonly baseOptions: KVObject = {}) {}

    /**
     * Register a schema
     * @param  {Object} args
     * @param  {String} args.name - schema name/id
     * @param  {Object} args.schema - schema definition
     * @param  {Object} [args.options={}] - schema options to be merged in to transform options
     * @return {Undefined}
     */
    public register({
        name,
        schema,
        options: schemaOptions
    }: {
        name: string;
        schema?: Schema;
        options?: KVObject;
    }): void {
        if (!isString(name)) {
            throw new Error('Invalid "name" Property (non string)');
        }
        this.registry[name] = {
            name,
            schema: validateSchema({ name, schema }),
            options: schemaOptions
        };
    }

    /**
     * Get a schema from the registry by name
     * @param  {String} options.name - schema name/id
     * @return {Object}              - schema
     */
    public getSchema({ name }: { name: string }): SchemaContext {
        return this.registry[name];
    }

    /**
     * Transform raw data into a valid JSON API document
     * @param  {Object} args
     * @param  {String} args.name - the top level schema name
     * @param  {Object|Object[]} args.source - a single source object or an aray of source objects
     * @param  {Object} [options={}] - function level options
     * @return {Object} document
     */
    public transform({
        name,
        source,
        options: opts
    }: {
        name: string;
        source?: any;
        options?: KVObject;
    }): JsonapiDataDocument {
        if (!isString(name)) {
            throw new TransformError(`Invalid "name" Property (non string) actual type: '${typeof name}'`, {
                name,
                source,
                options: opts
            });
        }
        const docSchema = this.registry[name];
        if (!docSchema) {
            throw new TransformError(`Missing Schema: ${name}`, { name, source, options: opts });
        }
        const options: KVObject = Object.assign({}, this.baseOptions, opts);
        const include = this.createInclude();
        const data = this.transformSource({ docSchema, source, options, include });
        const included = include.get();
        const document = {
            jsonapi: {
                version: '1.0'
            }
        } as JsonapiDataDocument;
        // add top level properties if available
        const topLevel = ['links', 'meta'];
        topLevel.forEach((prop) => {
            if (docSchema.schema[prop]) {
                const result = docSchema.schema[prop]({ source, options, data, included });
                if (isObject(result)) {
                    document[prop] = result;
                }
            }
        });
        document.data = data;
        if (included.length) {
            document.included = included;
        }
        return document;
    }

    /**
     * Untransform a valid JSON API document into raw data
     * @param  {Object} args
     * @param  {Object} args.document - a json-api formatted document
     * @param  {Object} [options={}] - function level options
     * @return {Object[]} an array of data objects
     */
    public untransform({
        document,
        options: opts
    }: {
        document: JsonapiDataDocument;
        options?: KVObject;
    }): KVObject<any[]> {
        // validate json api document
        validateJsonApiDocument(document);

        const options: KVObject = Object.assign({}, this.baseOptions, opts);
        const data: KVObject<any[]> = {};
        const resourceDataMap: any[] = [];

        if (Array.isArray(document.data)) {
            document.data.forEach((resource) =>
                this.untransformResource({ resource, data, resourceDataMap, document, options })
            );
        } else {
            this.untransformResource({
                resource: document.data as ResourceObject,
                data,
                resourceDataMap,
                document,
                options
            });
        }

        const primaryDataObjects = resourceDataMap.map((mapping) => mapping.object);

        // untransform included resources if desired
        if (options.untransformIncluded && document.included) {
            document.included.forEach((resource: any) =>
                this.untransformResource({ resource, data, resourceDataMap, document, options })
            );
        }

        // nest included resources if desired
        if (options.nestIncluded) {
            resourceDataMap.forEach((resourceDataMapping) =>
                Transformalizer.nestRelatedResources({ resourceDataMapping, data })
            );

            // remove circular dependencies if desired
            if (options.removeCircularDependencies) {
                const processed = new WeakSet();
                const visited = new WeakSet();

                Transformalizer.removeCircularDependencies({
                    object: { root: primaryDataObjects },
                    processed,
                    visited
                });
            }
        }

        return data;
    }

    /**
     * Transform source into the "primary data" of the document
     * @param  {Object} args
     * @param  {Object} args.docSchema - the top level schema used for transforming the document
     * @param  {Object|Object[]} args.source - source data
     * @param  {Object} args.options - function level options
     * @param  {Object} args.include - include object
     * @return {Object|Object[]}
     */
    private transformSource(args: {
        docSchema: SchemaContext;
        source: any;
        options: KVObject;
        include: Include;
    }): DataObject {
        const { docSchema, source, options: opts, include } = args;
        if (Array.isArray(source)) {
            return source.map((data) => this.transformData({ docSchema, source, options: opts, data, include }));
        }
        return this.transformData({ docSchema, source, options: opts, data: source, include });
    }

    /**
     * Transform a single source object into a valid resource object
     * @param  {Object} args.docSchema - the top level schema used for transforming the document
     * @param  {Object|Object[]} args.source - source data
     * @param  {Object} args.options - function level options
     * @param  {Object} args.data - current source object
     * @param  {Object} args.include - include object
     * @param  {String} [args._type] - (for use by transformRelationshipData)
     * @param  {String} [args._id] - (for use by transformRelationshipData)
     * @return {Object}
     * @param args
     */
    private transformData(args: {
        docSchema: SchemaContext;
        source: any;
        options: KVObject;
        data: any;
        include: Include;
        _type?: string;
        _id?: string;
    }): ResourceObject {
        const { docSchema, source, options, data, include, _type, _id } = args;
        // call dataSchema if defined and switch contexts if necessary
        let dataSchema: SchemaContext = docSchema;
        if (isFunction(docSchema.schema.data.dataSchema)) {
            assertIsDefined(docSchema.schema.data.dataSchema);
            const name = docSchema.schema.data.dataSchema({ source, data, options });
            if (name !== docSchema.name) {
                dataSchema = this.registry[name];
                if (!dataSchema) {
                    throw new Error(`Missing Schema: ${name}`);
                }
            }
        }
        const state = {};
        const params = { dataSchema, source, options, data, state } as any;
        const type = (params.type = _type || this.getType(params));
        const id = (params.id = _id || this.getId(params));
        const attributes = (params.attributes = this.getAttributes(params));
        const relationships = (params.relationships = this.getRelationships({ include, ...params }));
        const links = (params.links = this.getLinks(params));
        const meta = (params.meta = this.getMeta(params));
        // build resulting resource
        const resource = { type, id } as any;
        if (isObject(attributes)) {
            resource.attributes = attributes;
        }
        if (isObject(relationships)) {
            resource.relationships = relationships;
        }
        if (isObject(meta)) {
            resource.meta = meta;
        }
        if (isObject(links)) {
            resource.links = links;
        }
        return resource;
    }

    /**
     * Get the resource type for the current source object
     * @param  {Object} args
     * @param  {Object} args.dataSchema
     * @param  {Object|Object[]} args.source
     * @param  {Object} args.options
     * @param  {Object} args.data
     * @return {String} type
     * @private
     */
    private getType(args: {
        dataSchema: SchemaContext;
        source: any;
        options: KVObject;
        data: any;
        state: State;
    }): string {
        const { dataSchema, ...others } = args;
        const type = dataSchema.schema.data.type(others);
        if (!isString(type)) {
            throw new TransformError(`Invalid type, expected string but is '${typeof type}'. `, args);
        }
        return type;
    }

    /**
     * Get the resource id for the current source object
     * @param  {Object} args
     * @param  {Object} args.dataSchema
     * @param  {Object|Object[]} args.source
     * @param  {Object} args.options
     * @param  {Object} args.data
     * @param  {String} args.type
     * @return {String} id
     * @private
     */
    private getId(args: {
        dataSchema: SchemaContext;
        type: string;
        source: any;
        options: KVObject;
        data: any;
        state: State;
    }): string {
        const { dataSchema, ...others } = args;
        const id = dataSchema.schema.data.id(others);
        if (!isString(id)) {
            throw new TransformError(`Invalid type, expected string but is '${typeof id}'.`, args);
        }
        return id;
    }

    /**
     * Get the resource attributes object for the current source object
     * @param  {Object} args
     * @param  {Object} args.dataSchema
     * @param  {Object|Object[]} args.source
     * @param  {Object} args.options
     * @param  {Object} args.data
     * @param  {String} args.type
     * @param  {String} args.id
     * @return {Object} attributes
     * @private
     */
    private getAttributes(args: TransformAttributesArgs & { dataSchema: SchemaContext }): Attributes | undefined {
        const { dataSchema, ...others } = args;
        if (dataSchema.schema.data.attributes) {
            return dataSchema.schema.data.attributes(others);
        }
        return undefined;
    }

    /**
     * Get the resource relationships object for the current source object
     * @param  {Object} args
     * @param  {Object} args.dataSchema
     * @param  {Object|Object[]} args.source
     * @param  {Object} args.options
     * @param  {Object} args.data
     * @param  {String} args.type
     * @param  {String} args.id
     * @param  {Object} args.attributes
     * @param  {Object} args.include
     * @return {Object} relationships
     * @private
     */
    private getRelationships(args: {
        dataSchema: SchemaContext;
        source: any;
        options: Options;
        include: any;
        state: State;
    }): any | undefined {
        const { dataSchema, ...others } = args;
        const relSchema = dataSchema.schema.data.relationships;
        if (relSchema) {
            const keys = Object.keys(relSchema);
            const relationships = keys.reduce((memo: any, key: string) => {
                const fn = relSchema[key];
                const relationship = this.getRelationship({ fn, ...others });
                if (isObject(relationship)) {
                    memo[key] = relationship;
                }
                return memo;
            }, {});
            if (!Object.keys(relationships).length) {
                return undefined;
            }
            return relationships;
        }
        return undefined;
    }

    /**
     * Get the resource relationship object for the current relationship of the
     * current source object
     * @param  {Object} args
     * @param  {Object} args.fn
     * @param  {Object|Object[]} args.source
     * @param  {Object} args.options
     * @param  {Object} args.data
     * @param  {String} args.type
     * @param  {String} args.id
     * @param  {Object} args.attributes
     * @param  {Object} args.include
     * @return {Object} relationship
     * @private
     */
    private getRelationship(args: {
        fn: any;
        include: Include;
        source: any;
        options: Options;
        state: State;
    }): any | undefined {
        const { fn, include, ...others } = args;
        const result = fn(others);
        if (!isObject(result)) {
            return undefined;
        }
        const { meta, links, data } = result;
        const invalidData = typeof data === 'undefined' || typeof data !== 'object';
        if (!links && !meta && invalidData) {
            return undefined;
        }
        const relationship = {} as any;
        if (!invalidData) {
            if (Array.isArray(data)) {
                relationship.data = data.map((item) =>
                    this.transformRelationshipData({
                        item,
                        source: args.source,
                        options: args.options,
                        include
                    })
                );
            } else if (data === null) {
                relationship.data = null;
            } else {
                relationship.data = this.transformRelationshipData({
                    item: data,
                    source: args.source,
                    options: args.options,
                    include
                });
            }
        }
        if (isObject(meta)) {
            relationship.meta = meta;
        }
        if (isObject(links)) {
            relationship.links = links;
        }
        return relationship;
    }

    /**
     * Get the data for the current relationship object for the current source
     * object
     * @param  {Object} args
     * @param  {Object} args.item - the current data item
     * @param  {Object|Object[]} args.source
     * @param  {Object} args.options
     * @param  {Function} args.include
     * @return {Object} data
     * @private
     */
    private transformRelationshipData(args: {
        item: any;
        source: any;
        options: Options;
        include: Include;
    }): ResourceIdentifier {
        const { item, source, options, include } = args;
        const { name, data, included, meta } = item;
        if (!isString(name) || !this.registry[name]) {
            throw new TransformError(`Missing Schema: ${name}`, args);
        }
        const relSchema = this.registry[name];
        const state: State = {};
        const type = this.getType({ dataSchema: relSchema, source, options, data, state });
        const id = this.getId({ dataSchema: relSchema, source, options, data, type, state });
        const result = { type, id } as any;
        if (isObject(meta)) {
            result.meta = meta;
        }

        if (included === true && !include.exists({ type, id })) {
            include.markAsIncluded({ type, id });

            const resource = this.transformData({
                docSchema: relSchema,
                source,
                options,
                data,
                include,
                _type: type,
                _id: id
            });
            include.include(resource);
        }
        return result;
    }

    /**
     * Get the resource links for the current source object
     * @param  {Object} args
     * @param  {Object} args.dataSchema
     * @param  {Object|Object[]} args.source
     * @param  {Object} args.options
     * @param  {Object} args.data
     * @param  {String} args.type
     * @param  {String} args.id
     * @param  {Object} args.attributes
     * @param  {Object} args.relationships
     * @return {Object} links
     * @private
     */
    private getLinks(args: TransformLinkArgs & { dataSchema: SchemaContext }): Links | undefined {
        const { dataSchema, ...others } = args;
        if (dataSchema.schema.data.links) {
            return dataSchema.schema.data.links(others);
        }
        return undefined;
    }

    /**
     * Get the resource meta for the current source object
     * @param  {Object} args
     * @param  {Object} args.dataSchema
     * @param  {Object|Object[]} args.source
     * @param  {Object} args.options
     * @param  {Object} args.data
     * @param  {String} args.type
     * @param  {String} args.id
     * @param  {Object} args.attributes
     * @param  {Object} args.relationships
     * @param  {Object} args.links
     * @return {Object} meta
     * @private
     */
    private getMeta(args: TransformMetaArgs & { dataSchema: SchemaContext }): MetaObject | undefined {
        const { dataSchema, ...others } = args;
        if (dataSchema.schema.data.meta) {
            return dataSchema.schema.data.meta(others);
        }
        return undefined;
    }

    /**
     * Create an include object
     * @return {Object} include
     * @private
     */
    private createInclude(): Include {
        const included: ResourceObject[] = [];
        const alreadyIncluded: { [k: string]: boolean } = {};
        return {
            /**
             * Determine whether or not a given resource has already been included
             * @param {Object} args
             * @param {String} args.type
             * @param {String} args.id
             * @return {Boolean}
             */
            exists({ type, id }: ResourceIdentifier) {
                return alreadyIncluded[`${type}:${id}`];
            },

            /**
             * Mark a resource as included
             * @param {Object} args
             * @param {String} args.type
             * @param {String} args.id
             * @return {Undefined}
             */
            markAsIncluded({ type, id }: ResourceIdentifier) {
                alreadyIncluded[`${type}:${id}`] = true;
            },

            /**
             * Add an included resource to the included section of the document
             * @param {Object} resource
             * @return {Undefined}
             */
            include(resource: ResourceObject) {
                included.push(resource);
            },

            /**
             * Return the included array in its current state
             * @return {Object[]}
             */
            get() {
                return included;
            }
        } as Include;
    }

    /**
     * Untransform a single resource object into raw data
     * @param  {Object} args
     * @param  {Object} args.resource - the json-api resource object
     * @param  {Object} args.data - an object where each key is the name of a data type and each value is an array of
     *     raw data objects
     * @param  Object[] args.resourceDataMap - an array of objects that map resources to a raw data objects
     * @param  {Object} args.document - the json-api resource document
     * @param  {Object} args.options - function level options
     * @param  {Array} args.resourceDataMap - an array where each entry is an object that contains the reousrce and the
     *   corresponding raw data object
     */
    private untransformResource({
        resource,
        data,
        resourceDataMap,
        document,
        options
    }: {
        resource: ResourceObject;
        data: KVObject<any[]>;
        resourceDataMap: any;
        document: JsonapiDocument;
        options: KVObject;
    }) {
        // get the appropriate data schema to use
        const dataSchema = this.getUntransformedDataSchema({ type: resource.type, resource, document, options });

        // untransform the resource id
        const id = Transformalizer.getUntransformedId({ dataSchema, id: resource.id, type: resource.type, options });

        // untransform the resource attributes
        const attributes = Transformalizer.getUntransformedAttributes({
            dataSchema,
            id,
            type: resource.type,
            attributes: resource.attributes,
            resource,
            options
        });

        // create a plain javascript object with the resource id and attributes
        const obj = Object.assign({ id }, attributes);

        if (resource.relationships) {
            // for each relationship, add the relationship to the plain javascript object
            for (const relationshipName of Object.keys(resource.relationships)) {
                const relationship = resource.relationships[relationshipName].data;

                if (Array.isArray(relationship)) {
                    obj[relationshipName] = (relationship as ResourceIdentifier[]).map((relationshipResource) => {
                        const relationshipDataSchema = this.getUntransformedDataSchema({
                            type: relationshipResource.type,
                            resource: relationshipResource,
                            document,
                            options
                        });

                        return {
                            id: Transformalizer.getUntransformedId({
                                dataSchema: relationshipDataSchema,
                                id: relationshipResource.id,
                                type: relationshipResource.type,
                                options
                            })
                        };
                    });
                } else if (isObject(relationship)) {
                    assertIsDefined(relationship);
                    const relationshipDataSchema = this.getUntransformedDataSchema({
                        type: relationship.type,
                        resource: relationship,
                        document,
                        options
                    });

                    obj[relationshipName] = {
                        id: Transformalizer.getUntransformedId({
                            dataSchema: relationshipDataSchema,
                            id: relationship.id,
                            type: relationship.type,
                            options
                        })
                    };
                }
            }
        }

        if (!data[resource.type]) {
            data[resource.type] = [];
        }

        // add the plain javascript object to the untransformed output and map it to the resource
        data[resource.type].push(obj);
        resourceDataMap.push({ resource, object: obj });
    }

    /**
     * Get the data schema to use to untransform the resource object
     * @param  {Object} args
     * @param  {Object} args.type - the json-api resource object type
     * @param  {Object} args.resource - the json-api resource object
     * @param  {Object} args.document - the json-api resource document
     * @param  {Object} args.options - function level options
     */
    private getUntransformedDataSchema(args: UntransformDataSchemaArgs): SchemaContext {
        let dataSchema = this.getSchema({ name: args.type });

        // if the base schema defines a dataSchema function, use that to retrieve the
        // actual schema to use, otherwise return the base schema
        if (isFunction(dataSchema.schema.data.untransformDataSchema)) {
            assertIsDefined(dataSchema.schema.data.untransformDataSchema);
            const name = dataSchema.schema.data.untransformDataSchema(args);

            if (name !== dataSchema.name) {
                dataSchema = this.getSchema({ name });

                if (!dataSchema) {
                    throw new Error(`Missing Schema: ${name}`);
                }
            }
        }

        return dataSchema;
    }

    /**
     * Untransform a resource object's id
     * @param  {Object} args
     * @param  {Object} args.dataSchema - the data schema for the resource object
     * @param  {Object} args.id - the json-api resource object id
     * @param  {Object} args.type - the json-api resource object type
     * @param  {Object} args.options - function level options
     */
    private static getUntransformedId(args: {
        dataSchema: SchemaContext;
        id: string;
        type: string;
        options: KVObject;
    }): any {
        const { dataSchema, ...others } = args;
        let id = others.id;

        if (dataSchema.schema.data.untransformId) {
            id = dataSchema.schema.data.untransformId(others);
        }

        return id;
    }

    /**
     * Untransform a resource object's attributes
     * @param  {Object} args
     * @param  {Object} args.dataSchema - the data schema for the resource object
     * @param  {Object} args.id - the json-api resource object id, determined in the data.untransformId step
     * @param  {Object} args.type - the json-api resource object type
     * @param  {Object} args.attributes - the json-api resource object attributes
     * @param  {Object} args.resource - the full json-api resource object
     * @param  {Object} args.options - function level options
     */
    private static getUntransformedAttributes(args: {
        dataSchema: SchemaContext;
        id: string;
        type: string;
        attributes?: Attributes;
        resource: ResourceObject;
        options: Options;
    }): any {
        const { dataSchema, ...others } = args;
        let attributes = others.attributes;

        if (dataSchema.schema.data.untransformAttributes) {
            attributes = dataSchema.schema.data.untransformAttributes(others);
        }

        return attributes;
    }

    /**
     * Nest related resources as defined by the json-api relationships
     * @param  {Object} args
     * @param  {Object} args.resourceDataMapping - An object that maps a resource to a raw data object
     * @param  {Object} args.data - An object where each key is the name of a data type and each value is an array of
     *     raw data objects
     */
    private static nestRelatedResources({ resourceDataMapping, data }: { resourceDataMapping: any; data: any }): any {
        const resource = resourceDataMapping.resource;
        const obj = resourceDataMapping.object;

        if (resource.relationships) {
            // for each relationship, add the relationship to the plain javascript object
            Object.keys(resource.relationships).forEach((relationshipName) => {
                const relationship = resource.relationships[relationshipName].data;

                if (Array.isArray(relationship)) {
                    obj[relationshipName] = relationship.map((relationshipResource, index) => {
                        const relationshipType = relationshipResource.type;
                        let relatedObj = { id: obj[relationshipName][index].id };

                        if (data[relationshipType]) {
                            const tempRelatedObj = data[relationshipType].find(
                                (d: { id: string }) => d.id === obj[relationshipName][index].id
                            );

                            if (tempRelatedObj) {
                                relatedObj = tempRelatedObj;
                            }
                        }

                        return relatedObj;
                    });
                } else {
                    const relationshipType = relationship.type;

                    if (data[relationshipType]) {
                        const relatedObj = data[relationshipType].find(
                            (d: { id: string }) => d.id === obj[relationshipName].id
                        );

                        if (relatedObj) {
                            obj[relationshipName] = relatedObj;
                        }
                    }
                }
            });
        }
    }

    /**
     * Remove any circular references from a raw data object
     * @param  {Object} args
     * @param  {Object} args.object - the object to check for circular references
     * @param  {Object} args.processed - a WeakSet of data objects already checked for circular references
     * @param  {Object} args.visited - a WeakSet of data objects already visited in the object hierarchy
     */
    private static removeCircularDependencies({
        object,
        processed,
        visited
    }: {
        object: any;
        processed: any;
        visited: any;
    }): void {
        let queue: any[] = [];

        processed.add(object);

        Object.keys(object).forEach((key) => {
            if (Array.isArray(object[key])) {
                object[key].forEach((item: any, index: number) => {
                    if (isObject(item) && item.id) {
                        if (visited.has(item)) {
                            // if the property has already been visited (i.e. the current data object is a descendant of the property
                            // object) replace it with a new object that only contains the id
                            object[key][index] = { id: object[key][index].id };
                        } else if (!processed.has(item)) {
                            // if the property has not been processed,
                            // add it to the queue to remove any circular references it contains
                            queue = queue.concat(object[key]);
                        }
                    }
                });
            } else if (isObject(object[key]) && object[key].id) {
                if (visited.has(object[key])) {
                    // if the property has already been visited (i.e. the current data object is a descendant of the property
                    // object) replace it with a new object that only contains the id
                    object[key] = { id: object[key].id };
                } else if (!processed.has(object[key])) {
                    // if the property has not been processed,
                    // add it to the queue to remove any circular references it contains
                    queue = queue.concat(object[key]);
                }
            }
        });

        // add items to visited
        queue.forEach((item) => {
            visited.add(item);
        });

        // process the items
        queue.forEach((item) => {
            Transformalizer.removeCircularDependencies({ object: item, processed, visited });
        });

        // remove items from visited
        queue.forEach((item) => {
            visited.delete(item);
        });
    }
}
