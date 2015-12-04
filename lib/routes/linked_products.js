'use strict';

const cuid = require('cuid');
const Joi = require('joi');

const dataset = require('../models/dataset');
const DatastoreModel = require('gcloud-datastore-model')(dataset);

const datastoreKey = (supplierId, linkedProductId) => {
  return dataset.key(['Supplier', supplierId, 'LinkedProduct', linkedProductId || cuid()]);
};

const supplierKey = supplierId => {
  return dataset.key(['Supplier', supplierId]);
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

module.exports.register = (server, options, next) => {
  server.route({
    method: 'POST',
    path: '/suppliers/{supplierId}/linked_products',
    handler: (request, reply) => {
      DatastoreModel.insert(datastoreKey(request.params.supplierId), request.payload)
        .then(linkedProduct => reply(linkedProduct).created(`/suppliers/${request.params.supplierId}/linked_products/${linkedProduct.id}`))
        .catch(err => {
          console.error(err);
          reply.badImplementation();
        });
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
        status: {
          201: Joi.object().meta({className: 'LinkedProduct'}).description('The created linked product')
        }
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/suppliers/{supplierId}/linked_products/{id}',
    handler: (request, reply) => {
      DatastoreModel.get(datastoreKey(request.params.supplierId, request.params.id))
        .then(reply)
        .catch(err => {
          if (err.name === 'EntityNotFoundError') {
            return reply.notFound();
          }

          console.error(err);
          reply.badImplementation();
        });
    },
    config: {
      tags: ['api'],
      pre: [{method: verifySupplier}],
      validate: {
        params: {
          supplierId: Joi.string().required().description('Supplier identifier'),
          id: Joi.string().required().description('Linked product identifier')
        }
      },
      response: {
        status: {
          200: Joi.object().meta({className: 'LinkedProduct'}).description('A linked product')
        }
      }
    }
  });

  server.route({
    method: 'PUT',
    path: '/suppliers/{supplierId}/linked_products/{id}',
    handler: (request, reply) => {
      DatastoreModel.update(datastoreKey(request.params.supplierId, request.params.id), request.payload)
        .then(reply)
        .catch(err => {
          if (err.name === 'EntityNotFoundError') {
            return reply.notFound();
          }

          console.error(err);
          reply.badImplementation();
        });
    },
    config: {
      tags: ['api'],
      pre: [{method: verifySupplier}],
      validate: {
        params: {
          supplierId: Joi.string().required().description('Supplier identifier'),
          id: Joi.string().required().description('Linked product identifier')
        }
      },
      response: {
        status: {
          200: Joi.object().meta({className: 'LinkedProduct'}).description('A linked product')
        }
      }
    }
  });

  server.route({
    method: 'DELETE',
    path: '/suppliers/{supplierId}/linked_products/{id}',
    handler: (request, reply) => {
      DatastoreModel.delete(datastoreKey(request.params.supplierId, request.params.id))
        .then(() => reply().code(204))
        .catch(err => {
          if (err.name === 'EntityNotFoundError') {
            return reply.notFound();
          }

          console.error(err);
          reply.badImplementation();
        });
    },
    config: {
      tags: ['api'],
      pre: [{method: verifySupplier}],
      validate: {
        params: {
          supplierId: Joi.string().required().description('Supplier identifier'),
          id: Joi.string().required().description('Linked product identifier')
        }
      }
    }
  });

  next();
};

module.exports.register.attributes = {
  name: 'linked_products'
};
