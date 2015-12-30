'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const expect = require('chai').expect;

const specRequest = require('./spec_request');
const signJwt = require('./sign_jwt');

const linkedProductParameters = require('./parameters/linked_product.js');
const priceAdjustmentParameters = require('./parameters/price_adjustment.js');

describe('/suppliers/{id}/linked_products/{id}/price_adjustments', () => {
  let token;
  let supplierId;
  let linkedProductResponse;
  const supplierPayload = {name: 'a supplier', email: `${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'};

  beforeEach(() =>
    specRequest({url: '/suppliers', method: 'POST', payload: supplierPayload})
      .then(response => {
        token = signJwt({scope: [`supplier:${response.result.id}`]});
        supplierId = response.result.id;

        return specRequest({url: `${response.headers.location}/linked_products`, method: 'POST', payload: linkedProductParameters, headers: {authorization: token}});
      })
      .then(response => linkedProductResponse = response));

  describe('post', () => {
    let createResponse;

    beforeEach(() =>
      specRequest({url: `${linkedProductResponse.headers.location}/price_adjustments`, method: 'POST', payload: priceAdjustmentParameters, headers: {authorization: token}})
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
      expect(_.omit(createResponse.result, '_metadata', 'id')).to.deep.equal(priceAdjustmentParameters);
    });

    it('returns the location of the created linked product', () => {
      expect(createResponse.headers).to.have.property('location', `${linkedProductResponse.headers.location}/price_adjustments/${createResponse.result.id}`);
    });

    it('returns http 404 when supplier does not exist', () =>
      specRequest({url: '/suppliers/abc/linked_products/1/price_adjustments', method: 'POST', payload: priceAdjustmentParameters, headers: {authorization: signJwt({scope: ['supplier:abc']})}})
        .then(response => {
          expect(response.statusCode).to.equal(404);
          expect(response.result).to.have.property('message', 'Supplier "abc" not found.');
        }));

    it('returns http 404 when linked product does not exist', () =>
      specRequest({url: `/suppliers/${supplierId}/linked_products/1/price_adjustments`, method: 'POST', payload: priceAdjustmentParameters, headers: {authorization: signJwt({scope: [`supplier:${supplierId}`]})}})
        .then(response => {
          expect(response.statusCode).to.equal(404);
          expect(response.result).to.have.property('message', `Linked Product "1" not found for Supplier "${supplierId}".`);
        }));

    it('returns http 403 when creating price adjustment without correct scope', () => {
      return specRequest({url: `${linkedProductResponse.headers.location}/price_adjustments`, method: 'POST', payload: priceAdjustmentParameters, headers: {authorization: signJwt({scope: ['supplier:555']})}})
        .then(response => {
          expect(response.statusCode).to.equal(403);
          expect(response.result.message).match(/Insufficient scope/);
        });
    });
  });
});
