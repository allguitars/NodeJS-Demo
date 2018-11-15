const mongoose = require('mongoose');

module.exports = function (req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(404).send('Invalid ID');

  // If the id is valid, pass to the next middleware, the route handler
  next();
}
