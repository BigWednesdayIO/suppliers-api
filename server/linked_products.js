'use strict';

const cuid = require('cuid');
const Joi = require('joi');

const dataset = require('../lib/dataset');
const datasetEntities = require('../lib/dataset_entities');

const DatastoreModel = require('gcloud-datastore-model')(dataset);

const verifySupplier = (request, reply) => {
  const supplierId = request.params.supplierId;

  DatastoreModel.get(datasetEntities.supplierKey(supplierId))
    .then(() => reply(), err => {
      if (err.name === 'EntityNotFoundError') {
        return reply.supplierNotFound(supplierId);
      }

      console.error(err);
      reply.badImplementation();
    });
};

const linkedProductsAttributes = {
  product_id: Joi.string().required().description('The product identifier'),
  product_code: Joi.string().description('The supplier\'s product code or identifier'),
  price: Joi.number().precision(2).min(0.01).required().description('The base price for the supplier'),
  was_price: Joi.number().precision(2).min(0.01).required().description('The previous price for the supplier')
};

const requestSchema = Joi.object(linkedProductsAttributes).meta({className: 'LinkedProductParameters'});

const responseSchema = Joi.object(Object.assign({
  id: Joi.string().required().description('The linked product identifier'),
  _metadata: Joi.object({
    created: Joi.date().required().description('Date the linked product was created'),
    updated: Joi.date().required().description('Date the linked product was updated')
  }).meta({className: 'LinkedProductMetaData'})
}, linkedProductsAttributes)).meta({className: 'LinkedProduct'});

module.exports.register = (server, options, next) => {
  server.route({
    method: 'POST',
    path: '/suppliers/{supplierId}/linked_products',
    handler: (request, reply) => {
      DatastoreModel.insert(datasetEntities.linkedProductKey(request.params.supplierId, cuid()), request.payload)
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
        },
        payload: requestSchema.description('The linked product to add to the supplier'),
        options: {
          // disable conversion, otherwise decimal precision is automatically rounded and not validated
          convert: false
        }
      },
      response: {
        status: {
          201: responseSchema.description('The created linked product')
        }
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/suppliers/{supplierId}/linked_products',
    handler: (request, reply) => {
      const limit = request.query.hitsPerPage || 10;
      const page = request.query.page || 1;
      const offset = page === 1 ? 0 : (page - 1) * limit;

      const query = datasetEntities.linkedProductQuery().offset(offset).limit(limit);

      DatastoreModel.find(query)
        .then(reply)
        .catch(err => {
          console.error(err);
          reply.badImplementation();
        });
    },
    config: {
      tags: ['api'],
      validate: {
        params: {
          supplierId: Joi.string().required().description('Supplier identifier')
        },
        query: {
          hitsPerPage: Joi.number().integer().min(1).max(50).description('Number of products to return for a page'),
          page: Joi.number().integer().min(1).description('The page number to return')
        }
      },
      response: {
        status: {
          200: Joi.array().items(responseSchema).description('Linked products')
        }
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/suppliers/{supplierId}/linked_products/{id}',
    handler: (request, reply) => {
      DatastoreModel.get(datasetEntities.linkedProductKey(request.params.supplierId, request.params.id))
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
          200: responseSchema.description('A linked product')
        }
      }
    }
  });

  server.route({
    method: 'PUT',
    path: '/suppliers/{supplierId}/linked_products/{id}',
    handler: (request, reply) => {
      DatastoreModel.update(datasetEntities.linkedProductKey(request.params.supplierId, request.params.id), request.payload)
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
        },
        payload: requestSchema.description('The update linked product'),
        options: {
          // disable conversion, otherwise decimal precision is automatically rounded and not validated
          convert: false
        }
      },
      response: {
        status: {
          200: responseSchema.description('The updated linked product')
        }
      }
    }
  });

  server.route({
    method: 'DELETE',
    path: '/suppliers/{supplierId}/linked_products/{id}',
    handler: (request, reply) => {
      DatastoreModel.delete(datasetEntities.linkedProductKey(request.params.supplierId, request.params.id))
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
