'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const sinon = require('sinon');
const dataset = require('../lib/dataset');

describe('Supplier', () => {
  let Supplier;
  let sandbox;
  let saveStub;
  const testDate = new Date();

  const supplierEntities = [
    {key: {path: ['Supplier', 'A']}, data: {id: 'A', name: 'Supplier A', _metadata_created: new Date().setTime(testDate.getTime() + 2000)}},
    {key: {path: ['Supplier', 'B']}, data: {id: 'B', name: 'Supplier B', _metadata_created: new Date().setTime(testDate.getTime())}},
    {key: {path: ['Supplier', 'C']}, data: {id: 'C', name: 'Supplier C', _metadata_created: new Date().setTime(testDate.getTime() + 1000)}}
  ];

  const depotEntities = [
    {key: {path: ['Supplier', 'A', 'Depot', 'D1']}, data: {id: 'D1', name: 'Depot 1', _metadata_created: new Date().setTime(testDate.getTime() + 5000)}},
    {key: {path: ['Supplier', 'A', 'Depot', 'D2']}, data: {id: 'D2', name: 'Depot 1', _metadata_created: new Date().setTime(testDate.getTime() + 1000)}},
    {key: {path: ['Supplier', 'A', 'Depot', 'D3']}, data: {id: 'D3', name: 'Depot 1', _metadata_created: new Date().setTime(testDate.getTime())}},
    {key: {path: ['Supplier', 'B', 'Depot', 'S2D1']}, data: {id: 'S2D1', name: 'Supplier 2 Depot 1', _metadata_created: new Date().setTime(testDate.getTime())}}
  ];

  before(() => {
    sandbox = sinon.sandbox.create();

    sandbox.useFakeTimers(testDate.getTime());

    sandbox.stub(dataset, 'createQuery', kind => {
      return {
        kind,
        hasAncestor(key) {
          this.ancestorKey = key;
          return this;
        },
        order(order) {
          this.sortOrder = order;
          return this;
        }
      };
    });

    sandbox.stub(dataset, 'runQuery', (query, callback) => {
      let data = query.kind === 'Supplier' ? supplierEntities : depotEntities;

      if (query.ancestorKey) {
        const keyLength = query.ancestorKey.path.length;
        data = _.filter(data, entity => _.eq(entity.key.path.slice(0, keyLength), query.ancestorKey.path));
      }

      if (query.sortOrder === '_metadata_created') {
        data = _.sortBy(data, entity => entity.data._metadata_created);
      }

      callback(null, data.map(entity => {
        return {key: entity.key, data: entity.data};
      }));
    });

    sandbox.stub(dataset, 'get', (key, callback) => {
      callback(null, _.find(supplierEntities.concat(depotEntities), {key}));
    });

    sandbox.stub(dataset, 'key', path => {
      return {path};
    });

    saveStub = sandbox.stub(dataset, 'save', (args, callback) => {
      callback();
    });

    Supplier = require('../lib/supplier');
  });

  after(() => {
    sandbox.restore();
  });

  describe('create', () => {
    const attributes = {name: 'a supplier'};
    let createdSupplier;

    before(() => {
      return Supplier.create(attributes)
        .then(supplier => {
          createdSupplier = supplier;
        });
    });

    it('generates an id', () => {
      expect(createdSupplier).to.have.property('id');
    });

    it('sets created date', () => {
      expect(createdSupplier._metadata.created).to.deep.equal(testDate);
    });

    it('persists the supplier', () => {
      const persistedData = _.clone(createdSupplier);
      persistedData._metadata_created = persistedData._metadata.created;
      delete persistedData._metadata;

      const key = {path: ['Supplier', persistedData.id]};

      sinon.assert.calledWithMatch(saveStub, sinon.match({key, data: persistedData}));
    });
  });

  describe('get', () => {
    it('retrieves the supplier by id', () => {
      return Supplier.get('A')
        .then(supplier => {
          supplier._metadata_created = supplier._metadata.created;
          delete supplier._metadata;

          expect(supplier).to.deep.equal(supplierEntities[0].data);
        });
    });

    it('returns nothing when the supplier does not exist', () => {
      return Supplier.get('123')
        .then(supplier => {
          expect(supplier).to.not.exist;
        });
    });
  });

  describe('upsert', () => {
    describe('as create', () => {
      let createdSupplier;
      const testId = 'supplierid';
      const newSupplier = {name: 'new supplier'};

      before(() => {
        return Supplier.upsert(testId, newSupplier)
          .then(supplier => {
            createdSupplier = supplier;
          });
      });

      it('sets the id', () => {
        expect(createdSupplier.id).to.deep.equal(testId);
      });

      it('sets created date', () => {
        expect(createdSupplier._metadata.created).to.deep.equal(testDate);
      });

      it('persists the supplier', () => {
        const persistedData = _.clone(createdSupplier);
        persistedData._metadata_created = persistedData._metadata.created;
        delete persistedData._metadata;

        const key = {path: ['Supplier', persistedData.id]};

        sinon.assert.calledWithMatch(saveStub, sinon.match({key, data: persistedData}));
      });

      it('sets _inserted property', () => {
        expect(createdSupplier._inserted).to.equal(true);
      });

      it('makes _inserted property non-enumerable', () => {
        expect(createdSupplier._inserted.propertyIsEnumerable()).to.equal(false);
      });
    });

    describe('as update', () => {
      let updatedSupplier;
      const upsertSupplier = {name: 'updated name'};

      before(() => {
        return Supplier.upsert('A', upsertSupplier)
          .then(supplier => {
            updatedSupplier = supplier;
          });
      });

      it('updates the persisted supplier', () => {
        const persistedData = _.clone(upsertSupplier);
        persistedData.id = 'A';
        persistedData._metadata_created = supplierEntities[0].data._metadata_created;
        delete persistedData._metadata;

        sinon.assert.calledWithMatch(saveStub, sinon.match({key: supplierEntities[0].key, data: persistedData}));
      });

      it('sets _inserted property', () => {
        expect(updatedSupplier._inserted).to.equal(false);
      });

      it('makes _inserted property non-enumerable', () => {
        expect(updatedSupplier._inserted.propertyIsEnumerable()).to.equal(false);
      });
    });
  });

  describe('find', () => {
    let foundSuppliers;

    before(() => {
      return Supplier.find().then(suppliers => {
        foundSuppliers = suppliers;
      });
    });

    it('returns all suppliers', () => {
      supplierEntities.forEach(entity => {
        const expectedSupplier = _.find(foundSuppliers, {id: entity.data.id});
        expect(expectedSupplier).to.exist;
      });
    });

    it('returns suppliers sorted by default field created_at', () => {
      expect(_.map(foundSuppliers, 'id')).to.deep.equal(['B', 'C', 'A']);
    });
  });

  describe('createDepot', () => {
    const attributes = {name: 'a depot'};
    let createdDepot;

    before(() => {
      return Supplier.upsert('1', {name: 'a supplier'})
        .then(supplier => supplier.createDepot(attributes))
        .then(depot => {
          createdDepot = depot;
        });
    });

    it('generates an id', () => {
      expect(createdDepot).to.have.property('id');
    });

    it('sets created date', () => {
      expect(createdDepot._metadata.created).to.deep.equal(testDate);
    });

    it('persists the depot as a child of supplier', () => {
      const persistedData = _.clone(createdDepot);
      persistedData._metadata_created = persistedData._metadata.created;
      delete persistedData._metadata;

      const depotKey = {path: ['Supplier', '1', 'Depot', createdDepot.id]};

      sinon.assert.calledWithMatch(saveStub, sinon.match({key: depotKey, data: persistedData}));
    });
  });

  describe('upsertDepot', () => {
    describe('as create', () => {
      let createdDepot;
      const testId = 'depotid';
      const newDepot = {name: 'new depot'};

      before(() => {
        return Supplier.upsert('1', {name: 'supplier'})
          .then(supplier => supplier.upsertDepot(testId, newDepot))
          .then(depot => {
            createdDepot = depot;
          });
      });

      it('sets the id', () => {
        expect(createdDepot.id).to.deep.equal(testId);
      });

      it('sets created date', () => {
        expect(createdDepot._metadata.created).to.deep.equal(testDate);
      });

      it('persists the depot as a child of supplier', () => {
        const persistedData = _.clone(createdDepot);
        persistedData._metadata_created = persistedData._metadata.created;
        delete persistedData._metadata;

        const depotKey = {path: ['Supplier', '1', 'Depot', persistedData.id]};

        sinon.assert.calledWithMatch(saveStub, sinon.match({key: depotKey, data: persistedData}));
      });

      it('sets _inserted property', () => {
        expect(createdDepot._inserted).to.equal(true);
      });

      it('makes _inserted property non-enumerable', () => {
        expect(createdDepot._inserted.propertyIsEnumerable()).to.equal(false);
      });
    });

    describe('as update', () => {
      let updatedDepot;
      const upsertDepot = {name: 'updated name'};

      before(() => {
        return Supplier.get('A')
          .then(supplier => supplier.upsertDepot('D1', upsertDepot))
          .then(depot => {
            updatedDepot = depot;
          });
      });

      it('updates the persisted supplier', () => {
        const persistedData = _.clone(upsertDepot);
        persistedData.id = 'D1';
        persistedData._metadata_created = depotEntities[0].data._metadata_created;
        delete persistedData._metadata;

        sinon.assert.calledWithMatch(saveStub, sinon.match({key: depotEntities[0].key, data: persistedData}));
      });

      it('sets _inserted property', () => {
        expect(updatedDepot._inserted).to.equal(false);
      });

      it('makes _inserted property non-enumerable', () => {
        expect(updatedDepot._inserted.propertyIsEnumerable()).to.equal(false);
      });
    });
  });

  describe('findDepots', () => {
    let foundDepots;

    before(() => {
      return Supplier.get('A')
        .then(supplier => supplier.findDepots())
        .then(depots => {
          foundDepots = depots;
        });
    });

    it('returns all depots for the supplier', () => {
      depotEntities.slice(0, 3).forEach(entity => {
        const expectedDepot = _.find(foundDepots, {id: entity.data.id});
        expect(expectedDepot).to.exist;
      });
    });

    it('returns depots sorted by default field created_at', () => {
      expect(_.map(foundDepots, 'id')).to.deep.equal(['D3', 'D2', 'D1']);
    });
  });
});
