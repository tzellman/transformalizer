export interface KVObject<T = unknown> {
    [k: string]: T;
}

export type MetaObject = KVObject;

export interface JsonapiObject {
    version?: string;
    meta?: MetaObject;
}

export type Link = string | { href: string; meta?: KVObject };
export type Links = KVObject<Link>;
export type Attributes = Omit<KVObject, 'links' | 'relationships'>;

interface SelfRelationshipLink extends Links {
    self: Link;
}
interface RelatedRelationshipLink extends Links {
    related: Link;
}
export type RelationshipLinks = SelfRelationshipLink | RelatedRelationshipLink;

export interface ResourceIdentifier {
    id: string;
    type: string;
    meta?: MetaObject;
}

export type ResourceLinkage = null | [] | ResourceIdentifier | ResourceIdentifier[];

interface BaseRelationship {
    data?: ResourceLinkage;
    meta?: MetaObject;
    links?: RelationshipLinks;
}
interface LinksRelationship extends Omit<BaseRelationship, 'links'> {
    links: RelationshipLinks;
}
interface DataRelationship extends Omit<BaseRelationship, 'data'> {
    data: ResourceLinkage;
}
interface MetaRelationship extends Omit<BaseRelationship, 'meta'> {
    meta: MetaObject;
}
export type Relationship = LinksRelationship | DataRelationship | MetaRelationship;

export interface ResourceObject extends ResourceIdentifier {
    attributes?: Attributes;
    relationships?: KVObject<Relationship>;
    links?: Links;
}

export interface ErrorObject {
    id?: string;
    links?: Links;
    status?: string;
    code?: string;
    title?: string;
    detail?: string;
    source?: KVObject;
    meta?: MetaObject;
}

export type DataObject = ResourceObject | ResourceObject[] | null | [];

export interface JsonapiDocument {
    errors?: ErrorObject[];
    data?: DataObject;
    meta?: MetaObject;
    jsonapi?: JsonapiObject;
    links?: Links;
    included?: ResourceObject[];
}

export interface JsonapiErrorDocument extends Omit<JsonapiDocument, 'errors' | 'data' | 'included'> {
    errors: ErrorObject[];
}
export interface JsonapiDataDocument extends Omit<JsonapiDocument, 'data' | 'errors'> {
    data: DataObject;
}
export interface JsonapiMetaDocument extends Omit<JsonapiDocument, 'meta' | 'included'> {
    meta: MetaObject;
}

export function isJsonapiDataDocument(doc: JsonapiDocument): doc is JsonapiDataDocument {
    return (doc as JsonapiDataDocument).data !== undefined;
}

export function isJsonapiErrorDocument(doc: JsonapiDocument): doc is JsonapiErrorDocument {
    return (doc as JsonapiErrorDocument).errors !== undefined;
}

export function isJsonapiMetaDocument(doc: JsonapiDocument): doc is JsonapiMetaDocument {
    return !isJsonapiDataDocument(doc) && !isJsonapiErrorDocument(doc);
}
