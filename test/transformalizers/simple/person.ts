import * as R from 'ramda';

import { links, meta } from './common';
import { Schema } from '../../../lib';

const person: {name:string, schema:Schema} = {
    name: 'person',
    schema: {
        data: {
            id({ source, options, data }) {
                // eslint-disable-line
                return R.prop('_id', data);
            },

            type({ source, options, data }) {
                // eslint-disable-line
                return 'person';
            },

            attributes({ data, options }) {
                // eslint-disable-line
                const [first, last] = R.pipe(R.pathOr('', ['_source', 'name']), (name) => name.split(' '))(data);
                return {
                    first,
                    last
                };
            }
        },

        links,

        meta
    }
};

export default person;
