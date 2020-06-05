/* eslint no-console: off */
import * as _ from 'lodash';
import createTransformalizer from '../lib/transformalizer';

// create a new transformalizer
const transformalizer = createTransformalizer({ url: 'https://api.example.com' });

// register a schema
transformalizer.register({
    name: 'article',
    schema: {
        links({ source, options }) {
            if (Array.isArray(source)) {
                return { self: `${options.url}/articles` };
            }
            return undefined;
        },
        meta({ source }) {
            if (Array.isArray(source)) {
                return { count: source.length };
            }
            return undefined;
        },
        data: {
            type() {
                return 'article';
            },
            id({ data }) {
                return data.id.toString();
            },
            attributes({ data }) {
                return _(data)
                    .pick('title', 'body', 'createdAt')
                    .mapKeys((v, k) => _.snakeCase(k));
            },
            relationships: {
                author({ data, options, id }) {
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
                comments({ data, options, id }) {
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
            links({ options, id }) {
                return { self: `${options.url}/articles/${id}` };
            }
        }
    }
});

// register related schemas
transformalizer.register({
    name: 'user',
    schema: {
        links({ source, options }) {
            if (Array.isArray(source)) {
                return { self: `${options.url}/users` };
            }
            return undefined;
        },
        meta({ source }) {
            if (Array.isArray(source)) {
                return { count: source.length };
            }
            return undefined;
        },
        data: {
            type() {
                return 'user';
            },
            id({ data }) {
                return data.id.toString();
            },
            attributes({ data }) {
                return _(data)
                    .pick('firstName', 'lastName', 'email')
                    .mapKeys((v, k) => _.snakeCase(k));
            },
            relationships: {
                articles({ data, options, id }) {
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
                comments({ data, options, id }) {
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
            links({ options, id }) {
                return { self: `${options.url}/users/${id}` };
            }
        }
    }
});

transformalizer.register({
    name: 'comment',
    schema: {
        data: {
            type() {
                return 'comment';
            },
            id({ data }) {
                return data.id.toString();
            },
            attributes({ data }) {
                return _.pick(data, 'body');
            },
            relationships: {
                article({ data, options, id }) {
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
                author({ data, options, id }) {
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
            links({ options, id }) {
                return { self: `${options.url}/comments/${id}` };
            }
        }
    }
});

interface Article {
    id: number;
    title: string;
    body: string;
    createdAt: Date;
    author: number | User;
    comments?: Comment[];
}

const articles: Article[] = [
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

interface User {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
}

const users: User[] = [
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

interface Comment {
    id: number;
    body: string;
    author: number | User;
    article: number;
}

const comments: Comment[] = [
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
let source: Article[] | Article = articles;
console.log(JSON.stringify(source));
console.log();

let document = transformalizer.transform({ name: 'article', source });
console.log(JSON.stringify(document));
console.log();

// build a compound document of denormalized/hydrated articles
source = articles.map((article) => {
    const populated = _.pick(article, 'id', 'body', 'createdAt') as Article;
    populated.author = _.find(users, { id: article.author }) as User;
    populated.comments = _.filter(comments, { article: article.id }).map((comment) => ({
        author: _.find(users, { id: comment.author }) as User,
        body: comment.body,
        article: comment.article,
        id: comment.id
    }));
    return populated;
});
console.log(JSON.stringify(source));
console.log();

document = transformalizer.transform({ name: 'article', source });
console.log(JSON.stringify(document));
console.log();

// build a compound document using a single article
source = source[0];
console.log(JSON.stringify(source));
console.log();

document = transformalizer.transform({ name: 'article', source });
console.log(JSON.stringify(document));
console.log();
