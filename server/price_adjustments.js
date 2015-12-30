'use strict';

const cuid = require('cuid');
const Joi = require('joi');

const entities = require('../lib/dataset_entities');
const datastoreModel = require('gcloud-datastore-model')(require('../lib/dataset'));

const attributes = {
  price_adjustment_group_id: Joi.string().required().description('Identifier of the group the adjustment applies to'),
  type: Joi.string().required().valid(['value_override', 'value_adjustment', 'percentage_adjustment'])
    .description('The type of adjustment'),
  amount: Joi.number().precision(2).positive().required().when('type', {is: 'value_adjustment', then: Joi.number().precision(2)}).description('The percentage or value amount to adjust price by'),
  start_date: Joi.date().required().description('Date the price adjustment comes into effect'),
  end_date: Joi.date().description('Date the price adjustment ceases to have effect')
};

const requestSchema = Joi.object(attributes).meta({className: 'PriceAdjustmentParameterts'});

const responseSchema = Joi.object(Object.assign({
  id: Joi.string().required().description('The price adjustment identifier'),
  _metadata: Joi.object({
    created: Joi.date().required().description('Date the price adjustment was created'),
    updated: Joi.date().required().description('Date the price adjustment was updated')
  }).meta({className: 'PriceAdjustmentMetaData'})
}, attributes)).meta({className: 'PriceAdjustment'});

const verifySupplierLinkedProduct = (request, reply) => {
  const supplierId = request.params.supplierId;
  const linkedProductId = request.params.linkedProductId;

  const getSupplier = datastoreModel.get(entities.supplierKey(supplierId));
  const getLinkedProduct = datastoreModel.get(entities.linkedProductKey(supplierId, linkedProductId));

  getSupplier
    .then(() => getLinkedProduct, err => {
      const error = new Error('Get supplier error');
      error.source = 'supplier';
      error.internal = err;

      return error;
    })
    .then(result => {
      if (result instanceof Error && result.source === 'supplier') {
        const err = result.internal;

        if (err.name === 'EntityNotFoundError') {
          return reply.notFound(`Supplier "${supplierId}" not found.`);
        }

        console.error(err);
        return reply.badImplementation();
      }

      reply();
    }, err => {
      if (err.name === 'EntityNotFoundError') {
        return reply.notFound(`Linked Product "${linkedProductId}" not found for Supplier "${supplierId}".`);
      }

      console.error(err);
      reply.badImplementation();
    });
};

module.exports.register = (server, options, next) => {
  server.route({
    method: 'POST',
    path: '/suppliers/{supplierId}/linked_products/{linkedProductId}/price_adjustments',
    handler(req, reply) {
      const key = entities.priceAdjustmentKey(req.params.supplierId, req.params.linkedProductId, cuid());

      datastoreModel.insert(key, req.payload)
        .then(model => reply(model).created(`${req.url.path}/${model.id}`), reply.error.bind(reply));
    },
    config: {
      tags: ['api'],
      pre: [{method: verifySupplierLinkedProduct}],
      auth: {
        strategy: 'jwt',
        scope: ['supplier:{params.supplierId}', 'admin']
      },
      validate: {
        params: {
          supplierId: Joi.string().required().description('Supplier identifier'),
          linkedProductId: Joi.string().required().description('Linked product identifier')
        },
        payload: requestSchema.description('The price adjustment to create')
      },
      response: {
        status: {
          201: responseSchema.description('The created price adjustment')
        }
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/suppliers/{supplierId}/linked_products/{linkedProductId}/price_adjustments/{id}',
    handler(req, reply) {
      const key = entities.priceAdjustmentKey(req.params.supplierId, req.params.linkedProductId, req.params.id);

      datastoreModel.get(key)
        .then(reply, err => {
          if (err.name === 'EntityNotFoundError') {
            return reply.notFound();
          }

          reply.error(err);
        });
    },
    config: {
      tags: ['api'],
      pre: [{method: verifySupplierLinkedProduct}],
      auth: {
        strategy: 'jwt',
        scope: ['supplier:{params.supplierId}', 'admin']
      },
      validate: {
        params: {
          supplierId: Joi.string().required().description('Supplier identifier'),
          linkedProductId: Joi.string().required().description('Linked product identifier'),
          id: Joi.string().required().description('Price adjustment identifier')
        }
      },
      response: {
        status: {
          200: responseSchema.description('A price adjustment')
        }
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/suppliers/{supplierId}/linked_products/{linkedProductId}/price_adjustments',
    handler(req, reply) {
      const limit = req.query.hitsPerPage || 10;
      const page = req.query.page || 1;
      const offset = page === 1 ? 0 : (page - 1) * limit;

      const query = entities.priceAdjustmentQuery()
        .hasAncestor(entities.linkedProductKey(req.params.supplierId, req.params.linkedProductId))
        .offset(offset)
        .limit(limit);

      if (req.query.price_adjustment_group_id) {
        query.filter('price_adjustment_group_id =', req.query.price_adjustment_group_id);
      }

      datastoreModel.find(query)
        .then(reply)
        .catch(err => {
          console.error(err);
          reply.badImplementation();
        });
    },
    config: {
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: ['supplier:{params.supplierId}', 'admin']
      },
      pre: [{method: verifySupplierLinkedProduct}],
      validate: {
        params: {
          supplierId: Joi.string().required().description('Supplier identifier'),
          linkedProductId: Joi.string().required().description('Linked product identifier')
        },
        query: {
          hitsPerPage: Joi.number().integer().min(1).max(50).description('Number of price adjustments to return for a page'),
          page: Joi.number().integer().min(1).description('The page number to return'),
          price_adjustment_group_id: Joi.string().description('A price adjustment group for filtering')
        }
      },
      response: {
        status: {
          200: Joi.array().items(responseSchema.description('A price adjustment')).description('An array of price adjustments')
        }
      }
    }
  });

  server.route({
    method: 'PUT',
    path: '/suppliers/{supplierId}/linked_products/{linkedProductId}/price_adjustments/{id}',
    handler(req, reply) {
      const key = entities.priceAdjustmentKey(req.params.supplierId, req.params.linkedProductId, req.params.id);

      datastoreModel.update(key, req.payload)
        .then(reply, err => {
          if (err.name === 'EntityNotFoundError') {
            return reply.notFound();
          }

          reply.error(err);
        });
    },
    config: {
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: ['supplier:{params.supplierId}', 'admin']
      },
      pre: [{method: verifySupplierLinkedProduct}],
      validate: {
        params: {
          supplierId: Joi.string().required().description('Supplier identifier'),
          linkedProductId: Joi.string().required().description('Linked product identifier'),
          id: Joi.string().required().description('Price adjustment identifier')
        },
        payload: requestSchema.description('The updated price adjustment')
      },
      response: {
        status: {
          200: responseSchema.description('The updated price adjustment')
        }
      }
    }
  });

  server.route({
    method: 'DELETE',
    path: '/suppliers/{supplierId}/linked_products/{linkedProductId}/price_adjustments/{id}',
    handler(req, reply) {
      const key = entities.priceAdjustmentKey(req.params.supplierId, req.params.linkedProductId, req.params.id);

      datastoreModel.delete(key)
        .then(() => reply().code(204), err => {
          if (err.name === 'EntityNotFoundError') {
            return reply.notFound();
          }

          reply.error(err);
        });
    },
    config: {
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: ['supplier:{params.supplierId}', 'admin']
      },
      pre: [{method: verifySupplierLinkedProduct}],
      validate: {
        params: {
          supplierId: Joi.string().required().description('Supplier identifier'),
          linkedProductId: Joi.string().required().description('Linked product identifier'),
          id: Joi.string().required().description('Price adjustment identifier')
        }
      }
    }
  });

  next();
};

module.exports.register.attributes = {
  name: 'price-adjustments'
};
