const winston = require('winston');
const mongoose = require('mongoose');
const config = require('config');

// module.exports = function () {
//   const db = config.get('db')
//   mongoose
//     .connect(db)
//     .then(() => winston.info(`Connected to ${db}...`));
// };

// For Wise-PaaS to work
module.exports = function () {
  const vcap_services = JSON.parse(process.env.VCAP_SERVICES);
  // console.log(vcap_services);
  // console.log(VCAP_SERVICES);
  const replicaSetName = vcap_services['mongodb'][0].credentials.replicaSetName;
  const db = vcap_services['mongodb'][0].credentials.uri + '?replicaSet=' + replicaSetName;
  // const mongo_database = vcap_services['mongodb-develop'][0].credentials.database;
  // const mongo_host1 = vcap_services['mongodb-develop'][0].credentials.host1;
  // const mongo_port1 = vcap_services['mongodb-develop'][0].credentials.port1;
  // const mongo_user = vcap_services['mongodb-develop'][0].credentials.username;
  // const mongo_password = vcap_services['mongodb-develop'][0].credentials.password;

  mongoose
    .connect(db)
    .then(() => winston.info(`Connected to ${db}...`));
};


