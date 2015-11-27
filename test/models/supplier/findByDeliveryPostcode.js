'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const sinon = require('sinon');
const nock = require('nock');

const dataset = require('../../../lib/models/dataset');

const Supplier = require('../../../lib/models/supplier');

const supplierEntities = [
  {key: {path: ['Supplier', '1']}, data: {id: 'scotlandsupplier'}},
  {key: {path: ['Supplier', '2']}, data: {id: 'eastmidlandssupplier'}},
  {key: {path: ['Supplier', '3']}, data: {id: 'cambssupplier'}},
  {key: {path: ['Supplier', '4']}, data: {id: 'brentsupplier'}},
  {key: {path: ['Supplier', '5']}, data: {id: 'aberdeensupplier'}}
];

const depotEntities = [
  {key: {path: ['Supplier', '1', 'Depot', '1']}, data: {postcode: 'scottishpostcode', delivery_countries: ['Scotland']}},
  {key: {path: ['Supplier', '2', 'Depot', '1']}, data: {postcode: 'eastmidlandspostcode', delivery_regions: ['East Midlands']}},
  {key: {path: ['Supplier', '3', 'Depot', '1']}, data: {postcode: 'cambspostcode', delivery_counties: ['Cambridgeshire']}},
  {key: {path: ['Supplier', '4', 'Depot', '1']}, data: {postcode: 'brentpostcode', delivery_regions: ['Brent']}},
  {key: {path: ['Supplier', '5', 'Depot', '1']}, data: {postcode: 'aberdeenpostcode', delivery_places: ['Aberdeen']}}
];

describe('Supplier', () => {
  describe('findByDeliveryPostcode', () => {
    let runQueryStub;
    let getStub;

    beforeEach(() => {
      nock(`http://${process.env.POSTCODES_API_SVC_HOST}:${process.env.POSTCODES_API_SVC_PORT}`)
        .get('/postcodes/scottishpostcode')
        .reply(200, {
          postcode: 'scottishpostcode',
          country: 'Scotland'
        })
        .get('/postcodes/eastmidlandspostcode')
        .reply(200, {
          postcode: 'eastmidlandspostcode',
          region: 'East Midlands'
        })
        .get('/postcodes/cambspostcode')
        .reply(200, {
          postcode: 'cambspostcode',
          county: 'Cambridgeshire'
        })
        .get('/postcodes/brentpostcode')
        .reply(200, {
          postcode: 'brentpostcode',
          region: 'Brent'
        })
        .get('/postcodes/aberdeenpostcode')
        .reply(200, {
          postcode: 'aberdeenpostcode',
          place: 'Aberdeen'
        });

      runQueryStub = sinon.stub(dataset, 'runQuery', (query, callback) => {
        if (query.kinds[0] !== 'Depot') {
          throw new Error(`Expected depot query. Got ${query}`);
        }

        let results = depotEntities;

        query.filters.forEach(filter => {
          results = results.filter(entity => entity.data[filter.name] && entity.data[filter.name].indexOf(filter.val) >= 0);
        });

        callback(null, results);
      });

      getStub = sinon.stub(dataset, 'get', (keys, callback) => {
        callback(null, supplierEntities.filter(entity => _.any(keys, {path: entity.key.path})));
      });
    });

    afterEach(() => {
      nock.cleanAll();
      runQueryStub.restore();
      getStub.restore();
    });

    it('returns suppliers with depots delivering to the postcode country', () => {
      return Supplier.findByDeliveryPostcode('scottishpostcode')
        .then(suppliers => {
          expect(_.find(suppliers, {id: 'scotlandsupplier'})).to.exist;
        });
    });

    it('returns suppliers with depots delivering to the postcode region', () => {
      return Supplier.findByDeliveryPostcode('eastmidlandspostcode')
        .then(suppliers => {
          expect(_.find(suppliers, {id: 'eastmidlandssupplier'})).to.exist;
        });
    });

    it('returns suppliers with depots delivering to the postcode county', () => {
      return Supplier.findByDeliveryPostcode('cambspostcode')
        .then(suppliers => {
          expect(_.find(suppliers, {id: 'cambssupplier'})).to.exist;
        });
    });

    it('returns suppliers with depots delivering to the postcode district', () => {
      return Supplier.findByDeliveryPostcode('brentpostcode')
        .then(suppliers => {
          expect(_.find(suppliers, {id: 'brentsupplier'})).to.exist;
        });
    });

    it('returns suppliers with depots delivering to the postcode place', () => {
      return Supplier.findByDeliveryPostcode('aberdeenpostcode')
        .then(suppliers => {
          expect(_.find(suppliers, {id: 'aberdeensupplier'})).to.exist;
        });
    });

    it('does not return suppliers that do not deliver to the postcode', () => {
      return Supplier.findByDeliveryPostcode('aberdeenpostcode')
        .then(suppliers => {
          expect(_.find(suppliers, {id: 'brentsupplier'})).to.not.exist;
        });
    });
  });
});
