'use strict';

var fs = require('fs');
var bouncy = require('bouncy');

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

var server = bouncy(function (req, res, bounce) {
  var host = hosts[req.headers.host];
  if (host && host.port) {
    bounce(host.port);
  } else {
    res.statusCode = 404;
    res.end('no such host');
  }
});

server.listen(80);
