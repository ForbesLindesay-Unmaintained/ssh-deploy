'use strict';

var path = require('path');

module.exports = resolve;
function resolve(string) {
  if (string.substr(0, 1) === '~' && (process.env.HOME || process.env.USERPROFILE)) {
    string = (process.env.HOME || process.env.USERPROFILE) + string.substr(1);
  }
  return path.resolve(string);
}
