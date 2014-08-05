'use strict';

var assert = require('assert');
var Promise = require('promise');
var prepare = require('./prepare.js');
var toStream = require('../to-stream.js');

module.exports = start;
module.exports.description = 'Start or restart an application at a given host and version.';
module.exports.options = ['app', 'version', 'host'];

function start(connection, options) {
  var app = options.app;
  var version = options.version;
  var host = options.host;
  if (!host || typeof host !== 'string') {
    throw new Error('You must provide a value for options.host');
  }

  var hosts, instance;
  return prepare(connection).then(function () {
    versionExists(connection, app, version);
  }).then(function () {
    return getHosts(connection);
  }).then(function (_hosts) {
    hosts = _hosts;
    hosts[host] = (hosts[host] || {instance: 'blue'});
    instance = (hosts[host].instance = hosts[host].instance === 'blue' ? 'green' : 'blue');

    console.log(' - exec stop ' + host + '-' + instance);
    return connection.exec(['forever stop ' + host + '-' + instance]).then(console.log.bind(console), function () {});
  }).then(function () {
    console.log(' - exec extract ' + app + '@' + version);
    return connection.exec([
      'cd ssh-deploy-agent',
      'node extract-version --app ' + app + ' --version ' + version + ' --host ' + host + ' --instance ' + instance,
    ]).then(console.log.bind(console));
  }).then(function () {
    return connection.exec([
      'cd ssh-deploy-agent',
      'node get-port'
    ]);
  }).then(function (port) {
    port = port.trim();
    assert(/^\d+$/.test(port));
    hosts[host].port = port;
    return connection.exec('cat instances/' + host + '/environment.sh').then(null, function () { return ''; });
  }).then(function (env) {
    console.log(' - starting ' + host + ' on port ' + hosts[host].port + ' as ' + instance);
    console.dir((env.split('\n').some(Boolean) ? env.split('\n').filter(Boolean).join(' ') + ' ' : ''));
    return connection.exec([
      'cd ~/instances/' + host + '/' + instance,
      (env.split('\n').some(Boolean) ? env.split('\n').filter(Boolean).map(function (value) {
        return value.split('=')[0] + '="' + value.split('=').slice(1).join('=') + '"';
      }).join(' ') + ' ' : '') +
      'PORT=' + hosts[host].port + ' forever start ' +
        '--uid "' + host + '-' + instance + '" ' +
        '-a -l "' + host + '-' + version + '.log" ' +
        '-o "../' + version + '-stdout.log" ' +
        '-e "../' + version + '-stderr.log" ' +
        'server.js'
    ]).then(console.log.bind(console));
  }).then(function () {
    return new Promise(function (resolve) { setTimeout(resolve, 2000); });
  }).then(function () {
    connection.upload(toStream(JSON.stringify(hosts, null, '  ')), 'hosts.json');
  }).then(function () {
    return new Promise(function (resolve) { setTimeout(resolve, 10000); });
  }).then(function () {
    var otherInstance = instance === 'blue' ? 'green' : 'blue';
    console.log(' - exec stop ' + host + '-' + otherInstance);
    return connection.exec(['forever stop --killSignal SIGTERM ' + host + '-' + otherInstance]).then(console.log.bind(console), function () {});
  }).then(function () {
    return connection.exec([
      'cd ~/instances/' + host,
      'cat "' + version + '-stdout.log"',
      'cat "' + version + '-stderr.log"'
    ]).then(console.log.bind(console));
  });
}

function versionExists(connection, app, version) {
  return connection.stat('apps/' + app + '/' + version + '/package.tgz').then(function (stat) {
    // version exists
  }, function (err) {
    if (err.message !== 'No such file') throw err;
    else throw new Error('Cannot find version ' + JSON.stringify(version) + ' of ' + JSON.stringify(app));
  });
}

function getHosts(connection) {
  return connection.exec('cat hosts.json').then(function (res) {
    return JSON.parse(res);
  }, function () {
    return {};
  });
}
