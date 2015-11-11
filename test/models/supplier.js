'use strict';

const gcloud = require('gcloud');
const expect = require('chai').expect;
const sinon = require('sinon');

describe('Supplier', () => {
  let Supplier;
  let sandbox;
  let saveStub;
  let keyStub;
  const persistedSupplier = {id: 'abc', name: 'supplier'};
  const newKey = {key: 'new'};
  const existingKey = {key: 'existing'};

  before(() => {
    sandbox = sinon.sandbox.create();

    const dataset = {
      key: () => {},
      createQuery: kind => {
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
      },
      runQuery: (query, callback) => {
        if (query.filteredId === 'abc') {
          return callback(null, [{key: existingKey, data: persistedSupplier}]);
        }

        callback(null, []);
      },
      save: () => {}
    };

    sandbox.stub(gcloud.datastore, 'dataset', () => {
      return dataset;
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
    it('generates an id', () => {
      return Supplier.create({name: 'a supplier'})
        .then(supplier => {
          expect(supplier).to.have.property('id');
        });
    });

    it('persists the supplier', () => {
      const data = {name: 'a supplier'};
      return Supplier.create(data)
        .then(supplier => {
          sinon.assert.calledWith(keyStub, 'Supplier');

          const persistedData = data;
          persistedData.id = supplier.id;

          sinon.assert.calledWithMatch(saveStub, sinon.match({key: newKey, method: 'insert_auto_id', data: persistedData}));
        });
    });
  });

  describe('get', () => {
    it('retrieves the supplier by id', () => {
      return Supplier.get('abc')
        .then(supplier => {
          expect(supplier).to.equal(persistedSupplier);
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
    it('inserts the supplier when it does not exist', () => {
      const newSupplier = {id: 'new', name: 'new supplier'};

      return Supplier.upsert(newSupplier)
        .then(() => {
          sinon.assert.calledWith(keyStub, 'Supplier');
          sinon.assert.calledWithMatch(saveStub, sinon.match({key: newKey, method: 'insert_auto_id', data: newSupplier}));
        });
    });

    it('updates an existing supplier', () => {
      const existingSupplier = {id: 'abc', name: 'updated name'};

      return Supplier.upsert(existingSupplier)
        .then(() => {
          sinon.assert.calledWithMatch(saveStub, sinon.match({key: existingKey, method: 'update', data: existingSupplier}));
        });
    });
  });
});
