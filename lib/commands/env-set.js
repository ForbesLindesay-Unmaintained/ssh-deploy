'use strict';

var Promise = require('promise');
var concat = require('concat-stream');
var toStream = require('../to-stream.js');

module.exports = set;
module.exports.description = 'Set the value of an environment variables for a given host.';
module.exports.options = ['host', 'name', 'value'];

function set(connection, options) {
  var host = options.host;
  return connection.mkdir('instances').then(null, function () {}).then(function () {
    return connection.mkdir('instances/' + host).then(null, function () {});
  }).then(function () {
    return connection.exec('cat instances/' + host + '/environment.sh')
  }).then(null, function () {
    return '';
  }).then(function (src) {
    var env = {};
    src.split('\n').forEach(function (value) {
      value = value.split('=');
      if (value.length > 1) {
        env[value[0]] = value.slice(1).join('=');
      }
    });
    env[options.name] = options.value;
    var envString = Object.keys(env).map(function (key) {
      return key + '=' + env[key];
    }).join('\n');
    return connection.upload(toStream(envString), 'instances/' + host + '/environment.sh');
  });
}
