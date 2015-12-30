'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const specRequest = require('./spec_request');
const priceAdjustmentParameters = require('./parameters/price_adjustment');
const signJwt = require('./sign_jwt');

describe('/suppliers/{id}/linked_products/{id}/price_adjustments - validation', () => {
  const baseUri = '/suppliers/1/linked_products/1/price_adjustments';
  const token = signJwt({scope: ['supplier:1']});

  [{method: 'POST', url: baseUri}, {method: 'PUT', url: `${baseUri}/1`}].forEach(request => {
    ['price_adjustment_group_id', 'type', 'amount', 'start_date'].forEach(attribute => {
      it(`requires ${attribute} for ${request.method} request`, () =>
        specRequest({url: request.url, method: request.method, payload: _.omit(priceAdjustmentParameters, attribute), headers: {authorization: token}})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal(`child "${attribute}" fails because ["${attribute}" is required]`);
          }));
    });

    ['price_adjustment_group_id', 'type'].forEach(attribute => {
      it(`requires ${attribute} to be a string for ${request.method} request`, () =>
        specRequest({url: request.url, method: request.method, payload: Object.assign({}, priceAdjustmentParameters, {[attribute]: 1}), headers: {authorization: token}})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal(`child "${attribute}" fails because ["${attribute}" must be a string]`);
          }));
    });

    ['start_date', 'end_date'].forEach(attribute => {
      it(`requires ${attribute} to be a date for ${request.method} request`, () =>
        specRequest({url: request.url, method: request.method, payload: Object.assign({}, priceAdjustmentParameters, {[attribute]: 'abc'}), headers: {authorization: token}})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal(`child "${attribute}" fails because ["${attribute}" must be a number of milliseconds or valid date string]`);
          }));
    });

    it(`requires amount to be a number for ${request.method} request`, () =>
      specRequest({url: request.url, method: request.method, payload: Object.assign({}, priceAdjustmentParameters, {amount: 'abc'}), headers: {authorization: token}})
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result.message).to.equal('child "amount" fails because ["amount" must be a number]');
        }));

    it(`requires type to be one of [value_override, value_adjustment, percentage_adjustment] for ${request.method} request`, () =>
      specRequest({url: request.url, method: request.method, headers: {authorization: token}, payload: Object.assign({}, priceAdjustmentParameters, {type: 'abc'})})
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result).to.have.property('message', 'child "type" fails because ["type" must be one of [value_override, value_adjustment, percentage_adjustment]]');
        }));

    it(`required amount to be a positive number when type is value_override for ${request.method} request`, () =>
      specRequest({url: request.url, method: request.method, headers: {authorization: token}, payload: Object.assign({}, priceAdjustmentParameters, {type: 'value_override', amount: -1})})
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result).to.have.property('message', `child "amount" fails because ["amount" must be a positive number]`);
        }));

    it(`requires amount attribute to be a positive number when type is percentage_adjustment for ${request.method} request`, () =>
      specRequest({url: request.url, method: request.method, headers: {authorization: token}, payload: Object.assign({}, priceAdjustmentParameters, {type: 'percentage_adjustment', amount: -1})})
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result).to.have.property('message', `child "amount" fails because ["amount" must be a positive number]`);
        }));
  });
});
