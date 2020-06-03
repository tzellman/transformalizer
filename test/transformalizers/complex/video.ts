import * as R from 'ramda';
import { Schema } from '../../../lib';

const video: { name: string; schema: Schema } = {
    name: 'video',
    schema: {
        data: {
            type: R.always('video'),
            id: R.pathOr('1', ['data', 'id']),
            attributes({ data }: { data: any }) {
                return R.pickAll(['name', 'description'], data);
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
                    self: `${options.url}/videos/${id}`
                };
            }
        }
    }
};

export default video;
