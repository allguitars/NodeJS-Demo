const winston = require('winston');
// require('winston-mongodb');
require('express-async-errors');

module.exports = function () {
  // process.on('uncaughtException', ex => {
  //   winston.error(ex.message, ex);
  //   process.exit(1);
  // });

  // Better than process.on()
  winston.handleExceptions(
    new winston.transports.Console({ colorize: true, prettyPrint: true }),
    new winston.transports.File({ filename: 'uncaughtExceptions.log' })
  );

  process.on('unhandledRejection', ex => {
    throw ex;
  });

  // for winston@3.0.0
  // winston.add(new winston.transports.File({ filename: 'logfile.log' }));
  // winston@2.4.0
  winston.add(winston.transports.File, { filename: 'logfile.log' });
  // winston.add(winston.transports.MongoDB, {
  //   db: 'mongodb://localhost/vidly',
  //   level: 'info'
  // });
};
