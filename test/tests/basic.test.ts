import { expect } from 'chai';
import * as _ from 'lodash';
import { describe, it } from 'mocha';

import createTransformalizer, { ResourceIdentifier, ResourceObject } from '../../lib';
import { assertIsDefined } from '../../lib/utils';

// create a new transformalizer
const transformalizer = createTransformalizer({ url: 'https://api.example.com' });

// register a schema
transformalizer.register({
    name: 'article',
    schema: {
        links({ source, options }: { source: any; options: any }) {
            if (Array.isArray(source)) {
                return { self: `${options.url}/articles` };
            }
            return undefined;
        },
        meta({ source }: { source: any }) {
            if (Array.isArray(source)) {
                return { count: source.length };
            }
            return undefined;
        },
        data: {
            attributes({ data }: { data: any }) {
                return _(data)
                    .pick('title', 'body', 'createdAt')
                    .mapKeys((v, k) => _.snakeCase(k))
                    .value();
            },
            relationships: {
                author({ data, options, id }: { data: any; options: any; id: string }) {
                    const { author } = data;
                    const links = {
                        self: `${options.url}/articles/${id}/relationships/author`,
                        related: `${options.url}/articles/${id}/author`
                    };
                    if (!author) {
                        return { links };
                    }
                    const included = _.isObject(author);
                    return {
                        data: {
                            name: 'user',
                            data: included ? author : { id: author },
                            included
                        },
                        links
                    };
                },
                comments({ data, options, id }: { data: any; options: any; id: string }) {
                    const { comments } = data;
                    const links = {
                        self: `${options.url}/articles/${id}/relationships/comments`,
                        related: `${options.url}/articles/${id}/comments`
                    };
                    if (!Array.isArray(comments) || !comments.length) {
                        return { links };
                    }
                    const included = _.isObject(comments[0]);
                    return {
                        data: comments.map((comment) => ({
                            name: 'comment',
                            data: included ? comment : { id: comment },
                            included
                        })),
                        links
                    };
                }
            },
            links({ options, id }: { options: any; id: string }) {
                return { self: `${options.url}/articles/${id}` };
            }
        }
    }
});

// register related schemas
transformalizer.register({
    name: 'user',
    schema: {
        links({ source, options }: { source: any; options: any }) {
            if (Array.isArray(source)) {
                return { self: `${options.url}/users` };
            }
            return undefined;
        },
        meta({ source }: { source: any }) {
            if (Array.isArray(source)) {
                return { count: source.length };
            }
            return undefined;
        },
        data: {
            attributes({ data }: { data: any }) {
                return _(data)
                    .pick('firstName', 'lastName', 'email')
                    .mapKeys((v, k) => _.snakeCase(k))
                    .value();
            },
            relationships: {
                articles({ data, options, id }: { data: any; options: any; id: string }) {
                    const { articles } = data;
                    const links = {
                        self: `${options.url}/users/${id}/relationships/articles`,
                        related: `${options.url}/users/${id}/articles`
                    };
                    if (!Array.isArray(articles) || !articles.length) {
                        return { links };
                    }
                    const included = _.isObject(articles[0]);
                    return {
                        data: articles.map((article) => ({
                            name: 'article',
                            data: included ? article : { id: article },
                            included
                        })),
                        links
                    };
                },
                comments({ data, options, id }: { data: any; options: any; id: string }) {
                    const { comments } = data;
                    const links = {
                        self: `${options.url}/articles/${id}/relationships/comments`,
                        related: `${options.url}/articles/${id}/comments`
                    };
                    if (!Array.isArray(comments) || !comments.length) {
                        return { links };
                    }
                    const included = _.isObject(comments[0]);
                    return {
                        data: comments.map((comment) => ({
                            name: 'comment',
                            data: included ? comment : { id: comment },
                            included
                        })),
                        links
                    };
                }
            },
            links({ options, id }: { options: any; id: string }) {
                return { self: `${options.url}/users/${id}` };
            }
        }
    }
});

transformalizer.register({
    name: 'comment',
    schema: {
        data: {
            attributes({ data }: { data: any }) {
                return _.pick(data, 'body');
            },
            relationships: {
                article({ data, options, id }: { data: any; options: any; id: string }) {
                    const { article } = data;
                    const links = {
                        self: `${options.url}/users/${id}/relationships/article`,
                        related: `${options.url}/users/${id}/article`
                    };
                    if (!article) {
                        return { links };
                    }
                    const included = _.isObject(article);
                    return {
                        data: {
                            name: 'article',
                            data: included ? article : { id: article },
                            included
                        },
                        links
                    };
                },
                author({ data, options, id }: { data: any; options: any; id: string }) {
                    const { author } = data;
                    const links = {
                        self: `${options.url}/articles/${id}/relationships/author`,
                        related: `${options.url}/articles/${id}/author`
                    };
                    if (!author) {
                        return { links };
                    }
                    const included = _.isObject(author);
                    return {
                        data: {
                            name: 'user',
                            data: included ? author : { id: author },
                            included
                        },
                        links
                    };
                }
            },
            links({ options, id }: { options: any; id: string }) {
                return { self: `${options.url}/comments/${id}` };
            }
        }
    }
});

const articles = [
    {
        id: 1,
        title: 'First Article',
        body: 'Hello, World!',
        createdAt: new Date(),
        author: 2
    },
    {
        id: 2,
        title: 'Second Article',
        body: 'Hola, World!',
        createdAt: new Date(),
        author: 1
    }
];

const users = [
    {
        id: 1,
        firstName: 'Kanye',
        lastName: 'West',
        email: 'kwest@example.com'
    },
    {
        id: 2,
        firstName: 'A$AP',
        lastName: 'Ferg',
        email: 'ferg@example.com'
    }
];

const comments = [
    {
        id: 1,
        body: 'Nice article Ferg!',
        author: 1,
        article: 1
    },
    {
        id: 2,
        body: 'Thanks Yeezy!',
        author: 2,
        article: 1
    },
    {
        id: 3,
        body: 'First!',
        author: 2,
        article: 2
    },
    {
        id: 4,
        body: 'nah man',
        author: 1,
        article: 2
    }
];

// build a document of normalized articles
describe('basic', function () {
    it('should correctly transform a list of normalized articles', function () {
        const source = articles;
        const document = transformalizer.transform({ name: 'article', source });
        expect(document).to.be.an('object').with.all.keys('jsonapi', 'data', 'links', 'meta');
        expect(document).to.have.property('data').that.is.an('array').with.lengthOf(source.length);

        (document.data as ResourceObject[]).forEach((resource: any, i: number) => {
            const s = source[i];
            expect(resource).to.be.an('object').with.all.keys('type', 'id', 'attributes', 'relationships', 'links');
            expect(resource).to.have.property('type', 'article');
            expect(resource).to.have.property('id', s.id.toString());
            expect(resource).to.have.property('attributes').that.is.an('object');
            expect(resource.attributes).to.have.all.keys('title', 'body', 'created_at');
            expect(resource.attributes).to.have.property('title', s.title);
            expect(resource.attributes).to.have.property('body', s.body);
            expect(resource.attributes).to.have.property('created_at', s.createdAt);
            expect(resource).to.have.property('relationships').that.is.an('object');
            expect(resource.relationships).to.have.all.keys('author', 'comments');
            expect(resource.relationships.author).to.be.an('object');
            expect(resource.relationships.author).to.have.all.keys('data', 'links');
            expect(resource.relationships.author.data).to.be.an('object');
            expect(resource.relationships.author.data).to.have.all.keys('type', 'id');
            expect(resource.relationships.author.data).to.have.property('type', 'user');
            expect(resource.relationships.author.data).to.have.property('id', s.author.toString());
            expect(resource.relationships.author.links).to.be.an('object');
            expect(resource.relationships.author.links).to.have.all.keys('self', 'related');
            expect(resource.relationships.author.links.self).to.match(/articles\/\d\/relationships\/author/);
            expect(resource.relationships.author.links.related).to.match(/articles\/\d\/author/);
            expect(resource.relationships.comments).to.be.an('object');
            expect(resource.relationships.comments).to.have.all.keys('links');
            expect(resource.relationships.comments.links).to.be.an('object');
            expect(resource.relationships.comments.links).to.have.all.keys('self', 'related');
            expect(resource.relationships.comments.links.self).to.match(/articles\/\d\/relationships\/comments/);
            expect(resource.relationships.comments.links.related).to.match(/articles\/\d\/comments/);
        });
        expect(document).to.have.property('links').that.is.an('object');
        expect(document.links).to.have.all.keys('self');
        expect(document.links)
            .to.have.property('self')
            .that.matches(/articles$/);
    });

    it('should correctly transform a list of denormalized articles', function () {
        const source = articles.map((article) => {
            const populated = _.pick(article, 'id', 'body', 'createdAt', 'title') as any;
            populated.author = _.find(users, { id: article.author });
            populated.comments = _.filter(comments, { article: article.id }).map((comment) => ({
                author: _.find(users, { id: comment.author }),
                body: comment.body,
                article: comment.article,
                id: comment.id
            }));
            return populated;
        });
        const document = transformalizer.transform({ name: 'article', source });
        expect(document).to.be.an('object').with.all.keys('jsonapi', 'data', 'links', 'meta', 'included');
        expect(document).to.have.property('data').that.is.an('array').with.lengthOf(source.length);
        (document.data as ResourceObject[]).forEach((resource: any, i: number) => {
            const s = source[i];
            expect(resource).to.be.an('object').with.all.keys('type', 'id', 'attributes', 'relationships', 'links');
            expect(resource).to.have.property('type', 'article');
            expect(resource).to.have.property('id', s.id.toString());
            expect(resource).to.have.property('attributes').that.is.an('object');
            expect(resource.attributes).to.have.all.keys('title', 'body', 'created_at');
            expect(resource.attributes).to.have.property('title', s.title);
            expect(resource.attributes).to.have.property('body', s.body);
            expect(resource.attributes).to.have.property('created_at', s.createdAt);
            expect(resource).to.have.property('relationships').that.is.an('object');
            expect(resource.relationships).to.have.all.keys('author', 'comments');
            expect(resource.relationships.author).to.be.an('object');
            expect(resource.relationships.author).to.have.all.keys('data', 'links');
            expect(resource.relationships.author.data).to.be.an('object');
            expect(resource.relationships.author.data).to.have.all.keys('type', 'id');
            expect(resource.relationships.author.data).to.have.property('type', 'user');
            expect(resource.relationships.author.data).to.have.property('id', s.author.id.toString());
            expect(resource.relationships.author.links).to.be.an('object');
            expect(resource.relationships.author.links).to.have.all.keys('self', 'related');
            expect(resource.relationships.author.links.self).to.match(/articles\/\d\/relationships\/author/);
            expect(resource.relationships.author.links.related).to.match(/articles\/\d\/author/);
            expect(resource.relationships.comments).to.be.an('object');
            expect(resource.relationships.comments).to.have.all.keys('links', 'data');
            expect(resource.relationships.comments.data).to.be.an('array').with.lengthOf(s.comments.length);
            resource.relationships.comments.data.forEach((comment: any, a: number) => {
                expect(comment).to.be.an('object').with.all.keys('type', 'id');
                expect(comment).to.have.property('type', 'comment');
                expect(comment).to.have.property('id', s.comments[a].id.toString());
            });
            expect(resource.relationships.comments.links).to.be.an('object');
            expect(resource.relationships.comments.links).to.have.all.keys('self', 'related');
            expect(resource.relationships.comments.links.self).to.match(/articles\/\d\/relationships\/comments/);
            expect(resource.relationships.comments.links.related).to.match(/articles\/\d\/comments/);
        });
    });

    it('should correctly transform a single denormalized article', function () {
        const source = articles
            .map((article) => {
                const populated = _.pick(article, 'id', 'body', 'createdAt', 'title') as any;
                populated.author = _.find(users, { id: article.author });
                populated.comments = _.filter(comments, { article: article.id }).map((comment) => ({
                    author: _.find(users, { id: comment.author }),
                    body: comment.body,
                    article: comment.article,
                    id: comment.id
                }));
                return populated;
            })
            .shift();
        const document = transformalizer.transform({ name: 'article', source });
        expect(document).to.be.an('object').with.all.keys('jsonapi', 'data', 'included');
        expect(document)
            .to.have.property('data')
            .that.is.an('object')
            .with.all.keys('type', 'id', 'attributes', 'relationships', 'links');
        const docData = document.data as ResourceObject;
        expect(docData).to.be.an('object').with.all.keys('type', 'id', 'attributes', 'relationships', 'links');
        expect(docData).to.have.property('type', 'article');
        expect(docData).to.have.property('id', source.id.toString());
        expect(docData).to.have.property('attributes').that.is.an('object');
        expect(docData.attributes).to.have.all.keys('title', 'body', 'created_at');
        expect(docData.attributes).to.have.property('title', source.title);
        expect(docData.attributes).to.have.property('body', source.body);
        expect(docData.attributes).to.have.property('created_at', source.createdAt);
        expect(docData).to.have.property('relationships').that.is.an('object');
        expect(docData.relationships).to.have.all.keys('author', 'comments');
        assertIsDefined(docData.relationships);
        expect(docData.relationships.author).to.be.an('object');
        expect(docData.relationships.author).to.have.all.keys('data', 'links');
        expect(docData.relationships.author.data).to.be.an('object');
        expect(docData.relationships.author.data).to.have.all.keys('type', 'id');
        expect(docData.relationships.author.data).to.have.property('type', 'user');
        expect(docData.relationships.author.data).to.have.property('id', source.author.id.toString());
        expect(docData.relationships.author.links).to.be.an('object');
        expect(docData.relationships.author.links).to.have.all.keys('self', 'related');
        assertIsDefined(docData.relationships.author.links);
        expect(docData.relationships.author.links.self).to.match(/articles\/\d\/relationships\/author/);
        expect(docData.relationships.author.links.related).to.match(/articles\/\d\/author/);
        expect(docData.relationships.comments).to.be.an('object');
        expect(docData.relationships.comments).to.have.all.keys('links', 'data');
        expect(docData.relationships.comments.data).to.be.an('array').with.lengthOf(source.comments.length);
        (docData.relationships.comments.data as ResourceIdentifier[]).forEach(
            (comment: ResourceIdentifier, a: number) => {
                expect(comment).to.be.an('object').with.all.keys('type', 'id');
                expect(comment).to.have.property('type', 'comment');
                expect(comment).to.have.property('id', source.comments[a].id.toString());
            }
        );
        expect(docData.relationships.comments.links).to.be.an('object');
        expect(docData.relationships.comments.links).to.have.all.keys('self', 'related');
        assertIsDefined(docData.relationships.comments.links);
        expect(docData.relationships.comments.links.self).to.match(/articles\/\d\/relationships\/comments/);
        expect(docData.relationships.comments.links.related).to.match(/articles\/\d\/comments/);
    });
});
