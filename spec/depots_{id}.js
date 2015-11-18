'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const specRequest = require('./spec_request');

describe('/depots/{id}', () => {
  describe('put', () => {
    it('returns http 400 when supplier does not exist', () => {
      return specRequest({url: '/depots/1', method: 'PUT', payload: {name: 'test', supplier_id: '123'}})
        .then(response => {
          expect(response.statusCode).to.equal(404);
          expect(response.result).to.have.property('message', 'Supplier "123" not found.');
        });
    });

    describe('as create', () => {
      let createResponse;
      const createPayload = {name: 'A Depot', supplier_id: '1'};

      beforeEach(() => {
        return specRequest({url: '/suppliers/1', method: 'PUT', payload: {name: 'Supplier'}})
          .then(() => specRequest({url: '/depots/1', method: 'PUT', payload: createPayload}))
          .then(response => {
            createResponse = response;
          });
      });

      it('returns http 201', () => {
        expect(createResponse.statusCode).to.equal(201);
      });

      it('returns created resource location', () => {
        expect(createResponse.headers.location).to.equal(`/depots/1`);
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

    describe('as update', () => {
      let updateResponse;
      const updatePayload = {name: 'A new name', supplier_id: '1'};

      beforeEach(() => {
        return specRequest({url: '/suppliers/1', method: 'PUT', payload: {name: 'Supplier'}})
          .then(() => specRequest({url: '/depots/1', method: 'PUT', payload: {name: 'a depot', supplier_id: '1'}}))
          .then(() => specRequest({url: '/depots/1', method: 'PUT', payload: updatePayload}))
          .then(response => {
            updateResponse = response;
          });
      });

      it('returns http 200', () => {
        expect(updateResponse.statusCode).to.equal(200);
      });

      it('returns a depot resource', () => {
        const resource = _.clone(updatePayload);
        resource.id = '1';

        expect(updateResponse.result).to.have.property('_metadata');
        expect(updateResponse.result._metadata).to.have.property('created');
        expect(updateResponse.result._metadata.created).to.be.an.instanceOf(Date);

        const result = _.omit(updateResponse.result, '_metadata');
        expect(result).to.deep.equal(resource);
      });
    });

    describe('validation', () => {
      const putDepotPayload = {name: 'name', supplier_id: '1'};

      it('rejects id', () => {
        const payload = _.assign({id: '1'}, putDepotPayload);

        return specRequest({url: '/depots/1', method: 'PUT', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('"id" is not allowed');
          });
      });

      it('requires name', () => {
        const payload = _.omit(putDepotPayload, 'name');

        return specRequest({url: '/depots/1', method: 'PUT', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "name" fails because ["name" is required]');
          });
      });

      it('requires name to be a string', () => {
        const payload = _.omit(putDepotPayload, 'name');
        payload.name = 123;

        return specRequest({url: '/depots/1', method: 'PUT', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "name" fails because ["name" must be a string]');
          });
      });

      it('requires supplier_id', () => {
        const payload = _.omit(putDepotPayload, 'supplier_id');

        return specRequest({url: '/depots/1', method: 'PUT', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "supplier_id" fails because ["supplier_id" is required]');
          });
      });

      it('requires supplier_id to be a string', () => {
        const payload = _.omit(putDepotPayload, 'supplier_id');
        payload.supplier_id = 123;

        return specRequest({url: '/depots/1', method: 'PUT', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "supplier_id" fails because ["supplier_id" must be a string]');
          });
      });

      it('does not allow _metadata', () => {
        const payload = _.clone(putDepotPayload);
        payload._metadata = {created: new Date()};

        return specRequest({url: '/depots/1', method: 'PUT', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('"_metadata" is not allowed');
          });
      });
    });
  });

  describe('get', () => {
    let getResponse;
    const depot = {name: 'a depot', supplier_id: '1'};

    beforeEach(() => {
      return specRequest({url: '/suppliers/1', method: 'PUT', payload: {name: 'Supplier'}})
        .then(() => specRequest({url: '/depots/1', method: 'PUT', payload: depot}))
        .then(() => specRequest({url: '/depots/1', method: 'GET'}))
        .then(response => {
          getResponse = response;
        });
    });

    it('returns http 404 when depot does not exist', () => {
      return specRequest({url: '/depots/2', method: 'GET'})
        .then(response => {
          expect(response.statusCode).to.equal(404);
        });
    });

    it('returns http 200', () => {
      expect(getResponse.statusCode).to.equal(200);
    });

    it('returns the depot resource', () => {
      const resource = _.clone(depot);
      resource.id = '1';

      expect(getResponse.result).to.have.property('_metadata');
      expect(getResponse.result._metadata).to.have.property('created');
      expect(getResponse.result._metadata.created).to.be.an.instanceOf(Date);

      const result = _.omit(getResponse.result, '_metadata');
      expect(result).to.deep.equal(resource);
    });
  });
});
