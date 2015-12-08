'use strict';

const _ = require('lodash');
const bluebird = require('bluebird');
const cuid = require('cuid');
const expect = require('chai').expect;
const specRequest = require('./spec_request');

const linkedProductParameters = require('./parameters/linked_product.js');

describe('/suppliers/{id}/linked_products', () => {
  let supplierId;
  const supplierPayload = {name: 'a supplier', email: `${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'};

  beforeEach(() =>
    specRequest({url: '/suppliers', method: 'POST', payload: supplierPayload})
      .then(response => supplierId = response.result.id));

  describe('post', () => {
    let createResponse;

    beforeEach(() =>
      specRequest({url: '/suppliers', method: 'POST', payload: supplierPayload})
        .then(response => {
          supplierId = response.result.id;
          return specRequest({url: `${response.headers.location}/linked_products`, method: 'POST', payload: linkedProductParameters});
        })
        .then(response => createResponse = response));

    it('returns http 201', () => {
      expect(createResponse.statusCode).to.equal(201);
    });

    it('returns the generated id', () => {
      expect(createResponse.result.id).to.match(/c.{24}/);
    });

    it('returns created and updated dates', () => {
      expect(createResponse.result._metadata.created).to.be.a('date');
      expect(createResponse.result._metadata.updated).to.be.a('date');
    });

    it('returns the linked product resource', () => {
      expect(_.omit(createResponse.result, '_metadata', 'id')).to.deep.equal(linkedProductParameters);
    });

    it('returns the location of the created linked product', () => {
      expect(createResponse.headers).to.have.property('location', `/suppliers/${supplierId}/linked_products/${createResponse.result.id}`);
    });

    it('returns http 404 when supplier does not exist', () =>
      specRequest({url: '/suppliers/abc/linked_products', method: 'POST', payload: linkedProductParameters})
        .then(response => {
          expect(response.statusCode).to.equal(404);
          expect(response.result).to.have.property('message', 'Supplier "abc" not found.');
        }));
  });

  describe('get', () => {
    let createResponses;
    let getResponse;

    beforeEach(() =>
      bluebird.mapSeries([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], i =>
        specRequest({
          url: `/suppliers/${supplierId}/linked_products`,
          method: 'POST',
          payload: Object.assign({}, linkedProductParameters, {product_id: i.toString()})
        }))
      .then(responses => {
        createResponses = responses;
        return specRequest({url: `/suppliers/${supplierId}/linked_products`, method: 'GET'});
      })
      .then(response => getResponse = response));

    it('returns http 200', () => {
      expect(getResponse.statusCode).to.equal(200);
    });

    it('returns a page of 10 products with default order by created date', () => {
      const expectedResults = createResponses.slice(0, 10).map(response => response.result);
      expect(getResponse.result).to.deep.equal(expectedResults);
    });

    it('returns a custom page size', () =>
      specRequest({url: `/suppliers/${supplierId}/linked_products?hitsPerPage=3`, method: 'GET'})
        .then(response => {
          const expectedResults = createResponses.slice(0, 3).map(response => response.result);
          expect(response.result).to.deep.equal(expectedResults);
        }));

    it('rejects with http 400 when hitsPerPage is not a number', () =>
      specRequest({url: `/suppliers/${supplierId}/linked_products?hitsPerPage=test`, method: 'GET'})
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result).to.have.property('message', 'child "hitsPerPage" fails because ["hitsPerPage" must be a number]');
        }));

    it('rejects with http 400 when hitsPerPage is not an integer', () =>
      specRequest({url: `/suppliers/${supplierId}/linked_products?hitsPerPage=1.5`, method: 'GET'})
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result).to.have.property('message', 'child "hitsPerPage" fails because ["hitsPerPage" must be an integer]');
        }));

    it('rejects with http 400 when hitsPerPage is not above zero', () =>
      specRequest({url: `/suppliers/${supplierId}/linked_products?hitsPerPage=0`, method: 'GET'})
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result).to.have.property('message', 'child "hitsPerPage" fails because ["hitsPerPage" must be larger than or equal to 1]');
        }));
  });
});
