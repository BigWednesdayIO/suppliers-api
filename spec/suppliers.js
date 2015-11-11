'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const specRequest = require('./spec_request');

describe('/suppliers', () => {
  const createSupplierPayload = {name: 'A Supplier'};

  describe('post', () => {
    let createResponse;

    before(() => {
      return specRequest({url: '/suppliers', method: 'POST', payload: createSupplierPayload})
        .then(response => {
          createResponse = response;
        });
    });

    it('returns http 201', () => {
      expect(createResponse.statusCode).to.equal(201);
    });

    it('returns created resource location', () => {
      expect(createResponse.headers.location).to.equal(`/suppliers/${createResponse.result.id}`);
    });

    it('returns the supplier resource', () => {
      const resource = _.clone(createSupplierPayload);
      resource.id = createResponse.result.id;

      expect(createResponse.result).to.deep.equal(resource);
    });

    describe('validation', () => {
      it('requires name', () => {
        const payload = _.omit(createSupplierPayload, 'name');

        return specRequest({url: '/suppliers', method: 'POST', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "name" fails because ["name" is required]');
          });
      });

      it('requires name to be a string', () => {
        const payload = _.omit(createSupplierPayload, 'name');
        payload.name = 123;

        return specRequest({url: '/suppliers', method: 'POST', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "name" fails because ["name" must be a string]');
          });
      });
    });
  });

  describe('get', () => {
    const suppliers = [
      {id: 'A', name: 'Supplier A'},
      {id: 'B', name: 'Supplier B'},
      {id: 'C', name: 'Supplier C'}
    ];

    before(() => {
      return require('./hooks').deleteTestData()
        .then(() => Promise.all([
          specRequest({url: '/suppliers/A', method: 'PUT', payload: suppliers[0]}),
          specRequest({url: '/suppliers/B', method: 'PUT', payload: suppliers[1]}),
          specRequest({url: '/suppliers/C', method: 'PUT', payload: suppliers[2]})
        ]));
    });

    it('returns all suppliers', () => {
      return specRequest({url: '/suppliers', method: 'GET'})
        .then(response => {
          expect(response.statusCode).to.equal(200);
          expect(response.result).to.deep.equal(suppliers);
        });
    });
  });
});
