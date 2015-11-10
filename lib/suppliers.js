'use strict';

const Joi = require('joi');

const supplierParametersSchema = Joi.object({
  name: Joi.string().required().description('Supplier name')
});

const suppliersSchema = supplierParametersSchema.concat(Joi.object({
  id: Joi.string().required().description('Supplier identifier')
}));

exports.register = function (server, options, next) {
  server.route({
    method: 'POST',
    path: '/suppliers',
    handler: (req, reply) => {
      const supplier = req.payload;
      supplier.id = '1';

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

  return next();
};

exports.register.attributes = {
  name: 'suppliers'
};
