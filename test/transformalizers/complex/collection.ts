import * as R from 'ramda';
import { Schema } from '../../../lib';

const collection: { name: string; schema: Schema } = {
    name: 'collection',
    schema: {
        data: {
            type: R.always('collection'),
            id: R.pathOr('1', ['data', 'id']),
            attributes({ data }: { data: any }) {
                return R.pickAll(['name', 'desc'], data);
            },
            relationships: {
                content({ data }: { data: any }) {
                    const content = R.propOr([], 'content', data);
                    return {
                        // @ts-ignore
                        data: content.map((c) => ({
                            name: c._type,
                            data: c,
                            included: true
                        }))
                    };
                },
                tags({ data }: { data: any }) {
                    const tags = R.propOr([], 'tags', data);
                    return {
                        // @ts-ignore
                        data: tags.map((tag) => ({
                            name: 'tag',
                            data: tag,
                            included: true
                        }))
                    };
                }
            },
            links({ options, id }: { options: any; id: string }) {
                return {
                    self: `${options.url}/collections/${id}`
                };
            }
        }
    }
};

export default collection;
