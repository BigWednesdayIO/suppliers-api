'use strict';

const cuid = require('cuid');
const Joi = require('joi');

const entities = require('../lib/dataset_entities');
const datastoreModel = require('gcloud-datastore-model')(require('../lib/dataset'));

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
        }
      },
      response: {
        status: {
          201: Joi.object().description('The created price adjustment').meta({className: 'PriceAdjustment'})
        }
      }
    }
  });

  next();
};

module.exports.register.attributes = {
  name: 'price-adjustments'
};
