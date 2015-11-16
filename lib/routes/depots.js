'use strict';

const Boom = require('boom');
const Joi = require('joi');

exports.register = function (server, options, next) {
  server.decorate('reply', 'supplierNotFound', function (id) {
    this.response(Boom.notFound(`Supplier "${id}" not found.`));
  });

  server.route({
    method: 'GET',
    path: '/suppliers/{id}/depots',
    handler: (request, reply) => {
      reply.supplierNotFound(request.params.id);
    },
    config: {
      tags: ['api'],
      validate: {
        params: {
          id: Joi.string().required().description('Supplier identifier')
        }
      }
    }
  });

  server.route({
    method: 'POST',
    path: '/suppliers/{id}/depots',
    handler: (request, reply) => {
      reply.supplierNotFound(request.params.id);
    },
    config: {
      tags: ['api'],
      validate: {
        params: {
          id: Joi.string().required().description('Supplier identifier')
        }
      }
    }
  });

  return next();
};

exports.register.attributes = {
  name: 'depots'
};
