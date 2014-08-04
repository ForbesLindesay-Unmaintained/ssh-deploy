'use strict';

module.exports = list;
module.exports.description = 'Get the value of all environment variables for a given host.';
module.exports.options = ['host'];

function list(connection, options) {
  var host = options.host;
  return connection.exec('cat instances/' + host + '/environment.sh').then(console.log.bind(console));
}
