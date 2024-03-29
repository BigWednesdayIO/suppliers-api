'use strict';

const Hapi = require('hapi');
const Swaggered = require('hapi-swaggered');
const Package = require('../package.json');
const jwtAuthStrategy = require('./jwt_auth_strategy');

const plugins = [{
  register: jwtAuthStrategy
}, {
  register: require('hapi-version-route')
}, {
  register: require('hapi-boom-decorators')
}, {
  register: require('./suppliers')
}, {
  register: require('./depots')
}, {
  register: require('./authenticate')
}, {
  register: require('./linked_products')
}, {
  register: require('./price_adjustments')
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
