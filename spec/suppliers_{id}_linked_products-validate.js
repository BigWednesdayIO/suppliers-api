'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const specRequest = require('./spec_request');
const linkedProductParameters = require('./parameters/linked_product');

describe('/suppliers/{id}/linked_products - validation', () => {
  let supplierRoute;

  beforeEach(() =>
    specRequest({url: '/suppliers', method: 'POST', payload: {name: 'a supplier'}})
      .then(response => supplierRoute = response.headers.location));

  const attributes = [
    {name: 'product_id', type: 'string', required: true},
    {name: 'product_code', type: 'string'}
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
    });
});