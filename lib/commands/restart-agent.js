'use strict';

module.exports = restart;
module.exports.description = 'Restarts the bouncy proxy that is responsible for mapping hosts onto ports';
module.exports.options = [];

function restart(connection) {
  return connection.exec([
    'cd ~/ssh-deploy-agent',
    'forever stop ssh-deploy-agent',
  ]).then(null, function () {}).then(function () {
    return connection.exec([
      'cd ~/ssh-deploy-agent',
      'forever start -a --uid ssh-deploy-agent server.js'
    ]);
  });
}
