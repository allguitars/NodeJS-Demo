# Test-driven Development (TDD)

- A approach to build software.
- Also called Test-first.
- **You wirte your tests before writing the application or production code**.

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
    server.close();
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

