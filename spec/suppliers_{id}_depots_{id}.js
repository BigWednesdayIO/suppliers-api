'use strict';

const _ = require('lodash');
const expect = require('chai').expect;

const specRequest = require('./spec_request');
const depotParameters = require('./parameters/depot');

describe('/suppliers/{id}/depots/{id}', () => {
  describe('put', () => {
    it('returns http 404 when supplier does not exist', () => {
      return specRequest({url: '/suppliers/123/depots/1', method: 'PUT', payload: depotParameters()})
        .then(response => {
          expect(response.statusCode).to.equal(404);
          expect(response.result).to.have.property('message', 'Supplier "123" not found.');
        });
    });

    describe('as create', () => {
      let createResponse;
      const createPayload = depotParameters();

      beforeEach(() => {
        return specRequest({url: '/suppliers/1', method: 'PUT', payload: {name: 'Supplier'}})
          .then(() => specRequest({url: '/suppliers/1/depots/1', method: 'PUT', payload: createPayload}))
          .then(response => {
            createResponse = response;
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

    describe('as update', () => {
      let updateResponse;
      const updatePayload = _.assign(depotParameters(), {name: 'A new name'});

      beforeEach(() => {
        return specRequest({url: '/suppliers/1', method: 'PUT', payload: {name: 'Supplier'}})
          .then(() => specRequest({url: '/suppliers/1/depots/1', method: 'PUT', payload: depotParameters()}))
          .then(() => specRequest({url: '/suppliers/1/depots/1', method: 'PUT', payload: updatePayload}))
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
      it('rejects id', () => {
        const payload = _.assign({id: '1'}, depotParameters());

        return specRequest({url: '/suppliers/1/depots/1', method: 'PUT', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('"id" is not allowed');
          });
      });

      it('requires name', () => {
        const payload = _.omit(depotParameters(), 'name');

        return specRequest({url: '/suppliers/1/depots/1', method: 'PUT', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "name" fails because ["name" is required]');
          });
      });

      it('requires name to be a string', () => {
        const payload = _.omit(depotParameters(), 'name');
        payload.name = 123;

        return specRequest({url: '/suppliers/1/depots/1', method: 'PUT', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "name" fails because ["name" must be a string]');
          });
      });

      it('requires delivery_outward_codes', () => {
        const payload = _.omit(depotParameters(), 'delivery_outward_codes');

        return specRequest({url: '/suppliers/1/depots/1', method: 'PUT', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "delivery_outward_codes" fails because ["delivery_outward_codes" is required]');
          });
      });

      it('requires delivery_outward_codes to be an array', () => {
        const payload = _.assign({}, depotParameters(), {delivery_outward_codes: 1});

        return specRequest({url: '/suppliers/1/depots/1', method: 'PUT', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "delivery_outward_codes" fails because ["delivery_outward_codes" must be an array]');
          });
      });

      it('requires delivery_outward_codes items to be strings', () => {
        const payload = _.assign({}, depotParameters(), {delivery_outward_codes: [1]});

        return specRequest({url: '/suppliers/1/depots/1', method: 'PUT', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "delivery_outward_codes" fails because ["delivery_outward_codes" at position 0 fails because ["0" must be a string]]');
          });
      });

      it('requires delivery_outward_codes items to be in the correct format', () => {
        const payload = _.assign({}, depotParameters(), {delivery_outward_codes: ['1']});

        return specRequest({url: '/suppliers/1/depots/1', method: 'PUT', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "delivery_outward_codes" fails because ["delivery_outward_codes" at position 0 fails because ["0" with value "1" fails to match the outward code pattern]]');
          });
      });

      it('requires delivery_postcode_areas', () => {
        const payload = _.omit(depotParameters(), 'delivery_postcode_areas');

        return specRequest({url: '/suppliers/1/depots/1', method: 'PUT', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "delivery_postcode_areas" fails because ["delivery_postcode_areas" is required]');
          });
      });

      it('requires delivery_postcode_areas to be an array', () => {
        const payload = _.assign({}, depotParameters(), {delivery_postcode_areas: 1});

        return specRequest({url: '/suppliers/1/depots/1', method: 'PUT', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "delivery_postcode_areas" fails because ["delivery_postcode_areas" must be an array]');
          });
      });

      it('requires delivery_postcode_areas items to be strings', () => {
        const payload = _.assign({}, depotParameters(), {delivery_postcode_areas: [1]});

        return specRequest({url: '/suppliers/1/depots/1', method: 'PUT', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "delivery_postcode_areas" fails because ["delivery_postcode_areas" at position 0 fails because ["0" must be a string]]');
          });
      });

      it('does not allow _metadata', () => {
        const payload = _.assign({_metadata: {created: new Date()}}, depotParameters());

        return specRequest({url: '/suppliers/1/depots/1', method: 'PUT', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('"_metadata" is not allowed');
          });
      });
    });
  });

  describe('get', () => {
    let getResponse;
    const depot = depotParameters();

    beforeEach(() => {
      return specRequest({url: '/suppliers/1', method: 'PUT', payload: {name: 'Supplier'}})
        .then(() => specRequest({url: '/suppliers/1/depots/1', method: 'PUT', payload: depot}))
        .then(() => specRequest({url: '/suppliers/1/depots/1', method: 'GET'}))
        .then(response => {
          getResponse = response;
        });
    });

    it('returns http 404 when supplier does not exist', () => {
      return specRequest({url: '/suppliers/123/depots/1', method: 'GET'})
        .then(response => {
          expect(response.statusCode).to.equal(404);
          expect(response.result).to.have.property('message', 'Supplier "123" not found.');
        });
    });

    it('returns http 404 when depot does not exist', () => {
      return specRequest({url: '/suppliers/1/depots/2', method: 'GET'})
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

  describe('delete', () => {
    beforeEach(() => {
      return specRequest({url: '/suppliers/1', method: 'PUT', payload: {name: 'Supplier'}})
        .then(() => specRequest({url: '/suppliers/1/depots/1', method: 'PUT', payload: depotParameters()}));
    });

    it('returns http 404 when supplier does not exist', () => {
      return specRequest({url: '/suppliers/123/depots/1', method: 'DELETE'})
        .then(response => {
          expect(response.statusCode).to.equal(404);
          expect(response.result).to.have.property('message', 'Supplier "123" not found.');
        });
    });

    it('returns http 404 when depot does not exist', () => {
      return specRequest({url: '/suppliers/1/depots/2', method: 'DELETE'})
        .then(response => expect(response.statusCode).to.equal(404));
    });

    it('returns http 204', () => {
      return specRequest({url: '/suppliers/1/depots/1', method: 'DELETE'})
        .then(response => expect(response.statusCode).to.equal(204));
    });
  });
});
