'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const sinon = require('sinon');
const dataset = require('../lib/dataset');

describe('Supplier', () => {
  let Supplier;
  let sandbox;
  let saveStub;
  let keyStub;
  const newSupplierKey = {path: ['Supplier']};
  const testDate = new Date();

  const supplierEntities = [
    {key: {path: ['Supplier', 1]}, data: {id: 'A', name: 'Supplier A', _metadata_created: new Date().setTime(testDate.getTime() + 2000)}},
    {key: {path: ['Supplier', 2]}, data: {id: 'B', name: 'Supplier B', _metadata_created: new Date().setTime(testDate.getTime())}},
    {key: {path: ['Supplier', 3]}, data: {id: 'C', name: 'Supplier C', _metadata_created: new Date().setTime(testDate.getTime() + 1000)}}
  ];

  const depotEntities = [{key: {path: ['Supplier', 1, 'Depot', 1]}, data: {id: 'D1', name: 'Depot 1', _metadata_created: new Date()}}];

  before(() => {
    sandbox = sinon.sandbox.create();

    sandbox.useFakeTimers(testDate.getTime());

    sandbox.stub(dataset, 'createQuery', kind => {
      return {
        kind,
        filteredId: undefined,
        sortOrder: undefined,
        filter(_, id) {
          this.filteredId = id;
          return this;
        },
        hasAncestor() {
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

      if (query.filteredId) {
        const entity = _.find(data, entity => entity.data.id === query.filteredId);

        if (entity) {
          return callback(null, [{key: entity.key, data: entity.data}]);
        }

        return callback(null, []);
      }

      if (query.sortOrder === '_metadata_created') {
        data = _.sortBy(data, entity => entity.data._metadata_created);
      }

      callback(null, data.map(entity => {
        return {key: entity.key, data: entity.data};
      }));
    });

    keyStub = sandbox.stub(dataset, 'key', path => {
      return {path: [].concat(path)};
    });

    saveStub = sandbox.stub(dataset, 'save', (args, callback) => {
      let key;

      if (args.method === 'insert_auto_id') {
        key = _.cloneDeep(args.key);
        key.path.push(1);
      }

      callback(null, {mutation_result: {insert_auto_id_key: [key]}});
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

      sinon.assert.calledWithMatch(saveStub, sinon.match({key: newSupplierKey, method: 'insert_auto_id', data: persistedData}));
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
        sinon.assert.calledWith(keyStub, 'Supplier');

        const persistedData = _.clone(createdSupplier);
        persistedData._metadata_created = persistedData._metadata.created;
        delete persistedData._metadata;

        sinon.assert.calledWithMatch(saveStub, sinon.match({key: newSupplierKey, method: 'insert_auto_id', data: persistedData}));
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

        sinon.assert.calledWithMatch(saveStub, sinon.match({key: supplierEntities[0].key, method: 'update', data: persistedData}));
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
      return Supplier.create({name: 'a supplier'})
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

      const depotKey = {path: ['Supplier', 1, 'Depot']};

      sinon.assert.calledWithMatch(saveStub, sinon.match({key: depotKey, method: 'insert_auto_id', data: persistedData}));
    });
  });

  describe('upsertDepot', () => {
    describe('as create', () => {
      let createdDepot;
      const testId = 'depotid';
      const newDepot = {name: 'new depot'};

      before(() => {
        return Supplier.create({name: 'supplier'})
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

        const depotKey = {path: ['Supplier', 1, 'Depot']};

        sinon.assert.calledWithMatch(saveStub, sinon.match({key: depotKey, method: 'insert_auto_id', data: persistedData}));
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

        sinon.assert.calledWithMatch(saveStub, sinon.match({key: depotEntities[0].key, method: 'update', data: persistedData}));
      });

      it('sets _inserted property', () => {
        expect(updatedDepot._inserted).to.equal(false);
      });

      it('makes _inserted property non-enumerable', () => {
        expect(updatedDepot._inserted.propertyIsEnumerable()).to.equal(false);
      });
    });
  });
});
