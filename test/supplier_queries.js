'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const proxyquire = require('proxyquire');
const sinon = require('sinon');

const dataset = require('../lib/dataset');

const supplierEntities = [
  {key: {path: ['Supplier', '1']}, data: {name: 'scotland supplier'}},
  {key: {path: ['Supplier', '2']}, data: {name: 'east midlands supplier'}},
  {key: {path: ['Supplier', '3']}, data: {name: 'cambs supplier'}},
  {key: {path: ['Supplier', '4']}, data: {name: 'brent supplier'}},
  {key: {path: ['Supplier', '5']}, data: {name: 'aberdeen supplier'}}
];

const depotEntities = [
  {key: {path: ['Supplier', '1', 'Depot', '1']}, data: {postcode: 'scottishpostcode', delivery_countries: ['Scotland']}},
  {key: {path: ['Supplier', '2', 'Depot', '1']}, data: {postcode: 'eastmidlandspostcode', delivery_regions: ['East Midlands']}},
  {key: {path: ['Supplier', '3', 'Depot', '1']}, data: {postcode: 'cambspostcode', delivery_counties: ['Cambridgeshire']}},
  {key: {path: ['Supplier', '4', 'Depot', '1']}, data: {postcode: 'brentpostcode', delivery_regions: ['Brent']}},
  {key: {path: ['Supplier', '5', 'Depot', '1']}, data: {postcode: 'aberdeenpostcode', delivery_places: ['Aberdeen']}}
];

const linkedProductEntities = [
  {key: {path: ['Supplier', '5', 'SupplierLinkedProduct', '1']}, data: {product_id: 'aberdeensupplierproduct'}}
];

const stubDatastoreModel = () => {
  return {
    getMany: keys => {
      return new Promise(resolve => {
        const matchingEntities = supplierEntities.filter(entity => _.any(keys, key => _.eq(key.path, entity.key.path)));

        resolve(matchingEntities.map(e =>
          Object.assign({id: _.last(e.key.path), _metadata: {created: new Date(), updated: new Date()}}, e.data)));
      });
    }
  };
};

const supplierQueries = proxyquire('../lib/supplier_queries', {'gcloud-datastore-model': stubDatastoreModel});

describe('Supplier queries', () => {
  let sandbox;

  afterEach(() => {
    sandbox.restore();
  });

  describe('findByDeliveryLocations', () => {
    beforeEach(() => {
      sandbox = sinon.sandbox.create();

      sandbox.stub(dataset, 'runQuery', (query, callback) => {
        if (query.kinds[0] !== 'Depot') {
          throw new Error(`Expected depot query. Got ${query}`);
        }

        let results = depotEntities;

        query.filters.forEach(filter => {
          results = results.filter(entity => entity.data[filter.name] && entity.data[filter.name].indexOf(filter.val) >= 0);
        });

        callback(null, results);
      });
    });

    it('returns suppliers with depots delivering to the postcode country', () => {
      return supplierQueries.findByDeliveryLocations({country: 'Scotland'})
        .then(suppliers => {
          expect(_.find(suppliers, {name: 'scotland supplier'})).to.exist;
        });
    });

    it('returns suppliers with depots delivering to the postcode region', () => {
      return supplierQueries.findByDeliveryLocations({region: 'East Midlands'})
        .then(suppliers => {
          expect(_.find(suppliers, {name: 'east midlands supplier'})).to.exist;
        });
    });

    it('returns suppliers with depots delivering to the postcode county', () => {
      return supplierQueries.findByDeliveryLocations({county: 'Cambridgeshire'})
        .then(suppliers => {
          expect(_.find(suppliers, {name: 'cambs supplier'})).to.exist;
        });
    });

    it('returns suppliers with depots delivering to the postcode district', () => {
      return supplierQueries.findByDeliveryLocations({region: 'Brent'})
        .then(suppliers => {
          expect(_.find(suppliers, {name: 'brent supplier'})).to.exist;
        });
    });

    it('returns suppliers with depots delivering to the postcode place', () => {
      return supplierQueries.findByDeliveryLocations({place: 'Aberdeen'})
        .then(suppliers => {
          expect(_.find(suppliers, {name: 'aberdeen supplier'})).to.exist;
        });
    });

    it('does not return suppliers that do not deliver to the postcode', () => {
      return supplierQueries.findByDeliveryLocations({place: 'Aberdeen'})
        .then(suppliers => {
          expect(_.find(suppliers, {name: 'brent supplier'})).to.not.exist;
        });
    });
  });

  describe('findBySuppliedProduct', () => {
    beforeEach(() => {
      sandbox = sinon.sandbox.create();

      sandbox.stub(dataset, 'runQuery', (query, callback) => {
        if (query.kinds[0] !== 'SupplierLinkedProduct') {
          throw new Error(`Expected linked product query. Got ${query}`);
        }

        let results = linkedProductEntities;

        query.filters.forEach(filter => {
          results = results.filter(entity => entity.data[filter.name] && entity.data[filter.name] === filter.val);
        });

        callback(null, results);
      });
    });

    it('returns suppliers that sell the identified product', () => {
      return supplierQueries.findBySuppliedProduct('aberdeensupplierproduct')
        .then(suppliers => {
          expect(_.find(suppliers, {name: 'aberdeen supplier'})).to.exist;
        });
    });

    it('returns the identifier of the linked product as metadata for suppliers that sell the product', () => {
      return supplierQueries.findBySuppliedProduct('aberdeensupplierproduct')
        .then(suppliers => {
          const supplier = _.find(suppliers, {name: 'aberdeen supplier'});
          expect(supplier._metadata).to.have.property('linked_product_id', '1');
        });
    });

    it('does not returns suppliers that do not sell the identified product', () => {
      return supplierQueries.findBySuppliedProduct('aberdeensupplierproduct')
        .then(suppliers => {
          expect(_.find(suppliers, {name: 'brent supplier'})).to.not.exist;
        });
    });
  });
});
