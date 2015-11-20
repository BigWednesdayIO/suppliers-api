'use strict';

const Boom = require('boom');
const Joi = require('joi');
const Supplier = require('../models/supplier');
const SupplierDepot = require('../models/supplier_depot');

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
  name: Joi.string().required().description('Depot name'),
  delivery_outward_codes: Joi.array().required().items(Joi.string()).description('Outward codes where deliveries can be made - https://en.wikipedia.org/wiki/Postcodes_in_the_United_Kingdom#Outward_code'),
  delivery_postcode_areas: Joi.array().required().items(Joi.string()).description('Postcode areas where deliveries can be made - https://en.wikipedia.org/wiki/Postcodes_in_the_United_Kingdom#Postcode_area')
}).meta({
  className: 'DepotParameters'
});

const depotSchema = Joi.object({
  id: Joi.string().required().description('Depot identifier'),
  name: Joi.string().required().description('Depot name'),
  delivery_outward_codes: Joi.array().required().items(Joi.string()).description('Outward codes where deliveries can be made - https://en.wikipedia.org/wiki/Postcodes_in_the_United_Kingdom#Outward_code'),
  delivery_postcode_areas: Joi.array().required().items(Joi.string()).description('Postcode areas where deliveries can be made - https://en.wikipedia.org/wiki/Postcodes_in_the_United_Kingdom#Postcode_area'),
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
      SupplierDepot.find(request.params.id).then(depots => {
        reply(depots);
      }, reply.error.bind(reply));
    },
    config: {
      tags: ['api'],
      pre: [{method: verifySupplier()}],
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
      SupplierDepot.get(request.params.supplierId, request.params.id).then(depot => {
        reply(depot || Boom.notFound());
      }, reply.error.bind(reply));
    },
    config: {
      tags: ['api'],
      pre: [{method: verifySupplier('supplierId')}],
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
      SupplierDepot.create(request.params.id, request.payload).then(depot => {
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
          201: depotSchema.description('The created depot')
        }
      }
    }
  });

  server.route({
    method: 'PUT',
    path: '/suppliers/{supplierId}/depots/{id}',
    handler: (request, reply) => {
      SupplierDepot.upsert(request.params.supplierId, request.params.id, request.payload)
        .then(depot => {
          const response = reply(depot);

          if (depot._inserted) {
            response.created(`/suppliers/${request.params.supplierId}/depots/${depot.id}`);
          }
        });
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
          201: depotSchema.description('The created depot'),
          200: depotSchema.description('The updated depot')
        }
      }
    }
  });

  server.route({
    method: 'DELETE',
    path: '/suppliers/{supplierId}/depots/{id}',
    handler: (request, reply) => {
      SupplierDepot.get(request.params.supplierId, request.params.id)
        .then(depot => {
          if (!depot) {
            return reply(Boom.notFound());
          }

          SupplierDepot.delete(request.params.supplierId, request.params.id)
            .then(() => reply().code(204), reply.error.bind(reply));
        });
    },
    config: {
      tags: ['api'],
      pre: [{method: verifySupplier('supplierId')}],
      validate: {
        params: {
          supplierId: Joi.string().required().description('Supplier identifier'),
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
