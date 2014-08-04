'use strict';

var PassThrough = require('stream').PassThrough;

module.exports = toStream;
function toStream(buffer) {
  var stream = new PassThrough();
  stream.end(buffer);
  return stream;
}
