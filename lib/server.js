'use strict';

const Hapi = require('hapi');
const Swaggered = require('hapi-swaggered');
const Suppliers = require('./suppliers');
const Package = require('../package.json');

const plugins = [{
  register: Suppliers
}, {
  register: Swaggered,
  options: {
    auth: false,
    info: {
      title: 'Suppliers API',
      version: Package.version
    }
  }
}];

module.exports = callback => {
  const server = new Hapi.Server();

  server.connection({port: 8080});

  server.decorate('reply', 'error', function (err) {
    console.error(err);
    this.response(err);
  });

  server.register(plugins, err => {
    if (err) {
      return callback(err);
    }

    callback(null, server);
  });
};
