const winston = require('winston');
const express = require('express');
const app = express();

require('./startup/logging')();
require('./startup/routes')(app);
require('./startup/db')();
require('./startup/config')();
require('./startup/validation')();

const port = process.env.PORT || 3000;
app.listen(port, () => winston.info(`Listening on port ${port}...`));

// --------- Throw an exception for demo
// throw new Error('Something failed during startup.');
// --------- Make a promise rejection for demo
// const p = Promise.reject(new Error('Something failed miserably!'));
// p.then(() => console.log('Done'));