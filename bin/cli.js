#!/usr/bin/env node

var argv = require('minimist')(process.argv.slice(2), {
  string: ['host', 'name', 'value', 'directory', 'app', 'version'],
  default: {
    directory: process.cwd()
  },
  alias: {
    help: 'h',
    host: 'H',
    name: 'n',
    value: 'V',
    app: 'a',
    version: 'v'
  }
});
var deploy = require('../');

var descriptions = {
  host: 'The host is the domain name that an application is made accessible at (defaults to host read from package.json)',
  name: 'The name of the environment variable',
  value: 'The value of the environment variable',
  directory: 'The directory of the application, defaults to the current working directory',
  app: 'The name of the application (defaults to name, read from package.json)',
  version: 'The version of teh application (default to version, read from package.json)'
};


if (argv.help || argv._[0] === 'help' || argv._.length < 2) {
  var commandLength = Object.keys(deploy).map(function (c) { return c.length; }).reduce(function (a, b) {
    return Math.max(a, b);
  }, 0);
  var optionLength = Object.keys(descriptions).map(function (o) { return o.length; }).reduce(function (a, b) {
    return Math.max(a, b);
  }, 0);
  Object.keys(deploy).sort().forEach(function (command) {
    if (argv._.length === 2 && argv._[1] !== command) {
      return;
    } else if (typeof argv.help === 'string' && argv.help !== command) {
      return;
    }
    var padding = '';
    while ((command.length + padding.length) < commandLength) {
      padding += ' ';
    }
    console.log();
    if (deploy[command].options.length) {
      console.log('ssh-deploy ' + command + padding + ' <remote> [options] ' + deploy[command].description);
      console.log();
      console.log('  options:');
      console.log();
      deploy[command].options.forEach(function (option) {
        var padding = '';
        while ((option.length + padding.length) < optionLength) {
          padding += ' ';
        }
        console.log('    --' + option + padding + ' ' + descriptions[option]);
      });
    } else {
      console.log('ssh-deploy ' + command + padding + ' <remote>           ' + deploy[command].description);
    }
  });
  console.log();
} else {
  deploy[argv._[0]](argv._[1], argv).done();
}
