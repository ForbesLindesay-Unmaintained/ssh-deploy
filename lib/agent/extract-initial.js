'use strict';

var fs = require('fs');
var path = require('path');
var argv = require('minimist')(process.argv.slice(2));
var unpack = require('tar-pack').unpack;

fs.createReadStream(path.resolve(__dirname + '/../apps/' + argv.app + '/' + argv.version + '/initial.tgz'))
  .pipe(unpack(path.resolve(__dirname + '/../apps/' + argv.app + '/' + argv.version + '/package')));
