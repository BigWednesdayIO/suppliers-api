'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const specRequest = require('./spec_request');

describe('/suppliers/{id}/depots/{id}', () => {
  describe('put', () => {
    let createResponse;
    const createPayload = {name: 'A Depot'};

    before(() => {
      return specRequest({url: '/suppliers/1', method: 'PUT', payload: {name: 'Supplier'}})
        .then(() => specRequest({url: '/suppliers/1/depots/1', method: 'PUT', payload: createPayload}))
        .then(response => {
          createResponse = response;
        });
    });

    describe('as create', () => {
      it('returns http 404 when supplier does not exist', () => {
        return specRequest({url: '/suppliers/123/depots/1', method: 'PUT', payload: createPayload})
          .then(response => {
            expect(response.statusCode).to.equal(404);
            expect(response.result).to.have.property('message', 'Supplier "123" not found.');
          });
      });

      it('returns http 201', () => {
        expect(createResponse.statusCode).to.equal(201);
      });

      it('returns created resource location', () => {
        expect(createResponse.headers.location).to.equal(`/suppliers/1/depots/1`);
      });

      it('returns a depot resource', () => {
        const resource = _.clone(createPayload);
        resource.id = '1';

        expect(createResponse.result).to.have.property('_metadata');
        expect(createResponse.result._metadata).to.have.property('created');
        expect(createResponse.result._metadata.created).to.be.an.instanceOf(Date);

        const result = _.omit(createResponse.result, '_metadata');
        expect(result).to.deep.equal(resource);
      });
    });

    describe('validation', () => {
      const putDepotPayload = {name: 'name'};

      it('rejects id', () => {
        const payload = _.assign({id: '1'}, putDepotPayload);

        return specRequest({url: '/suppliers/1/depots/1', method: 'PUT', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('"id" is not allowed');
          });
      });

      it('requires name', () => {
        const payload = _.omit(putDepotPayload, 'name');

        return specRequest({url: '/suppliers/1/depots/1', method: 'PUT', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "name" fails because ["name" is required]');
          });
      });

      it('requires name to be a string', () => {
        const payload = _.omit(putDepotPayload, 'name');
        payload.name = 123;

        return specRequest({url: '/suppliers/1/depots/1', method: 'PUT', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "name" fails because ["name" must be a string]');
          });
      });

      it('does not allow _metadata', () => {
        const payload = _.clone(putDepotPayload);
        payload._metadata = {created: new Date()};

        return specRequest({url: '/suppliers/1/depots/1', method: 'PUT', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('"_metadata" is not allowed');
          });
      });
    });
  });
});
