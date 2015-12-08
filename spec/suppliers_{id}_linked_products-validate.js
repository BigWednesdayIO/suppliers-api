'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const expect = require('chai').expect;
const specRequest = require('./spec_request');
const linkedProductParameters = require('./parameters/linked_product');

describe('/suppliers/{id}/linked_products - validation', () => {
  let supplierRoute;

  beforeEach(() =>
    specRequest({url: '/suppliers', method: 'POST', payload: {name: 'a supplier', email: `${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'}})
      .then(response => supplierRoute = response.headers.location));

  const attributes = [
    {name: 'product_id', type: 'string', required: true},
    {name: 'product_code', type: 'string'},
    {name: 'price', type: 'money', required: true},
    {name: 'was_price', type: 'money'}
  ];

  [{method: 'POST', url: '/linked_products'}, {method: 'PUT', url: '/linked_products/1'}]
    .forEach(request => {
      // test required attributes
      attributes.filter(a => a.required).forEach(attribute => {
        it(`requires ${attribute.name} for ${request.method} request`, () => {
          return specRequest({url: `${supplierRoute}${request.url}`, method: request.method, payload: _.omit(linkedProductParameters, attribute.name)})
            .then(response => {
              expect(response.statusCode).to.equal(400);
              expect(response.result.message).to.equal(`child "${attribute.name}" fails because ["${attribute.name}" is required]`);
            });
        });
      });

      // test string attributes
      attributes.filter(a => a.type === 'string').forEach(attribute => {
        it(`rejects non-string ${attribute.name} values for ${request.method} request`, () => {
          return specRequest({url: `${supplierRoute}${request.url}`, method: request.method, payload: Object.assign({}, linkedProductParameters, {[attribute.name]: 1})})
            .then(response => {
              expect(response.statusCode).to.equal(400);
              expect(response.result.message).to.equal(`child "${attribute.name}" fails because ["${attribute.name}" must be a string]`);
            });
        });
      });

      // test money attributes
      attributes.filter(a => a.type === 'money').forEach(attribute => {
        it(`rejects non-numeric ${attribute.name} values for ${request.method} request`, () => {
          return specRequest({url: `${supplierRoute}${request.url}`, method: request.method, payload: Object.assign({}, linkedProductParameters, {[attribute.name]: 'abc'})})
            .then(response => {
              expect(response.statusCode).to.equal(400);
              expect(response.result.message).to.equal(`child "${attribute.name}" fails because ["${attribute.name}" must be a number]`);
            });
        });

        it(`rejects number ${attribute.name} values below 0.01 for ${request.method} request`, () => {
          return specRequest({url: `${supplierRoute}${request.url}`, method: request.method, payload: Object.assign({}, linkedProductParameters, {[attribute.name]: 0})})
            .then(response => {
              expect(response.statusCode).to.equal(400);
              expect(response.result.message).to.equal(`child "${attribute.name}" fails because ["${attribute.name}" must be larger than or equal to 0.01]`);
            });
        });

        it(`rejects number ${attribute.name} values with too many decimal places for ${request.method} request`, () => {
          return specRequest({url: `${supplierRoute}${request.url}`, method: request.method, payload: Object.assign({}, linkedProductParameters, {[attribute.name]: 10.254})})
            .then(response => {
              expect(response.statusCode).to.equal(400);
              expect(response.result.message).to.equal(`child "${attribute.name}" fails because ["${attribute.name}" must have no more than 2 decimal places]`);
            });
        });
      });
    });
});
