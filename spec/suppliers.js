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

      expect(createResponse.result).to.have.property('_metadata');
      expect(createResponse.result._metadata).to.have.property('created');
      expect(createResponse.result._metadata.created).to.be.an.instanceOf(Date);

      const result = _.omit(createResponse.result, '_metadata');
      expect(result).to.deep.equal(resource);
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

      it('does not allow _metadata', () => {
        const payload = _.clone(createSupplierPayload);
        payload._metadata = {created: new Date()};

        return specRequest({url: '/suppliers', method: 'POST', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('"_metadata" is not allowed');
          });
      });
    });
  });

  describe('get', () => {
    const suppliers = [
      {name: 'Supplier A'},
      {name: 'Supplier B'},
      {name: 'Supplier C'}
    ];

    before(() => {
      return require('./hooks').deleteTestData()
        .then(() => specRequest({url: '/suppliers/B', method: 'PUT', payload: suppliers[1]}))
        .then(() => specRequest({url: '/suppliers/A', method: 'PUT', payload: suppliers[0]}))
        .then(() => specRequest({url: '/suppliers/C', method: 'PUT', payload: suppliers[2]}));
    });

    it('returns all suppliers', () => {
      return specRequest({url: '/suppliers', method: 'GET'})
        .then(response => {
          expect(response.statusCode).to.equal(200);

          response.result.forEach(supplier => {
            expect(supplier).to.have.property('_metadata');
            expect(supplier._metadata).to.have.property('created');
            expect(supplier._metadata.created).to.be.an.instanceOf(Date);
          });

          const result = response.result.map(supplier => _.omit(supplier, '_metadata'));

          expect(result).to.deep.equal([
            _.assign({id: 'B'}, suppliers[1]),
            _.assign({id: 'A'}, suppliers[0]),
            _.assign({id: 'C'}, suppliers[2])
          ]);
        });
    });
  });
});
