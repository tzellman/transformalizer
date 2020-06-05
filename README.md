# transformalizer

a bare bones node module for transforming raw data into JSON API v1.0 compliant payloads.

this module:

-   makes no assumption regarding the shape of your data or the datastores/sdks used.
-   supports the full JSON API v1.0 specification
-   supports dynamic transformations, links, and meta at all levels of a document

## Installing

```shell
$ npm install --save transformalizer
```

## Getting Started

Create a new transformalizer and register schemas

```typescript
import createTransformalizer from "transformalizer";

// create a new transformalizer
const transformalizer = createTransformalizer();

// register a schema
transformalizer.register({
    name: "article",
    schema: {
        /* see below for schema details and examples */
    },
});

// transform raw data into a valid JSON API v1.0 document
const document = transformalizer.transform({ name: "article", source });
console.log(JSON.stringify(document));
```

## Examples

See examples in the examples folder of this repository.

-   [basic](/examples/basic.ts)

## API

### createTransformalizer([options]) => transformalizer

Create a new transformalizer object

###### Parameters

| Name         | Type   | Description                               |
| ------------ | ------ | ----------------------------------------- |
| [options={}] | Object | global options shared between all schemas |

###### Examples

```javascript
const createTransformalizer = require("transformalizer");

const transformalizer = createTransformalizer();
```

---

### transformalizer.register(params)

Register a new document schema.

###### Parameters

| Name          | Type   | Description                                               |
| ------------- | ------ | --------------------------------------------------------- |
| params        | Object |                                                           |
| params.name   | String | schema name                                               |
| params.schema | Object | mappings for type, see [Schema](#schema) for more details |

###### Examples

```javascript
transformalizer.register({
    name: "blog-post",
    schema: {
        // ..
    },
});
```

---

### transformalizer.transform(params) => Object

Build a json api document using the schema with specified name and with the given source data.

###### Parameters

| Name                | Type   | Description                                                                                      |
| ------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| params              | Object |                                                                                                  |
| params.name         | String | the name of the schema to use                                                                    |
| params.source       | Object | Object[]                                                                                         | source data |
| [params.options={}] | Object | additional data to be passed to transform functions, this will be merged with the global options |

###### Examples

```javascript
const blogPost = { title: "Hello, World!", body: "To be continued...", createdAt: new Date() };
const document = transformalizer.transform({ name: "blog-post", source: blogPost });
```

---

### transformalizer.untransform(params) => Object

Reconstruct data objects from a json api document.

###### Parameters

| Name              | Type   | Description                                                                                        |
| ----------------- | ------ | -------------------------------------------------------------------------------------------------- |
| params            | Object |                                                                                                    |
| params.document   | Object | json api document                                                                                  |
| params.options={} | Object | additional data to be passed to untransform functions, this will be merged with the global options |

###### Examples

```javascript
const payload = {
    data: {
        id: "1",
        type: "blog-post",
        attributes: { title: "Hello, World!", body: "To be continued...", createdAt: "2017-09-19T13:10:00" },
    },
};
const data = transformalizer.untransform({ document: payload });
```

## Options

Global options are passed in when creating a new transformalizer object. Options can also be passed in when transforming source objects to the json-api format or untransforming a json-api document back to data objects.

###### Options for Untransforming Json-Api Documents

| Name                       | Type    | Description                                                                                                                                                                                                          |
| -------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| untransformIncluded        | Boolean | A value indicating whether included resources are untransformed back to data objects                                                                                                                                 |
| nestIncluded               | Boolean | A value indicating whether the full object hierarchy is recreated using the included data objects. **Caveat:** This can lead to circular references.                                                                 |
| removeCircularDependencies | Boolean | A value indicating whether circular dependencies in the full object hierarchy should be removed. **Caveat:** This may lead to an unexpected object hierarchy depending on how the data relationships are structured. |

## Schema

A schema object defines a set of functions used to transform your raw data into a valid JSON API document. It has the following basic structure (that closely resembles a json api document), which is described in more detail below

```javascript
{
  links({ source, options, data, included }) {
    return { /* top level links */ };
  },
  meta({ source, options, data, included }) {
    return { /* top level meta */ };
  },
  data: {
    dataSchema({ source, options, data }) {
      return 'other-schema-name';
    },
    untransformDataSchema({ type, resource, document, options }) {
      return 'my-type';
    },
    type({ source, options, data, state }) {
      return 'my-type';
    },
    id({ source, options, data, type, state }) {
      return data.id.toString();
    },
    untransformId({ id, type, options }) {
      return parseInt(id, 10);
    },
    attributes({ source, options, data, type, id, state }) {
      return { /* resource attributes */ }
    },
    untransformAttributes({ id, type, attributes, resource, options }) {
      return { /* resource attributes */ }
    },
    relationships: {
      // ..
      [key]({ source, options, data, type, id, attributes, state }) {
        return {
          data: {
            name: 'related-schema',
            data: { /* relationship data to be passed to other schema */ },
            included: true,
          },
          links: { /* relationship links if available */ },
          meta: { /* relationship meta if available */ }
        }
      },
      // ..
    },
    links({ source, options, data, type, id, attributes, relationships, state }) {
      return { /* resource links if available */ }
    },
    meta({ source, options, data, type, id, attributes, relationships, state }) {
      return { /* resource meta if available */ }
    }
  }
}
```

### links(params) => Object <small>optional</small>

A function that should return the top level links object.

###### Parameters

| Name            | Type            | Description                                                                          |
| --------------- | --------------- | ------------------------------------------------------------------------------------ |
| params          | Object          |                                                                                      |
| params.source   | Object[],Object | the source data passed to the #transform function                                    |
| params.options  | Object          | any options passed to the #transform function, merged with the global options object |
| params.data     | Object          | the json api document data after transform                                           |
| params.included | Object[]        | the json api document included data after transform                                  |

---

### meta(params) => Object <small>optional</small>

A function that should return the top level meta object.

###### Parameters

| Name            | Type            | Description                                                                          |
| --------------- | --------------- | ------------------------------------------------------------------------------------ |
| params          | Object          |                                                                                      |
| params.source   | Object[],Object | the source data passed to the #transform function                                    |
| params.options  | Object          | any options passed to the #transform function, merged with the global options object |
| params.data     | Object          | the json api document data after transform                                           |
| params.included | Object[]        | the json api document included data after transform                                  |

---

### data.type(params) => String <small>optional</small>

A function that should return the type of the resource being processed. If this is not provided, the name of the schema will be used as the resource type.

###### Parameters

| Name           | Type            | Description                                                                                                                                        |
| -------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| params         | Object          |                                                                                                                                                    |
| params.source  | Object[],Object | the source data passed to the #transform function                                                                                                  |
| params.options | Object          | any options passed to the #transform function                                                                                                      |
| params.data    | Object          | the current item being processed when source is an array, or the source itself if not an array                                                     |
| params.state   | Object          | the recommended namespace for passing information between data level methods, useful for storing calculated data that is needed in multiple places |

---

### data.id(params) => String <small>optional</small>

A function that should return the id of the data object being processed. If this is not provided, it is assumed that the "id" of the resource is simply the "id" property of the source object.

###### Parameters

| Name           | Type            | Description                                                                                                                                        |
| -------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| params         | Object          |                                                                                                                                                    |
| params.source  | Object[],Object | the source data passed to the #transform function                                                                                                  |
| params.options | Object          | any options passed to the #transform function                                                                                                      |
| params.data    | Object          | the current item being processed when source is an array, or the source itself if not an array                                                     |
| params.type    | String          | the resource type determined in the `data.type` step                                                                                               |
| params.state   | Object          | the recommended namespace for passing information between data level methods, useful for storing calculated data that is needed in multiple places |

---

### data.untransformId(params) => Object <small>optional</small>

A function that should return the id of the resource being processed. If this is not provided, it is assumed that the "id" of the data object is simply the "id" property of the resource.

###### Parameters

| Name           | Type   | Description                                     |
| -------------- | ------ | ----------------------------------------------- |
| params         | Object |                                                 |
| params.id      | String | the resource id                                 |
| params.type    | String | the resource type                               |
| params.options | Object | any options passed to the #untransform function |

---

### data.attributes(params) => Object <small>optional</small>

A function that should return the attributes portion of the resource being processed. If a null or undefined value is returned, no attributes will be included on the resource.

###### Parameters

| Name           | Type            | Description                                                                                                                                        |
| -------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| params         | Object          |                                                                                                                                                    |
| params.source  | Object[],Object | the source data passed to the #transform function                                                                                                  |
| params.options | Object          | any options passed to the #transform function                                                                                                      |
| params.data    | Object          | the current item being processed when source is an array, or the source itself if not an array                                                     |
| params.type    | String          | the resource type determined in the `data.type` step                                                                                               |
| params.id      | String          | the id of the current resource, determined in the `data.id` step                                                                                   |
| params.state   | Object          | the recommended namespace for passing information between data level methods, useful for storing calculated data that is needed in multiple places |

---

### data.untransformAttributes(params) => Object <small>optional</small>

A function that should return the attributes portion of the data object being processed. If this is not provided, it is assumed that the attributes of the data object are simply the "attributes" property of the resource.

###### Parameters

| Name              | Type   | Description                                                                    |
| ----------------- | ------ | ------------------------------------------------------------------------------ |
| params            | Object |                                                                                |
| params.id         | Object | the id of the current data object, determined in the `data.untransformId` step |
| params.type       | String | the resource type                                                              |
| params.attributes | Object | the json-api resource object attributes                                        |
| params.resource   | Object | the full json-api resource object                                              |
| params.options    | Object | any options passed to the #untransform function                                |

---

### data.relationships._key_(params) => Object <small>optional</small>

A map of relationship keys to functions that should return a valid [relationship object](http://jsonapi.org/format/#document-resource-object-relationships) with one caveat outlined below. If a null or undefined value is returned, that relationship will be excluded from the relationships object.

**Caveat:** The data property of the relationship object should either be a single object or an array of objects in the form shown below

```javascript
{
  name: 'schemaName', // the name of the related schema to use to transform the related item
  data: { /* the "data" param to be passed to the related schema's functions */ },
  included: true, // optional, required if the related item should be included
  meta: { /* a meta object to be included on the resource identifier object */ }
}
```

###### Parameters

| Name              | Type            | Description                                                                                                                                        |
| ----------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| params            | Object          |                                                                                                                                                    |
| params.source     | Object[],Object | the source data passed to the #transform function                                                                                                  |
| params.options    | Object          | any options passed to the #transform function                                                                                                      |
| params.data       | Object          | the current item being processed when source is an array, or the source itself if not an array                                                     |
| params.type       | String          | the resource type determined in the `data.type` step                                                                                               |
| params.id         | String          | the id of the current resource, determined in the `data.id` step                                                                                   |
| params.attributes | Object          | the attributes object of the current resource, determined in the `data.attributes` step                                                            |
| params.state      | Object          | the recommended namespace for passing information between data level methods, useful for storing calculated data that is needed in multiple places |

---

### data.links(params) => Object <small>optional</small>

A function that should return the links object for the current resource. If a null or undefined value is returned, no links will be included on the resource.

###### Parameters

| Name                 | Type            | Description                                                                                                                                        |
| -------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| params               | Object          |                                                                                                                                                    |
| params.source        | Object[],Object | the source data passed to the #transform function                                                                                                  |
| params.options       | Object          | any options passed to the #transform function                                                                                                      |
| params.data          | Object          | the current item being processed when source is an array, or the source itself if not an array                                                     |
| params.type          | String          | the resource type determined in the `data.type` step                                                                                               |
| params.id            | String          | the id of the current resource, determined in the `data.id` step                                                                                   |
| params.attributes    | Object          | the attributes object of the current resource, determined in the `data.attributes` step                                                            |
| params.relationships | Object          | the relationships object of the current resource, determined in the `data.relationships` step                                                      |
| params.state         | Object          | the recommended namespace for passing information between data level methods, useful for storing calculated data that is needed in multiple places |

---

### data.meta(params) => Object <small>optional</small>

A function that should return the meta object for the current resource. If a null or undefined value is returned, no attributes will be included on the resource.

###### Parameters

| Name                 | Type            | Description                                                                                                                                        |
| -------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| params               | Object          |                                                                                                                                                    |
| params.source        | Object[],Object | the source data passed to the #transform function                                                                                                  |
| params.options       | Object          | any options passed to the #transform function                                                                                                      |
| params.data          | Object          | the current item being processed when source is an array, or the source itself if not an array                                                     |
| params.type          | String          | the resource type determined in the `data.type` step                                                                                               |
| params.id            | String          | the id of the current resource, determined in the `data.id` step                                                                                   |
| params.attributes    | Object          | the attributes object of the current resource, determined in the `data.attributes` step                                                            |
| params.relationships | Object          | the relationships object of the current resource, determined in the `data.relationships` step                                                      |
| params.links         | Object          | the links object of the current resource, determined in the `data.links` step                                                                      |
| params.state         | Object          | the recommended namespace for passing information between data level methods, useful for storing calculated data that is needed in multiple places |

---

### data.dataSchema(params) => String <small>optional</small>

A function that should return the name of a schema to use to transform the current source object. Useful for building documents who's primary data is a collection of multiple types.

###### Parameters

| Name           | Type            | Description                                                                                    |
| -------------- | --------------- | ---------------------------------------------------------------------------------------------- |
| params         | Object          |                                                                                                |
| params.source  | Object[],Object | the source data passed to the #transform function                                              |
| params.options | Object          | any options passed to the #transform function                                                  |
| params.data    | Object          | the current item being processed when source is an array, or the source itself if not an array |

---

### data.untransformDataSchema(params) => String <small>optional</small>

A function that should return the name of a schema to use to untransform the current resource.

###### Parameters

| Name            | Type   | Description                                     |
| --------------- | ------ | ----------------------------------------------- |
| params          | Object |                                                 |
| params.type     | String | the resource type                               |
| params.resource | Object | the full json-api resource object               |
| params.document | Object | the full json-api document                      |
| params.options  | Object | any options passed to the #untransform function |

## Test

Run the test suite

```shell
$ npm test
```

Run coverage

```shell
$ npm run coverage
```

## Contributing

1. [Fork it](https://github.com/GaiamTV/transformalizer/fork)
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create new Pull Request

## License

Copyright (c) 2017 Gaia.
Licensed under the [MIT license](LICENSE.md).
