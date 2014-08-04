'use strict';

var fs = require('fs');
var Promise = require('promise');
var SSHConnection = require('ssh2');
var getConnection = require('./connection.js');

module.exports = function (remote) {
  return new SSH(remote);
};
function SSH(remote) {
  var connection = new SSHConnection();
  this.connection = connection;
  this.ready = getConnection(remote).then(function (remote) {
    return new Promise(function (resolve, reject) {
      connection.on('error', reject);
      connection.on('ready', resolve);
      connection.connect(remote);
    });
  });
}
SSH.prototype.exec = function (commands) {
  if (Array.isArray(commands)) commands = commands.join(' && ');
  var connection = this.connection;
  return this.ready = this.ready.then(null, noop).then(function () {
    return new Promise(function (resolve, reject) {
      var exitCode = 0;
      connection.exec(commands, function(err, stream) {
        var stream_output = '';
        var err_output = ''
        stream.on('data', function(data) {
          stream_output += data.toString();
        });
        stream.stderr.on('data', function (data) {
          err_output += data.toString();
        });
        var pending = 3;
        stream.on('end', function () {
          if (0 === --pending) {
            if (exitCode === 0) resolve(stream_output);
            else reject(new Error('Command existed with code ' + exitCode + ':\n\n' + stream_output + '\n\n' + err_output));
          }
        });
        stream.stderr.on('end', function () {
          if (0 === --pending) {
            if (exitCode === 0) resolve(stream_output);
            else reject(new Error('Command existed with code ' + exitCode + ':\n\n' + stream_output + '\n\n' + err_output));
          }
        });
        stream.on('exit', function(code) {
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
