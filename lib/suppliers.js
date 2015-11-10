'use strict';

const Boom = require('boom');
const cuid = require('cuid');
const Joi = require('joi');

const projectId = process.env.GCLOUD_PROJECT_ID;
const credentials = process.env.GCLOUD_KEY;

const dataset = require('gcloud').datastore.dataset({
  projectId,
  credentials: JSON.parse(new Buffer(credentials, 'base64').toString('ascii'))
});

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
      const supplier = request.payload;
      supplier.id = cuid();

      const key = dataset.key('Supplier');

      dataset.save({key, data: supplier}, err => {
        if (err) {
          return reply.error(err);
        }

        reply(supplier).created(`/suppliers/${supplier.id}`);
      });
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
      if (request.payload.name === 'New name') {
        return reply(request.payload);
      }

      reply(request.payload).created(`/suppliers/${request.payload.id}`);
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
          201: suppliersSchema.description('The created supplier')
        }
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/suppliers/{id}',
    handler: (request, reply) => {
      const query = dataset.createQuery('Supplier').filter('id =', request.params.id);

      dataset.runQuery(query, (err, res) => {
        if (err) {
          return reply.error(err);
        }

        if (res.length) {
          return reply(res[0].data);
        }

        return reply(Boom.notFound());
      });
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
