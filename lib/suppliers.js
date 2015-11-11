'use strict';

const Boom = require('boom');
const Joi = require('joi');

const Supplier = require('./models/supplier');

const supplierParametersSchema = Joi.object({
  name: Joi.string().required().description('Supplier name')
}).meta({
  className: 'SupplierParameters'
});

const suppliersSchema = supplierParametersSchema.concat(Joi.object({
  id: Joi.string().required().description('Supplier identifier')
})).meta({
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
      Joi.validate(request.payload, {id: Joi.valid(request.params.id)}, {convert: false, allowUnknown: true}, err => {
        if (err) {
          return reply(Boom.badRequest(`child "id" fails because ["id" must be ${request.params.id}]`, err));
        }

        Supplier.upsert(request.payload).then(supplier => {
          const response = reply(supplier);

          if (supplier._inserted) {
            response.created(`/suppliers/${supplier.id}`);
          }
        }, reply.error.bind(reply));
      });
    },
    config: {
      tags: ['api'],
      validate: {
        params: {
          id: Joi.string().required().description('Supplier identifier')
        },
        payload: suppliersSchema
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
