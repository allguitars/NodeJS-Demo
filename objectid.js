// This code is to try to explicitly generate an objectID

const mongoose = require('mongoose');

const id = new mongoose.Types.ObjectId();

console.log(id.getTimestamp());

const isValid = mongoose.Types.ObjectId.isValid('1234');
console.log(isValid);
