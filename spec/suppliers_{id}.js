'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const expect = require('chai').expect;
const auth0Stubber = require('./auth0_stubber');

const specRequest = require('./spec_request');
const depotParameters = require('./parameters/depot');
const linkedProductParameters = require('./parameters/linked_product');

describe('/suppliers/{id}', () => {
  const createSupplierPayload = {name: 'A Supplier', email: `${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'};

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
      const resource = _.omit(createSupplierPayload, 'password');
      resource.id = createResponse.result.id;

      expect(getResponse.result).to.have.property('_metadata');
      expect(getResponse.result._metadata).to.have.property('created');
      expect(getResponse.result._metadata.created).to.be.an.instanceOf(Date);

      const result = _.omit(getResponse.result, '_metadata');
      expect(result).to.deep.equal(resource);
    });
  });

  describe('put', () => {
    let updateResponse;

    let createSupplierPayload;
    let updatedSupplierPayload;

    beforeEach(() => {
      auth0Stubber.disable();
      createSupplierPayload = {name: 'A Supplier', email: `${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'};
      updatedSupplierPayload = {name: 'New name', email: `${cuid()}@bigwednesday.io`};

      return specRequest({url: '/suppliers', method: 'POST', payload: createSupplierPayload})
        .then(response => {
          return specRequest({url: `/suppliers/${response.result.id}`, method: 'PUT', payload: updatedSupplierPayload});
        })
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

    it('returns http 404 for a supplier that doesn\'t exist', () => {
      return specRequest({url: '/suppliers/abc', method: 'PUT', payload: updatedSupplierPayload})
        .then(response => {
          expect(response.statusCode).to.equal(404);
        });
    });

    describe('validation', () => {
      const putSupplierPayload = {name: 'supplier', email: `${cuid()}@bigwednesday.io`};

      it('rejects id', () => {
        const payload = _.assign({id: 'SUP'}, putSupplierPayload);

        return specRequest({url: '/suppliers/SUP', method: 'PUT', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('"id" is not allowed');
          });
      });

      it('requires email', () => {
        const payload = _.omit(putSupplierPayload, 'email');

        return specRequest({url: '/suppliers/SUP', method: 'PUT', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "email" fails because ["email" is required]');
          });
      });

      it('requires correct email format', () => {
        const payload = _.clone(putSupplierPayload);
        payload.email = 'bigwednesday.io';

        return specRequest({url: '/suppliers/SUP', method: 'PUT', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "email" fails because ["email" must be a valid email]');
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

  describe('delete', () => {
    let supplier1;
    let supplier2;
    let supplier3;

    beforeEach(() => {
      auth0Stubber.disable();

      return Promise.all([
        specRequest({url: '/suppliers', method: 'POST', payload: {name: 'Supplier', email: `${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'}}),
        specRequest({url: '/suppliers', method: 'POST', payload: {name: 'Supplier', email: `${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'}}),
        specRequest({url: '/suppliers', method: 'POST', payload: {name: 'Supplier', email: `${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'}})
      ])
      .then(responses => {
        supplier1 = responses[0].result;
        supplier2 = responses[1].result;
        supplier3 = responses[2].result;

        return Promise.all([
          specRequest({url: `/suppliers/${supplier2.id}/depots`, method: 'POST', payload: depotParameters()}),
          specRequest({url: `/suppliers/${supplier3.id}/linked_products`, method: 'POST', payload: linkedProductParameters})
        ]);
      });
    });

    it('returns http 404 when supplier does not exist', () => {
      return specRequest({url: '/suppliers/123', method: 'DELETE'})
        .then(response => expect(response.statusCode).to.equal(404));
    });

    it('returns http 409 when supplier has associated depots', () => {
      return specRequest({url: `/suppliers/${supplier2.id}`, method: 'DELETE'})
        .then(response => {
          expect(response.statusCode).to.equal(409);
          expect(response.result.message).to.equal(`Supplier "${supplier2.id}" has associated depots, which must be deleted first.`);
        });
    });

    it('returns http 409 when supplier has associated linked products', () => {
      return specRequest({url: `/suppliers/${supplier3.id}`, method: 'DELETE'})
        .then(response => {
          expect(response.statusCode).to.equal(409);
          expect(response.result.message).to.equal(`Supplier "${supplier3.id}" has associated linked products, which must be deleted first.`);
        });
    });

    it('returns http 204', () => {
      return specRequest({url: `/suppliers/${supplier1.id}`, method: 'DELETE'})
        .then(response => expect(response.statusCode).to.equal(204));
    });
  });
});
