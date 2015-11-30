'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const sinon = require('sinon');
const dataset = require('../../../lib/models/dataset');

describe('Supplier', () => {
  let Supplier;
  let sandbox;
  let saveStub;
  let deleteStub;
  const testDate = new Date();

  const supplierEntities = [
    {key: {path: ['Supplier', 'A']}, data: {id: 'A', name: 'Supplier A', _metadata_created: new Date().setTime(testDate.getTime() + 2000)}},
    {key: {path: ['Supplier', 'B']}, data: {id: 'B', name: 'Supplier B', obsolete_property: 1, _metadata_created: new Date().setTime(testDate.getTime())}},
    {key: {path: ['Supplier', 'C']}, data: {id: 'C', name: 'Supplier C', _metadata_created: new Date().setTime(testDate.getTime() + 1000)}}
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
      if (query.kind !== 'Supplier') {
        return callback(null, []);
      }

      let data = supplierEntities;

      if (query.sortOrder === '_metadata_created') {
        data = _.sortBy(data, entity => entity.data._metadata_created);
      }

      callback(null, data.map(entity => {
        return {key: entity.key, data: entity.data};
      }));
    });

    sandbox.stub(dataset, 'get', (key, callback) => {
      callback(null, _.find(supplierEntities, {key}));
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

    Supplier = require('../../../lib/models/supplier');
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
      const upsertSupplier = {name: 'updated name'};

      it('updates the persisted supplier', () => {
        const persistedData = _.clone(upsertSupplier);
        persistedData.id = 'A';
        persistedData._metadata_created = supplierEntities[0].data._metadata_created;
        delete persistedData._metadata;

        return Supplier.upsert('A', upsertSupplier)
          .then(() => {
            sinon.assert.calledWithMatch(saveStub, sinon.match({key: supplierEntities[0].key, data: persistedData}));
          });
      });

      it('sets _inserted property', () => {
        return Supplier.upsert('A', upsertSupplier)
          .then(supplier => {
            expect(supplier._inserted).to.equal(false);
          });
      });

      it('makes _inserted property non-enumerable', () => {
        return Supplier.upsert('A', upsertSupplier)
          .then(supplier => {
            expect(supplier._inserted.propertyIsEnumerable()).to.equal(false);
          });
      });

      it('does not keep obsolete properties of the persisted supplier', () => {
        return Supplier.upsert('B', upsertSupplier)
          .then(() => {
            sinon.assert.calledWithMatch(saveStub,
              sinon.match(value => !value.data.hasOwnProperty('obsolete_property'), 'data without obsolete_property'));
          });
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

  describe('delete', () => {
    it('deletes the persisted supplier', () => {
      const key = {path: ['Supplier', '1']};

      return Supplier.delete('1')
        .then(() => {
          sinon.assert.calledWith(deleteStub, key);
        });
    });
  });
});
