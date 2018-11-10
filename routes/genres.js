const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { Genre, validate } = require('../models/genre');
const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();

// Get all genres
router.get('/', async (req, res) => {
  // throw new Error('Could not get the genres.');
  const genres = await Genre.find().sort('name');
  res.send(genres);
});

// Add a new genre
router.post('/', auth, async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const genre = new Genre({ name: req.body.name });
  await genre.save();
  res.send(genre);
});

// Update a genre
router.put('/:id', auth, async (req, res) => {
  // Validate the input of genre. If invalid, return 400 - Bad request
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const genre = await Genre.findByIdAndUpdate(
    req.params.id,
    { name: req.body.name },
    { new: true }
  );

  if (!genre)
    return res.status(404).send('The genre with the given ID was not found!');

  res.send(genre);
});

// Only an admin can delete the genre.
router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    const genre = await Genre.findByIdAndRemove(req.params.id);

    if (!genre)
      return res.status(404).send('The genre with given id was not found!');

    res.send(genre);
  } catch (ex) {
    console.log(ex.message);
    res.status(400).send('Bad request...');
  }
});

// Get a single genre
router.get('/:id', async (req, res) => {
  const genre = await Genre.findById(req.params.id);

  if (!genre)
    return res.status(404).send('The genre with given id was not found!');

  res.send(genre);
});

module.exports = router;
