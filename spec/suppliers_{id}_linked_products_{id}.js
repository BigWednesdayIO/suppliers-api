'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const expect = require('chai').expect;
const specRequest = require('./spec_request');
const signJwt = require('./sign_jwt');

const linkedProductParameters = require('./parameters/linked_product.js');

describe('/suppliers/{id}/linked_products/{id}', () => {
  const supplierPayload = {name: 'a supplier', email: `${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'};
  let createSupplierResponse;
  let createResponse;
  let token;

  beforeEach(() =>
    specRequest({url: '/suppliers', method: 'POST', payload: supplierPayload})
      .then(response => {
        createSupplierResponse = response;
        token = signJwt({scope: [`supplier:${response.result.id}`]});
        return specRequest({url: `${response.headers.location}/linked_products`, method: 'POST', payload: linkedProductParameters, headers: {authorization: token}});
      })
      .then(response => createResponse = response));

  describe('get', () => {
    let getResponse;

    beforeEach(() =>
      specRequest({url: createResponse.headers.location, method: 'GET', headers: {authorization: token}})
        .then(response => getResponse = response));

    it('returns http 200', () => {
      expect(getResponse.statusCode).to.equal(200);
    });

    it('returns the id', () => {
      expect(getResponse.result.id).to.equal(createResponse.result.id);
    });

    it('returns created and updated dates', () => {
      expect(getResponse.result._metadata.created).to.deep.equal(createResponse.result._metadata.created);
      expect(getResponse.result._metadata.updated).to.deep.equal(createResponse.result._metadata.updated);
    });

    it('returns the linked product resource', () => {
      expect(_.omit(getResponse.result, '_metadata', 'id')).to.deep.equal(linkedProductParameters);
    });

    it('returns the associated product when expanded', () =>
      specRequest({url: `${createResponse.headers.location}?expand[]=product`, method: 'GET', headers: {authorization: token}})
        .then(response => {
          expect(response.result).to.have.property('product');
          expect(response.result.product).to.be.an('object');
          expect(response.result).to.not.have.property('product_id');
        }));

    it('returns http 404 when supplier does not exist', () =>
      specRequest({url: '/suppliers/abc/linked_products/1', method: 'GET', headers: {authorization: signJwt({scope: ['supplier:abc']})}})
        .then(response => {
          expect(response.statusCode).to.equal(404);
          expect(response.result).to.have.property('message', 'Supplier "abc" not found.');
        }));

    it('returns http 404 when linked product does not exist', () =>
      specRequest({url: `${createSupplierResponse.headers.location}/linked_products/abc`, method: 'GET', headers: {authorization: token}})
        .then(response => expect(response.statusCode).to.equal(404)));

    it('rejects with http 400 when expand is not an array', () =>
      specRequest({url: `${createResponse.headers.location}?expand=product`, method: 'GET', headers: {authorization: token}})
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result).to.have.property('message', 'child "expand" fails because ["expand" must be an array]');
        }));

    it('rejects with http 400 when expand contains anything that is not "product"', () =>
      specRequest({url: `${createResponse.headers.location}?expand[]=test`, method: 'GET', headers: {authorization: token}})
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result).to.have.property('message', 'child "expand" fails because ["expand" at position 0 fails because ["0" must be one of [product]]]');
        }));

    it('returns http 403 when requesting linked product without correct scope', () => {
      return specRequest({url: createResponse.headers.location, method: 'GET', headers: {authorization: signJwt({scope: ['supplier:555']})}})
        .then(response => {
          expect(response.statusCode).to.equal(403);
          expect(response.result.message).match(/Insufficient scope/);
        });
    });
  });

  describe('put', () => {
    const updatePayload = Object.assign({}, linkedProductParameters, {product_id: '2'});
    let updateResponse;
    let getUpdatedResponse;

    beforeEach(() =>
      specRequest({url: createResponse.headers.location, method: 'PUT', payload: updatePayload, headers: {authorization: token}})
        .then(response => updateResponse = response)
        .then(() => specRequest({url: createResponse.headers.location, method: 'GET', headers: {authorization: token}}))
        .then(response => getUpdatedResponse = response));

    it('returns http 200', () => {
      expect(updateResponse.statusCode).to.equal(200);
    });

    it('returns the id', () => {
      expect(updateResponse.result.id).to.equal(createResponse.result.id);
    });

    it('returns created date', () => {
      expect(updateResponse.result._metadata.created).to.deep.equal(createResponse.result._metadata.created);
    });

    it('progresses the updated date', () => {
      expect(updateResponse.result._metadata.updated).to.be.a('date');
      expect(updateResponse.result._metadata.updated.toISOString()).to.be.above(createResponse.result._metadata.updated.toISOString());
    });

    it('returns the updated linked product resource', () => {
      expect(_.omit(updateResponse.result, '_metadata', 'id')).to.deep.equal(updatePayload);
    });

    it('persists the update', () => {
      expect(getUpdatedResponse.result).to.deep.equal(updateResponse.result);
    });

    it('returns http 404 when supplier does not exist', () =>
      specRequest({url: '/suppliers/abc/linked_products/1', method: 'PUT', payload: updatePayload, headers: {authorization: signJwt({scope: ['supplier:abc']})}})
        .then(response => {
          expect(response.statusCode).to.equal(404);
          expect(response.result).to.have.property('message', 'Supplier "abc" not found.');
        }));

    it('returns http 404 when linked product does not exist', () =>
      specRequest({url: `${createSupplierResponse.headers.location}/linked_products/abc`, method: 'PUT', payload: updatePayload, headers: {authorization: token}})
        .then(response => expect(response.statusCode).to.equal(404)));

    it('returns http 403 when updating linked product without correct scope', () => {
      return specRequest({url: createResponse.headers.location, method: 'PUT', payload: updatePayload, headers: {authorization: signJwt({scope: ['supplier:555']})}})
        .then(response => {
          expect(response.statusCode).to.equal(403);
          expect(response.result.message).match(/Insufficient scope/);
        });
    });
  });

  describe('delete', () => {
    let deleteResponse;

    beforeEach(() =>
      specRequest({url: createResponse.headers.location, method: 'DELETE', headers: {authorization: token}})
        .then(response => deleteResponse = response));

    it('returns http 204', () => {
      expect(deleteResponse.statusCode).to.equal(204);
    });

    it('returns nothing', () => {
      expect(deleteResponse.result).to.not.exist;
    });

    it('deletes the resource', () =>
      specRequest({url: createResponse.headers.location, method: 'GET', headers: {authorization: token}})
        .then(response => expect(response.statusCode).to.equal(404)));

    it('returns http 404 when supplier does not exist', () =>
      specRequest({url: '/suppliers/abc/linked_products/1', method: 'DELETE', headers: {authorization: signJwt({scope: ['supplier:abc']})}})
        .then(response => {
          expect(response.statusCode).to.equal(404);
          expect(response.result).to.have.property('message', 'Supplier "abc" not found.');
        }));

    it('returns http 404 when linked product does not exist', () =>
      specRequest({url: `${createSupplierResponse.headers.location}/linked_products/abc`, method: 'DELETE', headers: {authorization: token}})
        .then(response => expect(response.statusCode).to.equal(404)));

    it('returns http 403 when deleting linked product without correct scope', () => {
      return specRequest({url: createResponse.headers.location, method: 'DELETE', headers: {authorization: signJwt({scope: ['supplier:555']})}})
        .then(response => {
          expect(response.statusCode).to.equal(403);
          expect(response.result.message).match(/Insufficient scope/);
        });
    });
  });
});
