# Test-driven Development (TDD)

- A approach to build the software.
- Also called Test-first Development.
- **Write your tests before writing the application or production code**.

## Content
- [Foundation of TDD](#Foundation-of-TDD)
- [Benefits of TDD](#Benefits-of-TDD)
- [Implementation of Returning a Movie](#Implementation-of-Returning-a-Movie)
  - [Test Cases](#Test-Cases)
- [Populating the DB](#Populating-the-DB)
- [Testing the Authorization](#Testing-the-Authorization)
- [Testing the Input](#Testing-the-Input)
- [Refactoring Tests](#Refactoring-Tests)
- [Looking Up an Object](#Looking-Up-an-Object)
- [Testing If Rental Processed](#Testing-If-Rental-Processed)
- [Testing the Valid Request](#Testing-the-Valid-Request)
- [Testing the Return Date](#Testing-the-Return-Date)
- [Testing the Rental Fee](#Testing-the-Rental-Fee)
- [Teseting the Movie Stock](#Teseting-the-Movie-Stock)
- [Testing the Response](#Testing-the-Response)
- [Refactoring the Validation Logic](#Refactoring-the-Validation-Logic)
- [Mongoose Static Methods](#Mongoose-Static-Methods)
  - [Static Methods and Instance Methods](#Static-Methods-and-Instance-Methods)
  - [The statics Property](#The-statics-Property)
- [Refactoring the Domain Logic](#Refactoring-the-Domain-Logic)
  - [Information Expert Principle](#Information-Expert-Principle)
  - [Instance Methods](#Instance-Methods)
  - [Response Code 200](#Response-Code-200)

## Foundation of TDD

- **Start by writing a failing test** - this test should fail because you don't have any application code that would make it pass. 
- **Write the simplest code to make this code pass** - it should be absolutely simplest. You don't want to over-engineer here. Use the simplest implementation that would make this test pass.
- **Refactor your code if necessary**

You repeat these three steps over and over until you build a complete feature.

## Benefits of TDD

- **Testable Source Code** - Your code will be testable right from the get-go. You don't have to make any changes of your code to make it testable.
- **Full Coverage by Tests** - Every line of your production code will be fully covered by tests, which means you can refactor and deploy with confidence.
- It often results in a **Simpler Implementation**. When you start with a big class diagram, chances are, you are over-engineering and making the solution more complex. If you write enough code to make all the tests pass, and that solution works, there is no reason to write more code.

The fact that all your tests pass means you have fulfilled all the business requirements. So, unless there is a new requirement, you don't need to write more code. And if there is a new requirement, you start by a failing test. 

Test first or code first? Which approach is better? In theory, the TDD is more promising because of the benefits shown as above, but in practice, sometimes it can get really complex and it may slow you down. If that's the case, it's better to switch to the code-first approach and write your test after.

## Implementation of Returning a Movie

_rental.js_
```js
...

const Rental = mongoose.model('Rental', new mongoose.Schema({
    customer: {
        type: new mongoose.Schema({
            name: {
                type: String,
                required: true,
                minlength: 5,
                maxlength: 50
            },
            isGold: {
                type: Boolean,
                default: false
            },
            phone: {
                type: String,
                required: true,
                minlength: 5,
                maxlength: 50
            }
        }),
        required: true
    },
    movie: {
        type: new mongoose.Schema({
            title: {
                type: String,
                required: true,
                trim: true,
                minlength: 5,
                maxlength: 255
            },
            dailyRentalRate: {
                type: Number,
                required: true,
                min: 0,
                max: 255
            }
        }),
        required: true
    },
    dateOut: {
        type: Date,
        required: true,
        default: Date.now
    },
    dateReturned: {
        type: Date
    },
    rentalFee: {         // can be calculate with the condition of isGold
        type: Number,
        min: 0
    }
}));

...
```

The last two properties, _dateReturned_ and _rentalFee_, are initially undefined. When a customer returns a movie we'll set the return date and calculate the rental fee.

Now in terms of the API design, how are we going to send a request to our server to return a movie?

One way is to go back to our _rentals_ endpoint and add the ability to update a rental.

Let's have a quick look here, so in the routes folder, we have the _rentals) module
```js
router.post('/', auth, async (req, res) => {
  ...

```

Currently we can only post to the above endpoint to create a new rental so one solution to return a movie is to add another route handler for updating a rental.

However, **this is a bad approach**. Let me explain why. So, back in our _rental_ model, these two properties, _dateReturned and rentalFee_, we don't want the client to set these values. Otherwise, the client can send 0 as the rentalFee so these values should be calculated and set on the server.

Also, by the same token, we don't want the client to accidentally modify the value of _dateOut_ or the _customer_ property.

So, **a better approach is to have a new endpoint to return a movie**. We're going to have a new endpoint like this:
```js
// POST /api/returns
```

A PSOT to this endpoint to send a return request or a return command. In this request you should add two properties, customerId and movieId. 
```js
// POST /api/returns {customerId, movieId}
```

Now on the server, we'll look up the rental for this combination and we'll get a document like this:
```js
const Rental = mongoose.model('Rental', new mongoose.Schema({
    customer: {
        ...
    },
    movie: {
        ...
    },
    dateOut: {
        ...
    },
    dateReturned: {
        ...
    },
    rentalFee: {
        ...
    }
}));
```

Then we'll set the return date to the current date time and also calculate the rentalFee accordingly. So, this endpoint will be the **contract** that we're going to expose for our clients.

Now that we know what this contract looks like, we can start writing the test cases, or how this contract should behave.

### Test Cases

Now let's brainstorm and write all the test cases that we can think of. This is not a complete list, and it may change or extend later.

#### Negative Cases

When we send a post request to this endpoint, how should this endpoint behave? First of all, we want to make sure that only authenticated users can call this endpoint. So, this should return **401** or **unauthorized** if client is not logged in.

```js
// Return 401 if the client is not logged in
```

Now, assuming that the client is logged in, what is the next thing we need to check for? We want to make sure the customer ID is provided, and if not we want to return a bad request.

```js
// Return 400 if customerId is not provided
```

Similarly, we want to make sure the movieId is provided as well.

```js
// Return 400 if movieId is not provided
```

It is also possible that the client sends both the customerId and movieId, but we don't have a rental for this combination.

```js
// Return 404 if no rental found for this customer/movie
```

What is the next possibility? That we do have a rental, but that rental is already processed. In other words, a customer already returned the movie. In that case, we want to return 400 which means this is a bad request.

```js
// Return 400 if rental already processed
```

So these are all the negative cases. Now let's take a look at the positive cases.

#### Positive Cases

If we get to this point, that means:
- We're processing a valid return
- We should also set the return date
- We need to calculate the rental fee
- We should also add the movie back to the stock
- And finally, what should we return to the client in the body of the response? We can return the summary of the rental. This will be the rental with all the properties set: _dateOut_, _dateReturned_, _rentalFee_, and so on. 

```js
// Return 200 if valid request
// Set the return date
// Calculate the rental fee
// Increase the stock
// Return the rental
```

## Populating the DB

Create a new test file: tests/integration/_returns.test.js_

```js
const { Rental } = require('../../models/rental');
const mongoose = require('mongoose');

describe('/api/returns', () => {
  let server;
  let customerId;
  let movieId;
  // Declare rental here so we can use it in different functions
  let rental;

  // Populate the database and load the server before each test
  beforeEach(async () => {
    server = require('../../index');

    // create the customerId separately here because we will be using it when posting a request at some point in the test suite
    customerId = mongoose.Types.ObjectId();
    movieId = mongoose.Types.ObjectId();

    rental = new Rental({
      // Other properties will be automatically set to default
      customer: {
        _id: customerId,
        name: '12345',
        phone: '12345'
        // isGold has a default value
      },
      movie: {
        _id: movieId,
        title: '12345',
        dailyRentalRate: 2
      }
    });

    await rental.save();
  });

  // Clean up the DB and close the server after each test
  afterEach(async () => {
    awaitserver.close();
    await Rental.remove({});
  });

  // Before writing the real test case, we just first make sure this test suite works, and the DB was populated
  it('should work!', async () => {
    const result = await Rental.findById(rental._id);
    expect(rental).not.toBeNull();
  });
});
```

## Testing the Authorization

Let's start writing the very first test case.
```js
// Return 401 if the client is not logged in
```

_returns.test.js_
```js
const request = require('supertest');

...

  it('should return 401 if client is not logged in', async () => {
    const res = await request(server)
      .post('/api/returns')
      .send({ customerId, movieId });  // ES6 syntax
      // the same as send({ customerId: customerId, movieId: movieId });

    expect(res.status).toBe(401);
  });

...
```

Now, save and run the test.

```shell
  /api/returns
    ✕ should return 401 if client is not logged in (647ms)

  ● /api/returns › should return 401 if client is not logged in

    expect(received).toBe(expected) // Object.is equality

    Expected: 401
    Received: 404

      40 |       .send({ customerId, movieId });
      41 |
    > 42 |     expect(res.status).toBe(401);
```

We expected to get 401, but we got 404. Where did that come from Well, we haven't implemented that endpoint so by default, when we call an endpoint that doesn't exist, it returns a 404 error. Let's go ahead and implement this endpoint. 

Under _routes_ folder, create a new file called _returns.js_. We need to load express, get a router, and define a new endpoint.

_returns.js_
```js
const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  // TODO
});

module.exports = router;
```

Now we need to include this router in our application object.

_/startup/routes.js_
```js
...

const returns = require('../routes/returns');
...

module.exports = function (app) {
  ...
  app.use('/api/returns', returns);
  ...
};

```

Now back to our _returns_ module, **what is the simplest code that we can write to make out test pass?**

**All we expect here is that the status should be 401.**
```js
// test
expect(res.status).toBe(401);
```

So, the simplest code we can write for the endpoint:

_returns.js_
```js
...
router.post('/', async (req, res) => {
  // The simplest code that can make the test pass.
  res.status(401).send('Unauthorized');
});
...
```

Now this may look a little bit silly for you as you may think we haven't really checked the json web token and we didn't add the authorization and middleware, but this is the whole point of test driven development. **It forces you to write only the code that you really need**.

With this approach, maybe we'll come up with a different implementation that is far simpler then what we have done so far. So, the simplest code that we could write to make our tests pass is as shown above.

As we write more test cases, maybe this code doesn't work anymore, then we'll come back and change it. **This is the whole cycle**. 

## Testing the Input

For our second test case, we want to return 400 if customerId is not provided, first we need an authentication token, we want to make sure that the user is already logged in but didn't provide the customerId.

_returns.test.js_
```js
...
// For generating the JWT
const { User } = require('../../models/user');
...

  it('should return 400 if customerId is not provided', async () => {
    const token = new User().generateAuthToken();

    const res = await request(server)
      .post('/api/returns')
      .set('x-auth-token', token)  // The user has been logged in
      .send({ movieId });  // Lacks the customerId

    expect(res.status).toBe(400);
  });

```

_returns.js_
```js

router.post('/', async (req, res) => {
  // The simplest code that we can make the test pass
  if (!req.body.customerId) return res.status(400).send('CustomerId not provided.');

  res.status(401).send('Unauthorized');
});

```

Don't worry about using **joi** to validate the body of the request since we can always add that later when we refactor our code. If we have a comprehensive test suite of tests, we can always come back here and refactor this implementation and make it better.

Our third test is very similar to this
```js
  it('should return 400 if movieId is not provided', async () => {
    const token = new User().generateAuthToken();

    const res = await request(server)
      .post('/api/returns')
      .set('x-auth-token', token)
      .send({ customerId });

    expect(res.status).toBe(400);
  });
```

Whenever you write a new test case, check if the new failure is caused by the new test you just added. So back in the terminal:

```shell
 RUNS  tests/integration/returns.test.js
 FAIL  tests/integration/returns.test.js
  /api/returns
    ✓ should return 401 if client is not logged in (627ms)
    ✓ should return 400 if customerId is not provided (8ms)
    ✕ should return 400 if movieId is not provided (7ms)

  ● /api/returns › should return 400 if movieId is not provided

    expect(received).toBe(expected) // Object.is equality

    Expected: 400
    Received: 401

      63 |       .send({ customerId });
      64 |
    > 65 |     expect(res.status).toBe(400);
```

So, we have checked that it's not happening because of a different reason. Let's go back and modify our production code.

_returns.js_
```js
router.post('/', async (req, res) => {
  if (!req.body.customerId) return res.status(400).send('customerId not provided.');
  // new code
  if (!req.body.movieId) return res.status(400).send('movieId not provided.');

  res.status(401).send('Unauthorized');
});
```

## Refactoring Tests

As we have discussed before, tests are first-class citizens in your code base -- They're as important as the production code. So as you write tests, it's absolutely crucial to refactor your tests and make them cleaner.

If you look at the tests you have written so far, you can see a little bit of duplication.

```js
  it('should return 400 if customerId is not provided', async () => {
    const token = new User().generateAuthToken();

    const res = await request(server)
      .post('/api/returns')
      .set('x-auth-token', token)
      .send({ movieId });  // Lacks the customerId

    expect(res.status).toBe(400);
  });

  it('should return 400 if movieId is not provided', async () => {
    const token = new User().generateAuthToken();

    const res = await request(server)
      .post('/api/returns')
      .set('x-auth-token', token)
      .send({ customerId });

    expect(res.status).toBe(400);
  });
```

Now we're going to refactor these tests using Mosh's technique.

First, we define the **happy path**, and then in each test, we'll change **one parameter** that would simulate in edge case.

On the top, we define the happy path:
```js
describe('/api/returns', () => {
  let server;
  let customerId;
  let movieId;
  let rental;

  // Happy path
  const exec = () => {
    // We can exlude await here, meaning we just return a promise.
    // We'll just have the caller of this function await the promise. 
    return request(server)
      .post('/api/returns')
      .set('x-auth-token', token)
      .send({ custmerId, movieId }); // Happy path should have a valid request
  };
```

Now we should also set the _token_ to a valid value in _beforeEach()_ function.

```js
describe('/api/returns', () => {
  ...
  let token; // Define the variable at the top level

  ...

  beforeEach(async () => {
    ...
    token = new User().generateAuthToken();

  ...

```

Now let's modify each test accordingly.

```js
  it('should return 401 if client is not logged in', async () => {
    token = '';

    const res = await exec();

    expect(res.status).toBe(401);
  });

  it('should return 400 if customerId is not provided', async () => {
    customerId = '';

    const res = await exec();

    expect(res.status).toBe(400);
  });

```

Instead of setting the customerId to an empty string, we could define an object and call it _payload_. We would add that object to the body of the request, and then here, we could delete the _customerId_ property in the payload.

```js
  it('should return 400 if customerId is not provided', async () => {
    // Another approach
    delete payload.custmerId;  

    const res = await exec();

    expect(res.status).toBe(400);
  });
```

And the final test:
```js
  it('should return 400 if movieId is not provided', async () => {
    movieId = '';

    const res = await exec();

    expect(res.status).toBe(400);
  });
```

## Looking Up an Object

```js
// should return 404 if no rental found for the customer/movie
```

In this test, to simulate this edge case, we're going to delete the _rental_ that we created earlier.

```js
  it('should return 404 if no rental found for the customer/movie', async () => {
    // Clean up the Rental collection so the retnal cannot be found.
    await Rental.remove({});

    const res = await exec();

    expect(res.status).toBe(404);
  });
```

Then we make sure that this test would fail.

Back in the production code, what is the simplest code that we can write to make this test pass? Well, we need to find a rental for this _customerId_ and _movieId_. If that rental doesn't exist, then we'll return a _404_ error.

Note that each rental has a _customer_ property which is an **embedded document** so we use a **dot** notation to access a property in a sub-document, which, in this case, is the _objectId_.

_returns.js_
```js
const { Rental } = require('../models/rental');

...

router.post('/', async (req, res) => {
  if (!req.body.customerId) return res.status(400).send('customerId not provided.');
  if (!req.body.movieId) return res.status(400).send('movieId not provided.');

  // -------------- added ------------------
  const rental = await Rental.findOne({
    'customer._id': req.body.customerId,
    'movie._id': req.body.movieId
  });
  if (!rental) return res.status(404).send('Rental not found.');
  // ---------------------------------------

  res.status(401).send('Unauthorized');
});
```

## Testing If Rental Processed

```js
// Return 400 if rental already processed
```
That the rental has been processed means the _dateReturned_ has been set. Let's write the test first.

```js
  it('should return 400 if return is already processed', async () => {
    rental.dateReturned = new Date();  // Set the returning date
    await rental.save();

    const res = await exec();

    expect(res.status).toBe(400);
  });
```

Now back in the route handler, what is the simplest code that we can write to make this test pass? Well, if we pass this point, that means we do have a rental object. We just have to set the _dateReturned_ property for this object.

_returns.js_
```js
router.post('/', async (req, res) => {
  if (!req.body.customerId) return res.status(400).send('customerId not provided.');
  if (!req.body.movieId) return res.status(400).send('movieId not provided.');

  const rental = await Rental.findOne({
    'customer._id': req.body.customerId,
    'movie._id': req.body.movieId
  });
  if (!rental) return res.status(404).send('Rental not found.');

  // ----------------------- added -----------------------
  if (rental.dateReturned) return res.status(400).send('Rental already processed.');
  // -----------------------------------------------------

  res.status(401).send('Unauthorized');
});
```

## Testing the Valid Request

```js
// Return 200 if valid request
```

_returns.test.js_
```js
  it('should return 200 if we have a valid request', async () => {
    const res = await exec();

    expect(res.status).toBe(200);
  });
```

_returns.js_
```js
router.post('/', async (req, res) => {
  if (!req.body.customerId) return res.status(400).send('customerId not provided.');
  if (!req.body.movieId) return res.status(400).send('movieId not provided.');

  const rental = await Rental.findOne({
    'customer._id': req.body.customerId,
    'movie._id': req.body.movieId
  });
  if (!rental) return res.status(404).send('Rental not found.');

  if (rental.dateReturned) return res.status(400).send('Rental already processed.');

  // If we pass this point that means we're dealing with a valid 
  // request, so we can simply return status 200 and an empty
  // response.

  // ---------------------- added ----------------------
  return res.status(200).send();
  // Make sure to call the send() method. Otherwise, if you just call
  // status, you're not returning a response to the client.
  // ---------------------------------------------------

  res.status(401).send('Unauthorized');
});
```

However, if we save this change, the first test that we wrote to make sure that only the authenticated clients can call this endpoint is gonna fail. 

```shell
  /api/returns
    ✕ should return 401 if client is not logged in (1077ms)
    ✓ should return 400 if customerId is not provided (11ms)
    ✓ should return 400 if movieId is not provided (4ms)
    ✓ should return 404 if no rental found for the customer/movie (7ms)
    ✓ should return 400 if return is already processed (9ms)
    ✓ should return 200 if we have a valid request (5ms)

  ● /api/returns › should return 401 if client is not logged in

    expect(received).toBe(expected) // Object.is equality

    Expected: 401
    Received: 200

      52 |     const res = await exec();
      53 |
    > 54 |     expect(res.status).toBe(401);
         |                        ^
      55 |   });
```

This line cannot be reached by the test.

```js
res.status(401).send('Unauthorized');
```

Now that we have reached this stage, we can get rid of this line and add our **authorization middleware**.

Let's import our _auth_ middleware and then pass it as a second argument to the _post_ method.

_returns.js_
```js
const auth = require('../middleware/auth');

...

// -------------------- auth added --------------------
router.post('/', auth, async (req, res) => {
// ----------------------------------------------------
  if (!req.body.customerId) return res.status(400).send('customerId not provided.');
  if (!req.body.movieId) return res.status(400).send('movieId not provided.');

  const rental = await Rental.findOne({
    'customer._id': req.body.customerId,
    'movie._id': req.body.movieId
  });
  if (!rental) return res.status(404).send('Rental not found.');

  if (rental.dateReturned) return res.status(400).send('Rental already processed.');

  return res.status(200).send();
});
```

Now, all our tests should pass.

## Testing the Return Date

```js
// Set the return date
```

When we execute _exec()_, somewhere else will modify the database so that object in memory is not aware of changes in the database. That's why we need to reload/query the rental and save it to a new variable, _rentalInDb_.

```js
  it('should set the dateReturned if input is valid', async () => {
    await exec();

    const rentalInDb = await Rental.findById(rental._id);

    // A gereral test. Will modify it later
    expect(rentalInDb.dateReturned).toBeDefined();
  });
```

Now here in our route handler, we can write simple code like this:

_returns.js_
```js
router.post('/', auth, async (req, res) => {
  ...

  rental.dateReturned = 1; // The simples code to make the test pass.
  await rental.save();

  return res.status(200).send();
});
```

The assertion is still a bit too general. We want to be more specific, but here's the tricky part. In our production code, in the route handler, we should set this to the current time, but in our test, when we make an assertion against the property, we won't have the value of the current time. Well we do, but that it is already different than the one set by the route handler.

So, when testing scenarios like that, we should calculate the difference between the current time and the value of this property, and ensure the difference is less than, let's say, 10 seconds in the worst case scenario. Now let's modify this assertion.

```js
  it('should set the dateReturned if input is valid', async () => {
    await exec();

    const rentalInDb = await Rental.findById(rental._id);
    const diff = new Date() - rentalInDb.dateReturned; // in ms
    
    // The worst case where the test is really slow
    expect(diff).toBeLessThan(10 * 1000);
  });
```

Now, change the production code.
```js
router.post('/', auth, async (req, res) => {
  ...

  rental.dateReturned = new Date();
  await rental.save();

  return res.status(200).send();
});
```

## Testing the Rental Fee

```js
// Calculate the rental fee
```

Now here's the tricky part. The _dateOut_ property of the _rental_ object that we saved to the database in the beforeEach() function, by default, will be automatically set to the current time by Mongoose. Now to test this scenario, we want to make sure that this movie has been out for at least one day, not one second. So, we need to modify this rental document in the database before calling the _exec()_ function.

The simplest way is to use a library called **moment.js** for working with date and time. Now we can install this library as a dependency of our application, or install it only for development purposes when writing tests. We are going to install it as an application dependency because in our production code, we're also going to calculate the number of days the movie has been out.

```shell
$ npm i moment
```

Back in our test, first we need to import this library on the top:

```js
const moment = require('moment');
```

- We call _moment()_ to get the current DateTime.
- Then we call _add()_ and pass, let's say, -7, as the first argument. For the second argument we pass _days_ as a string.

```js
// This gives us a moment object that is 7 days before. 
rental.dateOut = moment().add(-7, 'days');
```

Now we need to convert this to a plain JavaScript object when saving this rental because the type of this _dateOut_ property is the standard JavaScript **Date**.

```js
rental.dateOut = moment().add(-7, 'days').toDate();
```

Now let's write the assertion. Assuming that this movie has been out for seven days, and we set the _dailyRentalRate_ of the movie for this rental to 2 dollars.

```js
  it('should set the rentalFee if input is valid', async () => {
    rental.dateOut = moment().add(-7, 'days').toDate();
    await rental.save();

    await exec();

    const rentalInDb = await Rental.findById(rental._id);
    expect(rentalInDb.rentalFee).toBe(14);
  });
```

Back in our production code.
- Call _moment()_ to get the current datetime
- Use _diff()_ method to get how many days are thes dates apart

```js
const moment = require('moment');

...

router.post('/', auth, async (req, res) => {
  ...

  rental.dateReturned = new Date();
  
  // --------------------- added ---------------------
  const rentalDays = moment().diff(rental.dateOut, 'days');
  rental.rentalFee = rentalDays * rental.movie.dailyRentalRate;
  // -------------------------------------------------
  await rental.save();

  return res.status(200).send();
});
```

## Teseting the Movie Stock

```js
// Increase the stock after return
```

This test requires a little bit more work because before sending this request, we should make sure to have that movie in the database. When we execute the request, we can inspect that the number of movie in stock has been increased by 1.

First, let's go back to our _beforeEach()_ function. Just like how we created our _rental_, we should also create a _movie_.

```js
const { Movie } = require('../../models/movie');
...

describe('/api/returns', () => {
  ...

  let movie; // Added

  ...

  beforeEach(async () => {
    server = require('../../index');
    customerId = mongoose.Types.ObjectId();
    movieId = mongoose.Types.ObjectId();
    token = new User().generateAuthToken();

    // You can see duplicate of movie object here.
    // We could have refactored this and put them in a separate 
    // constant, but it doesn't really matter as much in this case
    // because we're not going to come back and modify the number here
    // in the future, and then we'll have to modify 2 different places.
    // So, these are constant values we're going to use for all the 
    // tests in this suite. 
    // ----------------- Added -----------------
    movie = new Movie({
      _id: movieId,
      title: '12345',
      dailyRentalRate: 2,
      genre: { name: '12345' },  // required property
      numberInStock: 10
    });
    await movie.save();
    // -----------------------------------------

    rental = new Rental({
      customer: {
        _id: customerId,
        name: '12345',
        phone: '12345'
      },
      movie: {  // duplicate
        _id: movieId,
        title: '12345',
        dailyRentalRate: 2
      }
    });
    await rental.save();
  });

```

Now let's create our test. 

```js
  it('should increase the movie stock if input is valid', async () => {
    await exec();

    const movieInDb = await Movie.findById(movieId);
    expect(movieInDb.numberInStock).toBe(11);
  });

```

Now there is another way to write this test. When someone is looking at this code, they may say where did that _11_ come from? It looks like a magic number -- That's a fair argument.

So the other way to write this is as following.
```js
  it('should increase the movie stock if input is valid', async () => {
    await exec();

    const movieInDb = await Movie.findById(movieId);
    expect(movieInDb.numberInStock).toBe(movie.numberInStock + 1);
  });
```

Now, back in our route handler. To make the test pass, we can use the **query-first** or **update-first** approach. Let's use the update first appraoch here because we don't really need to read the movie in this case.

**update()**
- As a first argument, we pass our query object
- As a second argument, we pass our update object. Here we use the **$inc** operator. We need to increment the value of _numberInStock_ property by 1.
- Note that you need to **await** the _update()_ function, otherwise **your test will get the wrong value of _numberInStock_ becuase it hasn't completed the update**.

```js
const { Movie } = require('../models/movie');
...

router.post('/', auth, async (req, res) => {
  ...

  const rentalDays = moment().diff(rental.dateOut, 'days');
  rental.rentalFee = rentalDays * rental.movie.dailyRentalRate;
  await rental.save();

  // -------------------- added --------------------
  await Movie.update({ _id: rental.movie._id }, {
    $inc: { numberInStock: 1 }
  });
  // -----------------------------------------------

  return res.status(200).send();
});

```

Now one thing we forgot was to do cleanup after we create that movie. So, in the _afterEach()_ function, we should also remove all the movie documents in our movies collection.

_returns.test.js_
```js
  afterEach(async () => {
    await server.close();
    await Rental.remove({});
    await Movie.remove({});  // added
  });

```

## Testing the Response

Finally, the last test case:

```js
// Return the rental in the body of the response
```

Writet the test case first:

```js
  it('should return the rental if input is valid', async () => {
    const res = await exec();

    // Get the rental from the database
    const rentalInDb = await findById(rental._id);

    // should match with the updated rental
    expect(res.body).toMatchObject(rentalInDb);
  });
```

_returns.js_
```js
router.post('/', auth, async (req, res) => {
  ...

  await Movie.update({ _id: rental.movie._id }, {
    $inc: { numberInStock: 1 }
  });

  // Send the rental object in the response -------
  return res.status(200).send(rental);
  // ----------------------------------------------
});

```

Save and run, then we have the following error:
```shell
    Difference:
    - Expected
    + Received

    @@ -5,12 +5,12 @@
          "_id": "5bffaffede80b8b1667b8f4b",
          "isGold": false,
          "name": "12345",
          "phone": "12345",
        },
    -   "dateOut": 2018-11-29T09:23:10.151Z,
    -   "dateReturned": 2018-11-29T09:23:10.155Z,
    +   "dateOut": "2018-11-29T09:23:10.151Z",
    +   "dateReturned": "2018-11-29T09:23:10.155Z",
        "movie": Object {
          "_id": "5bffaffede80b8b1667b8f4c",
          "dailyRentalRate": 2,
          "title": "12345",
        },

      147 |
      148 |     // should match with the updated rental
    > 149 |     expect(res.body).toMatchObject(rentalInDb);

```

The reason this test failed is because of how these two properties _dateOut_ and _dateReturned_ are set. For the _rental_ object that we get from Mongoose, the type of these properties was set to **Date** so their value is a **standard JavaScript Datetime**.

However, for the object that we are returning in the body of the response, that's **a standard which is formatted using JSON** so the value is a **string**.

So, this assertion is a little bit too specific, we want to make it a little more general. We should **look for the existence of certain properties in the body of the response**.

```js
  it('should return the rental if input is valid', async () => {
    const res = await exec();

    const rentalInDb = await Rental.findById(rental._id);

    // ---------------- modified ----------------
    expect(res.body).toHaveProperty('dateOut');
    expect(res.body).toHaveProperty('dateReturned');
    expect(res.body).toHaveProperty('rentalFee');
    expect(res.body).toHaveProperty('customer');
    expect(res.body).toHaveProperty('movie');
    // ------------------------------------------
  });

```

Now, all tests are passing. However, this code is a little bit too lengthy. Let's go for a better way to rewrite this.

_res.body_ is an object right so we can get the name of all the properties in this object by calling **Object.keys()** method. Also, we make sure this array equals another array.

```js
  it('should return the rental if input is valid', async () => {
    const res = await exec();

    const rentalInDb = await Rental.findById(rental._id);

    expect(Object.keys(res.body)).toEqual(expect.arrayContaining([
      'dateOut', 'dateReturned', 'rentalFee', 'customer', 'movie'
    ]));

```

## Refactoring the Validation Logic

Now here's the beauty of Test-driven Development. The route handler (_returns.js_) that we created has been 100 percent covered by tests. So, now we can easily refactor this function, come up with a better implementation, run all the tests, and **if all these tests pass, we would be confident that we didn't break anything during this refactoring**.

The first thing I want to modify here is how we validate the input.

```js
  if (!req.body.customerId) return res.status(400).send('customerId not provided.');
  if (!req.body.movieId) return res.status(400).send('movieId not provided.');
```

Instead of these two lines, we want to validate using **joi**.

_returns.js_
```js
const Joi = require('joi'); // added

...

router.post('/', auth, async (req, res) => {
  // ------------------- replaced -------------------
  const { error } = validateReturn(req.body);
  if (error) return res.status(400).send(error.details[0].message);
  // ------------------------------------------------
  
  ...

});

// added
function validateReturn(req) {
  // In this req, we want to have these two properties
  const schema = {
    customerId: Joi.objectId().required(),
    movieId: Joi.objectId().required()
  };
  return Joi.validate(req, schema);
}

module.exports = router;

```

Save and run, all tests are still passing so we didn't break anything.

You might be asking, what was the point of this refactoring -- We replaced two lines with another two lines so we didn't really make the code shorter. That is true. However, note that we have these two lines in a lot of route handlers. 

```js
  const { error } = validateReturn(req.body);
  if (error) return res.status(400).send(error.details[0].message);
```

This is repetitive so we can move this code into a middleware function, just like how we check the authentication using a middleware function. 

Now, we are going to write this middleware function in _returns.js_ and then movie it to a different file.

_returns.js_

```js
const validate = (req, res, next) => {
  const { error } = validator(req.body);
  if (error) return res.status(400).send(error.details[0].message);
};
```

Now here's the tricky part. This first line, which shows the name of the validater function, is different in each route handler, such as validateReturn, validateGenre, and so on. So, we need to be able to **dynamically pass a validator function** here.

To fix this problem, instead of passing _req_, _res_ and _next_ here, we're going to pass _validator_, which is a **function**. And instead of directly executing the code for validation, we're going to return a middleware function to give to **Express**. **Express** will call that middleware function as part of processing the request.

Now, we move the logic for validation inside of this middleware function being returned. And finally, replace the _validateReturn_ with _validator_.

```js
const validate = (validator) => {  // pass in a function
  
  // return a middleware (a function that takes req, res, and next)
  return (req, res, next) => {

    // --------------- validation logic ---------------
    const { error } = validator(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    // ------------------------------------------------

    next();
  };
};
```

If we have an error we're going to return a 400 response, otherwise, we're going to call _next()_. 

Now, we can easily use this when setting up our route. Here, we're going to pass an array of middleware functions. First, we want to make sure that the client is logged in. Next, we validate the request, and as a _validator_ we **pass in a reference to our _validateReturn_ function**. After that, we have our route handler.

```js
router.post('/', [auth, validate(validateReturn)], async (req, res) => {
  
  ...

```

Ok, let's move this middleware to a different file. Under _middleware_ folder, create a new file called _validate.js_.

_validate.js_
```js
module.exports = (validator) => {
  return (req, res, next) => {
    const { error } = validator(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    next();
  };
};
```

And then import this module in _returns.js_.

```js
const validate = require('../middleware/validate');

...

```

Back to the terminal, all tests are passing.

Now, with this new _validate_ function, we can also refactor the existing route handlers and remove the validation logic that we have repeated in almost every route handler. Just Make sure to write a test for each route handler first you're going to modify. At a minimum you should test the validation in that function.

## Mongoose Static Methods

The next thing we want to improve here is how we look up a rental.

_returns.js_
```js
  const rental = await Rental.findOne({
    'customer._id': customerId,
    'movie._id': movieId
  });
```

Imagine that somewhere else in the application, if we wanted to look up a rental, then we would have to call this _findOne()_ method, and pass an object with the properties, _customer.\_id_ and _movie.\_id_. It's a little bit inconvenient.

Would it be nicer if we could get a rental like this:

```js
const rental = await Rental.lookup(customerId, movieId);
```

### Static Methods and Instance Methods

In object oriented programming, we have two types of methods: **static methods** and **instance methods**. A static method is a method that is available directly on a class, such as:

_Rental.lookup()_

In contrast, an instance method is one that is available on an object or an instance of a class. Earlier, we added an instance method to our _User_ class so we can create a new user and call _generateAuthToken()_ method.

_new User().generateAuthToken()_

- We use **instance methods** when we are working with a particular object, and the result that we get will be dependent on that object.
- We use a **static method** when we are not working with a particular object. That's why they're available on a class.

### The statics Property

Now we need to extract the schema to a constant so that we can use that constant to add a static method to it.

_rental.js_

```js
const rentalSchema = new mongoose.Schema({
  customer: {
      ...
  },
  movie: {
    ...
  },
  dateOut: {
    ...
  },
  dateReturned: {
    ...
  },
  rentalFee: {
    ...
  }
})
```

_rentalSchema_ has a property called _statics_, which returns an object, and in this object we can define the static methods in the _Rental_ class. We set it to a function, and this function should take two paramters, _customerId_ and _movieId_.

Here we don't need to define a separate constant, we're going to return the result immediately.

Also, we don't need to await here and we **simply return the Promise that we get from _findOne_ method and let the caller of the _lookup_ method await that Promise**.

```js
// When using "this" keyword, you cannot use the arrow function syntax!
rentalSchema.statics.lookup = function (customerId, movieId) {
  return this.findOne({  // this references the Rental class
    'customer._id': customerId,
    'movie._id': movieId
  });
}

const Rental = mongoose.model('Rental', rentalSchema);

```

_returns.js_

```js
...

router.post('/', [auth, validate(validateReturn)], async (req, res) => {
  const rental = await Rental.lookup(req.body.customerId, req.body.movieId);

...

```

The benefit of having automated tests while doing this refactoring is that when you make a mistake, these tests will tell you immediately that this refactoring is not working.

If we did not have these tests, we would have to fire up postman, and keep calling up this endpoint with different values to make sure all different edge cases are working, which is very tedious. And the problem is, as our application grows larger and larger, manually testing all these execution paths becomes very costly, and sometimes impossible.

It is possible that sometimes you deploy our application to the production and have bugs you are not aware of. This can be very costly to the business that is using your software. That's why we write automated tests. It will take some time and require some effort and learning curve, but these tests help us catch bugs earlier in the software development life cycle.

## Refactoring the Domain Logic

Currently, this route handler is too busy calculating what should happen to the state of this rental object.

_returns.js_
```js
...
router.post('/', [auth, validate(validateReturn)], async (req, res) => {

  ...

  this.dateReturned = new Date();

  const rentalDays = moment().diff(this.dateOut, 'days');
  this.rentalFee = rentalDays * this.movie.dailyRentalRate;

  ...

```

### Information Expert Principle

**Any logic that modifies the state of an object should be encapsulated in that object itself.**

All this logic that we have here is based on the state of the _rental_. 

- We are looking at the _rental.dateOut_,
- based on that we calculate the _rentalDays_, and
- based on that we calculate the _rentalFee_.

So, all this logic can be encapsulated in the _rental_ object itself.

### Instance Methods

Now we're going to modify a rental object and add a new method called _return()_. When we call this method, it will set the return date to Now and calculate the rental fee.

We need an instance method because this method should be available on a rental object. Instead of the statics property we use a **methods** property.

_rental.js_

```js
// Replace "rental" with "this"

rentalSchema.methods.return = function () {
  this.dateReturned = new Date();

  const rentalDays = moment().diff(this.dateOut, 'days');
  this.rentalFee = rentalDays * this.movie.dailyRentalRate;
}
```

_returns.js_

```js
router.post('/', [auth, validate(validateReturn)], async (req, res) => {
  ...

  rental.return();  // added
  await rental.save();

  ...

```

Back to the terminal, there is an error:

```shell
error: moment is not defined ReferenceError: moment is not defined
    at model.moment (/Users/yihsiulee/GoogleDrive/ExerciseFiles/NodeJS/Udemy/Node-js-The-Complete-Guide-to-Build-RESTful-APIs/movie-project/models/rental.js:73:22)
```

Again, the beauty of automated tests! Without this test we had to manually test every edge case.

Because we cut the logic and paste it into a different file, we need to import the module used in this logic.

_rental.js_

```js
const moment = require('moment');

```

Now, back to the terminal, all tests are passing. Beautiful!

### Response Code 200

Actually, we don't have to explicitly set the status to 200 because _Express_ will set that by default.

_returns.js_

```js
router.post('/', [auth, validate(validateReturn)], async (req, res) => {
  ...

  // return res.status(200).send(rental)
  return res.send(rental);
  
});

```

