'use strict';

var fs = require('fs');
var path = require('path');
var argv = require('minimist')(process.argv.slice(2));
var rimraf = require('rimraf').sync;
var unpack = require('tar-pack').unpack;

rimraf(path.resolve(__dirname + '/../instances/' + argv.host + '/' + argv.instance));
fs.createReadStream(path.resolve(__dirname + '/../apps/' + argv.app + '/' + argv.version + '/package.tgz'))
  .pipe(unpack(path.resolve(__dirname + '/../instances/' + argv.host + '/' + argv.instance)));
