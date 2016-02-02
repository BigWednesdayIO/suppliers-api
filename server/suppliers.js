'use strict';

const _ = require('lodash');
const Boom = require('boom');
const cuid = require('cuid');
const Joi = require('joi');
const request = require('request');

const dataset = require('../lib/dataset');
const datasetEntities = require('../lib/dataset_entities');
const supplierQueries = require('../lib/supplier_queries');
const supplierMapper = require('../lib/supplier_mapper');
const supplierStore = require('../lib/supplier_store');

const DatastoreModel = require('gcloud-datastore-model')(dataset);

const postcodesApi = `http://${process.env.POSTCODES_API_SVC_SERVICE_HOST}:${process.env.POSTCODES_API_SVC_SERVICE_PORT}`;

const getDeliveryPostcodeData = (req, reply) => {
  if (!req.query.deliver_to) {
    return reply();
  }

  const postcode = req.query.deliver_to;

  request({url: `${postcodesApi}/postcodes/${postcode}`}, (err, response, body) => {
    if (err) {
      console.error(`Error getting postcode data.`, err);
      return reply(Boom.badImplementation());
    }

    if (response.statusCode === 200) {
      return reply(JSON.parse(body));
    }

    if (response.statusCode === 404) {
      return reply(Boom.badRequest(`child "deliver_to" fails because ["deliver_to" with value "${postcode}" is not a known postcode]`));
    }

    console.error(`Postcodes API error response [${response.statusCode}].`, body);

    reply(Boom.badImplementation());
  });
};

const baseSupplierSchema = Joi.object({
  email: Joi.string().email().required().description('Supplier email'),
  name: Joi.string().required().description('Supplier name'),
  about: Joi.string().description('About the supplier'),
  facebook: Joi.string().description('Facebook'),
  twitter: Joi.string().description('Twitter'),
  website: Joi.string().description('Website'),
  ititials: Joi.string().description('Initials for material design avatar placeholder'),
  colour: Joi.string().description('Colour for material design avatar placeholder'),
  banner_image: Joi.string().description('Banner image for search results'),
  logo: Joi.string().description('Supplier logo'),
  has_memberships: Joi.boolean().description('Supplier has enabled memberships'),
  purchase_restrictions: Joi.string().description('Whether anybody, or only members can buy fromt the supplier')
});

const suppliersSchema = baseSupplierSchema.concat(Joi.object({
  id: Joi.string().required().description('Supplier identifier'),
  _metadata: Joi.object({
    created: Joi.date().required().description('Date the supplier was created'),
    updated: Joi.date().required().description('Date the supplier was updated'),
    linked_product_id: Joi.string().description('The identifier of a linked product that satisfied a search for suppliers using supplies_product parameter')
  }).meta({className: 'SupplierMetadata'})
})).meta({
  className: 'Supplier'
});

const getSuppliers = request => {
  if (request.query.deliver_to) {
    return supplierQueries.findByDeliveryLocations(request.pre.postcodeData);
  }

  if (request.query.supplies_product) {
    return supplierQueries.findBySuppliedProduct(request.query.supplies_product);
  }

  return supplierStore.find(datasetEntities.supplierQuery());
};

exports.register = function (server, options, next) {
  server.route({
    method: 'POST',
    path: '/suppliers',
    handler: (request, reply) => {
      supplierStore.insert(datasetEntities.supplierKey(cuid()), request.payload)
        .then(supplier => {
          reply(supplierMapper.toModel(supplier)).created(`/suppliers/${supplier.id}`);
        }, reply.error.bind(reply));
    },
    config: {
      tags: ['api'],
      auth: false,
      validate: {
        payload: baseSupplierSchema.concat(Joi.object({
          password: Joi.string().required().description('Supplier password')
        })).meta({
          className: 'SupplierCreateParameters'
        }).description('The supplier to create')
      },
      response: {
        failAction: process.env.RESPONSE_FAIL_ACTION || 'log',
        status: {
          201: suppliersSchema.description('The created supplier')
        }
      }
    }
  });

  server.route({
    method: 'PUT',
    path: '/suppliers/{id}',
    handler: (request, reply) => {
      supplierStore.update(datasetEntities.supplierKey(request.params.id), request.payload)
        .then(supplier => {
          reply(supplierMapper.toModel(supplier));
        })
        .catch(err => {
          if (err.name === 'EntityNotFoundError') {
            return reply.notFound();
          }

          console.error(err);
          reply.error(err);
        });
    },
    config: {
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: ['supplier:{params.id}', 'admin']
      },
      validate: {
        params: {
          id: Joi.string().required().description('Supplier identifier')
        },
        payload: baseSupplierSchema.meta({
          className: 'SupplierUpdateParameters'
        }).description('The supplier to update')
      },
      response: {
        failAction: process.env.RESPONSE_FAIL_ACTION || 'log',
        status: {
          200: suppliersSchema.description('The updated supplier')
        }
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/suppliers/{id}',
    handler: (request, reply) => {
      supplierStore.get(datasetEntities.supplierKey(request.params.id))
        .then(supplier => {
          reply(supplierMapper.toModel(supplier));
        })
        .catch(err => {
          if (err.name === 'EntityNotFoundError') {
            return reply.notFound();
          }

          console.error(err);
          reply.error(err);
        });
    },
    config: {
      tags: ['api'],
      auth: false,
      validate: {
        params: {
          id: Joi.string().required().description('Supplier identifier')
        }
      },
      response: {
        failAction: process.env.RESPONSE_FAIL_ACTION || 'log',
        status: {
          200: suppliersSchema.description('The requested supplier')
        }
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/suppliers',
    handler: (request, reply) => {
      getSuppliers(request).then(result => {
        reply(result.map(supplierMapper.toModel));
      }, reply.error.bind(reply));
    },
    config: {
      tags: ['api'],
      auth: false,
      pre: [{method: getDeliveryPostcodeData, assign: 'postcodeData'}],
      validate: {
        query: Joi.object({
          deliver_to: Joi.string().regex(/^[A-Z]{1,2}[0-9][0-9A-Z]?[0-9][A-Z]{2}$/i, 'postcode').description('Delivery postcode (no white space)'),
          supplies_product: Joi.string().description('A product identifier')
        }).nand('deliver_to', 'supplies_product')
      },
      response: {
        failAction: process.env.RESPONSE_FAIL_ACTION || 'log',
        status: {
          200: Joi.array().items(suppliersSchema).description('Suppliers')
        }
      }
    }
  });

  server.route({
    method: 'DELETE',
    path: '/suppliers/{id}',
    handler: (request, reply) => {
      const supplierKey = datasetEntities.supplierKey(request.params.id);
      const hasDepotsQuery = datasetEntities.depotQuery().hasAncestor(supplierKey);
      const hasLinkedProductsQuery = datasetEntities.linkedProductQuery().hasAncestor(supplierKey);

      Promise.all([
        DatastoreModel.find(hasDepotsQuery),
        DatastoreModel.find(hasLinkedProductsQuery)
      ])
      .then(_.spread((depots, linkedProducts) => {
        if (depots.length) {
          return reply.conflict(`Supplier "${request.params.id}" has associated depots, which must be deleted first.`);
        }

        if (linkedProducts.length) {
          return reply.conflict(`Supplier "${request.params.id}" has associated linked products, which must be deleted first.`);
        }

        return supplierStore.delete(datasetEntities.supplierKey(request.params.id))
          .then(() => reply().code(204))
          .catch(err => {
            if (err.name === 'EntityNotFoundError') {
              return reply.notFound();
            }

            console.error(err);
            reply.error(err);
          });
      }))
      .catch(reply.error.bind(reply));
    },
    config: {
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: ['supplier:{params.id}', 'admin']
      },
      validate: {
        params: {
          id: Joi.string().required().description('Supplier identifier')
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
  name: 'suppliers'
};
