'use strict';

var fs = require('fs');
var Promise = require('promise');
var SSHConnection = require('ssh2');
var getConnection = require('./connection.js');

module.exports = function (remote, debug) {
  return new SSH(remote, debug);
};
function SSH(remote, debug) {
  var connection = new SSHConnection();
  this.connection = connection;
  this.debug = debug;
  this.ready = getConnection(remote).then(function (remote) {
    return new Promise(function (resolve, reject) {
      connection.on('error', reject);
      connection.on('ready', resolve);
      connection.connect(remote);
    });
  });
}
SSH.prototype.exec = function (commands, options) {
  if (Array.isArray(commands)) commands = commands.join(' && ');
  var connection = this.connection;
  var debug = this.debug;
  if (debug) {
    console.log('DEBUG ' + commands);
  }
  debug = debug || (options ? options.silent === false : false);
  var timeout = (options ? options.timeout : 0) || 60000;
  var timer;
  return this.ready = this.ready.then(null, noop).then(function () {
    return new Promise(function (resolve, reject) {
      function refreshTimer() {
        clearTimeout(timer);
        timer = setTimeout(function () {
          reject(new Error('Operation timed out'));
        }, timeout);
      }
      var exitCode = 1;
      connection.exec(commands, function(err, stream) {
        var stream_output = '';
        var err_output = '';
        stream.on('data', function(data) {
          stream_output += data.toString();
          if (debug) {
            process.stdout.write(data);
          }
        });
        stream.stderr.on('data', function (data) {
          err_output += data.toString();
          if (debug) {
            process.stderr.write(data);
          }
        });
        var pending = 3;
        stream.on('end', function () {
          if (debug) {
            console.log('stdout end');
          }
          if (0 === --pending) {
            if (exitCode === 0) resolve(stream_output);
            else reject(new Error('Command existed with code ' + exitCode + ':\n\n' + stream_output + '\n\n' + err_output));
          }
        });
        stream.stderr.on('end', function () {
          if (debug) {
            console.log('stderr end');
          }
          if (0 === --pending) {
            if (exitCode === 0) resolve(stream_output);
            else reject(new Error('Command existed with code ' + exitCode + ':\n\n' + stream_output + '\n\n' + err_output));
          }
        });
        stream.on('exit', function(code) {
          if (debug) {
            console.log('exit ' + code);
          }
          exitCode = code;
          if (0 === --pending) {
            if (exitCode === 0) resolve(stream_output);
            else reject(new Error('Command existed with code ' + exitCode + ':\n\n' + stream_output + '\n\n' + err_output));
          }
        });
      });
    });
  });
};
SSH.prototype.sftp = function () {
  var connection = this.connection;
  return this.ready = this.ready.then(null, noop).then(function () {
    return new Promise(function (resolve, reject) {
      connection.sftp(function (err, sftp) {
        if (err) reject(err);
        else resolve(sftp);
      });
    });
  });
};
SSH.prototype.stat = function (path) {
  return this.ready = this.sftp().then(function (sftp) {
    return new Promise(function (resolve, reject) {
      sftp.stat(path, function (err, res) {
        if (err) reject(err);
        else resolve(res);
      });
    }).then(function (res) {
      sftp.end();
      return res;
    }, function (err) {
      sftp.end();
      throw err;
    });
  });
};
SSH.prototype.mkdir = function (path) {
  return this.ready = this.sftp().then(function (sftp) {
    return new Promise(function (resolve, reject) {
      sftp.mkdir(path, function (err, res) {
        if (err) reject(err);
        else resolve(res);
      });
    }).then(function (res) {
      sftp.end();
      return res;
    }, function (err) {
      sftp.end();
      throw err;
    });
  });
};
SSH.prototype.upload = function (source, destination) {
  if (typeof source === 'string') source = fs.createReadStream(source);
  return this.ready = this.sftp().then(function (sftp) {
    return new Promise(function (resolve, reject) {
      destination = sftp.createWriteStream(destination);
      source.on('error', reject);
      destination.on('error', reject);
      destination.on('close', resolve);
      source.pipe(destination);
    }).then(function () {
      sftp.end();
    }, function (err) {
      sftp.end();
      throw err;
    });
  });
};
SSH.prototype.download = function (source, destination) {
  if (typeof destination === 'string') destination = fs.createWriteStream(destination);
  return this.ready = this.sftp().then(function (sftp) {
    return new Promise(function (resolve, reject) {
      source = sftp.createReadStream(source);
      source.on('error', reject);
      destination.on('error', reject);
      destination.on('close', resolve);
      source.pipe(destination);
    }).then(function () {
      sftp.end();
    }, function (err) {
      sftp.end();
      throw err;
    });
  });
};
SSH.prototype.close = function () {
  var connection = this.connection;
  return this.ready = this.ready.then(null, noop).then(function () {
    connection.end();
  }, function (err) {
    connection.end();
    throw err;
  });
};

function noop() {
}
