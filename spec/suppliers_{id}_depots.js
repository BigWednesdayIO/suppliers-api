'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const specRequest = require('./spec_request');

describe('/suppliers/{id}/depots', () => {
  const createPayload = {name: 'A depot'};
  let createResponse;

  before(() => {
    return specRequest({url: '/suppliers/1', method: 'PUT', payload: {name: 'Supplier 1'}})
      .then(() => specRequest({url: '/suppliers/1/depots', method: 'POST', payload: createPayload}))
      .then(response => {
        createResponse = response;
      });
  });

  describe('post', () => {
    it('returns http 404 for a non existant supplier', () => {
      return specRequest({url: '/suppliers/123/depots', method: 'POST', payload: {name: 'Depot 1'}})
        .then(response => {
          expect(response.statusCode).to.equal(404);
          expect(response.result).to.have.property('message', 'Supplier "123" not found.');
        });
    });

    it('returns http 201 for a new depot', () => {
      expect(createResponse.statusCode).to.equal(201);
    });

    it('returns created resource location', () => {
      expect(createResponse.headers.location).to.equal(`/suppliers/1/depots/${createResponse.result.id}`);
    });

    it('returns the created resource', () => {
      const resource = _.clone(createPayload);
      resource.id = createResponse.result.id;

      expect(createResponse.result).to.have.property('_metadata');
      expect(createResponse.result._metadata).to.have.property('created');
      expect(createResponse.result._metadata.created).to.be.an.instanceOf(Date);

      const result = _.omit(createResponse.result, '_metadata');
      expect(result).to.deep.equal(resource);
    });

    describe('validation', () => {
      it('requires name', () => {
        const payload = _.omit(createPayload, 'name');

        return specRequest({url: '/suppliers/1/depots', method: 'POST', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "name" fails because ["name" is required]');
          });
      });

      it('requires name to be a string', () => {
        const payload = _.omit(createPayload, 'name');
        payload.name = 123;

        return specRequest({url: '/suppliers/1/depots', method: 'POST', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "name" fails because ["name" must be a string]');
          });
      });

      it('does not allow _metadata', () => {
        const payload = _.clone(createPayload);
        payload._metadata = {created: new Date()};

        return specRequest({url: '/suppliers/1/depots', method: 'POST', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('"_metadata" is not allowed');
          });
      });
    });
  });

  describe('get', () => {
    const depots = [
      {name: 'Depot 1'},
      {name: 'Depot 2'},
      {name: 'Depot 3'}
    ];

    before(() => {
      return specRequest({url: '/suppliers/2', method: 'PUT', payload: {name: 'Supplier 2'}})
        .then(() => specRequest({url: '/suppliers/1/depots/3', method: 'PUT', payload: depots[2]}))
        .then(() => specRequest({url: '/suppliers/1/depots/1', method: 'PUT', payload: depots[0]}))
        .then(() => specRequest({url: '/suppliers/1/depots/2', method: 'PUT', payload: depots[1]}))
        .then(() => specRequest({url: '/suppliers/2/depots/1', method: 'PUT', payload: {name: 'Supplier 2, Depot 1'}}));
    });

    it('returns http 404 for a non existant supplier', () => {
      return specRequest({url: '/suppliers/123/depots', method: 'GET'})
        .then(response => {
          expect(response.statusCode).to.equal(404);
          expect(response.result).to.have.property('message', 'Supplier "123" not found.');
        });
    });

    it('returns depots for the supplier', () => {
      return specRequest({url: '/suppliers/1/depots', method: 'GET'})
        .then(response => {
          expect(response.statusCode).to.equal(200);

          response.result.forEach(depot => {
            expect(depot).to.have.property('_metadata');
            expect(depot._metadata).to.have.property('created');
            expect(depot._metadata.created).to.be.an.instanceOf(Date);
          });

          const result = response.result.map(depot => _.omit(depot, '_metadata'));

          expect(result).to.deep.equal([
            _.assign({id: '3'}, depots[2]),
            _.assign({id: '1'}, depots[0]),
            _.assign({id: '2'}, depots[1])
          ]);
        });
    });
  });
});
