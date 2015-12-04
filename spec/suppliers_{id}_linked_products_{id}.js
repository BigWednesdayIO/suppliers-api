'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const specRequest = require('./spec_request');

describe('/suppliers/{id}/linked_products/{id}', () => {
  const supplierPayload = {name: 'a supplier'};
  const linkedProductPayload = {product_id: '1'};
  let createSupplierResponse;
  let createResponse;
  let getResponse;

  describe('get', () => {
    before(() =>
      specRequest({url: '/suppliers', method: 'POST', payload: supplierPayload})
        .then(response => {
          createSupplierResponse = response;
          return specRequest({url: `${response.headers.location}/linked_products`, method: 'POST', payload: linkedProductPayload});
        })
        .then(response => {
          createResponse = response;
          return specRequest({url: response.headers.location, method: 'GET'});
        })
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
});
