'use strict';

var path = require('path');
var fs = require('fs');
var argv = require('minimist')(process.argv.slice(2));
var rimraf = require('rimraf').sync;
var mkdirp = require('mkdirp').sync;

if (!argv.force) {
  try {
    fs.statSync(__dirname + '/../apps/' + argv.app + '/' + argv.version + '/package.tgz');
    console.error(argv.app + '@' + argv.version + ' already exists, you must increment the version or use --force to deploy.');
    process.exit(1);
  } catch (ex) {
    if (ex.code !== 'ENOENT') throw ex;
  }
}
rimraf(path.resolve(__dirname + '/../apps/' + argv.app + '/' + argv.version));
mkdirp(path.resolve(__dirname + '/../apps/' + argv.app + '/' + argv.version));
