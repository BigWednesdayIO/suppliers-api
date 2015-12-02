'use strict';

const _ = require('lodash');
const Boom = require('boom');
const Joi = require('joi');
const request = require('request');

const Supplier = require('../models/supplier');
const SupplierDepot = require('../models/supplier_depot');

const postcodesApi = `http://${process.env.POSTCODES_API_SVC_HOST}:${process.env.POSTCODES_API_SVC_PORT}`;

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

const supplierParametersSchema = Joi.object({
  name: Joi.string().required().description('Supplier name')
}).meta({
  className: 'SupplierParameters'
});

const suppliersSchema = Joi.object({
  id: Joi.string().required().description('Supplier identifier'),
  name: Joi.string().required().description('Supplier name'),
  _metadata: Joi.object({
    created: Joi.date().required().description('Date the supplier was created')
  }).meta({className: 'SupplierMetadata'})
}).meta({
  className: 'Supplier'
});

exports.register = function (server, options, next) {
  server.route({
    method: 'POST',
    path: '/suppliers',
    handler: (request, reply) => {
      Supplier.create(request.payload).then(supplier => {
        reply(supplier).created(`/suppliers/${supplier.id}`);
      }, reply.error.bind(reply));
    },
    config: {
      tags: ['api'],
      validate: {
        payload: supplierParametersSchema.description('The supplier to create')
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
      Supplier.update(request.params.id, request.payload)
        .then(supplier => reply(supplier || Boom.notFound()), reply.error.bind(reply));
    },
    config: {
      tags: ['api'],
      validate: {
        params: {
          id: Joi.string().required().description('Supplier identifier')
        },
        payload: supplierParametersSchema.description('The supplier to update or create')
      },
      response: {
        failAction: process.env.RESPONSE_FAIL_ACTION || 'log',
        status: {
          201: suppliersSchema.description('The created supplier'),
          200: suppliersSchema.description('The updated supplier')
        }
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/suppliers/{id}',
    handler: (request, reply) => {
      Supplier.get(request.params.id).then(supplier => {
        reply(supplier || Boom.notFound());
      }, reply.error.bind(reply));
    },
    config: {
      tags: ['api'],
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
      const get = request.pre.postcodeData ? Supplier.findByDeliveryLocations(request.pre.postcodeData) : Supplier.find();

      get.then(suppliers => {
        reply(suppliers);
      }, reply.error.bind(reply));
    },
    config: {
      tags: ['api'],
      pre: [{method: getDeliveryPostcodeData, assign: 'postcodeData'}],
      validate: {
        query: {
          deliver_to: Joi.string().regex(/^[A-Z]{1,2}[0-9][0-9A-Z]?[0-9][A-Z]{2}$/i, 'postcode').description('Delivery postcode (no white space)')
        }
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
      Promise.all([
        Supplier.get(request.params.id),
        SupplierDepot.find(request.params.id)
      ])
      .then(_.spread((supplier, depots) => {
        if (!supplier) {
          return reply(Boom.notFound());
        }

        if (depots.length) {
          return reply(Boom.conflict(`Supplier "${request.params.id}" has associated depots, which must be deleted first.`));
        }

        Supplier.delete(request.params.id)
          .then(() => reply().code(204), reply.error.bind(reply));
      }));
    },
    config: {
      tags: ['api'],
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
