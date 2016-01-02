'use strict';

const _ = require('lodash');
const bluebird = require('bluebird');
const cuid = require('cuid');
const expect = require('chai').expect;

const specRequest = require('./spec_request');
const signToken = require('./sign_jwt');

const linkedProductParameters = require('./parameters/linked_product');
const priceAdjustmentParameters = require('./parameters/price_adjustment');

const testDate = new Date(2015, 1, 1);

const testLinkedProducts = [
  {
    linked_product: Object.assign({}, linkedProductParameters, {product_id: '1'}),
    price_adjustments: [
      Object.assign({}, priceAdjustmentParameters, {price_adjustment_group_id: 'g1'}),
      Object.assign({}, priceAdjustmentParameters, {price_adjustment_group_id: 'g1'}),
      Object.assign({}, priceAdjustmentParameters, {price_adjustment_group_id: 'g1'}),
      Object.assign(_.omit(priceAdjustmentParameters, 'end_date'), {price_adjustment_group_id: 'g2', start_date: testDate})
    ]
  },
  {
    linked_product: Object.assign({}, linkedProductParameters, {product_id: '2'}),
    price_adjustments: [
      Object.assign({}, priceAdjustmentParameters, {price_adjustment_group_id: 'g2', start_date: testDate, end_date: new Date(testDate.getTime() + 10000)}),
      Object.assign({}, priceAdjustmentParameters, {price_adjustment_group_id: 'g2', start_date: new Date(testDate.getTime() - 10000), end_date: new Date(testDate.getTime() - 5000)}),
      Object.assign({}, priceAdjustmentParameters, {price_adjustment_group_id: 'g1'})
    ]
  },
  {
    linked_product: Object.assign({}, linkedProductParameters, {product_id: '3'}),
    price_adjustments: [
      Object.assign({}, priceAdjustmentParameters, {price_adjustment_group_id: 'g1'}),
      Object.assign({}, priceAdjustmentParameters, {price_adjustment_group_id: 'g1'}),
      Object.assign(_.omit(priceAdjustmentParameters, 'end_date'), {price_adjustment_group_id: 'g2', start_date: testDate})
    ]
  }
];

describe('/suppliers/{id}/price_adjustments', () => {
  describe('get', function () {
    this.timeout(5000);
    const linkedProductIds = [];
    let getResponse;

    before(() =>
      specRequest({
        url: '/suppliers',
        method: 'POST',
        payload: {name: 'a supplier', email: `${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'}
      })
      .then(supplierResponse => {
        const token = signToken({scope: [`supplier:${supplierResponse.result.id}`]});

        return bluebird.mapSeries(testLinkedProducts, p =>
          specRequest({
            url: `/suppliers/${supplierResponse.result.id}/linked_products`,
            method: 'POST',
            payload: p.linked_product,
            headers: {authorization: token}
          })
          .then(linkedProductResponse => {
            linkedProductIds.push(linkedProductResponse.result.id);

            return bluebird.mapSeries(p.price_adjustments, a =>
              specRequest({
                url: `${linkedProductResponse.headers.location}/price_adjustments`,
                method: 'POST',
                payload: a,
                headers: {authorization: token}
              }));
          })
          .then(() =>
            specRequest({
              url: `/suppliers/${supplierResponse.result.id}/price_adjustments?price_adjustment_group_id=g2&date=${testDate.toISOString()}&linked_product_id[]=${linkedProductIds[0]}&linked_product_id[]=${linkedProductIds[1]}`,
              method: 'GET',
              headers: {authorization: token}
            }))
          .then(response => getResponse = response));
      }));

    it('returns http 200', () => expect(getResponse.statusCode).to.equal(200));

    it('returns all adjustments for the group, active on the date, associated with the linked product ids', () => {
      const expectedAdjustments = [
        testLinkedProducts[0].price_adjustments[3],
        testLinkedProducts[1].price_adjustments[0]
      ];

      expect(getResponse.result.map(r => _.omit(r, 'id', '_metadata'))).to.deep.equal(expectedAdjustments);
    });

    it('returns the adjustment linked_product_id as metadata', () =>
      expect(getResponse.result.map(a => a._metadata.linked_product_id)).to.deep.equal(linkedProductIds.slice(0, 2)));

    it('returns http 404 for unknown suppliers', () =>
      specRequest({
        url: `/suppliers/notfound/price_adjustments?price_adjustment_group_id=g2&date=${new Date()}&linked_product_id[]=1`,
        method: 'GET',
        headers: {authorization: signToken({scope: ['supplier:notfound']})}
      })
      .then(response => {
        expect(response.statusCode).to.equal(404);
        expect(response.result).to.have.property('message', 'Supplier "notfound" not found.');
      }));
  });
});
