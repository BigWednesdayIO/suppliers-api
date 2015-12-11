'use strict';

const _ = require('lodash');
const bluebird = require('bluebird');
const cuid = require('cuid');
const expect = require('chai').expect;
const specRequest = require('./spec_request');
const signJwt = require('./sign_jwt');

const linkedProductParameters = require('./parameters/linked_product.js');

describe('/suppliers/{id}/linked_products', () => {
  let supplierId;
  let supplierRoute;
  let token;
  const supplierPayload = {name: 'a supplier', email: `${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'};

  beforeEach(() =>
    specRequest({url: '/suppliers', method: 'POST', payload: supplierPayload})
      .then(response => {
        token = signJwt({scope: [`supplier:${response.result.id}`]});
        supplierId = response.result.id;
        supplierRoute = response.headers.location;
      }));

  describe('post', () => {
    let createResponse;

    beforeEach(() =>
      specRequest({url: `${supplierRoute}/linked_products`, method: 'POST', payload: linkedProductParameters, headers: {authorization: token}})
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
      specRequest({url: '/suppliers/abc/linked_products', method: 'POST', payload: linkedProductParameters, headers: {authorization: signJwt({scope: ['supplier:abc']})}})
        .then(response => {
          expect(response.statusCode).to.equal(404);
          expect(response.result).to.have.property('message', 'Supplier "abc" not found.');
        }));

    it('returns http 403 when creating linked products without correct scope', () => {
      return specRequest({url: `${supplierRoute}/linked_products`, method: 'POST', payload: linkedProductParameters, headers: {authorization: signJwt({scope: ['supplier:555']})}})
        .then(response => {
          expect(response.statusCode).to.equal(403);
          expect(response.result.message).match(/Insufficient scope/);
        });
    });
  });

  describe('get', () => {
    let createResponses;
    let getResponse;

    beforeEach(() =>
      bluebird.mapSeries([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], i =>
        specRequest({
          url: `/suppliers/${supplierId}/linked_products`,
          method: 'POST',
          headers: {authorization: token},
          payload: Object.assign({}, linkedProductParameters, {product_id: i.toString()})
        }))
      .then(responses => {
        createResponses = responses;
        return specRequest({url: `/suppliers/${supplierId}/linked_products`, method: 'GET', headers: {authorization: token}});
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
      specRequest({url: `/suppliers/${supplierId}/linked_products?hitsPerPage=3`, method: 'GET', headers: {authorization: token}})
        .then(response => {
          const expectedResults = createResponses.slice(0, 3).map(response => response.result);
          expect(response.result).to.deep.equal(expectedResults);
        }));

    it('returns the requested page', () =>
      Promise.all([
        specRequest({url: `/suppliers/${supplierId}/linked_products?hitsPerPage=3&page=1`, method: 'GET', headers: {authorization: token}}),
        specRequest({url: `/suppliers/${supplierId}/linked_products?hitsPerPage=3&page=2`, method: 'GET', headers: {authorization: token}}),
        specRequest({url: `/suppliers/${supplierId}/linked_products?hitsPerPage=3&page=3`, method: 'GET', headers: {authorization: token}}),
        specRequest({url: `/suppliers/${supplierId}/linked_products?hitsPerPage=3&page=4`, method: 'GET', headers: {authorization: token}}),
        specRequest({url: `/suppliers/${supplierId}/linked_products?hitsPerPage=3&page=5`, method: 'GET', headers: {authorization: token}})
      ])
      .then(_.spread((firstPage, secondPage, thirdPage, fourthPage, fifthPage) => {
        expect(firstPage.result).to.deep.equal(createResponses.slice(0, 3).map(response => response.result));
        expect(secondPage.result).to.deep.equal(createResponses.slice(3, 6).map(response => response.result));
        expect(thirdPage.result).to.deep.equal(createResponses.slice(6, 9).map(response => response.result));
        expect(fourthPage.result).to.deep.equal(createResponses.slice(9, 11).map(response => response.result));
        expect(fifthPage.result).to.be.empty;
      })));

    it('returns the product resource when expanded', () =>
      specRequest({url: `/suppliers/${supplierId}/linked_products?hitsPerPage=3&expand[]=product`, method: 'GET', headers: {authorization: token}})
        .then(response => {
          response.result.forEach(result => {
            expect(result).to.have.property('product');
            expect(result.product).to.be.an('object');
            expect(result).to.not.have.property('product_id');
          });
        }));

    ['hitsPerPage', 'page'].forEach(attribute => {
      it(`rejects with http 400 when ${attribute} is not a number`, () =>
        specRequest({url: `/suppliers/${supplierId}/linked_products?${attribute}=test`, method: 'GET', headers: {authorization: token}})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result).to.have.property('message', `child "${attribute}" fails because ["${attribute}" must be a number]`);
          }));

      it(`rejects with http 400 when ${attribute} is not an integer`, () =>
        specRequest({url: `/suppliers/${supplierId}/linked_products?${attribute}=1.5`, method: 'GET', headers: {authorization: token}})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result).to.have.property('message', `child "${attribute}" fails because ["${attribute}" must be an integer]`);
          }));

      it(`rejects with http 400 when ${attribute} is not above zero`, () =>
        specRequest({url: `/suppliers/${supplierId}/linked_products?${attribute}=0`, method: 'GET', headers: {authorization: token}})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result).to.have.property('message', `child "${attribute}" fails because ["${attribute}" must be larger than or equal to 1]`);
          }));
    });

    it('rejects with http 400 when hitsPerPage is above 50', () =>
      specRequest({url: `/suppliers/${supplierId}/linked_products?hitsPerPage=51`, method: 'GET', headers: {authorization: token}})
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result).to.have.property('message', 'child "hitsPerPage" fails because ["hitsPerPage" must be less than or equal to 50]');
        }));

    it('rejects with http 400 when expand is not an array', () =>
      specRequest({url: `/suppliers/${supplierId}/linked_products?hitsPerPage=3&expand=product`, method: 'GET', headers: {authorization: token}})
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result).to.have.property('message', 'child "expand" fails because ["expand" must be an array]');
        }));

    it('rejects with http 400 when expand contains anything that is not "product"', () =>
      specRequest({url: `/suppliers/${supplierId}/linked_products?hitsPerPage=3&expand[]=test`, method: 'GET', headers: {authorization: token}})
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result).to.have.property('message', 'child "expand" fails because ["expand" at position 0 fails because ["0" must be one of [product]]]');
        }));

    it('returns http 403 when requesting linked products without correct scope', () => {
      return specRequest({url: `/suppliers/${supplierId}/linked_products`, method: 'GET', headers: {authorization: signJwt({scope: ['supplier:555']})}})
        .then(response => {
          expect(response.statusCode).to.equal(403);
          expect(response.result.message).match(/Insufficient scope/);
        });
    });
  });
});
