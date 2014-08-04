'use strict';

var fs = require('fs');
var path = require('path');
var Promise = require('promise');
var pack = require('tar-pack').pack;
var StreamNpm = require("fstream-npm");
var ssh = require('./lib/ssh.js');
var read = Promise.denodeify(fs.readFile);

function publish(remote, directory) {
  return read(directory + '/package.json', 'utf8').then(function (pkg) {
    pkg = JSON.parse(pkg);
    var name = pkg.name;
    var version = pkg.version;
    console.log('Deploying ' + name + '@' + version);
    var connection = ssh(remote);
    return connection.stat(name + '/' + version + '/package.tgz').then(function (stat) {
      throw new Error('Version ' + version + ' already exists.  You must increase the version number to deploy (or add the force option).');
    }, function (err) {
      if (err.message !== 'No such file') throw err;
    }).then(function () {
      console.log(' - mkdir');
      return connection.mkdir(name).then(null, function () {}).then(function () {
        return connection.mkdir(name + '/' + version).then(null, function () {});
      });
    }).then(function () {
      console.log(' - exec prepare');
      return  connection.exec([
        'cd deployment-utils',
        'npm install tar-pack rimraf',
        'node -e "' +
          "var path = require('path');" +
          "var rimraf = require('rimraf').sync;" +
          "rimraf(path.resolve(__dirname + '/../" + name + "/" + version + "/package'));" +
          "rimraf(path.resolve(__dirname + '/../" + name + "/" + version + "/initial.tgz'));" +
          "rimraf(path.resolve(__dirname + '/../" + name + "/" + version + "/package.tgz'));" + '"'
      ]).then(console.log.bind(console));
    }).then(function () {
      console.log(' - upload');
      return connection.upload(pack(StreamNpm(directory)), name + '/' + version + '/initial.tgz');
    }).then(function () {
      return connection.mkdir('deployment-utils').then(null, function () {});
    }).then(function () {
      console.log(' - exec unpack');
      return connection.exec([
        'cd deployment-utils',
        'node -e "' +
          "var fs = require('fs');" +
          "var path = require('path');" +
          "var unpack = require('tar-pack').unpack;" +
          "fs.createReadStream(path.resolve(__dirname + '/../" + name + "/" + version + "/initial.tgz'))" +
            ".pipe(unpack(path.resolve(__dirname + '/../" + name + "/" + version + "/package')));" + '"',
      ]).then(console.log.bind(console));
    }).then(function () {
      console.log(' - exec install');
      return connection.exec([
        'cd ' + name + '/' + version + '/package',
        'npm install --production',
      ]).then(console.log.bind(console));
    }).then(function () {
      console.log(' - exec repack');
      return connection.exec([
        'cd deployment-utils',
        'node -e "' +
          "var fs = require('fs');" +
          "var path = require('path');" +
          "var pack = require('tar-pack').pack;" +
          "pack(path.resolve(__dirname + '/../" + name + "/" + version + "/package'), {ignoreFiles: []})" +
            ".pipe(fs.createWriteStream(path.resolve(__dirname + '/../" + name + "/" + version + "/package.tgz')));" + '"',
        'node -e "' +
          "var path = require('path');" +
          "var rimraf = require('rimraf').sync;" +
          "rimraf(path.resolve(__dirname + '/../" + name + "/" + version + "/package'));" +
          "rimraf(path.resolve(__dirname + '/../" + name + "/" + version + "/initial.tgz'));" + '"'
      ]).then(console.log.bind(console));
    }).then(function () {
      return connection.close();
    }, function (err) {
      connection.close();
      throw err;
    });
  });
}

function start(remote, name, version, options) {
  var environmentName = options.environmentName || name;
  var connection = ssh(remote);
  return connection.stat(name + '/' + version + '/package.tgz').then(function (stat) {
    // version exists
  }, function (err) {
    if (err.message !== 'No such file') throw err;
    else throw new Error('Cannot find version ' + JSON.stringify(version) + ' of ' + JSON.stringify(name));
  }).then(function () {
    console.log(' - exec prepare');
    return connection.exec([
      'cd deployment-utils',
      'npm install forever -g',
      'npm install tar-pack rimraf'
    ]).then(console.log.bind(console));
  }).then(function () {
    console.log(' - exec stop ' + environmentName);
    return connection.exec(['forever stop ' + environmentName]).then(console.log.bind(console), function () {});
  }).then(function () {
    console.log(' - exec extract ' + name + '@' + version);
    return connection.exec([
      'cd deployment-utils',
      'node -e "' +
        "var fs = require('fs');" +
        "var path = require('path');" +
        "var rimraf = require('rimraf').sync;" +
        "var unpack = require('tar-pack').unpack;" +
        "rimraf(path.resolve(__dirname + '/../" + environmentName + "/live'));" +
        "fs.createReadStream(path.resolve(__dirname + '/../" + name + "/" + version + "/package.tgz'))" +
          ".pipe(unpack(path.resolve(__dirname + '/../" + environmentName + "/live')));" + '"',
    ]).then(console.log.bind(console));
  }).then(function () {
    console.log(' - read environment');
    return connection.exec([
      'cd ' + environmentName,
      'cat environment.txt'
    ]).then(null, function (err) {
      if (/No such file or directory/.test(err.message)) return '';
      else throw err;
    });
  }).then(function (environment) {
    console.log(' - exec start ' + environmentName);
    if (environment) {
      environment = environment.split('\n').filter(Boolean).join(' ') + ' ';
    } else {
      environment = '';
    }
    return connection.exec([
      'cd ' + environmentName + '/live',
      environment + 'forever start ' +
        '--uid "' + environmentName + '" ' +
        '-a -l "' + environmentName + '-' + version + '.log" ' +
        '-o "../' + version + '-stdout.log" ' +
        '-e "../' + version + '-stderr.log" ' +
        'server.js'
    ]).then(console.log.bind(console));
  }).then(function () {
    return new Promise(function (resolve) { setTimeout(resolve, 2000); });
  }).then(function () {
    return connection.exec([
      'cd ' + environmentName,
      'cat "' + version + '-stdout.log"',
      'cat "' + version + '-stderr.log"'
    ]).then(console.log.bind(console));
  }).then(function () {
    return connection.close();
  }, function (err) {
    connection.close();
    throw err;
  });
}

function getEnvironment(remote, name) {
}

// publish(HOST, __dirname + '/../../dashboard.forbeslindesay.co.uk').done();
// start(HOST, 'dashboard.forbeslindesay.co.uk', '0.0.2').done();
