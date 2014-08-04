'use strict';

var fs = require('fs');
var path = require('path');
var argv = require('minimist')(process.argv.slice(2));
var pack = require('tar-pack').pack;
var rimraf = require('rimraf').sync;

var dir = __dirname + '/../apps/' + argv.app + '/' + argv.version;

pack(path.resolve(dir + '/package'), {ignoreFiles: []})
  .pipe(fs.createWriteStream(path.resolve(dir + '/package.tgz')))
  .on('close', function () {
    rimraf(path.resolve(dir + '/package'));
    rimraf(path.resolve(dir + '/initial.tgz'));
  });
