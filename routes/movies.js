const auth = require('../middleware/auth');
const { Genre } = require('../models/genre');
const { Movie, validate } = require('../models/movie');
const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  const movies = await Movie.find().sort('title');
  res.send(movies);
});

router.post('/', auth, async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // Find the genre by ID first
  try {
    const genre = await Genre.findById(req.body.genreId);
    if (!genre) return res.status(400).send('Invalid genre...');

    const movie = new Movie({
      title: req.body.title,
      numberInStock: req.body.numberInStock,
      dailyRentalRate: req.body.dailyRentalRate,
      genre: {
        _id: genre._id,
        name: genre.name
      }
    });
    await movie.save();
    res.send(movie);
  } catch (ex) {
    res.send(ex.message);
  }
});

// Update information for the movie
// We will not upate the genre and title because that will not change
router.put('/:id', auth, async (req, res) => {
  // Find the movie first for the old data
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie)
      return res.status(404).send('The movie with the given ID was not found!');

    if (req.body.numberInStock) movie.numberInStock = req.body.numberInStock;
    if (req.body.dailyRentalRate)
      movie.dailyRentalRate = req.body.dailyRentalRate;

    movie.save();
    res.send(movie);
  } catch (ex) {
    console.log(ex.message);
    res.status(400).send('Bad request...');
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const movie = await Movie.findByIdAndRemove(req.params.id);
    if (!movie)
      return res.status(404).send('The movie with given id was not found!');
    res.send(movie);
  } catch (ex) {
    console.log(ex.message);
    res.status(400).send('Bad request...');
  }
});

// Get a single movie
router.get('/:id', async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie)
    return res.status(404).send('The movie with given id was not found!');

  res.send(movie);
});

module.exports = router;
