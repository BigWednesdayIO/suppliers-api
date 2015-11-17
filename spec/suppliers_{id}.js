'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const specRequest = require('./spec_request');

describe('/suppliers/{id}', () => {
  const createSupplierPayload = {name: 'A Supplier'};

  describe('get', () => {
    let createResponse;
    let getResponse;

    beforeEach(() => {
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

      expect(getResponse.result).to.have.property('_metadata');
      expect(getResponse.result._metadata).to.have.property('created');
      expect(getResponse.result._metadata.created).to.be.an.instanceOf(Date);

      const result = _.omit(getResponse.result, '_metadata');
      expect(result).to.deep.equal(resource);
    });
  });

  describe('put', () => {
    let createResponse;
    const createSupplierPayload = {name: 'A Supplier'};

    beforeEach(() => {
      return specRequest({url: '/suppliers/1', method: 'PUT', payload: createSupplierPayload})
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

        expect(createResponse.result).to.have.property('_metadata');
        expect(createResponse.result._metadata).to.have.property('created');
        expect(createResponse.result._metadata.created).to.be.an.instanceOf(Date);

        const result = _.omit(createResponse.result, '_metadata');
        expect(result).to.deep.equal(resource);
      });
    });

    describe('as update', () => {
      let updateResponse;
      const updatedSupplierPayload = {name: 'New name'};

      beforeEach(() => {
        return specRequest({url: '/suppliers/1', method: 'PUT', payload: {name: 'initial name'}})
          .then(() => specRequest({url: '/suppliers/1', method: 'PUT', payload: updatedSupplierPayload}))
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

        expect(updateResponse.result).to.have.property('_metadata');
        expect(updateResponse.result._metadata).to.have.property('created');
        expect(updateResponse.result._metadata.created).to.be.an.instanceOf(Date);

        const result = _.omit(updateResponse.result, '_metadata');
        expect(result).to.deep.equal(resource);
      });
    });

    describe('validation', () => {
      const putSupplierPayload = {name: 'supplier'};

      it('rejects id', () => {
        const payload = _.assign({id: 'SUP'}, putSupplierPayload);

        return specRequest({url: '/suppliers/SUP', method: 'PUT', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('"id" is not allowed');
          });
      });

      it('requires name', () => {
        const payload = _.omit(putSupplierPayload, 'name');

        return specRequest({url: '/suppliers/SUP', method: 'PUT', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "name" fails because ["name" is required]');
          });
      });

      it('requires name to be a string', () => {
        const payload = _.omit(putSupplierPayload, 'name');
        payload.name = 123;

        return specRequest({url: '/suppliers/SUP', method: 'PUT', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "name" fails because ["name" must be a string]');
          });
      });

      it('does not allow _metadata', () => {
        const payload = _.clone(putSupplierPayload);
        payload._metadata = {created: new Date()};

        return specRequest({url: '/suppliers/SUP', method: 'PUT', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('"_metadata" is not allowed');
          });
      });
    });
  });
});
