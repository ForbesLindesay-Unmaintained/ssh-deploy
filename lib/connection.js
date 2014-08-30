'use strict';

var fs = require('fs');
var Promise = require('promise');
var sshConfig = require('sshconf-stream');
var resolvePath = require('./resolve.js');

var readFile = Promise.denodeify(fs.readFile);

module.exports = getConfig;
module.exports.getAutoCompleteList = getAutoCompleteList;
function getConfig(name) {
  return readConfig(name).then(function (remote) {
    return remote || parse(name) || name;
  }).then(function (remote) {
    if (typeof remote === 'string') {
      throw new Error('Could not find ' + remote);
    }
    if (!remote.identityfile) {
      return remote;
    }
    return readFile(resolvePath(remote.identityfile), 'utf8').then(function (privateKey) {
      delete remote.identityfile;
      remote.privateKey = privateKey;
      return remote;
    });
  });
}
function getAutoCompleteList() {
  return new Promise(function (resolve, reject) {
    var result = [];
    var source = fs.createReadStream(resolvePath('~/.ssh/config'));
    var parser = sshConfig.createParseStream();
    source.on('error', function (err) {
      if (err.code === 'ENOENT') resolve(null);
      else reject(err);
    });
    parser.on('error', reject);
    parser.on('data', function(host) {
      var remote = {};
      for (var k in host.keywords) {
        remote[k.toLowerCase()] = host.keywords[k][0];
      }
      result.push(remote.host);
    });
    parser.on('end', resolve.bind(null, result));
    source.pipe(parser);
  });
}
function readConfig(name) {
  return new Promise(function (resolve, reject) {
    var source = fs.createReadStream(resolvePath('~/.ssh/config'));
    var parser = sshConfig.createParseStream();
    source.on('error', function (err) {
      if (err.code === 'ENOENT') resolve(null);
      else reject(err);
    });
    parser.on('error', reject);
    parser.on('data', function(host) {
      var remote = {};
      for (var k in host.keywords) {
        remote[k.toLowerCase()] = host.keywords[k][0];
      }
      if (remote.host === name) {
        resolve({
          username: remote.user || process.env.USER,
          host: remote.hostname,
          identityfile: remote.identityfile || '~/.ssh/id_rsa'
        });
      }
    });
    parser.on('end', resolve.bind(null, null));
    source.pipe(parser);
  });
}

function parse(remote) {
  if (typeof remote === 'string') {
    // username:password@host
    // or
    // user@host
    var regex = /^([a-zA-Z0-9\-\.]+)(\:.*)?@(.+)$/;
    var m = regex.exec(remote);
    if (!m) {
      return {
        username: process.env.USER,
        host: remote,
        identityfile: '~/.ssh/id_rsa'
      };
    }
    var ret = {
      username: m[1],
      host: m[3]
    };
    if (m[2]) {
      ret.password = m[2].slice(1);
    } else {
      ret.identityfile = '~/.ssh/id_rsa'
    }
    return ret;
  }
};
