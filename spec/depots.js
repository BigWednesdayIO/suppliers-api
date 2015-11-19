'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const specRequest = require('./spec_request');

describe('/depots', () => {
  describe('post', () => {
    const createPayload = {name: 'A depot', supplier_id: '1'};
    let createResponse;

    beforeEach(() => {
      return specRequest({url: '/suppliers/1', method: 'PUT', payload: {name: 'Supplier 1'}})
        .then(() => specRequest({url: '/depots', method: 'POST', payload: createPayload}))
        .then(response => {
          createResponse = response;
        });
    });

    it('returns http 400 for a non existant supplier', () => {
      return specRequest({url: '/depots', method: 'POST', payload: {name: 'Depot 1', supplier_id: '123'}})
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result).to.have.property('message', 'child "supplier_id" fails because ["supplier_id" is not a known id]');
        });
    });

    it('returns http 201 for a new depot', () => {
      expect(createResponse.statusCode).to.equal(201);
    });

    it('returns created resource location', () => {
      expect(createResponse.headers.location).to.equal(`/depots/${createResponse.result.id}`);
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

        return specRequest({url: '/depots', method: 'POST', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "name" fails because ["name" is required]');
          });
      });

      it('requires name to be a string', () => {
        const payload = _.omit(createPayload, 'name');
        payload.name = 123;

        return specRequest({url: '/depots', method: 'POST', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "name" fails because ["name" must be a string]');
          });
      });

      it('requires supplier_id', () => {
        const payload = _.omit(createPayload, 'supplier_id');

        return specRequest({url: '/depots', method: 'POST', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "supplier_id" fails because ["supplier_id" is required]');
          });
      });

      it('requires supplier_id to be a string', () => {
        const payload = _.omit(createPayload, 'supplier_id');
        payload.supplier_id = 123;

        return specRequest({url: '/depots', method: 'POST', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "supplier_id" fails because ["supplier_id" must be a string]');
          });
      });

      it('does not allow _metadata', () => {
        const payload = _.clone(createPayload);
        payload._metadata = {created: new Date()};

        return specRequest({url: '/depots', method: 'POST', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('"_metadata" is not allowed');
          });
      });
    });
  });

  describe('get', () => {
    const depots = [
      {name: 'Depot A', supplier_id: '1'},
      {name: 'Depot B', supplier_id: '1'},
      {name: 'Depot C', supplier_id: '1'}
    ];

    beforeEach(() => {
      return specRequest({url: '/suppliers/1', method: 'PUT', payload: {name: 'supplier 1'}})
        .then(() => specRequest({url: '/depots/B', method: 'PUT', payload: depots[1]}))
        .then(() => specRequest({url: '/depots/A', method: 'PUT', payload: depots[0]}))
        .then(() => specRequest({url: '/depots/C', method: 'PUT', payload: depots[2]}));
    });

    it('returns all depots', () => {
      return specRequest({url: '/depots', method: 'GET'})
        .then(response => {
          expect(response.statusCode).to.equal(200);

          response.result.forEach(depot => {
            expect(depot).to.have.property('_metadata');
            expect(depot._metadata).to.have.property('created');
            expect(depot._metadata.created).to.be.an.instanceOf(Date);
          });

          const result = response.result.map(depot => _.omit(depot, '_metadata'));

          expect(result).to.deep.equal([
            _.assign({id: 'B'}, depots[1]),
            _.assign({id: 'A'}, depots[0]),
            _.assign({id: 'C'}, depots[2])
          ]);
        });
    });
  });
});
