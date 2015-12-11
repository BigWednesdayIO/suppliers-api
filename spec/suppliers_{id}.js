'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const expect = require('chai').expect;
const auth0Stubber = require('./auth0_stubber');
const signJwt = require('./sign_jwt');

const specRequest = require('./spec_request');
const depotParameters = require('./parameters/depot');
const linkedProductParameters = require('./parameters/linked_product');

const adminToken = signJwt({scope: ['admin']});
const otherUsersToken = signJwt({scope: ['supplier:12345']});

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

  describe('put', function () {
    this.timeout(5000);
    let updateResponse;

    let createSupplierPayload;
    let updatedSupplierPayload;
    let token;

    beforeEach(() => {
      auth0Stubber.disable();
      createSupplierPayload = {name: 'A Supplier', email: `${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'};
      updatedSupplierPayload = {name: 'New name', email: `${cuid()}@bigwednesday.io`};

      return specRequest({url: '/suppliers', method: 'POST', payload: createSupplierPayload})
        .then(response => {
          token = signJwt({scope: [`supplier:${response.result.id}`]});
          return specRequest({url: `/suppliers/${response.result.id}`, method: 'PUT', payload: updatedSupplierPayload, headers: {authorization: token}});
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
      return specRequest({url: '/suppliers/abc', method: 'PUT', payload: updatedSupplierPayload, headers: {authorization: adminToken}})
        .then(response => {
          expect(response.statusCode).to.equal(404);
        });
    });

    it('returns http 403 when updating supplier without correct scope ', () => {
      return specRequest({url: '/suppliers/abc', method: 'PUT', payload: updatedSupplierPayload, headers: {authorization: otherUsersToken}})
        .then(response => {
          expect(response.statusCode).to.equal(403);
          expect(response.result.message).match(/Insufficient scope/);
        });
    });

    describe('validation', () => {
      const putSupplierPayload = {name: 'supplier', email: `${cuid()}@bigwednesday.io`};
      const supToken = signJwt({scope: ['supplier:SUP']});

      it('rejects id', () => {
        const payload = _.assign({id: 'SUP'}, putSupplierPayload);

        return specRequest({url: '/suppliers/SUP', method: 'PUT', payload, headers: {authorization: supToken}})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('"id" is not allowed');
          });
      });

      it('requires email', () => {
        const payload = _.omit(putSupplierPayload, 'email');

        return specRequest({url: '/suppliers/SUP', method: 'PUT', payload, headers: {authorization: supToken}})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "email" fails because ["email" is required]');
          });
      });

      it('requires correct email format', () => {
        const payload = _.clone(putSupplierPayload);
        payload.email = 'bigwednesday.io';

        return specRequest({url: '/suppliers/SUP', method: 'PUT', payload, headers: {authorization: supToken}})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "email" fails because ["email" must be a valid email]');
          });
      });

      it('requires name', () => {
        const payload = _.omit(putSupplierPayload, 'name');

        return specRequest({url: '/suppliers/SUP', method: 'PUT', payload, headers: {authorization: supToken}})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "name" fails because ["name" is required]');
          });
      });

      it('requires name to be a string', () => {
        const payload = _.omit(putSupplierPayload, 'name');
        payload.name = 123;

        return specRequest({url: '/suppliers/SUP', method: 'PUT', payload, headers: {authorization: supToken}})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "name" fails because ["name" must be a string]');
          });
      });

      it('does not allow _metadata', () => {
        const payload = _.clone(putSupplierPayload);
        payload._metadata = {created: new Date()};

        return specRequest({url: '/suppliers/SUP', method: 'PUT', payload, headers: {authorization: supToken}})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('"_metadata" is not allowed');
          });
      });
    });
  });

  describe('delete', function () {
    this.timeout(5000);
    let supplier1;
    let supplier2;
    let supplier3;
    let supplier1Token;
    let supplier2Token;
    let supplier3Token;

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
        supplier1Token = signJwt({scope: [`supplier:${supplier1.id}`]});
        supplier2Token = signJwt({scope: [`supplier:${supplier2.id}`]});
        supplier3Token = signJwt({scope: [`supplier:${supplier3.id}`]});

        return Promise.all([
          specRequest({url: `/suppliers/${supplier2.id}/depots`, method: 'POST', payload: depotParameters(), headers: {authorization: supplier2Token}}),
          specRequest({url: `/suppliers/${supplier3.id}/linked_products`, method: 'POST', payload: linkedProductParameters, headers: {authorization: supplier3Token}})
        ]);
      });
    });

    it('returns http 404 when supplier does not exist', () => {
      return specRequest({url: '/suppliers/123', method: 'DELETE', headers: {authorization: signJwt({scope: ['supplier:123']})}})
        .then(response => expect(response.statusCode).to.equal(404));
    });

    it('returns http 403 when deleting supplier without correct scope', () => {
      return specRequest({url: '/suppliers/123', method: 'DELETE', headers: {authorization: signJwt({scope: ['supplier:555']})}})
        .then(response => {
          expect(response.statusCode).to.equal(403);
          expect(response.result.message).match(/Insufficient scope/);
        });
    });

    it('returns http 409 when supplier has associated depots', () => {
      return specRequest({url: `/suppliers/${supplier2.id}`, method: 'DELETE', headers: {authorization: supplier2Token}})
        .then(response => {
          expect(response.statusCode).to.equal(409);
          expect(response.result.message).to.equal(`Supplier "${supplier2.id}" has associated depots, which must be deleted first.`);
        });
    });

    it('returns http 409 when supplier has associated linked products', () => {
      return specRequest({url: `/suppliers/${supplier3.id}`, method: 'DELETE', headers: {authorization: supplier3Token}})
        .then(response => {
          expect(response.statusCode).to.equal(409);
          expect(response.result.message).to.equal(`Supplier "${supplier3.id}" has associated linked products, which must be deleted first.`);
        });
    });

    it('returns http 204', () => {
      return specRequest({url: `/suppliers/${supplier1.id}`, method: 'DELETE', headers: {authorization: supplier1Token}})
        .then(response => expect(response.statusCode).to.equal(204));
    });
  });
});
