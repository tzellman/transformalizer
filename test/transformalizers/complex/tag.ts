import * as R from 'ramda';
import { Schema } from '../../../lib';

const tag: { name: string; schema: Schema } = {
    name: 'tag',
    schema: {
        data: {
            type: R.always('tag'),
            id: R.pathOr('1', ['data', 'id']),
            attributes({ data }: { data: any }) {
                return R.pickAll(['name', 'desc'], data);
            },
            links({ options, id }: { options?: any; id: string }) {
                return {
                    self: `${options.url}/tags/${id}`
                };
            }
        }
    }
};

export default tag;
