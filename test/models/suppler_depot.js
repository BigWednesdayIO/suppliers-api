'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const sinon = require('sinon');
const dataset = require('../../lib/models/dataset');

describe('Supplier Depot', () => {
  let SupplierDepot;
  let sandbox;
  let saveStub;
  let deleteStub;
  const testDate = new Date();

  const depotEntities = [
    {key: {path: ['Supplier', 'supplierId', 'Depot', 'D1']}, data: {id: 'D1', name: 'Depot 1', _metadata_created: new Date().setTime(testDate.getTime() + 5000)}},
    {key: {path: ['Supplier', 'supplierId', 'Depot', 'D2']}, data: {id: 'D2', name: 'Depot 1', obsolete_property: 1, _metadata_created: new Date().setTime(testDate.getTime() + 1000)}},
    {key: {path: ['Supplier', 'supplierId', 'Depot', 'D3']}, data: {id: 'D3', name: 'Depot 1', _metadata_created: new Date().setTime(testDate.getTime())}},
    {key: {path: ['Supplier', 'supplierId2', 'Depot', 'S2D1']}, data: {id: 'S2D1', name: 'Supplier 2 Depot 1', _metadata_created: new Date().setTime(testDate.getTime())}}
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
      if (query.kind !== 'Depot') {
        return callback(null, []);
      }

      let data = depotEntities;

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
      callback(null, _.find(depotEntities, {key}));
    });

    sandbox.stub(dataset, 'key', path => {
      return {path};
    });

    saveStub = sandbox.stub(dataset, 'save', (args, callback) => {
      callback();
    });

    deleteStub = sandbox.stub(dataset, 'delete', (key, callback) => {
      callback();
    });

    SupplierDepot = require('../../lib/models/supplier_depot');
  });

  after(() => {
    sandbox.restore();
  });

  describe('create', () => {
    const attributes = {name: 'a depot'};
    let createdDepot;

    before(() => {
      return SupplierDepot.create('supplierId', attributes)
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

    it('persists the depot as a child of the supplier', () => {
      const persistedData = _.clone(createdDepot);
      persistedData._metadata_created = persistedData._metadata.created;
      delete persistedData._metadata;

      const key = {path: ['Supplier', 'supplierId', 'Depot', persistedData.id]};

      sinon.assert.calledWithMatch(saveStub, sinon.match({key, data: persistedData}));
    });
  });

  describe('get', () => {
    it('retrieves the depot by id', () => {
      return SupplierDepot.get('supplierId', 'D1')
        .then(depot => {
          depot._metadata_created = depot._metadata.created;
          delete depot._metadata;

          expect(depot).to.deep.equal(depotEntities[0].data);
        });
    });

    it('returns nothing when the depot does not exist', () => {
      return SupplierDepot.get('supplierId', '123')
        .then(depot => {
          expect(depot).to.not.exist;
        });
    });
  });

  describe('upsert', () => {
    describe('as create', () => {
      let createdDepot;
      const testId = 'depotId';
      const newDepot = {name: 'new depot'};

      before(() => {
        return SupplierDepot.upsert('supplierId', testId, newDepot)
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

        const key = {path: ['Supplier', 'supplierId', 'Depot', testId]};

        sinon.assert.calledWithMatch(saveStub, sinon.match({key, data: persistedData}));
      });

      it('sets _inserted property', () => {
        expect(createdDepot._inserted).to.equal(true);
      });

      it('makes _inserted property non-enumerable', () => {
        expect(createdDepot._inserted.propertyIsEnumerable()).to.equal(false);
      });
    });

    describe('as update', () => {
      const upsertDepot = {name: 'updated name'};

      it('updates the persisted depot', () => {
        const persistedData = _.clone(upsertDepot);
        persistedData.id = 'D1';
        persistedData._metadata_created = depotEntities[0].data._metadata_created;
        delete persistedData._metadata;

        return SupplierDepot.upsert('supplierId', 'D1', upsertDepot)
          .then(() => {
            sinon.assert.calledWithMatch(saveStub, sinon.match({key: depotEntities[0].key, data: persistedData}));
          });
      });

      it('sets _inserted property', () => {
        return SupplierDepot.upsert('supplierId', 'D1', upsertDepot)
          .then(depot => {
            expect(depot._inserted).to.equal(false);
          });
      });

      it('makes _inserted property non-enumerable', () => {
        return SupplierDepot.upsert('supplierId', 'D1', upsertDepot)
          .then(depot => {
            expect(depot._inserted.propertyIsEnumerable()).to.equal(false);
          });
      });

      it('does not keep obsolete properties of the persisted supplier', () => {
        return SupplierDepot.upsert('supplierId', 'D2', upsertDepot)
          .then(() => {
            sinon.assert.calledWithMatch(saveStub, sinon.match(value => !value.data.hasOwnProperty('obsolete_property'),
              'data without obsolete_property'));
          });
      });
    });
  });

  describe('find', () => {
    let foundDepots;

    before(() => {
      return SupplierDepot.find('supplierId').then(depots => {
        foundDepots = depots;
      });
    });

    it('returns all depots for the supplier', () => {
      const supplierDepots = depotEntities.slice(0, 3);

      supplierDepots.forEach(entity => {
        const expectedDepot = _.find(foundDepots, {id: entity.data.id});
        expect(expectedDepot).to.exist;
      });
    });

    it('returns depots sorted by default field created_at', () => {
      expect(_.map(foundDepots, 'id')).to.deep.equal(['D3', 'D2', 'D1']);
    });
  });

  describe('delete', () => {
    it('deletes the persisted depot', () => {
      const key = {path: ['Supplier', 'supplierId', 'Depot', 'depotId']};

      return SupplierDepot.delete('supplierId', 'depotId')
        .then(() => {
          sinon.assert.calledWith(deleteStub, key);
        });
    });
  });
});
