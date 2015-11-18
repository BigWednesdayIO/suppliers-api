'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const sinon = require('sinon');
const dataset = require('../lib/dataset');

describe('Depot', () => {
  let Depot;
  let sandbox;
  let saveStub;
  let deleteStub;
  const testDate = new Date();

  const depotEntities = [
    {key: {path: ['Depot', 'A']}, data: {id: 'A', name: 'Depot A', supplier_id: '1', _metadata_created: new Date().setTime(testDate.getTime() + 2000)}},
    {key: {path: ['Depot', 'B']}, data: {id: 'B', name: 'Depot B', supplier_id: '1', _metadata_created: new Date().setTime(testDate.getTime())}},
    {key: {path: ['Depot', 'C']}, data: {id: 'C', name: 'Depot C', supplier_id: '1', _metadata_created: new Date().setTime(testDate.getTime() + 1000)}},
    {key: {path: ['Depot', '1']}, data: {id: '1', name: 'Supplier 2 depot 1', supplier_id: '2', _metadata_created: new Date().setTime(testDate.getTime() + 2000)}},
    {key: {path: ['Depot', '2']}, data: {id: '2', name: 'Supplier 2 depot 2', supplier_id: '2', _metadata_created: new Date().setTime(testDate.getTime() + 2000)}}
  ];

  before(() => {
    sandbox = sinon.sandbox.create();

    sandbox.useFakeTimers(testDate.getTime());

    sandbox.stub(dataset, 'createQuery', kind => {
      return {
        kind,
        filter(field, value) {
          this.appliedFilter = {field, value};
          return this;
        },
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
      let data = depotEntities;

      if (query.appliedFilter && query.appliedFilter.field.endsWith(' =')) {
        const field = query.appliedFilter.field.replace(' =', '');
        data = _.filter(data, entity => _.eq(entity.data[field], query.appliedFilter.value));
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

    Depot = require('../lib/depot');
  });

  after(() => {
    sandbox.restore();
  });

  describe('create', () => {
    const attributes = {name: 'a depot'};
    let createdDepot;

    before(() => {
      return Depot.create(attributes)
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

    it('persists the depot', () => {
      const persistedData = _.clone(createdDepot);
      persistedData._metadata_created = persistedData._metadata.created;
      delete persistedData._metadata;

      const key = {path: ['Depot', persistedData.id]};

      sinon.assert.calledWithMatch(saveStub, sinon.match({key, data: persistedData}));
    });
  });

  describe('get', () => {
    it('retrieves the depot by id', () => {
      return Depot.get('A')
        .then(depot => {
          depot._metadata_created = depot._metadata.created;
          delete depot._metadata;

          expect(depot).to.deep.equal(depotEntities[0].data);
        });
    });

    it('returns nothing when the depot does not exist', () => {
      return Depot.get('123')
        .then(depot => {
          expect(depot).to.not.exist;
        });
    });
  });

  describe('upsert', () => {
    describe('as create', () => {
      let createdDepot;
      const testId = 'depotid';
      const newDepot = {name: 'new depot'};

      before(() => {
        return Depot.upsert(testId, newDepot)
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

      it('persists the depot', () => {
        const persistedData = _.clone(createdDepot);
        persistedData._metadata_created = persistedData._metadata.created;
        delete persistedData._metadata;

        const key = {path: ['Depot', persistedData.id]};

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
      let updatedDepot;
      const upsertDepot = {name: 'updated name'};

      before(() => {
        return Depot.upsert('A', upsertDepot)
          .then(depot => {
            updatedDepot = depot;
          });
      });

      it('updates the persisted depot', () => {
        const persistedData = _.clone(upsertDepot);
        persistedData.id = 'A';
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

  describe('find', () => {
    it('returns all depot', () => {
      return Depot.find()
        .then(depots => {
          depotEntities.forEach(entity => {
            const expectedDepot = _.find(depots, {id: entity.data.id});
            expect(expectedDepot).to.exist;
          });
        });
    });

    it('returns depots sorted by default field created_at', () => {
      return Depot.find()
        .then(depots => {
          expect(_.map(depots, 'id')).to.deep.equal(['B', 'C', 'A', '1', '2']);
        });
    });

    it('returns depots for a supplier', () => {
      return Depot.find({supplier_id: '2'})
        .then(depots => {
          expect(_.map(depots, 'id')).to.deep.equal(['1', '2']);
        });
    });
  });

  describe('delete', () => {
    it('deletes the persisted depot', () => {
      const key = {path: ['Depot', '1']};

      return Depot.delete('1')
        .then(() => {
          sinon.assert.calledWith(deleteStub, key);
        });
    });
  });
});
