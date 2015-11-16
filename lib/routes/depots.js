'use strict';

const Boom = require('boom');
const Joi = require('joi');
const Supplier = require('../datastore_model')('Supplier');
const Depot = require('../datastore_model')('Depot');

const verifySupplier = param => {
  return (request, reply) => {
    const supplierId = request.params[param || 'id'];

    Supplier.get(supplierId)
      .then(supplier => {
        if (!supplier) {
          return reply.supplierNotFound(supplierId);
        }

        reply();
      });
  };
};

const depotParametersSchema = Joi.object({
  name: Joi.string().required().description('Depot name')
}).meta({
  className: 'DepotParameters'
});

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
      pre: [{method: verifySupplier()}],
      validate: {
        params: {
          id: Joi.string().required().description('Supplier identifier')
        },
        payload: depotParametersSchema.description('The depot to create')
      },
      response: {
        failAction: process.env.RESPONSE_FAIL_ACTION || 'log',
        status: {
          201: depotSchema
        }
      }
    }
  });

  server.route({
    method: 'PUT',
    path: '/suppliers/{supplierId}/depots/{id}',
    handler: (request, reply) => {
      Depot.upsert(request.params.id, request.payload)
        .then(depot => reply(depot).created(`/suppliers/${request.params.supplierId}/depots/${request.params.id}`), reply.error.bind(reply));
    },
    config: {
      tags: ['api'],
      pre: [{method: verifySupplier('supplierId')}],
      validate: {
        params: {
          supplierId: Joi.string().required().description('Supplier identifier'),
          id: Joi.string().required().description('Depot identifier')
        },
        payload: depotParametersSchema.description('The depot to create or update')
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
