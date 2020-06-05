import * as R from 'ramda';
import { Schema } from '../../../lib';

const schema: { name: string; schema: Schema } = {
    name: 'tag',
    schema: {
        data: {
            type: R.always('tag'),
            id: R.compose(R.toString, R.path(['data', 'id'])),
            untransformId: R.compose(Number, R.path(['id'])),
            attributes({ data }) {
                const attributes = R.pick(['name', 'description'], data);
                return R.isEmpty(attributes) ? undefined : attributes;
            },
            untransformAttributes: R.path(['attributes']),
            links({ options, id }) {
                return {
                    self: `${options.url}/tags/${id}`
                };
            }
        }
    }
};

export default schema;
