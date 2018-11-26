# Test-driven Development (TDD)

- A approach to build the software.
- Also called Test-first Development.
- **Write your tests before writing the application or production code**.

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

