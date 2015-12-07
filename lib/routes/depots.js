'use strict';

const Boom = require('boom');
const cuid = require('cuid');
const Joi = require('joi');

const dataset = require('../models/dataset');
const DatastoreModel = require('gcloud-datastore-model')(dataset);

const supplierKey = supplierId => {
  return dataset.key(['Supplier', supplierId]);
};

const datastoreKey = (supplierId, depotId) => {
  const key = supplierKey(supplierId);

  key.path.push('Depot');

  if (depotId) {
    key.path.push(depotId);
  }

  return key;
};

const verifySupplier = (request, reply) => {
  const supplierId = request.params.supplierId;

  DatastoreModel.get(supplierKey(supplierId))
    .then(() => reply(), err => {
      if (err.name === 'EntityNotFoundError') {
        return reply.supplierNotFound(supplierId);
      }

      console.error(err);
      reply.badImplementation();
    });
};

const baseSchema = {
  name: Joi.string().required().description('Depot name'),
  delivery_countries: Joi.array().required().items(Joi.string()).description('Countries where deliveries can be fulfilled'),
  delivery_regions: Joi.array().required().items(Joi.string()).description('Regions where deliveries can be fulfilled'),
  delivery_counties: Joi.array().required().items(Joi.string()).description('Counties where deliveries can be fulfilled'),
  delivery_districts: Joi.array().required().items(Joi.string()).description('Districts where deliveries can be fulfilled'),
  delivery_places: Joi.array().required().items(Joi.string()).description('Places where deliveries can be fulfilled')
};

const depotParametersSchema = Joi.object(baseSchema).meta({
  className: 'DepotParameters'
});

const depotSchema = Joi.object(Object.assign({
  id: Joi.string().required().description('Depot identifier'),
  _metadata: Joi.object({
    created: Joi.date().required().description('Date the depot was created'),
    updated: Joi.date().required().description('Date the depot was updated')
  }).meta({className: 'DepotMetadata'})}, baseSchema)
).meta({
  className: 'Depot'
});

exports.register = function (server, options, next) {
  server.decorate('reply', 'supplierNotFound', function (id) {
    this.response(Boom.notFound(`Supplier "${id}" not found.`));
  });

  server.route({
    method: 'GET',
    path: '/suppliers/{supplierId}/depots',
    handler: (request, reply) => {
      const query = dataset.createQuery('Depot').hasAncestor(supplierKey(request.params.supplierId)).order('_metadata_created');
      DatastoreModel.find(query)
        .then(reply, reply.error.bind(reply));
    },
    config: {
      tags: ['api'],
      pre: [{method: verifySupplier}],
      validate: {
        params: {
          supplierId: Joi.string().required().description('Supplier identifier')
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
      DatastoreModel.get(datastoreKey(request.params.supplierId, request.params.id))
        .then(reply)
        .catch(err => {
          if (err.name === 'EntityNotFoundError') {
            return reply.notFound();
          }

          reply.error(err);
        });
    },
    config: {
      tags: ['api'],
      pre: [{method: verifySupplier}],
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
    path: '/suppliers/{supplierId}/depots',
    handler: (request, reply) => {
      DatastoreModel.insert(datastoreKey(request.params.supplierId, cuid()), request.payload)
        .then(depot => reply(depot).created(`/suppliers/${request.params.supplierId}/depots/${depot.id}`))
        .catch(reply.error.bind(reply));
    },
    config: {
      tags: ['api'],
      pre: [{method: verifySupplier}],
      validate: {
        params: {
          supplierId: Joi.string().required().description('Supplier identifier')
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
      DatastoreModel.update(datastoreKey(request.params.supplierId, request.params.id), request.payload)
        .then(reply)
        .catch(err => {
          if (err.name === 'EntityNotFoundError') {
            return reply.notFound();
          }

          reply.error(err);
        });
    },
    config: {
      tags: ['api'],
      pre: [{method: verifySupplier}],
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
      DatastoreModel.get(datastoreKey(request.params.supplierId, request.params.id))
        .then(() => reply().code(204))
        .catch(err => {
          if (err.name === 'EntityNotFoundError') {
            return reply.notFound();
          }

          reply.error(err);
        });
    },
    config: {
      tags: ['api'],
      pre: [{method: verifySupplier}],
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
