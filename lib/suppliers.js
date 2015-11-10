'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const Joi = require('joi');

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

const suppliers = [];

exports.register = function (server, options, next) {
  server.route({
    method: 'POST',
    path: '/suppliers',
    handler: (req, reply) => {
      const supplier = req.payload;
      supplier.id = cuid();

      suppliers.push(supplier);

      reply(supplier).created(`/suppliers/${supplier.id}`);
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
    method: 'GET',
    path: '/suppliers/{id}',
    handler: (req, reply) => {
      const supplier = _.find(suppliers, {id: req.params.id});

      reply(supplier);
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

  return next();
};

exports.register.attributes = {
  name: 'suppliers'
};
