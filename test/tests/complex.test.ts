import { expect } from 'chai';
import * as faker from 'faker';
import * as _ from 'lodash';
import { describe, it } from 'mocha';

import transformalizer from '../transformalizers/complex';
import { assertIsDefined } from '../../lib/utils';
import { ResourceIdentifier, ResourceObject } from '../../lib';

const tags = _.range(10).map(() => ({
    _type: 'tag',
    id: faker.random.uuid(),
    name: faker.lorem.word(),
    desc: faker.lorem.sentence()
}));

const articles = _.range(5).map(() => ({
    _type: 'article',
    id: faker.random.uuid(),
    title: faker.lorem.words(3),
    body: faker.lorem.paragraph(),
    tags: _.sampleSize(tags, _.random(1, 2))
}));

const videos = _.range(5).map(() => ({
    _type: 'video',
    id: faker.random.uuid(),
    name: faker.lorem.words(3),
    description: faker.lorem.paragraph(),
    tags: _.sampleSize(tags, _.random(1, 2))
})) as any[];

const content = articles.slice().concat(videos.slice());

const collections = _.range(2).map(() => ({
    _type: 'collection',
    id: faker.random.uuid(),
    name: faker.lorem.words(3),
    desc: faker.lorem.paragraph(),
    tags: _.sampleSize(tags, _.random(1, 2)),
    content: _.sampleSize(content, 5)
}));

describe('complex', function () {
    it('builds the correct document with a single collection', function () {
        const source = _.sample(collections) as any;
        const payload = transformalizer.transform({ name: 'collection', source });
        expect(payload).to.be.an('object').with.all.keys('jsonapi', 'data', 'included');
        expect(payload).to.have.property('data').that.is.an('object');
        const payloadData = payload.data as ResourceObject;
        expect(payloadData).to.have.all.keys('type', 'id', 'attributes', 'relationships', 'links');
        expect(payloadData).to.have.property('type', 'collection');
        expect(payloadData).to.have.property('id', source.id);
        expect(payloadData).to.have.property('attributes').that.is.an('object');

        expect(payloadData.attributes).to.have.property('name', source.name);
        expect(payloadData.attributes).to.have.property('desc', source.desc);
        expect(payloadData).to.have.property('relationships').that.is.an('object');
        expect(payloadData.relationships).to.have.property('content');
        assertIsDefined(payloadData.relationships);
        expect(payloadData.relationships.content).to.be.an('object');
        expect(payloadData.relationships.content).with.all.keys('data');
        expect(payloadData.relationships.content.data).to.be.an('array').with.lengthOf(source.content.length);
        assertIsDefined(payloadData.relationships.content.data);
        (payloadData.relationships.content.data as ResourceIdentifier[]).forEach((rel: any, i: number) => {
            expect(rel).to.be.an('object').with.all.keys('type', 'id');
            expect(rel).to.have.property('type', source.content[i]._type);
            expect(rel).to.have.property('id', source.content[i].id);
        });
        expect(payloadData.relationships).to.have.property('tags');
        expect(payloadData.relationships.tags).to.be.an('object');
        expect(payloadData.relationships.tags).with.all.keys('data');
        expect(payloadData.relationships.tags.data).to.be.an('array').with.lengthOf(source.tags.length);
        (payloadData.relationships.tags.data as ResourceIdentifier[]).forEach((rel, i) => {
            expect(rel).to.be.an('object').with.all.keys('type', 'id');
            expect(rel).to.have.property('type', source.tags[i]._type);
            expect(rel).to.have.property('id', source.tags[i].id);
        });
        let expectedIncluded: any[] = [];
        source.tags.forEach((tag: any) => expectedIncluded.push(`tag:${tag.id}`));
        source.content.forEach((c: any) => {
            expectedIncluded.push(`${c._type}:${c.id}`);
            c.tags.forEach((tag: any) => expectedIncluded.push(`tag:${tag.id}`));
        });
        expectedIncluded = _.uniq(expectedIncluded).sort();
        expect(payload.included).to.be.an('array').with.lengthOf(expectedIncluded.length);
        assertIsDefined(payload.included);
        const included = payload.included.map((item) => `${item.type}:${item.id}`);
        expect(_.intersection(expectedIncluded, included).sort()).to.deep.equal(expectedIncluded);
        const includedData = {
            articles: payload.included.filter(({ type }) => type === 'article'),
            videos: payload.included.filter(({ type }) => type === 'video'),
            tags: payload.included.filter(({ type }) => type === 'tag')
        };
        includedData.articles.forEach((article) => {
            const s = articles.find(({ id }) => id === article.id);
            assertIsDefined(s);
            expect(article).to.be.an('object');
            expect(article).to.have.all.keys('type', 'id', 'attributes', 'relationships', 'links');
            expect(article).to.have.property('type', 'article');
            expect(article).to.have.property('id', s.id);
            expect(article).to.have.property('attributes').that.is.an('object');
            expect(article.attributes).to.have.property('title', s.title);
            expect(article.attributes).to.have.property('body', s.body);
            expect(article).to.have.property('relationships').that.is.an('object');
            expect(article.relationships).to.have.property('tags').that.is.an('object');
            assertIsDefined(article.relationships);
            expect(article.relationships.tags).to.have.all.keys('data');
            expect(article.relationships.tags)
                .to.have.property('data')
                .that.is.an('array')
                .with.lengthOf(s.tags.length);
            assertIsDefined(article.relationships.tags.data);
            (article.relationships.tags.data as ResourceIdentifier[]).forEach((tag, i) => {
                expect(tag).to.be.an('object').with.all.keys('type', 'id');
                expect(tag).to.have.property('type', 'tag');
                expect(tag).to.have.property('id', s.tags[i].id);
            });
        });
        includedData.videos.forEach((video) => {
            const s = videos.find(({ id }) => id === video.id);
            expect(video).to.be.an('object');
            expect(video).to.have.all.keys('type', 'id', 'attributes', 'relationships', 'links');
            expect(video).to.have.property('type', 'video');
            expect(video).to.have.property('id', s.id);
            expect(video).to.have.property('attributes').that.is.an('object');
            expect(video.attributes).to.have.property('name', s.name);
            expect(video.attributes).to.have.property('description', s.description);
            expect(video).to.have.property('relationships').that.is.an('object');
            expect(video.relationships).to.have.property('tags').that.is.an('object');
            assertIsDefined(video.relationships);
            expect(video.relationships.tags).to.have.all.keys('data');
            expect(video.relationships.tags).to.have.property('data').that.is.an('array').with.lengthOf(s.tags.length);
            assertIsDefined(video.relationships.tags.data);
            (video.relationships.tags.data as ResourceIdentifier[]).forEach((tag, i) => {
                expect(tag).to.be.an('object').with.all.keys('type', 'id');
                expect(tag).to.have.property('type', 'tag');
                expect(tag).to.have.property('id', s.tags[i].id);
            });
        });
        includedData.tags.forEach((tag) => {
            const s = tags.find(({ id }) => id === tag.id);
            assertIsDefined(s);
            expect(tag).to.be.an('object');
            expect(tag).to.have.all.keys('type', 'id', 'attributes', 'links');
            expect(tag).to.have.property('type', 'tag');
            expect(tag).to.have.property('id', s.id);
            expect(tag).to.have.property('attributes').that.is.an('object');
            expect(tag.attributes).to.have.property('name', s.name);
            expect(tag.attributes).to.have.property('desc', s.desc);
        });
    });

    it('builds the correct document with multiple collections', function () {
        const source = collections.slice();
        const payload = transformalizer.transform({ name: 'collection', source });
        expect(payload).to.be.an('object').with.all.keys('jsonapi', 'data', 'included');
        expect(payload).to.have.property('data').that.is.an('array').with.lengthOf(source.length);
        let expectedIncluded: string[] = [];
        assertIsDefined(payload.data);
        (payload.data as ResourceObject[]).forEach((resource, i) => {
            const _source = source[i];
            expect(resource).to.have.all.keys('type', 'id', 'attributes', 'relationships', 'links');
            expect(resource).to.have.property('type', 'collection');
            expect(resource).to.have.property('id', _source.id);
            expect(resource).to.have.property('attributes').that.is.an('object');
            expect(resource.attributes).to.have.property('name', _source.name);
            expect(resource.attributes).to.have.property('desc', _source.desc);
            expect(resource).to.have.property('relationships').that.is.an('object');
            expect(resource.relationships).to.have.property('content');
            assertIsDefined(resource.relationships);
            expect(resource.relationships.content).to.be.an('object');
            expect(resource.relationships.content).with.all.keys('data');
            expect(resource.relationships.content.data).to.be.an('array').with.lengthOf(_source.content.length);
            assertIsDefined(resource.relationships.content.data);
            (resource.relationships.content.data as ResourceIdentifier[]).forEach((rel, a) => {
                expect(rel).to.be.an('object').with.all.keys('type', 'id');
                expect(rel).to.have.property('type', _source.content[a]._type);
                expect(rel).to.have.property('id', _source.content[a].id);
            });
            expect(resource.relationships).to.have.property('tags');
            expect(resource.relationships.tags).to.be.an('object');
            expect(resource.relationships.tags).with.all.keys('data');
            expect(resource.relationships.tags.data).to.be.an('array').with.lengthOf(_source.tags.length);
            (resource.relationships.tags.data as ResourceIdentifier[]).forEach((rel, a) => {
                expect(rel).to.be.an('object').with.all.keys('type', 'id');
                expect(rel).to.have.property('type', _source.tags[a]._type);
                expect(rel).to.have.property('id', _source.tags[a].id);
            });

            _source.tags.forEach((tag: any) => expectedIncluded.push(`tag:${tag.id}`));
            _source.content.forEach((c) => {
                expectedIncluded.push(`${c._type}:${c.id}`);
                c.tags.forEach((tag) => expectedIncluded.push(`tag:${tag.id}`));
            });
        });
        expectedIncluded = _.uniq(expectedIncluded).sort();
        expect(payload.included).to.be.an('array').with.lengthOf(expectedIncluded.length);
        assertIsDefined(payload.included);
        const included = payload.included.map((item) => `${item.type}:${item.id}`);
        expect(_.intersection(expectedIncluded, included).sort()).to.deep.equal(expectedIncluded);
        const includedData = {
            articles: payload.included.filter(({ type }) => type === 'article'),
            videos: payload.included.filter(({ type }) => type === 'video'),
            tags: payload.included.filter(({ type }) => type === 'tag')
        };
        includedData.articles.forEach((article) => {
            const s = articles.find(({ id }) => id === article.id);
            assertIsDefined(s);
            expect(article).to.be.an('object');
            expect(article).to.have.all.keys('type', 'id', 'attributes', 'relationships', 'links');
            expect(article).to.have.property('type', 'article');
            expect(article).to.have.property('id', s.id);
            expect(article).to.have.property('attributes').that.is.an('object');
            expect(article.attributes).to.have.property('title', s.title);
            expect(article.attributes).to.have.property('body', s.body);
            expect(article).to.have.property('relationships').that.is.an('object');
            expect(article.relationships).to.have.property('tags').that.is.an('object');
            assertIsDefined(article.relationships);
            expect(article.relationships.tags).to.have.all.keys('data');
            expect(article.relationships.tags)
                .to.have.property('data')
                .that.is.an('array')
                .with.lengthOf(s.tags.length);
            (article.relationships.tags.data as ResourceIdentifier[]).forEach((tag, i) => {
                expect(tag).to.be.an('object').with.all.keys('type', 'id');
                expect(tag).to.have.property('type', 'tag');
                expect(tag).to.have.property('id', s.tags[i].id);
            });
        });
        includedData.videos.forEach((video) => {
            const s = videos.find(({ id }) => id === video.id);
            expect(video).to.be.an('object');
            expect(video).to.have.all.keys('type', 'id', 'attributes', 'relationships', 'links');
            expect(video).to.have.property('type', 'video');
            expect(video).to.have.property('id', s.id);
            expect(video).to.have.property('attributes').that.is.an('object');
            expect(video.attributes).to.have.property('name', s.name);
            expect(video.attributes).to.have.property('description', s.description);
            expect(video).to.have.property('relationships').that.is.an('object');
            expect(video.relationships).to.have.property('tags').that.is.an('object');
            assertIsDefined(video.relationships);
            expect(video.relationships.tags).to.have.all.keys('data');
            expect(video.relationships.tags).to.have.property('data').that.is.an('array').with.lengthOf(s.tags.length);
            (video.relationships.tags.data as ResourceIdentifier[]).forEach((tag, i) => {
                expect(tag).to.be.an('object').with.all.keys('type', 'id');
                expect(tag).to.have.property('type', 'tag');
                expect(tag).to.have.property('id', s.tags[i].id);
            });
        });
        includedData.tags.forEach((tag) => {
            const s = tags.find(({ id }) => id === tag.id);
            assertIsDefined(s);
            expect(tag).to.be.an('object');
            expect(tag).to.have.all.keys('type', 'id', 'attributes', 'links');
            expect(tag).to.have.property('type', 'tag');
            expect(tag).to.have.property('id', s.id);
            expect(tag).to.have.property('attributes').that.is.an('object');
            expect(tag.attributes).to.have.property('name', s.name);
            expect(tag.attributes).to.have.property('desc', s.desc);
        });
    });

    it('uses dataSchema if provided', function () {
        const collection = _.sample(collections) as any;
        const source = collection.content;
        const document = transformalizer.transform({ name: 'content', source, options: { collection } });
        expect(document).to.have.property('data').that.is.an('array');
        (document.data as ResourceIdentifier[]).forEach((resource, i) => {
            expect(resource).to.have.property('type', source[i]._type);
        });
    });
});
