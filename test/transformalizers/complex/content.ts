import { Schema } from '../../../lib';

const content: { name: string; schema: Schema } = {
    name: 'content',
    schema: {
        data: {
            dataSchema({ data }: { data: any }) {
                return data._type;
            }
        },
        links({ options }: { options: any }) {
            return {
                self: `${options.url}/collections/${options.collection.id}/content`
            };
        },
        meta({ source }: { source: any }) {
            return {
                count: source.length
            };
        }
    }
};

export default content;
