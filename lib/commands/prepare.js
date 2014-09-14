'use strict';

var fs = require('fs');
var path = require('path');
var Promise = require('promise');
var semver = require('semver');

var readdir = Promise.denodeify(fs.readdir);

var AGENT_DIR = path.resolve(__dirname + '/../agent');

// 1. check for deployed version of agent and stop if it matches current version
// 2. stop the agent if it is already running (an old version)
// 3. create a directory for the agent
// 4. upload the agent
// 5. install dependencies for the agent
// 6. install forever
// 7. start the agent

module.exports = prepare;
module.exports.description = 'Prepare a server to be used for ssh-deploy';
module.exports.options = [];

function prepare(connection) {
  function update() {
    return Promise.all([
      readdir(AGENT_DIR),
      connection.exec('forever stop ssh-deploy-agent').then(null, function () {}),
      connection.mkdir('ssh-deploy-agent').then(null, function () {})
    ]).then(function (res) {
      var files = res[0];
      return Promise.all(files.map(function (file) {
        if (file === 'node_modules') return;
        return connection.upload(AGENT_DIR + '/' + file, 'ssh-deploy-agent/' + file);
      }));
    }).then(function () {
      return connection.exec([
        'cd ~/ssh-deploy-agent',
        'npm install --production',
        'npm install forever -g',
        'forever start -a --uid ssh-deploy-agent server.js'
      ]);
    });
  }
  return connection.exec('cat ~/ssh-deploy-agent/package.json').then(function (res) {
    var pkg = JSON.parse(res);
    var expectedVersion = require('../../package.json').version;
    if (semver.gt(expectedVersion, pkg.version)) {
      console.log('Out of date ssh-deploy-agent, deploying new ssh-deploy-agent');
      return update();
    } else if (pkg.version !== expectedVersion) {
      console.log('Servers version of ssh-deploy-agent is greater than client version.');
      console.log('');
      console.log('Aborting command, update to the latest version of ssh-deploy before retrying:');
      console.log('');
      console.log('  npm install ssh-deploy --global');
      process.exit(1);
    }
  }, function () {
    console.log('Could not find ssh-deploy-agent, deploying new ssh-deploy-agent');
    return update();
  });
}
