'use strict';

const boom = require('boom');
const joi = require('joi');

const Authenticator = require('../lib/auth0_authenticator');
const authenticator = new Authenticator({
  domain: process.env.AUTH0_DOMAIN,
  secret: process.env.AUTH0_CLIENT_SECRET,
  clientId: process.env.AUTHO_CLIENT_ID,
  connection: process.env.AUTH0_CONNECTION
});

const errorSchemas = require('hapi-error-schemas');

const sessionSchema = joi.object({
  id: joi.string().required().description('Supplier identifier'),
  email: joi.string().required().email().description('Supplier email address'),
  token: joi.string().required().description('Authentication token')
}).meta({
  className: 'SupplierSession'
});

const credentialsSchema = joi.object({
  email: joi.string().required().email().description('Supplier email address'),
  password: joi.string().required().description('Supplier password')
}).meta({
  className: 'SupplierCredentials'
});

exports.register = function (server, options, next) {
  server.route({
    method: 'POST',
    path: '/suppliers/authenticate',
    handler: (req, reply) => {
      authenticator.authenticate(req.payload.email, req.payload.password, ['scope', 'supplier_id', 'email'], (err, result) => {
        if (err) {
          if (err.name === 'AuthenticationFailedError') {
            return reply(boom.unauthorized('Invalid email address or password.'));
          }
          console.error(err);
          return reply(boom.badImplementation());
        }

        reply({
          id: result.payload.supplier_id,
          email: result.payload.email,
          token: result.encoded
        });
      });
    },
    config: {
      tags: ['api'],
      auth: false,
      validate: {
        payload: credentialsSchema.required().description('Supplier credentials')
      },
      response: {
        status: Object.assign({
          200: sessionSchema.description('Session for supplier')
        }, errorSchemas.statuses([401]))
      }
    }
  });

  return next();
};

exports.register.attributes = {
  name: 'authenticate'
};
