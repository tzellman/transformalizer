import * as R from 'ramda';
import { Schema } from '../../../lib';

const book: { name: string; schema: Schema } = {
    name: 'book',
    schema: {
        data: {
            type: R.always('book'),
            id: R.compose(R.toString, R.path(['data', 'id'])),
            untransformId: R.compose(Number, R.path(['id'])),
            attributes({ data }) {
                const attributes = R.pick(['title', 'copyright'], data);
                return R.isEmpty(attributes) ? undefined : attributes;
            },
            untransformAttributes: R.path(['attributes']),
            relationships: {
                author({ data }) {
                    const author = R.prop('author', data);
                    if (typeof author === 'undefined') {
                        return undefined;
                    }
                    if (!author) {
                        return { data: null };
                    }
                    return {
                        data: {
                            name: 'author',
                            data: author,
                            included: true
                        }
                    };
                },
                publisher({ data }) {
                    const publisher = R.prop('publisher', data);
                    if (!publisher) {
                        return undefined;
                    }
                    return {
                        data: {
                            name: 'publisher',
                            data: publisher,
                            included: true
                        }
                    };
                }
            },
            links({ options, id }) {
                return {
                    self: `${options.url}/books/${id}`
                };
            }
        }
    }
};

export default book;
