'use strict';

var Promise = require('promise');
var concat = require('concat-stream');
var toStream = require('../to-stream.js');

module.exports = get;
module.exports.description = 'Get the value of an environment variable for a given host.';
module.exports.options = ['host', 'name'];

function get(connection, options) {
  var host = options.host;
  return connection.exec('cat instances/' + host + '/environment.sh').then(null, function () {
    return '';
  }).then(function (src) {
    var env = {};
    src.split('\n').forEach(function (value) {
      value = value.split('=');
      if (value.length > 1) {
        if (value[0] === options.name) {
          console.log(value.slice(1).join('='));
        }
      }
    });
  });
}
