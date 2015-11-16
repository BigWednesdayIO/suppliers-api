'use strict';

const Boom = require('boom');
const Joi = require('joi');
const Supplier = require('../datastore_model')('Supplier');
const Depot = require('../datastore_model')('Depot');

const verifySupplier = (request, reply) => {
  Supplier.get(request.params.id)
    .then(supplier => {
      if (!supplier) {
        return reply.supplierNotFound(request.params.id);
      }

      reply();
    });
};

const depotSchema = Joi.object({
  id: Joi.string().required().description('Depot identifier'),
  name: Joi.string().required().description('Depot name'),
  _metadata: Joi.object({
    created: Joi.date().required().description('Date the depot was created')
  }).meta({className: 'DepotMetadata'})
}).meta({
  className: 'Depot'
});

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
      Depot.create(request.payload).then(depot => {
        reply(depot).created(`/suppliers/${request.params.id}/depots/${depot.id}`);
      }, reply.error.bind(reply));
    },
    config: {
      tags: ['api'],
      pre: [{method: verifySupplier}],
      validate: {
        params: {
          id: Joi.string().required().description('Supplier identifier')
        }
      },
      response: {
        failAction: process.env.RESPONSE_FAIL_ACTION || 'log',
        status: {
          201: depotSchema
        }
      }
    }
  });

  return next();
};

exports.register.attributes = {
  name: 'depots'
};
