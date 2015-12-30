'use strict';

const _ = require('lodash');
const bluebird = require('bluebird');
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

  describe('get', () => {
    let createResponses;
    let getResponse;
    let linkedProductResponse;

    beforeEach(() =>
      specRequest({
        url: `/suppliers/${supplierId}/linked_products`,
        method: 'POST',
        headers: {authorization: token},
        payload: linkedProductParameters
      })
      .then(response => {
        linkedProductResponse = response;

        return bluebird.mapSeries([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], i =>
          specRequest({
            url: `${response.headers.location}/price_adjustments`,
            method: 'POST',
            headers: {authorization: token},
            payload: Object.assign({}, priceAdjustmentParameters, {price_adjustment_group_id: i.toString()})
          }));
      })
      .then(responses => createResponses = responses)
      .then(() => specRequest({url: `${linkedProductResponse.headers.location}/price_adjustments`, method: 'GET', headers: {authorization: token}}))
      .then(response => getResponse = response));

    it('returns http 200', () => {
      expect(getResponse.statusCode).to.equal(200);
    });

    it('returns a page of 10 products with default order by created date', () => {
      const expectedResults = createResponses.slice(0, 10).map(response => response.result);
      expect(getResponse.result).to.deep.equal(expectedResults);
    });

    it('returns a custom page size', () =>
      specRequest({url: `${linkedProductResponse.headers.location}/price_adjustments?hitsPerPage=3`, method: 'GET', headers: {authorization: token}})
        .then(response => {
          const expectedResults = createResponses.slice(0, 3).map(response => response.result);
          expect(response.result).to.deep.equal(expectedResults);
        }));

    it('returns the requested page', () =>
      Promise.all([
        specRequest({url: `${linkedProductResponse.headers.location}/price_adjustments?hitsPerPage=3&page=1`, method: 'GET', headers: {authorization: token}}),
        specRequest({url: `${linkedProductResponse.headers.location}/price_adjustments?hitsPerPage=3&page=2`, method: 'GET', headers: {authorization: token}}),
        specRequest({url: `${linkedProductResponse.headers.location}/price_adjustments?hitsPerPage=3&page=3`, method: 'GET', headers: {authorization: token}}),
        specRequest({url: `${linkedProductResponse.headers.location}/price_adjustments?hitsPerPage=3&page=4`, method: 'GET', headers: {authorization: token}}),
        specRequest({url: `${linkedProductResponse.headers.location}/price_adjustments?hitsPerPage=3&page=5`, method: 'GET', headers: {authorization: token}})
      ])
      .then(_.spread((firstPage, secondPage, thirdPage, fourthPage, fifthPage) => {
        expect(firstPage.result).to.deep.equal(createResponses.slice(0, 3).map(response => response.result));
        expect(secondPage.result).to.deep.equal(createResponses.slice(3, 6).map(response => response.result));
        expect(thirdPage.result).to.deep.equal(createResponses.slice(6, 9).map(response => response.result));
        expect(fourthPage.result).to.deep.equal(createResponses.slice(9, 11).map(response => response.result));
        expect(fifthPage.result).to.be.empty;
      })));

    it('filters by price adjustment group', () =>
      specRequest({url: `${linkedProductResponse.headers.location}/price_adjustments?price_adjustment_group_id=1`, method: 'GET', headers: {authorization: token}})
        .then(response => expect(response.result).to.deep.equal([createResponses[0].result])));

    it('returns http 403 when getting price adjustment without correct scope', () =>
      specRequest({url: `${linkedProductResponse.headers.location}/price_adjustments`, method: 'GET', headers: {authorization: signJwt({scope: ['supplier:555']})}})
        .then(response => {
          expect(response.statusCode).to.equal(403);
          expect(response.result.message).match(/Insufficient scope/);
        }));

    ['hitsPerPage', 'page'].forEach(attribute => {
      it(`rejects with http 400 when ${attribute} is not a number`, () =>
        specRequest({url: `${linkedProductResponse.headers.location}/price_adjustments?${attribute}=test`, method: 'GET', headers: {authorization: token}})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result).to.have.property('message', `child "${attribute}" fails because ["${attribute}" must be a number]`);
          }));

      it(`rejects with http 400 when ${attribute} is not an integer`, () =>
        specRequest({url: `${linkedProductResponse.headers.location}/price_adjustments?${attribute}=1.5`, method: 'GET', headers: {authorization: token}})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result).to.have.property('message', `child "${attribute}" fails because ["${attribute}" must be an integer]`);
          }));

      it(`rejects with http 400 when ${attribute} is not above zero`, () =>
        specRequest({url: `${linkedProductResponse.headers.location}/price_adjustments?${attribute}=0`, method: 'GET', headers: {authorization: token}})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result).to.have.property('message', `child "${attribute}" fails because ["${attribute}" must be larger than or equal to 1]`);
          }));
    });

    it('returns http 404 when supplier does not exist', () =>
      specRequest({url: '/suppliers/abc/linked_products/1/price_adjustments', method: 'GET', headers: {authorization: signJwt({scope: ['supplier:abc']})}})
        .then(response => {
          expect(response.statusCode).to.equal(404);
          expect(response.result).to.have.property('message', 'Supplier "abc" not found.');
        }));

    it('returns http 404 when linked product does not exist', () =>
      specRequest({url: `/suppliers/${supplierId}/linked_products/1/price_adjustments`, method: 'GET', headers: {authorization: token}})
        .then(response => {
          expect(response.statusCode).to.equal(404);
          expect(response.result).to.have.property('message', `Linked Product "1" not found for Supplier "${supplierId}".`);
        }));

    it('rejects with http 400 when hitsPerPage is above 50', () =>
      specRequest({url: `${linkedProductResponse.headers.location}/price_adjustments?hitsPerPage=51`, method: 'GET', headers: {authorization: token}})
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result).to.have.property('message', 'child "hitsPerPage" fails because ["hitsPerPage" must be less than or equal to 50]');
        }));
  });
});
