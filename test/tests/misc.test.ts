import { expect } from 'chai';
import * as _ from 'lodash';
import { describe, it } from 'mocha';

import transformalizer from '../transformalizers/misc';
import { assertIsDefined } from '../../lib/utils';
import { ResourceObject } from '../../lib';

describe('miscellaneous', function () {
    it('each included resource should only appear once', function () {
        const author = { id: 1, firstName: 'Douglas', lastName: 'Adams' } as any;
        const publisher = { id: 2, name: 'William Heinemann Ltd.' };
        const books = [
            { id: 10, title: "Dirk Gently's Holistic Detective Agency", copyright: 1987, author, publisher },
            { id: 11, title: 'The Long Dark Tea-Time of the Soul', copyright: 1988, author, publisher },
            { id: 12, title: 'The Salmon of Doubt', copyright: 2002, author, publisher }
        ];
        const series = { id: 3, title: 'Dirk Gently', books };

        author.books = books.map((book) => ({ id: book.id }));

        const payload = transformalizer.transform({ name: 'series', source: series, options: {} });

        const uniqueIncluded = _.uniqBy(payload.included, (included: any) => `${included.type}:${included.id}`);

        assertIsDefined(payload.included);
        expect(uniqueIncluded).to.be.an('array').with.lengthOf(payload.included.length);
    }),
        it('the data attribute can be null for empty to-one relations', function () {
            const book = { id: 1, title: 'Beowulf', author: null };

            const payload = transformalizer.transform({ name: 'book', source: book });

            const payloadData = payload.data as ResourceObject;
            assertIsDefined(payloadData.relationships);
            expect(payloadData.relationships.author.data).to.be.a('null');
        });
});
