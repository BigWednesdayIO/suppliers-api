'use strict';

const Boom = require('boom');
const Joi = require('joi');
const Supplier = require('../supplier');

const verifySupplier = param => {
  return (request, reply) => {
    const supplierId = request.params[param || 'id'];

    Supplier.get(supplierId)
      .then(supplier => {
        if (!supplier) {
          return reply.supplierNotFound(supplierId);
        }

        reply(supplier);
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
      request.pre.supplier.findDepots().then(depots => {
        reply(depots);
      }, reply.error.bind(reply));
    },
    config: {
      tags: ['api'],
      pre: [{method: verifySupplier(), assign: 'supplier'}],
      validate: {
        params: {
          id: Joi.string().required().description('Supplier identifier')
        }
      },
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
    path: '/suppliers/{supplierId}/depots/{id}',
    handler: (request, reply) => {
      request.pre.supplier.getDepot(request.params.id).then(depot => {
        reply(depot || Boom.notFound());
      }, reply.error.bind(reply));
    },
    config: {
      tags: ['api'],
      pre: [{method: verifySupplier('supplierId'), assign: 'supplier'}],
      validate: {
        params: {
          supplierId: Joi.string().required().description('Supplier identifier'),
          id: Joi.string().required().description('Depot identifier')
        }
      },
      response: {
        failAction: process.env.RESPONSE_FAIL_ACTION || 'log',
        status: {
          200: depotSchema.description('A depot')
        }
      }
    }
  });

  server.route({
    method: 'POST',
    path: '/suppliers/{id}/depots',
    handler: (request, reply) => {
      request.pre.supplier.createDepot(request.payload).then(depot => {
        reply(depot).created(`/suppliers/${request.params.id}/depots/${depot.id}`);
      }, reply.error.bind(reply));
    },
    config: {
      tags: ['api'],
      pre: [{method: verifySupplier(), assign: 'supplier'}],
      validate: {
        params: {
          id: Joi.string().required().description('Supplier identifier')
        },
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
    path: '/suppliers/{supplierId}/depots/{id}',
    handler: (request, reply) => {
      request.pre.supplier.upsertDepot(request.params.id, request.payload)
        .then(depot => {
          const response = reply(depot);

          if (depot._inserted) {
            response.created(`/suppliers/${request.params.supplierId}/depots/${depot.id}`);
          }
        });
    },
    config: {
      tags: ['api'],
      pre: [{method: verifySupplier('supplierId'), assign: 'supplier'}],
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
          201: depotSchema.description('The created depot'),
          200: depotSchema.description('The updated depot')
        }
      }
    }
  });

  return next();
};

exports.register.attributes = {
  name: 'depots'
};
