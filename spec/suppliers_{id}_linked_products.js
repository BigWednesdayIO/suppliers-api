'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const expect = require('chai').expect;
const specRequest = require('./spec_request');

const linkedProductParameters = require('./parameters/linked_product.js');

describe('/suppliers/{id}/linked_products', () => {
  const supplierPayload = {name: 'a supplier', email: `${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'};

  describe('post', () => {
    let createResponse;
    let supplierId;

    before(() =>
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
});
