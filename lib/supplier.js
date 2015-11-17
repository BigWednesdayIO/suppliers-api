'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const dataset = require('./dataset');

const supplierKind = 'Supplier';
const depotKind = 'Depot';

const getSingleEntity = query => {
  return new Promise((resolve, reject) => {
    dataset.runQuery(query, (err, res) => {
      if (err) {
        return reject(err);
      }

      if (res.length) {
        return resolve(res[0]);
      }

      resolve();
    });
  });
};

const save = (data, key, method) => {
  return new Promise((resolve, reject) => {
    dataset.save({key, method, data}, (err, result) => {
      if (err) {
        return reject(err);
      }

      let updatedKey = key;

      if (method === 'insert_auto_id') {
        updatedKey = result.mutation_result.insert_auto_id_key[0];
      }

      resolve({key: updatedKey, data});
    });
  });
};

const supplierKeys = new WeakMap();

const entityToModel = entity => {
  const model = {};

  _.assign(model, _.pick(entity.data, (value, property) => !property.startsWith('_metadata_')));
  model._metadata = {created: entity.data._metadata_created};

  return model;
};

const initialiseModel = (attributes, id) => {
  return _.assign({id: id || cuid(), _metadata_created: new Date()}, attributes);
};

class Supplier {
  constructor(entity) {
    _.assign(this, entityToModel(entity));

    supplierKeys.set(this, entity.key);
  }

  createDepot(depot) {
    const supplierKey = supplierKeys.get(this);
    const depotKey = dataset.key(supplierKey.path.concat(depotKind));

    return save(initialiseModel(depot), depotKey, 'insert_auto_id')
      .then(entityToModel);
  }

  upsertDepot(id, depot) {
    const supplierKey = supplierKeys.get(this);
    const query = dataset.createQuery(depotKind).hasAncestor(supplierKey).filter('id =', id);

    return getSingleEntity(query)
      .then(entity => {
        if (entity) {
          const data = _.assign({}, entity.data, depot);

          return save(data, entity.key, 'update')
            .then(entityToModel)
            .then(depot => {
              Object.defineProperty(depot, '_inserted', {value: false});
              return depot;
            });
        }

        const depotKey = dataset.key(supplierKey.path.concat(depotKind));
        return save(initialiseModel(depot, id), depotKey, 'insert_auto_id')
          .then(entityToModel)
          .then(depot => {
            Object.defineProperty(depot, '_inserted', {value: true});
            return depot;
          });
      });
  }
}

module.exports = {
  create(attributes) {
    return save(initialiseModel(attributes), dataset.key(supplierKind), 'insert_auto_id')
      .then(entity => new Supplier(entity));
  },

  get(id) {
    const query = dataset.createQuery(supplierKind).filter('id =', id);

    return getSingleEntity(query)
      .then(entity => entity ? new Supplier(entity) : undefined);
  },

  upsert(id, attributes) {
    const query = dataset.createQuery(supplierKind).filter('id =', id);

    return getSingleEntity(query)
      .then(entity => {
        if (entity) {
          const data = _.assign({}, entity.data, attributes);

          return save(data, entity.key, 'update')
            .then(entity => new Supplier(entity))
            .then(supplier => {
              Object.defineProperty(supplier, '_inserted', {value: false});
              return supplier;
            });
        }

        return save(initialiseModel(attributes, id), dataset.key(supplierKind), 'insert_auto_id')
          .then(entity => new Supplier(entity))
          .then(supplier => {
            Object.defineProperty(supplier, '_inserted', {value: true});
            return supplier;
          });
      });
  },

  find() {
    const query = dataset.createQuery(supplierKind).order('_metadata_created');

    return new Promise((resolve, reject) => {
      dataset.runQuery(query, (err, results) => {
        if (err) {
          return reject(err);
        }

        const suppliers = _.map(results, result => new Supplier(result));
        resolve(suppliers);
      });
    });
  }
};
