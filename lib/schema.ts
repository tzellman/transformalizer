import { Attributes, JsonapiDocument, KVObject, Links, MetaObject, ResourceObject } from './jsonapi';

export interface Include {
    exists({ type, id }: { type: string; id: string }): boolean;
    markAsIncluded({ type, id }: { type: string; id: string }): void;
    include(resource: ResourceObject): void;
    get(): ResourceObject[];
}

export type Options = KVObject<any>;
export type State = KVObject<any>;

export interface TransformArgs {
    id: string;
    type: string;
    source: any;
    options: Options;
    data: any;
    state: State;
    relationships: any;
    attributes?: Attributes;
    links?: Links;
}

export type TransformDataSchemaArgs = Pick<TransformArgs, 'source' | 'options' | 'data'>;
export type TransformTypeArgs = TransformDataSchemaArgs & Pick<TransformArgs, 'state'>;
export type TransformIdArgs = TransformTypeArgs & Pick<TransformArgs, 'type'>;
export type TransformAttributesArgs = TransformIdArgs & Pick<TransformArgs, 'id'>;
export type TransformRelationshipArgs = TransformAttributesArgs & Pick<TransformArgs, 'attributes'>;
export type TransformLinkArgs = TransformRelationshipArgs & Pick<TransformArgs, 'relationships'>;
export type TransformMetaArgs = TransformLinkArgs & Pick<TransformArgs, 'links'>;

export type UntransformDataSchemaArgs = {
    type: string;
    resource: ResourceObject;
    document: JsonapiDocument;
    options: Options;
};

interface DataSchema {
    dataSchema?(args: TransformDataSchemaArgs): string;
    type?(args: TransformTypeArgs): string;
    id?(args: TransformIdArgs): string;
    attributes?(args: TransformAttributesArgs): Attributes | undefined;
    relationships?: KVObject<(args: TransformRelationshipArgs) => any>;
    links?(params: TransformLinkArgs): Links | undefined;
    meta?(args: TransformMetaArgs): MetaObject | undefined;

    untransformDataSchema?(args: UntransformDataSchemaArgs): string;
    untransformId?(args?: any): any;
    untransformAttributes?(args?: any): any;
}

export interface Schema {
    links?(args?: any): Links | undefined;
    meta?(args?: any): MetaObject | undefined;
    data?: DataSchema;
}

type ValidatedDataSchema = DataSchema & Required<Pick<DataSchema, 'id' | 'type'>>;
export type ValidatedSchema = Schema & { data: ValidatedDataSchema };
