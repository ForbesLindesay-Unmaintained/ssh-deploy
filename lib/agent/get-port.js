'use strict';

require('getport')(4000, function (err, port) {
  if (err) throw err;
  console.log(port);
});
