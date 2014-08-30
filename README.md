

## Usage

```
ssh-deploy env-get       <remote> [options] Get the value of an environment variable for a given host.

  options:

    --host      The host is the domain name that an application is made accessible at
    --name      The name of the environment variable

ssh-deploy env-list      <remote> [options] Get the value of all environment variables for a given host.

  options:

    --host      The host is the domain name that an application is made accessible at

ssh-deploy env-set       <remote> [options] Set the value of an environment variables for a given host.

  options:

    --host      The host is the domain name that an application is made accessible at
    --name      The name of the environment variable
    --value     The value of the environment variable

ssh-deploy prepare       <remote>           Prepare a server to be used for ssh-deploy

ssh-deploy publish       <remote> [options] Publish a new version of an application.

  options:

    --directory The directory of the application, defaults to the current working directory
    --app       The name of the application (defaults to name, read from package.json)
    --version   The version of teh application (default to version, read from package.json)

ssh-deploy restart-agent <remote>           Restarts the bouncy proxy that is responsible for mapping hosts onto ports

ssh-deploy start         <remote> [options] Start or restart an application at a given host and version.

  options:

    --app       The name of the application (defaults to name, read from package.json)
    --version   The version of teh application (default to version, read from package.json)
    --host      The host is the domain name that an application is made accessible at
```

## API

Each command can also be accessed programatically by calling `deploy[command](remote, options)`, and will return a promise.  e.g.

```js
var deploy = require('ssh-deploy');
deploy.publish('root:password@127.0.0.1', {directory: process.cwd}).then(function () {
  return deploy.start('root:password@127.0.0.1', {directory: process.cwd, host: 'example.com'});
}).done(function () {
  console.log('updated deployment');
});
```

## Auto Complete and Naming Hosts

To configure a .ssh/config file see http://nerderati.com/2011/03/17/simplify-your-life-with-an-ssh-config-file/

To enable tab auto-complete run one of the following commands (depending on your system:

```
ssh-deploy completion >> ~/.bash_profile
ssh-deploy completion >> ~/.bashrc
ssh-deploy completion >> ~/.zshrc
```

This is exactly like adding completion to npm.  Note that it will only auto-complete the command name and the server name (if you have a .ssh/config file).
