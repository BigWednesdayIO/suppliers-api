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
    let createResponse;
    let getResponse;

    before(() => {
      return specRequest({url: '/suppliers', method: 'POST', payload: createSupplierPayload})
        .then(response => {
          expect(response.statusCode).to.equal(201);

          createResponse = response;
          return specRequest({url: response.headers.location, method: 'GET'});
        })
        .then(response => {
          getResponse = response;
        });
    });

    it('returns http 200 for a known supplier', () => {
      expect(getResponse.statusCode).to.equal(200);
    });

    it('returns http 404 for a supplier that doesn\'t exist', () => {
      return specRequest({url: '/suppliers/abc', method: 'GET'})
        .then(response => {
          expect(response.statusCode).to.equal(404);
        });
    });

    it('returns the supplier resource', () => {
      const resource = _.clone(createSupplierPayload);
      resource.id = createResponse.result.id;

      expect(getResponse.result).to.deep.equal(resource);
    });
  });

  describe('put', () => {
    let createResponse;
    const createSupplierPayload = {id: 'SUP', name: 'A Supplier'};

    before(() => {
      return specRequest({url: '/suppliers/SUP', method: 'PUT', payload: createSupplierPayload})
        .then(response => {
          createResponse = response;
        });
    });

    describe('as create', () => {
      it('returns http 201', () => {
        expect(createResponse.statusCode).to.equal(201);
      });

      it('returns created resource location', () => {
        expect(createResponse.headers.location).to.equal(`/suppliers/${createResponse.result.id}`);
      });

      it('returns a supplier resource', () => {
        const resource = _.clone(createSupplierPayload);
        resource.id = createResponse.result.id;

        expect(createResponse.result).to.deep.equal(resource);
      });
    });

    describe('as update', () => {
      let updateResponse;
      const updatedSupplierPayload = {id: 'SUP', name: 'New name'};

      before(() => {
        return specRequest({url: '/suppliers/SUP', method: 'PUT', payload: updatedSupplierPayload})
          .then(response => {
            updateResponse = response;
          });
      });

      it('returns http 200', () => {
        expect(updateResponse.statusCode).to.equal(200);
      });

      it('returns a supplier resource', () => {
        const resource = _.clone(updatedSupplierPayload);
        resource.id = updateResponse.result.id;

        expect(updateResponse.result).to.deep.equal(resource);
      });
    });
  });
});
