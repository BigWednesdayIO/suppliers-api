'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const specRequest = require('./spec_request');

describe('/suppliers/{id}/linked_products/{id}', () => {
  const supplierPayload = {name: 'a supplier'};
  const linkedProductPayload = {product_id: '1'};
  let createSupplierResponse;
  let createResponse;

  beforeEach(() =>
    specRequest({url: '/suppliers', method: 'POST', payload: supplierPayload})
      .then(response => {
        createSupplierResponse = response;
        return specRequest({url: `${response.headers.location}/linked_products`, method: 'POST', payload: linkedProductPayload});
      })
      .then(response => createResponse = response));

  describe('get', () => {
    let getResponse;

    beforeEach(() =>
      specRequest({url: createResponse.headers.location, method: 'GET'})
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
      expect(_.omit(getResponse.result, '_metadata', 'id')).to.deep.equal(linkedProductPayload);
    });

    it('returns http 404 when supplier does not exist', () =>
      specRequest({url: '/suppliers/abc/linked_products/1', method: 'GET'})
        .then(response => {
          expect(response.statusCode).to.equal(404);
          expect(response.result).to.have.property('message', 'Supplier "abc" not found.');
        }));

    it('returns http 404 when linked product does not exist', () =>
      specRequest({url: `${createSupplierResponse.headers.location}/linked_products/abc`, method: 'GET'})
        .then(response => expect(response.statusCode).to.equal(404)));
  });

  describe('put', () => {
    const updatePayload = Object.assign({}, linkedProductPayload, {product_id: '2'});
    let updateResponse;
    let getUpdatedResponse;

    beforeEach(() =>
      specRequest({url: createResponse.headers.location, method: 'PUT', payload: updatePayload})
        .then(response => updateResponse = response)
        .then(() => specRequest({url: createResponse.headers.location, method: 'GET'}))
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
      specRequest({url: '/suppliers/abc/linked_products/1', method: 'PUT', payload: updatePayload})
        .then(response => {
          expect(response.statusCode).to.equal(404);
          expect(response.result).to.have.property('message', 'Supplier "abc" not found.');
        }));

    it('returns http 404 when linked product does not exist', () =>
      specRequest({url: `${createSupplierResponse.headers.location}/linked_products/abc`, method: 'PUT', payload: updatePayload})
        .then(response => expect(response.statusCode).to.equal(404)));
  });
});
