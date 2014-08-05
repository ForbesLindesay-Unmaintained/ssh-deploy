'use strict';

var fs = require('fs');
var Promise = require('promise');
var ssh = require('./lib/ssh.js');

var read = Promise.denodeify(fs.readFile);

var version = require('./package.json').version;
var agent = JSON.parse(fs.readFileSync(__dirname + '/lib/agent/package.json', 'utf8'));
if (agent.version !== version) {
  agent.version = version;
  fs.writeFileSync(__dirname + '/lib/agent/package.json', JSON.stringify(agent, null, '  ') + '\n');
}

function addCommand(name) {
  var fn = require('./lib/commands/' + name);
  exports[name] = function (remote, options) {
    var connection = ssh(remote, options && options.debug);
    options = options || {};
    var pkg = options.directory ? read(options.directory + '/package.json', 'utf8').then(JSON.parse) : Promise.resolve({});
    return pkg.then(function (pkg) {
      options.app = options.app || pkg.name;
      options.version = options.version || pkg.version;
      options.host = options.host || pkg.host;
      fn.options.forEach(function (option) {
        if (!options[option] || typeof options[option] !== 'string') {
          throw new Error('You mut provide a value for ' + option);
        }
      });
      return fn(connection, options);
    }).then(function () {
      return connection.close();
    }, function (err) {
      connection.close();
      throw err;
    });
  };
  exports[name].description = fn.description;
  exports[name].options = fn.options;
}

fs.readdirSync(__dirname + '/lib/commands').forEach(function (command) {
  addCommand(command.replace(/\.js$/, ''));
});


// exports['restart-agent']('dashboard').done();
// exports.publish('dashboard', { directory: __dirname + '/../dashboard.forbeslindesay.co.uk' }).done();
// exports['env-list']('dashboard', {host: 'dashboard.forbeslindesay.co.uk'}).done();
// exports['env-set']('dashboard', {host: 'dashboard.forbeslindesay.co.uk', name: 'NAME', value: 'ForbesLindesay'}).done();
// exports.start('dashboard', {app: 'dashboard.forbeslindesay.co.uk',host: 'dashboard.forbeslindesay.co.uk',version: '0.0.6'}).done();
