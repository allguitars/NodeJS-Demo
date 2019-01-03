const request = require('supertest');
const { Genre } = require('../../models/genre');
const { User } = require('../../models/user');
const mongoose = require('mongoose');

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

    it('should return 404 if invalid id is passed', async () => {
      const res = await request(server).get('/api/genres/1');
      expect(res.status).toBe(404);
    });

    it('should return 404 if no genre with the given id exists', async () => {
      // Instead of sending 1, we send a valid object id here.
      const id = mongoose.Types.ObjectId();
      const res = await request(server).get('/api/genres/' + id);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /', () => {

    // Define the happy path, and then in each test, we change one parameter
    // that clearly aligns with the name of the test.
    let token;
    let name;

    // The code for the happy path
    const exec = async () => {
      return await request(server)
        .post('/api/genres')
        .set('x-auth-token', token)
        .send({ name }); // ES6 format - equals to .send({ name: name })
    }

    // Set the values for the happy path
    beforeEach(() => {
      token = User().generateAuthToken();
      name = 'genre1';
    });


    it('should return 401 if the client is not logged in', async () => {
      // The only difference between this test and the happy path is that
      // this test will not have a valid token so we set the token to ''.
      token = '';

      const res = await exec();

      expect(res.status).toBe(401);
    });

    it('should return 400 if genre is less than 5 characters', async () => {
      // This code clearly aligns with the test description - less than 5 chars
      name = '1234';

      const res = await exec();

      expect(res.status).toBe(400);
    });

    it('should return 400 if genre is more than 50 characters', async () => {
      // Clearly aligns with the test description - more than 50 chars
      name = new Array(52).join('a');

      const res = await exec();

      expect(res.status).toBe(400);
    });

    // Happy path 1
    it('should save the genre if it is valid', async () => {
      // We don't need to get the res because we are not using it here
      await exec();

      const genre = await Genre.find({ name: 'genre1' });
      expect(genre).not.toBeNull(); // Matcher function
    });

    // Happy path 2
    it('should return the genre if it is valid', async () => {
      const res = await exec();

      expect(res.body).toHaveProperty('_id'); // Don't care the value.
      expect(res.body).toHaveProperty('name', 'genre1');
    });
  });
});