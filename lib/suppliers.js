'use strict';

const Boom = require('boom');
const Joi = require('joi');

const Supplier = require('./datastore_model')('Supplier');

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
  }).description('Supplier metadata')
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
      Supplier.upsert(request.params.id, request.payload).then(upserted => {
        const response = reply(upserted);

        if (upserted._inserted) {
          response.created(`/suppliers/${upserted.id}`);
        }
      }, reply.error.bind(reply));
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
      Supplier.find().then(suppliers => {
        reply(suppliers);
      }, reply.error.bind(reply));
    },
    config: {
      tags: ['api'],
      response: {
        failAction: process.env.RESPONSE_FAIL_ACTION || 'log',
        status: {
          200: Joi.array().items(suppliersSchema).description('Suppliers')
        }
      }
    }
  });

  return next();
};

exports.register.attributes = {
  name: 'suppliers'
};
