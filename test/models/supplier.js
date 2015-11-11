'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const dataset = require('../../lib/models/dataset');

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
      if (query.filteredId === 'abc') {
        return callback(null, [{key: existingKey, data: persistedSupplier}]);
      }

      callback(null, []);
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
    describe('as create', () => {
      let createdSupplier;
      const newSupplier = {id: 'new', name: 'new supplier'};

      before(() => {
        return Supplier.upsert(newSupplier)
          .then(supplier => {
            createdSupplier = supplier;
          });
      });

      it('persists the supplier', () => {
        sinon.assert.calledWith(keyStub, 'Supplier');
        sinon.assert.calledWithMatch(saveStub, sinon.match({key: newKey, method: 'insert_auto_id', data: newSupplier}));
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
      const existingSupplier = {id: 'abc', name: 'updated name'};

      before(() => {
        return Supplier.upsert(existingSupplier)
          .then(supplier => {
            updatedSupplier = supplier;
          });
      });

      it('updates an existing supplier', () => {
        sinon.assert.calledWithMatch(saveStub, sinon.match({key: existingKey, method: 'update', data: existingSupplier}));
      });

      it('sets _inserted property', () => {
        expect(updatedSupplier._inserted).to.equal(false);
      });

      it('makes _inserted property non-enumerable', () => {
        expect(updatedSupplier._inserted.propertyIsEnumerable()).to.equal(false);
      });
    });
  });
});
