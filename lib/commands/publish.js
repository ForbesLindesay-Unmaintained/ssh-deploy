'use strict';

var Promise = require('promise');
var pack = require('tar-pack').pack;
var StreamNpm = require("fstream-npm");
var prepare = require('./prepare.js');

// 1. check the app isn't already published at this version & cleanup if it has been partially published
// 2. upload the app
// 3. unpackage the app
// 4. install dependencies of the app
// 5. repackage the app and cleanup build artifacts

module.exports = publish;
module.exports.description = 'Publish a new version of an application.';
module.exports.options = ['directory', 'app', 'version'];

function publish(connection, options) {
  var directory = options.directory;
  var app = options.app;
  var version = options.version;
  console.log('Deploying ' + app + '@' + version);
  return Promise.resolve(null).then(function () {
    console.log(' - exec prepare');
    return prepare(connection)
  }).then(function () {
    return connection.exec([
      'cd ~/ssh-deploy-agent',
      'node clear-version --app ' + app + ' --version ' + version
    ]);
  }).then(function () {
    console.log(' - upload');
    return connection.upload(pack(StreamNpm(directory)), 'apps/' + app + '/' + version + '/initial.tgz');
  }).then(function () {
    console.log(' - exec extract');
    return connection.exec([
      'cd ~/ssh-deploy-agent',
      'node extract-initial --app ' + app + ' --version ' + version
    ]).then(console.log.bind(console));
  }).then(function () {
    console.log(' - exec install');
    function installAttempt(n) {
      return connection.exec([
        'cd ~/apps/' + app + '/' + version + '/package',
        'npm install --production'
      ], {silent: false}).then(null, function (err) {
        if (n > 4) throw err;
        else return installAttempt(n + 1);
      });
    }
    return installAttempt(0);
  }).then(function () {
    console.log(' - exec repackage');
    return connection.exec([
      'cd ~/ssh-deploy-agent',
      'node package-initial --app ' + app + ' --version ' + version
    ]).then(console.log.bind(console));
  });
}
