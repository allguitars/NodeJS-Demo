# Integration Testing

In real-world applicaiton, we need to work with one or more external resources, and that's where Integration Tests come into the picture.

To write integration tests, we need a real database. We (1) populate this database with data for testing. Now (2) we send an http request to an endpoint we want to (3) test and then make an assertion. That assertion may involve inspecting the result or the database.

For example, if this is an http post request you create a new genre, in an integration test, we're going to look at our database and verify that this new genre is there.

## Prepare for Integration Tests
- Add one more flag in _package.json_
```json
  "scripts": {
    "test": "jest --watchAll --verbose"
  },
```
The **verbose** flag helps you troubleshoot problems when something goes wrong. With this flag, **jest** will output extra information in the console and if something goes wrong you can use that information to troubleshoot the problem.

- Avoid using **winston-mongodb** while running the integration test (temporarily)

There is some conflict with winston-mongodb.

Comment out the winston-mongodb part in _logging.js_
```js
// require('winston-mongodb');

...

  // winston.add(winston.transports.MongoDB, {
  //   db: 'mongodb://localhost/vidly',
  //   level: 'info'
  // });

```

## Setting Up the Test Database

We don't want this database to be the same as our development or production database because in our integration tests, we're going to add or remove documents from this test database. We don't want to mess up the data that we do have in our development or production environment.

_config/default.json_

Add a new key "db"
```json
{
  "jwtPrivateKey": "",
  "db": "mongodb://localhost/vidly"
}
```

_conifg/test.json_

Also add another key but with  different value
```json
{
  "jwtPrivateKey": "1234",
  "db": "mongodb://localhost/vidly_tests"
}
```

_startup/db.js_

Use config module to get different values according to NODE_ENV
```js
// We'll dynamically read the connection string based on the environment in which the application

const winston = require('winston');
const mongoose = require('mongoose');
const config = require('config');

module.exports = function () {
  const db = config.get('db')
  mongoose
    .connect(db)
    // Change the connectioon info message to a template string so the DB name can be shown accordingly.
    .then(() => winston.info(`Connected to ${db}...`));
};
```
Now you can set the enviroment variables to make Node to connect to different databases.
```shell
➜  movie-project git:(master) 
node index.js
info: Listening on port 3000...
info: Connected to mongodb://localhost/vidly...

➜  movie-project git:(master) 
NODE_ENV=test node index.js
info: Listening on port 3000...
info: Connected to mongodb://localhost/vidly_tests...
```

## First Iplementation

To write integration tests for **Express** applications, we need to install a library called **supertest**, with which we can send http requests to our endpoint, just like how we manually test our application using **Postman**. Because this is only for testing, we're going to save this as only a **development dependency**.

```shell
$ npm i supertest --save-dev
```

_index.js_

Originally we didn't get the returend object from the listen method which returns a **Server** object. Now we save this Server object into the variable, _server_.

```js
...

const server = app.listen(port, () => winston.info(`Listening on port ${port}...`));

// Export this server from our module so we can test this server in our test file.
module.exports = server;
```
- Under _tests_ directory, create a new folder called _integration_.
- Inside the new folder, crate a new file called _genres.test.js_. We can write all the integration tests for the _genres_ endpoint in this file. 

There is a problem with loading the server. The first time we run this integration test, this server will listen on port 3000. Now if you make a change to our code, **jest** is going to re-run our tests. If we load our server again, we're going to get an exception because there is already a server running on port 3000. So, when writing integration tests, you should load the server before, and close it after each test.

So, in **jasmine** and **jest**, we have another utility function called **beforeEach()**. Just like the other utility functions, this function takes a callback so jest will call this function before each test inside of this test suite. Similarly, we have another utility function, **afterEach()**. Again, we pass a callback function and here we can call **server.close()** to shut down the server.

_genres.test.js_

```js
// Loading supertest moduile returns a function called request with which we can send a request to an endpoint
const request = require('supertest'); 
let server;

// Inside this test suite, we can have other test suites. We're going to group all the tests for sending GET, POST, PUT, and DELETE requests in different test suites.
describe('/api/genres', () => {
  // Load the index module and get the server object
  // Load the server object before each test suite is run
  beforeEach(() => { server = require('../../index'); });
  // Shut down the server after each test suite is finished
  afterEach(() => { server.close(); });

  // reuest(server).get() returns a Promise so we should await it, and the function that has "await" keyword inside should have "async" prefix.
  describe('GET /', () => {
    it('should return all genres', async () => {
      // We get a response object when we await get()
      const res = await request(server).get('/api/genres');
      expect(res.status).toBe(200);
    });
  });
});
```

However, this test is a little bit too generic. With this test we can't verify if we are actually getting the list of genres. We're going to prepopulate our test database and then modify this test to ensure the genres that we get from this endpoint are the genres that we have stored in the database.

## Populating the Test DB

To populate our database, we need our genre module. This module exports an object with two properties: one is the Genre class; the other is the validate function so we need to use object destructuring syntax to get Genre property.
```js
const { Genre } = require('../../models/genre');
```
With **insertMany** method, we can add multiple documents to MongoDB in one go. Note that here we will not use simple values like 'a' or 'b' because here we are testing the entire application stack. Our validation functions will kick in and complain because the name of the genre is less than three or five characters. Also, this method returns a Promise so we need to **await** it. 
```js
  Genre.collection.insertMany([
    { name: 'genre1' },
    { name: 'genre2' }
  ]);
```
Asserting that we have 2 items in this array. This is a little bit generic, because even if you return an array of numbers here, this test will pass. 
```js
expect(res.body.length).toBe(2);
```
If we come back here to the test file and make a simple change like adding a comment, save the changes and then back in the terminal you can see our test fail. Look at the error message.
```shell
    expect(received).toBe(expected) // Object.is equality

    Expected: 2
    Received: 4

      21 |       expect(res.status).toBe(200);
    > 22 |       expect(res.body.length).toBe(2);
```
We expected value to be 2, but received 4, which means we expected two genres but we have 4 genres. With this implementation every time this test is executed, we add two new genres to our database, so as a best practice, whenever we change the state of our database, we should clean up after.

So, after we do our assertions, this is where we call _Genre.remove({})_, passing in an empty object as a query object, and this will remove all documents in Genre collection. It returns a Promise so we need to await it
```js
await Genre.remove({});
```
However, there is a problem with this implementation. If one of the expectations fail, this code will never be executed so the proper place to do the cleanup is in _afterEach_ function. Also because we have await here, we need to mark this function as **async**.
```js
  afterEach(async () => {
    server.close();
    await Genre.remove({});
  });
```
This is what I want you to remember. You should write and execute each test as if it's the only test in the world, and there are no other tests. It should always be executed in a clean state, and if you modify the state, you should always clean up after. Otherwise our tests will not be **repeatable**.

N back in our test, let's add more this expectations and make it more specific. Instead of checking the number of items in the array, we want to make sure in that array we have, in the body of the response, we have a genre with the name "genre1".

**res.body** is an array. Arrays have this method **some()**, here we pass in a predicate or a function which checks for the existence of an object in this array. 
```js
expect(res.body.some(g => g.name === 'genre1')).toBeTruthy();
```
The whole _genres.test.js_ looks like:
```js
const request = require('supertest');
const { Genre } = require('../../models/genre');

let server;

describe('/api/genres', () => {
  beforeEach(() => { server = require('../../index'); });
  afterEach(async () => {
    server.close();
    await Genre.remove({});
  });

  describe('GET /', () => {
    it('should return all genres', async () => {
      Genre.collection.insertMany([
        { name: 'genre1' },
        { name: 'genre2' }
      ]);

      const res = await request(server).get('/api/genres');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body.some(g => g.name === 'genre1')).toBeTruthy();
      expect(res.body.some(g => g.name === 'genre2')).toBeTruthy();
    });
  });
});
```

Now. let's add all another integration test for the following endpoint:

_genres.js_
```js
router.get('/:id', async (req, res) => {
  const genre = await Genre.findById(req.params.id);

  if (!genre)
    return res.status(404).send('The genre with given id was not found!');

  res.send(genre);
});
```





_gernes.test.js_
```js
  describe('GET /:id', () => {
    it('should return a genre if valid id is passed', async () => {
      const genre = new Genre({ name: 'genre1' });
      await genre.save();

      const res = await request(server).get('/api/genres/' + genre._id);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject(genre);
    });
  });
```
If we run this test, it's going to fail. Let's see why.
```shell
    Expected value to match object:
      {"__v": 0, "_id": "5be7d2ef5ddbf148b5554a1e", "name": "genre1"}
    Received:
      {"__v": 0, "_id": "5be7d2ef5ddbf148b5554a1e", "name": "genre1"}
    Difference:
    Compared values serialize to the same structure.
    Printing internal object structure without calling `toJSON` instead.

    - Expected
    + Received

    - model {
    -   "$__": InternalCache {
    -     "$options": Object {},
    -     "_id": ObjectID {
    -       "_bsontype": "ObjectID",
    -       "id": Buffer [
    -         91,
    -         231,
    -         210,
    -         239,
    -         93,
    -         219,
    -         241,
    -         72,
    -         181,
    -         85,
    -         74,
    -         30,
    -       ],
    -     },
    -     "activePaths": StateMachine {
    -       "map": [Function anonymous],
    -       "paths": Object {
    -         "name": "require",
    -       },
    -       "stateNames": Array [
    -         "require",
    -         "modify",
    -         "init",
    -         "default",
    -         "ignore",
    -       ],
    -       "states": Object {
    -         "default": Object {},
    -         "ignore": Object {},
    -         "init": Object {},
    -         "modify": Object {},
    -         "require": Object {
    -           "name": true,
    -         },
    -       },
    -     },
    -     "adhocPaths": undefined,
    -     "emitter": EventEmitter {
    -       "_events": Object {},
    -       "_eventsCount": 0,
    -       "_maxListeners": 0,
    -       "domain": null,
    -     },
    -     "fullPath": undefined,
    -     "getters": Object {},
    -     "inserting": true,
    -     "ownerDocument": undefined,
    -     "pathsToScopes": Object {},
    -     "populate": undefined,
    -     "populated": undefined,
    -     "removing": undefined,
    -     "saveError": undefined,
    -     "scope": undefined,
    -     "selected": undefined,
    -     "session": null,
    -     "shardval": undefined,
    -     "strictMode": true,
    -     "validationError": undefined,
    -     "version": undefined,
    -     "wasPopulated": false,
    -   },
    -   "_doc": Object {
    + Object {
        "__v": 0,
    -     "_id": ObjectID {
    -       "_bsontype": "ObjectID",
    -       "id": Buffer [
    -         91,
    -         231,
    -         210,
    -         239,
    -         93,
    -         219,
    -         241,
    -         72,
    -         181,
    -         85,
    -         74,
    -         30,
    -       ],
    -     },
    +   "_id": "5be7d2ef5ddbf148b5554a1e",
        "name": "genre1",
    -   },
    -   "errors": undefined,
    -   "isNew": false,
      }

      34 |       const res = await request(server).get('/api/genres/' + genre._id);
      35 |       expect(res.status).toBe(200);
    > 36 |       expect(res.body).toMatchObject(genre);
         |                        ^
      37 |     });
      38 |   });
      39 | });
```


Here is the reason. We expected _\_id_ to be an **object id**, but we receive a **string**. This is one of the issues we have when writing integration tests for mongoose models. When we store this genre in the database, mongoose assigns the id property, and sets it to an object id, but when you read this object from the database the id will be a string. 

So, we can rewrite this last expectation to something like this. 
```js
  expect(res.body).toHaveProperty('name', genre.name);
```

The _gernes.test.js_ so far:
```js
const request = require('supertest');
const { Genre } = require('../../models/genre');

let server;

describe('/api/genres', () => {
  beforeEach(() => { server = require('../../index'); });
  afterEach(async () => {
    server.close();
    await Genre.remove({});
  });

  describe('GET /', () => {
    it('should return all genres', async () => {
      Genre.collection.insertMany([
        { name: 'genre1' },
        { name: 'genre2' }
      ]);

      const res = await request(server).get('/api/genres');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body.some(g => g.name === 'genre1')).toBeTruthy();
      expect(res.body.some(g => g.name === 'genre2')).toBeTruthy();
    });
  });

  describe('GET /:id', () => {
    it('should return a genre if valid id is passed', async () => {
      const genre = new Genre({ name: 'genre1' });
      await genre.save();

      const res = await request(server).get('/api/genres/' + genre._id);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('name', genre.name);
    });
  });
});
```









