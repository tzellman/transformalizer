import * as R from 'ramda';
import { Schema } from '../../../lib';

const article: { name: string; schema: Schema } = {
    name: 'article',
    schema: {
        data: {
            type: R.always('article'),
            id: R.pathOr('1', ['data', 'id']),
            attributes({ data }: { data: any }) {
                return R.pickAll(['title', 'body'], data);
            },
            relationships: {
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
                    self: `${options.url}/articles/${id}`
                };
            }
        }
    }
};

export default article;
