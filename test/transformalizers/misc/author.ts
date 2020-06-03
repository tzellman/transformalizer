import * as R from 'ramda';
import { Schema } from '../../../lib';

const author: { name: string; schema: Schema } = {
    name: 'author',
    schema: {
        data: {
            type: R.always('author'),
            id: R.compose(R.toString, R.path(['data', 'id'])),
            untransformId: R.compose(Number, R.path(['id'])),
            attributes({ data }) {
                const attributes = R.pick(['firstName', 'lastName'], data);
                return R.isEmpty(attributes) ? undefined : attributes;
            },
            untransformAttributes: R.path(['attributes']),
            relationships: {
                books({ data }) {
                    const books = R.prop('books', data);
                    if (!books) {
                        return undefined;
                    }
                    return {
                        data: books.map((book) => ({
                            name: 'book',
                            data: book,
                            included: true
                        }))
                    };
                }
            },
            links({ options, id }) {
                return {
                    self: `${options.url}/authors/${id}`
                };
            }
        }
    }
};

export default author;
