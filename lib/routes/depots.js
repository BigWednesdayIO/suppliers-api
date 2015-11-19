'use strict';

const Boom = require('boom');
const Joi = require('joi');
const Supplier = require('../models/supplier');
const Depot = require('../models/depot');

const verifySupplier = (request, reply) => {
  Supplier.get(request.payload.supplier_id)
    .then(supplier => {
      if (!supplier) {
        return reply(Boom.badRequest('child "supplier_id" fails because ["supplier_id" is not a known id]'));
      }

      return reply();
    });
};

const depotParametersSchema = Joi.object({
  name: Joi.string().required().description('Depot name'),
  supplier_id: Joi.string().required().description('Supplier identifier')
}).meta({
  className: 'DepotParameters'
});

const depotSchema = Joi.object({
  id: Joi.string().required().description('Depot identifier'),
  name: Joi.string().required().description('Depot name'),
  supplier_id: Joi.string().required().description('Supplier identifier'),
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
    path: '/depots',
    handler: (request, reply) => {
      Depot.find().then(depots => {
        reply(depots);
      }, reply.error.bind(reply));
    },
    config: {
      tags: ['api'],
      response: {
        failAction: process.env.RESPONSE_FAIL_ACTION || 'log',
        status: {
          200: Joi.array().items(depotSchema).description('Depots')
        }
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/depots/{id}',
    handler: (request, reply) => {
      Depot.get(request.params.id).then(depot => {
        reply(depot || Boom.notFound());
      }, reply.error.bind(reply));
    },
    config: {
      tags: ['api'],
      validate: {
        params: {
          id: Joi.string().required().description('Depot identifier')
        }
      },
      response: {
        failAction: process.env.RESPONSE_FAIL_ACTION || 'log',
        status: {
          200: depotSchema.description('The requested depot')
        }
      }
    }
  });

  server.route({
    method: 'POST',
    path: '/depots',
    handler: (request, reply) => {
      Depot.create(request.payload).then(depot => {
        reply(depot).created(`/depots/${depot.id}`);
      }, reply.error.bind(reply));
    },
    config: {
      tags: ['api'],
      pre: [{method: verifySupplier}],
      validate: {
        payload: depotParametersSchema.description('The depot to create')
      },
      response: {
        failAction: process.env.RESPONSE_FAIL_ACTION || 'log',
        status: {
          201: depotSchema.description('The created depot')
        }
      }
    }
  });

  server.route({
    method: 'PUT',
    path: '/depots/{id}',
    handler: (request, reply) => {
      Depot.upsert(request.params.id, request.payload)
        .then(depot => {
          const response = reply(depot);

          if (depot._inserted) {
            response.created(`/depots/${depot.id}`);
          }
        });
    },
    config: {
      tags: ['api'],
      pre: [{method: verifySupplier}],
      validate: {
        params: {
          id: Joi.string().required().description('Depot identifier')
        },
        payload: depotParametersSchema.description('The depot to create or update')
      },
      response: {
        failAction: process.env.RESPONSE_FAIL_ACTION || 'log',
        status: {
          201: depotSchema.description('The created depot'),
          200: depotSchema.description('The updated depot')
        }
      }
    }
  });

  server.route({
    method: 'DELETE',
    path: '/depots/{id}',
    handler: (request, reply) => {
      Depot.get(request.params.id)
        .then(depot => {
          if (!depot) {
            return reply(Boom.notFound());
          }

          Depot.delete(request.params.id)
            .then(() => reply().code(204), reply.error.bind(reply));
        });
    },
    config: {
      tags: ['api'],
      validate: {
        params: {
          id: Joi.string().required().description('Depot identifier')
        }
      },
      response: {
        failAction: process.env.RESPONSE_FAIL_ACTION || 'log'
      }
    }
  });

  return next();
};

exports.register.attributes = {
  name: 'depots'
};
