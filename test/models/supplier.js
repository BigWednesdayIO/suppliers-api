'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const sinon = require('sinon');
const dataset = require('../../lib/models/dataset');

describe('Supplier', () => {
  let Supplier;
  let sandbox;
  let saveStub;
  let keyStub;
  const testDate = new Date();

  const persistedSuppliers = [
    {id: 'A', name: 'Supplier A', created_at: testDate},
    {id: 'B', name: 'Supplier B', created_at: testDate},
    {id: 'C', name: 'Supplier C', created_at: testDate}
  ];

  const newKey = {key: 'new'};
  const existingKey = {key: 'existing'};

  before(() => {
    sandbox = sinon.sandbox.create();

    sandbox.useFakeTimers(testDate.getTime());

    sandbox.stub(dataset, 'createQuery', kind => {
      if (kind !== 'Supplier') {
        return undefined;
      }

      return {
        filteredId: undefined,
        filter: (_, id) => {
          this.filteredId = id;
          return this;
        }
      };
    });

    sandbox.stub(dataset, 'runQuery', (query, callback) => {
      if (query.filteredId) {
        const supplier = _.find(persistedSuppliers, {id: query.filteredId});

        if (supplier) {
          return callback(null, [{key: existingKey, data: supplier}]);
        }

        return callback(null, []);
      }

      callback(null, persistedSuppliers.map(s => {
        return {key: existingKey, data: s};
      }));
    });

    keyStub = sandbox.stub(dataset, 'key', () => {
      return newKey;
    });

    saveStub = sandbox.stub(dataset, 'save', (args, callback) => {
      callback();
    });

    Supplier = require('../../lib/models/supplier');
  });

  after(() => {
    sandbox.restore();
  });

  describe('create', () => {
    const newSupplier = {name: 'a supplier'};
    let createdSupplier;

    before(() => {
      return Supplier.create(newSupplier)
        .then(supplier => {
          createdSupplier = supplier;
        });
    });

    it('generates an id', () => {
      expect(createdSupplier).to.have.property('id');
    });

    it('sets created date', () => {
      expect(createdSupplier.created_at).to.deep.equal(testDate);
    });

    it('persists the supplier', () => {
      sinon.assert.calledWithMatch(saveStub, sinon.match({key: newKey, method: 'insert_auto_id', data: createdSupplier}));
    });
  });

  describe('get', () => {
    it('retrieves the supplier by id', () => {
      return Supplier.get('A')
        .then(supplier => {
          expect(supplier).to.equal(persistedSuppliers[0]);
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
      const newSupplier = {id: 'new', name: 'new supplier'};

      before(() => {
        return Supplier.upsert(newSupplier)
          .then(supplier => {
            createdSupplier = supplier;
          });
      });

      it('sets created date', () => {
        expect(createdSupplier.created_at).to.deep.equal(testDate);
      });

      it('persists the supplier', () => {
        sinon.assert.calledWith(keyStub, 'Supplier');
        sinon.assert.calledWithMatch(saveStub, sinon.match({key: newKey, method: 'insert_auto_id', data: createdSupplier}));
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
      const upsertSupplier = {id: 'A', name: 'updated name'};

      before(() => {
        return Supplier.upsert(upsertSupplier)
          .then(supplier => {
            updatedSupplier = supplier;
          });
      });

      it('updates an existing supplier', () => {
        const persistedData = upsertSupplier;
        persistedData.created_at = persistedSuppliers[0].created_at;

        sinon.assert.calledWithMatch(saveStub, sinon.match({key: existingKey, method: 'update', data: persistedData}));
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
    it('returns all suppliers', () => {
      return Supplier.find().then(results => {
        expect(results).to.deep.equal(persistedSuppliers);
      });
    });
  });
});
