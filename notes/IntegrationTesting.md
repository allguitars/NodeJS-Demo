# Integration Testing

## Content
- [Inroduction](#Introduction)
- [Prepare for Integration Tests](#Prepare-for-Integration-Tests)
- [Setting Up the Test Database](#Setting-Up-the-Test-Database)
- [First Implementation](#First-Implementation)
- [Populating the Test DB](#Populating-the-Test-DB)
  - [Make the Test Repeatable](#Make-the-Test-Repeatable)
  - [Endpoint with a Parameter](#Endpoint-with-a-Parameter)
  - [Object ID Problem](#Object-ID-Problem)
  - [Deal with the Second Path](#Deal-with-the-Second-Path)
  - [Middleware Problem](#Middleware-Problem)
  - [Fix the Middleware Problem](#Fix-the-Middleware-Problem)
- [Create a Middleware Function to Catch the Invalid ID](#Create-a-Middleware-Function-to-Catch-the-Invalid-ID)
- [Testing the Authorization](#Testing-the-Authorization)
- [Testing Invalid Inputs](#Testing-Invalid-Inputs)
- [Testing the Happy Paths](#Testing-the-Happy-Paths)
- [Writing Clean Tests](#Writing-Clean-Tests)
  - [Examine the Happy Paths](#Examine-the-Happy-Paths)
  - [Extract the Repetitive Code in the Happy Paths](#Extract-the-Repetitive-Code-in-the-Happy-Paths)
  - [Deal with Happy Path One](#Deal-with-Happy-Path-One)
  - [Deal with the Path Where the User Is Not Logged In](#Deal-with-the-Path-Where-the-User-Is-Not-Logged-In)
  - [Deal with the Other Test Cases](#Deal-with-the-Other-Test-Cases)
  - [Align Clearly with the Description of the Test](#Align-Clearly-with-the-Description-of-the-Test)
  - [Modify the Rest of the Happy Paths](#Modify-the-Rest-of-the-Happy-Paths)
- [Testing the Auth Middleware](#Testing-the-Auth-Middleware)
  - [Token-Empty String V.S. Null](#Token-Empty-String-V.S.-Null)
  - [Unit Testing the Auth Middleware](#Unit-Testing-the-Auth-Middleware)
  - [Mock the header() Method](#Mock-the-header()-Method)
  - [Mock the _next()_ Function and _res_ Object](#Mock-the-_next()_-Function-and-_res_-Object)
- [Code Coverage](#Code-Coverage)

## Introduction

In real-world applicaiton, we need to work with one or more external resources, and that's where Integration Tests come into the picture.

To write integration tests, we need a real database. We (1) populate this database with data for testing. Now (2) we send an http request to an endpoint we want to (3) test and then make an assertion. That assertion may involve inspecting the result or the database.

For example, if there is an http post request to create a new genre, in an integration test, we're going to look at our database and verify that this new genre is there in the database.

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

## First Implementation

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

### Make the Test Repeatable

So, after we do our assertions, this is where we call _Genre.remove({})_, passing in an empty object as a query object, and this will remove all documents in Genre collection. It returns a Promise so we need to await it
```js
await Genre.remove({});
```
However, there is a problem with this implementation. If one of the expectations fail, this code will never be executed so the proper place to do the cleanup is in _afterEach_ function. Also because we have await here, we need to mark this function as **async**.
```js
  afterEach(async () => {
    await server.close();
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
    await server.close();
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
### Endpoint with a Parameter

Now. let's add another integration test for the following endpoint:

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

### Object ID Problem

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

So, we can rewrite this last expectation to something like this:
```js
  expect(res.body).toHaveProperty('name', genre.name);
```

The _genres.test.js_ so far:
```js
const request = require('supertest');
const { Genre } = require('../../models/genre');

let server;

describe('/api/genres', () => {
  beforeEach(() => { server = require('../../index'); });
  afterEach(async () => {
    await server.close();
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

### Deal with the Second Path

Now let's deal with the second path of the same endpoint, which is when an invalid ID is passed.

In this test we don't really need to add a genre in the database, we can start with an empty collection because when we pass an invalid genre id, it doesn't really matter if you have no genres or 50 genres in the database.

Let's delete the following two lines for two reasons:
One to make this test faster, and also, to make it cleaner and more maintainable.
```js
// deleted
  const genre = new Genre({ name: 'genre1' });
  await genre.save();
```
Instead of genre._id, we're going to pass 1 as an invalid genre id,and then we expect the status to be 404. we could also check the message in the body of the response, but it doesn't really matter as much. Let's just focus on 404.
```js
  it('should return 404 if invalid id is passed', async () => {
    const res = await request(server).get('/api/genres/1');
    expect(res.status).toBe(404);
  });
```

### Middleware Problem

We expected 404 but we got a 500 or internal server error. 
Result:
```shell
    Expected: 404
    Received: 500

      39 |     it('should return 404 if invalid id is passed', async () => {
      40 |       const res = await request(server).get('/api/genres/1');
    > 41 |       expect(res.status).toBe(404);
         |                          ^
      42 |     });
      43 |   });
      44 | });
```

What's going on here? Well, let's scroll up, here we have an error that is coming from winston.

```shell
error: Cast to ObjectId failed for value "1" at path "_id" for model "Genre" CastError: Cast to ObjectId failed for value "1" at path "_id" for model "Genre"
```

Earlier we defined the following error middleware function, and inside this function, first we log the error using **winston** and then return the 500 error to the client. So this error that we have here is coming from winston.

_errer.js_
```js
module.exports = function(err, req, res, next) {
  winston.error(err.message, err);

  res.status(500).send('Something failed.');
};
```

We have seen this issue before. Earlier we fixed this problem if we had the id in the body of the request so we installed a **joi** plugin for validating object id's, but that approach doesn't work if id is a route parameter. 

### Fix the Middleware Problem

So back in our route handler in _genres.js_, before calling _Genre.findById()_ we have to make sure that request.params.id is a valid object id; otherwise this route handler does not respond with 404.
```js
router.get('/:id', async (req, res) => {
  // -------------------- added ------------------------
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(404).send('Invalid ID');
  // ---------------------------------------------------
  
  const genre = await Genre.findById(req.params.id);

  if (!genre)
    return res.status(404).send('The genre with given id was not found!');

  res.send(genre);
});
```
Now all tests can pass. Beautiful!

However, throughout the application, we have quite a few endpoints to get a single resource, and we have to repeat this logic in all those endpoints.
```js
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(404).send('Invalid ID');
```
So, next we're going to refactor this code and move this logic into a middleware function.

## Create a Middleware Function to Catch the Invalid ID

Now, we want to move this logic into a middleware function so we can reuse it in multiple places.

Under _middleware_ folder, create a new file _validateObjectId.js_

```js
const mongoose = require('mongoose');

// Inside this function. So, if this parameter is not a valid object id we're going to return the 404 error; otherwise, we'll pass control to the next middleware function, which is in this case our route handler.
module.exports = function (req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(404).send('Invalid ID');

  // If the id is valid, pass to the next middleware, the route handler
  next();
}

```

In _genres.js_, we need to import this new middleware function.
```js
const validateObjectId = require('../middleware/validateObjectId');

...

// Apply this middleware function into the route hadler
router.get('/:id', validateObjectId, async (req, res) => {
  const genre = await Genre.findById(req.params.id);

  if (!genre)
    return res.status(404).send('The genre with given id was not found!');

  res.send(genre);
});

```

So, with automated tests, we can **refactor our code with confidence.**

## Testing the Authorization

Ｗe're going to test the route handler for creating a new genre. So how many tests do we need here?

**The number of tests should be greater than or equal to the number of execution paths.**

So here we have one execution path: if the genre is invalid, we're going to return a 400 error:
```js
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);
```

And here's the other execution path:
```js
  const genre = new Genre({ name: req.body.name });
  await genre.save();
  
  res.send(genre);

```
However for this execution path we need two tests:
- first we want to make sure that this genre is saved in the database so we're going to query the database and ensure that the genre that we sent is in there.
- In the other test, we want to make sure that genre is in the body of the **response**.

Also, note that here we have the authorization middleware:
```js
router.post('/', auth, async (req, res) => {
  ...
});
```
So, we need another test to make sure if the user is not logged in, we're going to return a 401 error which means **unauthorized**.

Now, let's add another test suite in _genres.test.js_
```js
  describe('POST /', () => {
    it('should return 401 if the client is not logged in', async () => {
      const res = await request(server)
        .post('/api/genres')
        .send({ name: 'genre1' });

      expect(res.status).toBe(401);
    });
  });
```

## Testing Invalid Inputs

Now let's assume the user or the client is logged in, but is sending an invalid genre so this time, we should return 400, which means bad request, if genre is invalid. But what makes genre invalid? -> we want to make sure that it's at least 5 characters. 

To implement this test, first we need to log in so we need to generate an **authentication token** and then we need to include that token in the header of the request.

_genres.test.js_
```js
// On the top, first we need to import our user model because earlier, we added a method to this class to generate an authentication token.
const { User } = require('../../models/user'); // Import User class from the user module

...

  describe('POST /', () => {

    ...

    it('should return 400 if genre is less than 5 characters.', async () => {
      // Before sending the request, we're going to create a token
      const token = User().generateAuthToken();

      const res = await request(server)
        .post('/api/genres')
        // The Name of the header is x-auth-token. This is the key that our authorization middleware looks for.
        .set('x-auth-token', token)
        .send({ name: '1234' }); // less than 5 chars

      expect(res.status).toBe(400);
    });
  });

```

Now by the same token, we should not be able to send a genre that is more than 50 characters. So, let's write another test for that. We can hard code a long string here, but that's ugly. Let me show you how to dynamically generate a long string. 

In the terminal window, let's just run **node**. Here we can execute JavaScript code. I'm going to new up an array of 5 elements and then join these elements using 'a'.

```shell
> new Array(5).join('a')
'aaaa'
>
```
We get 4 a's. Because we have 5 elements in this array, we'll put 'a' in between each element, and that's why we get 4 a's. The length of the string we have here equals the number of elements in the array minus 1. In other words, if we want a string that is, let's say, 51 characters, we should have an array of 52 elements because our separater will be between these elements.

```js
  describe('POST /', () => {

    ...

    it('should return 400 if genre is more than 50 characters.', async () => {
      const token = User().generateAuthToken();

      const longName = new Array(52).join('a'); // 51 a's

      const res = await request(server)
        .post('/api/genres')
        .set('x-auth-token', token)
        .send({ name: longName });

      expect(res.status).toBe(400);
    });
  });
```

Execute it, then we have the following error:

```shell
error: Genre validation failed: name: Path `name` (`aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`) is longer than the maximum allowed length (50). ValidationError: name: Path `name` (`aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`) is longer than the maximum allowed length (50).
    at new ValidationError (/Users/yihsiulee/GoogleDrive/ExerciseFiles/NodeJS/Udemy/Node-js-The-Complete-Guide-to-Build-RESTful-APIs/movie-project/node_modules/mongoose/lib/error/validation.js:27:11)
    at model.Object.<anonymous>.Document.invalidate (/Users/yihsiulee/GoogleDrive/ExerciseFiles/NodeJS/Udemy/Node-js-The-Complete-Guide-to-Build-RESTful-APIs/movie-project/node_modules/mongoose/lib/document.js:1832:32)
    at p.doValidate.skipSchemaValidators (/Users/yihsiulee/GoogleDrive/ExerciseFiles/NodeJS/Udemy/No FAIL  tests/integration/genres.test.jsul-APIs/movie-project/node_modules/mongoose/lib/document.js:1  /api/genres
    GET /
      ✓ should return all genres (604ms)
    GET /:id
      ✓ should return a genre if valid id is passed (17ms)
      ✓ should return 404 if invalid id is passed (4ms)
    POST /
      ✓ should return 401 if the client is not logged in (22ms)
      ✓ should return 400 if genre is less than 5 characters. (12ms)
      ✕ should return 400 if genre is more than 50 characters. (12ms)

  ● /api/genres › POST / › should return 400 if genre is more than 50 characters.

    expect(received).toBe(expected) // Object.is equality

    Expected: 400
    Received: 500

      74 |         .send({ name: longName });
      75 |
    > 76 |       expect(res.status).toBe(400);
         |                          ^
      77 |     });
      78 |   });
      79 | });
```

We expect the 400, but we got 500. You scroll up and you can see we get this error is coming from **mongoose**, validation error failed so we didn't implement our _joi_ validation function properly.

Back in _genre.js_, We added minimum characters, but we forgot maximum characters. 
```js
function validateGenre(body) {
    const schema = {
        name: Joi.string().min(5).max(50).required(), // adding max(50)
    };
    return Joi.validate(body, schema);
}

```

Back in the terminal, all tests are passing.

## Testing the Happy Paths

So now we know, for the following execution path, you had to write two tests because there are various possibilities that the input can be invalid. That's why we discussed earlier that the number of tests for a function is greater than or equal to the number of execution paths.

_genres.js_
```js
router.post('/', auth, async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  ...
});
```

Now, let's work on the happy path.

_genres.js_
```js
router.post('/', auth, async (req, res) => {

  ...

  // Happy paths
  const genre = new Genre({ name: req.body.name });
  await genre.save();
  res.send(genre);
});
```

First, we want to test that this genre is saved in the database.

_genres.test.js_
```js
  describe('POST /', () => {
 
    ...

    it('should save the genre if it is valid', async () => {
      const token = User().generateAuthToken();

      const res = await request(server)
        .post('/api/genres')
        .set('x-auth-token', token)
        .send({ name: 'genre1' });

      // Use our genre model to query the database
      const genre = await Genre.find({ name: 'genre1' });
      expect(genre).not.toBeNull(); // Matcher function
    });
  });
  
```

Now the last test! We want to make sure that this genre is in the body of the response. In this test, we don't need to query the database. We simply look at response.body. We want to make sure that here we have an _\_id_ property,

_genres.test.js_
```js
  describe('POST /', () => {
 
    ...

    it('should return the genre if it is valid', async () => {
      const token = User().generateAuthToken();

      const res = await request(server)
        .post('/api/genres')
        .set('x-auth-token', token)
        .send({ name: 'genre1' });

      expect(res.body).toHaveProperty('_id'); // Don't care the value.
      expect(res.body).toHaveProperty('name', 'genre1');
    });
  });
  
```

## Writing Clean Tests

In all these tests, we have a fair amount of duplication. Except the first one in every test, we're generating an authentication token. Also, the request that we are sending to the server looks very repetitive in each test. There is only a small variation. For example, we may want to set the name to a short string, or to a long string, or we want to remove the authorization token, but the rest of the body of this request, the general template, the general structure remains the same.

To make all these tests clean, **We define the happy path, and then in each test, we change one parameter that clearly aligns with the name of the test.**

### Examine the Happy Paths

Let's look at the happy paths:
```js
  describe('POST /', () => {
 
    ...

    // Happy path 1
    it('should save the genre if it is valid', async () => {
      // repetitive
      const token = User().generateAuthToken();

      // repetitive
      const res = await request(server)
        .post('/api/genres')
        .set('x-auth-token', token)
        .send({ name: 'genre1' });

      const genre = await Genre.find({ name: 'genre1' });
      expect(genre).not.toBeNull(); // Matcher function
    });

    // Happy path 2
    it('should return the genre if it is valid', async () => {
      // repetitive
      const token = User().generateAuthToken();

      // repetitive
      const res = await request(server)
        .post('/api/genres')
        .set('x-auth-token', token)
        .send({ name: 'genre1' });

      expect(res.body).toHaveProperty('_id'); // Don't care the value.
      expect(res.body).toHaveProperty('name', 'genre1');
    });
  });

...

```

### Extract the Repetitive Code in the Happy Paths

So, on top of this testcsuite, we are going to define a function. Let's call this _exec_., meaning we are executing this request. This function includes the repetitive request code.

Here we want to return the response so let's return it immediately and also because we're using **await** we should add **async**.
```js
  describe('POST /', () => {

    // The code for the happy path
    const exec = async () => {
      return await request(server)
        .post('/api/genres')
        .set('x-auth-token', token)
        .send({ name }); // ES6 format - equals to .send({ name: name })
    }

  ...

```

### Deal with Happy Path One

We can simply call the _exec()_ function, await it, and get the response. But in this test in particular, we are not working with this _res_ so we can delete it. 

```js
    it('should save the genre if it is valid', async () => {
      const token = User().generateAuthToken();

      // We don't need to get the res because we are not using it here
      await exec();

      const genre = await Genre.find({ name: 'genre1' });
      expect(genre).not.toBeNull(); // Matcher function
    });
```

### Deal with the Path Where the User Is Not Logged In

Compare the code for sending request and our _exec()_ function. 
```js
    it('should return 401 if the client is not logged in', async () => {
      const res = await request(server)
        .post('/api/genres')
        .send({ name: 'genre1' });

      expect(res.status).toBe(401);
    });
```

The only difference is where we set the authorization token. So technically, we can replace these few lines with a call to our _exec()_ function, await it, and get the response. But before calling this, we need to get rid of this token.

We define this token in this block, making it a global variable for this test suite.

```js
  describe('POST /', () => {

    let token;
    
    ...

```

In order to test the scenario where the client is not logged in, we want to explicitly set the token to an empty string so in this test, we don't have a token.

```js
  describe('POST /', () => {

    let token;

    it('should return 401 if the client is not logged in', async () => {
      token = '';

      const res = await exec();

      expect(res.status).toBe(401);
    });
    
    ...

```

### Deal with the Other Test Cases

However, in other tests, we do have a token so we should set this token to a valid Json Web Token before each test. If you look at the other tests, the first line of every test has this line:
```js
const token = User().generateAuthToken();
```
This is repetitive so we can extract this and put it in the _beforeEach()_ function for this test suite. Let's define beforeEach(). We give it an anonymous  function and inside we simply set the token.

```js
  describe('POST /', () => {

    let token;

    const exec = async () => {
      return await request(server)
        .post('/api/genres')
        .set('x-auth-token', token)
        .send({ name }); // ES6 format - equals to .send({ name: name })
    }

    // Now make sure to remove this constant keyword, otherwise here you will define a token with a different scope, but we are working with a token that is defined at the test suite level.
    beforeEach(() => {
      token = User().generateAuthToken();
    });

    ...

```
Now, before each test, you're initializing the token to a valid json web token. 

### Align Clearly with the Description of the Test

Test Case:
```js
  it('should return 400 if genre is less than 5 characters.', async () => {
    const res = await request(server)
      .post('/api/genres')
      .set('x-auth-token', token)
      .send({ name: '1234' });

    expect(res.status).toBe(400);
  });

```
Again, we replace these few lines for making the request with a call to our _exec()_ function, await it, and get the response, _res_.

```js
  it('should return 400 if genre is less than 5 characters.', async () => {  
    
    const res = await exec();

    expect(res.status).toBe(400);
  });
```

Now what is this scenario we're testing? -> "genre less than 5 characters". So similar to the token, we can define genre as **a variable in this test suite**. And then we change this variable in each test.

Let's also add the _name_ of the genre at the top of this test suite. Now here in our exec()_ function, we have hard-coded this genre:
```js
    const res = await request(server)
      ...

      .send({ name: '1234' });
```

We should get rid of this and set the name of the genre in each test explicitly. So, here we are going to change this to _name_:
```js
      .send({ name: name });
```

Or in ES6, we can make this code shorter so **if the key and value are the same, we can just add the key**.
```js
      .send({ name });
```

Now in _beforeEach()_, we want to set the values for the **happy path**:
```js
    beforeEach(() => {
      token = User().generateAuthToken();
      name = 'genre1';
    });
```

Now back to our test, in this test, we want a genre that is less than 5 characters so we set the name to '1234'.
```js
    it('should return 400 if genre is less than 5 characters', async () => {
      // This line clearly aligns with the test description - less than 5 chars
      name = '1234';

      const res = await exec();

      expect(res.status).toBe(400);
    });
```

This time we want to test "if genre is more than 50 characters". Here, we're setting the name but removing the constant, otherwise this will be a different constant with a different scope.

```js
    it('should return 400 if genre is more than 50 characters', async () => {
      // Clearly aligns with the test description - more than 50 chars
      name = new Array(52).join('a');

      const res = await exec();

      expect(res.status).toBe(400);
    });
```

### Modify the Rest of the Happy Paths

We don't need to set the token. Also, we replace the code for the request with a call to our _exec()_ function.

```js
    // Happy path 1
    it('should save the genre if it is valid', async () => {
      await exec();

      const genre = await Genre.find({ name: 'genre1' });
      expect(genre).not.toBeNull();
    });

    // Happy path 2
    it('should return the genre if it is valid', async () => {
      const res = await exec();

      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('name', 'genre1');
    });
```

## Testing the Auth Middleware

Currently, we have a single test to test the authorization as shown above so if the client doesn't provide a token, we expect a 401 error.

However, if you look at the authorization middleware's implementation. You can see here we have multiple execution paths. 

_auth.js_ under _middleware_ folder
```js
module.exports = function(req, res, next) {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).send('Access Denied. No token provided.');

  try {
    const decoded = jwt.verify(token, config.get('jwtPrivateKey'));
    req.user = decoded;
    next();
  } catch (ex) {
    res.status(400).send('Invalid token.');
  }
};
```

So one possibility is that we don't have a token, and that's the path we have tested. 

It is also possible that **the client sends a token, but this is not a valid json web token**. In that case we need to test that the status of the response is 400, which is shown is the _catch_ block. You might be asking why we didn't test this path in our genres suite. The reason for this is because we use this authorization middleware in different parts of our application on different endpoints: for creating a genre, for updating a genre, for deleting a genre as well as other resources.

It doesn't make sense to repeat all this logic every time you want to test an endpoint. So technically, **you should test this authorization middleware separately** to make sure all the execution paths work. And then for endpoints that require authorization, like in this case for posting a genre as following:

_genres.js_
```js
router.post('/', auth, async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const genre = new Genre({ name: req.body.name });
  await genre.save();
  res.send(genre);
});
```

We just write one test, to **make sure that the authorization middleware is included before our route handler**, like:

_genres.test.js_
```js
it('should return 401 if the client is not logged in', async () => {
  token = '';
  
  const res = await exec();
  expect(res.status).toBe(401);
});
```

Now, we're going to write the tests for the other paths in the authorization middleware separately.

Add a new file called _auth.test.js_ under _integration_ folder.

Now here we are mixing the testing of the middleware and route handlers, we're putting all these test files under the integration folder. Now if you have a large application you may want to separate these into different folders, like middleware or routes just like how we have organized our project

_auth.test.js_
```js
const { User } = require('../../models/user');
const { Genre } = require('../../models/genre');
const request = require('supertest');

describe('auth middleware', () => {
  let server;
  let token;

  beforeEach(() => {
    server = require('../../index');
    token = new User().generateAuthToken();
  });
  afterEach(async () => {
    await server.close();
    await Genre.remove({});
  });

  // Define the happy path
  const exec = () => {
    return request(server)
      .post('/api/genres')
      .set('x-auth-token', token)
      .send({ name: 'genre1' });
  }

  it('should return 401 if no token is provided', async () => {
    token = '';

    const res = await exec();
    expect(res.status).toBe(401);
  });
```

### Token-Empty String V.S. Null

Now what if we set token to null?
```js
token = null;
```
What do you think is gonna happen? Let's see, save, back in the terminal, our test failed. So we expected 401 but we got 400.
```shell
 FAIL  tests/integrationauth.test.js
  auth middleware
    ✕ should return 401 if no token is provided (245ms)
    ✓ should return 400 if token is invalid (5ms)
    ✓ should return 200 if token is valid (13ms)

  ● auth middleware › should return 401 if no token is provided

    expect(received).toBe(expected) // Object.is equality

    Expected: 401
    Received: 400

      28 |
      29 |     const res = await exec();
    > 30 |     expect(res.status).toBe(401);
         |                        ^
      31 |   });
```

The reason for this is that when we call the _set()_ method, whatever we pass here will be converted to a string, so when we pass null, **that null will be sent as a string, in an actual http request**.

So back to our authorization middleware, _auth.js_, **token will no longer be falsey** and will end up in the _try block_, which will verify that token, obviously it's invalid so that's why we end up with the _catch block_ and get a 400 error.

So, back to our test file. To test that there's no token we shouldn't set this to null, we should use an empty string.

_auth.test.js_
```js
  it('should return 401 if no token is provided', async () => {
    token = '';
    ...
```

Now, we will test the second test case. This time, we want to send an **invalid token* so as you saw in the implementation, we should expect a 400 error.

```js
  try {
    const decoded = jwt.verify(token, config.get('jwtPrivateKey'));
    req.user = decoded;
    next();
  } catch (ex) {
    res.status(400).send('Invalid token.');
  }
```

_auth.test.js_
```js
  it('should return 400 if token is invalid', async () => {
    token = 'a'; // just set it to a simple string

    const res = await exec();
    expect(res.status).toBe(400);
  });
```

Next, we're going focus on our happy paths. If we send a valid token we expect a response with a status of 200.

```js
  // Happy path
  it('should return 200 if token is valid', async () => {
    const res = await exec();
    expect(res.status).toBe(200);
  });
```

And remember to clean up the _Genre_ model in the _afterEach()_ function.
```js
const { Genre } = require('../../models/genre');
...

describe('auth middleware', () => {

  ...

  afterEach(async () => {
    await server.close();
    await Genre.remove({});
  });

  ...
```

Now one last thing, here in our _auth_ middleware, if the client provides a valid json web token, we want to make sure that the _request.user_ property is populated with the payload of that json web token. So we need to properly test this.

_auth.js_
```js
  try {
    const decoded = jwt.verify(token, config.get('jwtPrivateKey'));
    req.user = decoded;
    next();

  ...
```

However, as far as I know, with this **supertest** library, we don't have access to the request object and we can only work with the response. So to test this, we need to write a unit test.

### Unit Testing the Auth Middleware

We have learned that sometimes you cannot test a specific functionality using integration tests. That's why in any application, you need both unit and integration tests. They compliment each other.

For every piece of functionality, you need to make your own judgement and decide what is a better approach to test your code. There's no one size fits all. Sometimes you may prefer to use unit tests, other times you may prefer integration tests. What matters is you need some kind of test to verify the behavior of your application.

Let's go ahead and write a unit test for this function to make sure that if the client sends a valid json web token, _req.user_ will be populated with the payload of the json web token.

- Add a new folder called _middleware_ under the _unit_ folder.
- Then create a file called _auth.test.js_ under the _middleware_ folder.

Now We need to call _auth()_ function and pass three arguments: _req_ object, _res_ object, and the _next_ function. 
```js
const { User } = require('../../../models/user');
const auth = require('../../../middleware/auth');

describe('auth middleware', () => {
  it('should populate req.user with the payload of a valid JWT', () => {
    const token = new User(user).generateAuthToken();

    // Mock objects

    auth(req, res, next);

    // Assertion here

  });
});

```

Now we need to mock all of these, so, let's create a request object.
```js
const req = {}
```

### Mock the header() Method

What do we need in this object? Let's go back to our middleware:

_auth.js_
```js
module.exports = function(req, res, next) {
  const token = req.header('x-auth-token'); // Read a header
  
  ...
```

You can see in this function, **we need to call _reg.header_ to read a header**. So, our mock object should have a method called _header()_.

Back to our test file. We set header to **jest.fn()**, and here we call **mockReturnValue()** to return our token. 

```js
    const req = {
      header: jest.fn().mockReturnValue(token)
    };

```

### Mock the _next()_ Function and _res_ Object

Now, back to our middleware, assuming that we have a valid token, we'll end up in the try block. Here we'll verify the token, and then set the _user_ property. Finally, we call the _next()_ function. So _next()_ should also be a mock function.

```js
module.exports = function(req, res, next) {
  const token = req.header('x-auth-token');
  ...

  try {
    const decoded = jwt.verify(token, config.get('jwtPrivateKey'));
    req.user = decoded;
    next();

  ...

```

The mock _next()_ will be a function that does nothing.

_auth.test.js_
```js
const next = jest.fn();
``` 

Also, let's define the _res_ object. In this happy path we are not working with the response but we still need to pass it as an argument to the _auth()_ function.

```js
const res = {};  // An empty response object
```

So far, the test file:

```js
describe('auth middleware', () => {
  it('should populate req.user with the payload of a valid JWT', () => {
    const token = new User().generateAuthToken();

    const req = {
      header: jest.fn().mockReturnValue(token)
    };
    const res = {};
    const next = jest.fn();

    auth(req, res, next);

    expect(req.user).tobeDefined();
  });
});
```

This can pass the test, but let's change this and make it more specific. If we're generating the AuthToken, we want to initialize the user object with two properties, _\_id_ and _isAdmin_. **These are the properties that we put in the payload of our tokens**.

So, let's create a user object:
```js
  const user = { _id: 1, isAdmin: true };
```

However, earlier we have learned that this _\_id_ is an **object id** so if we set that to a number, mongoose is going to ignore that. **You need to pass a valid object id**.

```js
const mongoose = require('mongoose');

...

    const user = {
      _id: mongoose.Types.ObjectId(),
      isAdmin: true
    };

...
```

Now we have a user object, and then when creating a new instance of this _User_ model, we pass in this _user_ to initialize it.

```js
    const token = new User(user).generateAuthToken();
```

And finally, we change our expectation, so this _req.user_ should match this user object.

```js
    expect(req.user).toMatchObject(user);
```

Save, back in the terminal, you have a familiar error.

```shell
    Expected value to match object:
      {"_id": "5bf30992ea115def71f0280a", "isAdmin": true}
    Received:
      {"_id": "5bf30992ea115def71f0280a", "iat": 1542654354, "isAdmin": true}
    Difference:
    Compared values serialize to the same structure.
    Printing internal object structure without calling `toJSON` instead.

    - Expected
    + Received

      Object {
    -   "_id": ObjectID {
    -     "_bsontype": "ObjectID",
    -     "id": Buffer [
    -       91,
    -       243,
    -       9,
    -       146,
    -       234,
    -       17,
    -       93,
    -       239,
    -       113,
    -       240,
    -       40,
    -       10,
    -     ],
    -   },
    +   "_id": "5bf30992ea115def71f0280a",
        "isAdmin": true,
      }

      19 |     auth(req, res, next);
      20 |
    > 21 |     expect(req.user).toMatchObject(user);
         |                      ^
      22 |   });
      23 | });
      24 |
```

**We expected _\_id_ to be an ObjectId which is a complex structure, but what we got was a string**. 

So, technically when we create a user object, this _\_id_ property is an object id, but when we decode a json web token, we're dealing with a string:
```js
const decoded = jwt.verify(token, config.get('jwtPrivateKey'));
```

To make sure our expectation pass, we need to convert our object id to a hexadecimal string:
```js
    const user = {
      _id: mongoose.Types.ObjectId().toHexString(),
      isAdmin: true
    };
```
Now, back in the terminal, all tests are passing.

## Code Coverage

As you write unit and integration tests for various parts of your application, you might be wondering how much of your code is covered by tests, and what are some scenarios that we have not tested? And that's where a code coverage tool comes in the picture. 

Add a new flag in _package.json_:
```json
  "scripts": {
    "test": "jest --watchAll --verbose --runInBand --coverage"
  },
```

Save, now back in the terminal, we need to stop the test process and run npm test one more time.We will have a report of how much of our code is covered in tests.

![coverage](sc/coverage-terminal.png)

**jest** also generates an html report of how much of our code is covered by tests.

![all files](sc/coverage-all.png)

In this status bar column, we can see how much of the files in that folder are covered by tests. For example, you can see a majority of the files in the models folder are covered by tests. are covered by tests. Now **this does NOT mean that we explicitly written tests for the files in this folder**. It means that **somewhere we have tests, and when we execute those tests, it will call the code inside this folder**. 

For example, in the models folder:

![models](sc/coverage-models.png)

We can see that 100% of the code in _genre.js_ is tested. That doesn't mean that you have explicitly written tests for this file. But because we tested our _genres route_, in some tests we used the genre model, all the code in this file has been exercised by one or more tests. So this is just a basic guideline.

Now let's go to the middleware folder. Look at this auth module.
![middleware](sc/coverage-middleware.png)

Here on this table we have a few parameters. You have Statements, Branches or Execution paths, Functions and Lines. So in our auth module, we have a total of 11 statements, and 100% of those are covered by tests. We have two branches or two execution paths, and 100% of them are also covered by tests.

Let's have a quick look at this execution path:
```js
module.exports = function(req, res, next) {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).send('Access Denied. No token provided.');

  try {
    // Valid token
    const decoded = jwt.verify(token, config.get('jwtPrivateKey'));
    req.user = decoded;
    next();
  } catch (ex) {
    // Invalid token
    res.status(400).send('Invalid token.');
  }
};
```

Now more accurately, here we have three execution paths. Because it's possible a token is valid or invalid. But our code coverage tool determines the branches or execution paths based on the return statements.

Now back to html table, we also have functions, so in our auth module we have only one function and that function is tested. And finally, we have the number of lines of code. And again, what you see here is not exactly what you see in your code editor because in this module, we actualluy have 16 lines of code, and that is based on how we have formatted our code. However, the code coverage tool sees this differently

This table tells us **what areas of the code we need to focus more on**. For example, you can see our _admin_ module is really low on testing so you need to focus more on this module.

Let's go back to all files and then go to the routes folder. Here's our _genres_ module. You can see we have tested over 60% of the code in this module. 

![routes](sc/coverage-routes.png)

Now let's click on the file name and we will see the code in this module. Now you can see the areas the are not covered by tests, highlighted in red.

![highlight](sc/genres-highlight.png)

For example, earlier we wrote tests to get a single genre; however, this line of this function is not covered by any tests. 
```js
// Get a single genre
router.get('/:id', validateObjectId, async (req, res) => {
  const genre = await Genre.findById(req.params.id);

  if (!genre)
    return res.status(404).send('The genre with given id was not found!');

  res.send(genre);
});
```

Let's see why.

_genres.test.js_
```js
  describe('GET /:id', () => {
    it('should return a genre if valid id is passed', async () => {
      const genre = new Genre({ name: 'genre1' });
      await genre.save();

      const res = await request(server).get('/api/genres/' + genre._id);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('name', genre.name);
    });

    it('should return 404 if invalid id is passed', async () => {
      const res = await request(server).get('/api/genres/1');
      expect(res.status).toBe(404);
    });
  });
```

Here are the two tests that we wrote for this endpoint. Look at the second test case, "it should return 404 if valid id is passed". We passed '1' as an invalid id, and with our current implementation, this _validateObjectId_ middleware will kick in (See _genres.js_) and return a 404 error. However, if we pass a valid object id, there is no test to assert that we get a 404 error. That's why this code is highlighted in red.
```js
  if (!genre)
    return res.status(404).send('The genre with given id was not found!');
```

So, we can add the following test case.

_genres.test.js_
```js
  describe('GET /:id', () => {
    
    ...

    it('should return 404 if no genre with the given id exists', async () => {
      // Instead of sending 1, we send a valid object id here.
      const id = mongoose.Types.ObjectId();
      const res = await request(server).get('/api/genres/' + id);
      expect(res.status).toBe(404);
    });
  });

```

Now save, back in the terminal, **jest** re-runs our test and regenerates the coverage report every time. If we refresh now, this red highlight will be gone.

![fix highlight](sc/no-highlight.png)
