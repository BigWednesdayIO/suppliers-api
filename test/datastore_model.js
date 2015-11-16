'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const sinon = require('sinon');
const dataset = require('../lib/dataset');

describe('Datastore Model', () => {
  let DatastoreModel;
  let sandbox;
  let saveStub;
  let keyStub;
  const testKind = 'Model';
  const testDate = new Date();

  const persistedModels = [
    {id: 'A', name: 'Model A', _metadata_created: new Date().setTime(testDate.getTime() + 2000)},
    {id: 'B', name: 'Model B', _metadata_created: new Date().setTime(testDate.getTime())},
    {id: 'C', name: 'Model C', _metadata_created: new Date().setTime(testDate.getTime() + 1000)}
  ];

  const newKey = {key: 'new'};
  const existingKey = {key: 'existing'};

  before(() => {
    sandbox = sinon.sandbox.create();

    sandbox.useFakeTimers(testDate.getTime());

    sandbox.stub(dataset, 'createQuery', kind => {
      if (kind !== testKind) {
        return undefined;
      }

      return {
        filteredId: undefined,
        sortOrder: undefined,
        filter(_, id) {
          this.filteredId = id;
          return this;
        },
        order(order) {
          this.sortOrder = order;
          return this;
        }
      };
    });

    sandbox.stub(dataset, 'runQuery', (query, callback) => {
      if (query.filteredId) {
        const model = _.find(persistedModels, {id: query.filteredId});

        if (model) {
          return callback(null, [{key: existingKey, data: model}]);
        }

        return callback(null, []);
      }

      let data = persistedModels;

      if (query.sortOrder === '_metadata_created') {
        data = _.sortBy(persistedModels, '_metadata_created');
      }

      callback(null, data.map(model => {
        return {key: existingKey, data: model};
      }));
    });

    keyStub = sandbox.stub(dataset, 'key', () => {
      return newKey;
    });

    saveStub = sandbox.stub(dataset, 'save', (args, callback) => {
      callback();
    });

    DatastoreModel = require('../lib/datastore_model')(testKind);
  });

  after(() => {
    sandbox.restore();
  });

  describe('create', () => {
    const attributes = {name: 'a model'};
    let createdModel;

    before(() => {
      return DatastoreModel.create(attributes)
        .then(model => {
          createdModel = model;
        });
    });

    it('generates an id', () => {
      expect(createdModel).to.have.property('id');
    });

    it('sets created date', () => {
      expect(createdModel._metadata.created).to.deep.equal(testDate);
    });

    it('persists the model', () => {
      const persistedData = _.clone(createdModel);
      persistedData._metadata_created = persistedData._metadata.created;
      delete persistedData._metadata;

      sinon.assert.calledWithMatch(saveStub, sinon.match({key: newKey, method: 'insert_auto_id', data: persistedData}));
    });
  });

  describe('get', () => {
    it('retrieves the model by id', () => {
      return DatastoreModel.get('A')
        .then(model => {
          model._metadata_created = model._metadata.created;
          delete model._metadata;

          expect(model).to.deep.equal(persistedModels[0]);
        });
    });

    it('returns nothing when the model does not exist', () => {
      return DatastoreModel.get('123')
        .then(model => {
          expect(model).to.not.exist;
        });
    });
  });

  describe('upsert', () => {
    describe('as create', () => {
      let createdModel;
      const testId = 'modelid';
      const newModel = {name: 'new model'};

      before(() => {
        return DatastoreModel.upsert(testId, newModel)
          .then(model => {
            createdModel = model;
          });
      });

      it('sets the id', () => {
        expect(createdModel.id).to.deep.equal(testId);
      });

      it('sets created date', () => {
        expect(createdModel._metadata.created).to.deep.equal(testDate);
      });

      it('persists the model', () => {
        sinon.assert.calledWith(keyStub, testKind);

        const persistedData = _.clone(createdModel);
        persistedData._metadata_created = persistedData._metadata.created;
        delete persistedData._metadata;

        sinon.assert.calledWithMatch(saveStub, sinon.match({key: newKey, method: 'insert_auto_id', data: persistedData}));
      });

      it('sets _inserted property', () => {
        expect(createdModel._inserted).to.equal(true);
      });

      it('makes _inserted property non-enumerable', () => {
        expect(createdModel._inserted.propertyIsEnumerable()).to.equal(false);
      });
    });

    describe('as update', () => {
      let updatedModel;
      const upsertModel = {name: 'updated name'};

      before(() => {
        return DatastoreModel.upsert('A', upsertModel)
          .then(model => {
            updatedModel = model;
          });
      });

      it('updates the persisted model', () => {
        const persistedData = _.clone(upsertModel);
        persistedData.id = 'A';
        persistedData._metadata_created = persistedModels[0]._metadata_created;
        delete persistedData._metadata;

        sinon.assert.calledWithMatch(saveStub, sinon.match({key: existingKey, method: 'update', data: persistedData}));
      });

      it('sets _inserted property', () => {
        expect(updatedModel._inserted).to.equal(false);
      });

      it('makes _inserted property non-enumerable', () => {
        expect(updatedModel._inserted.propertyIsEnumerable()).to.equal(false);
      });
    });
  });

  describe('find', () => {
    let foundModels;

    before(() => {
      return DatastoreModel.find().then(models => {
        foundModels = models;
      });
    });

    it('returns all models', () => {
      persistedModels.forEach(model => {
        const expectedModel = _.find(foundModels, {id: model.id});
        expect(expectedModel).to.exist;
      });
    });

    it('returns models sorted by default field created_at', () => {
      expect(_.map(foundModels, 'id')).to.deep.equal(['B', 'C', 'A']);
    });
  });
});
