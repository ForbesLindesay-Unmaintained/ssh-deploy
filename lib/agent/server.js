'use strict';

var fs = require('fs');
var http = require('http');
var httpProxy = require('http-proxy');

var hosts = {};

function update() {
  fs.readFile('../hosts.json', 'utf8', function (err, res) {
    if (err) {
      console.error(err.stack || err);
      return done();
    }
    try {
      hosts = JSON.parse(res);
    } catch (ex) {
      console.error(ex.stack || ex);
    }
    return done();
  });
  function done() {
    setTimeout(update, 2000);
  }
}
update();

var proxy = httpProxy.createProxyServer({});

proxy.on('error', function (err, req, res) {
  if (err.code !== 'ECONNRESET') {
    // ECONRESET occurs whenever the client cancels the request
    // other error codes are usually not fatal
    console.error(err.stack || err);
  }
  req.destroy();
  res.destroy();
});

var server = http.createServer(function (req, res) {
  var host = hosts[req.headers.host];
  if (host && host.port) {
    proxy.web(req, res, {target: 'http://127.0.0.1:' + host.port});
  } else {
    res.statusCode = 404;
    res.end('no such host');
  }
});

server.listen(80);
