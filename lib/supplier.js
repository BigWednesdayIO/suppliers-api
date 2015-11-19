'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const dataset = require('./dataset');

const supplierKind = 'Supplier';
const depotKind = 'Depot';

const save = (data, key) => {
  return new Promise((resolve, reject) => {
    dataset.save({key, data}, err => {
      if (err) {
        return reject(err);
      }

      resolve({key, data});
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

  findDepots() {
    const supplierKey = supplierKeys.get(this);
    const query = dataset.createQuery(depotKind).hasAncestor(supplierKey).order('_metadata_created');

    return new Promise((resolve, reject) => {
      dataset.runQuery(query, (err, results) => {
        if (err) {
          return reject(err);
        }

        const depots = _.map(results, entityToModel);
        resolve(depots);
      });
    });
  }

  createDepot(depot) {
    const supplierKey = supplierKeys.get(this);
    const data = initialiseModel(depot);
    const depotKey = dataset.key(supplierKey.path.concat([depotKind, data.id]));

    return save(data, depotKey)
      .then(entityToModel);
  }

  upsertDepot(id, depot) {
    const supplierKey = supplierKeys.get(this);
    const depotKey = dataset.key(supplierKey.path.concat([depotKind, id]));

    return new Promise((resolve, reject) => {
      dataset.get(depotKey, (err, entity) => {
        if (err) {
          return reject(err);
        }

        return resolve(entity);
      });
    })
    .then(entity => {
      const data = entity ? _.assign({}, entity.data, depot) : initialiseModel(depot, id);

      return save(data, depotKey)
        .then(entityToModel)
        .then(depot => {
          Object.defineProperty(depot, '_inserted', {value: (entity === undefined)});
          return depot;
        });
    });
  }

  getDepot(id) {
    const supplierKey = supplierKeys.get(this);
    const depotKey = dataset.key(supplierKey.path.concat([depotKind, id]));

    return new Promise((resolve, reject) => {
      dataset.get(depotKey, (err, entity) => {
        if (err) {
          return reject(err);
        }

        return resolve(entity ? entityToModel(entity) : undefined);
      });
    });
  }

  deleteDepot(id) {
    const supplierKey = supplierKeys.get(this);
    const depotKey = dataset.key(supplierKey.path.concat([depotKind, id]));

    return new Promise((resolve, reject) => {
      dataset.delete(depotKey, err => {
        if (err) {
          return reject(err);
        }

        resolve();
      });
    });
  }
}

module.exports = {
  create(attributes) {
    const data = initialiseModel(attributes);

    return save(data, dataset.key([supplierKind, data.id]))
      .then(entity => new Supplier(entity));
  },

  get(id) {
    return new Promise((resolve, reject) => {
      dataset.get(dataset.key([supplierKind, id]), (err, entity) => {
        if (err) {
          return reject(err);
        }

        return resolve(entity ? new Supplier(entity) : undefined);
      });
    });
  },

  upsert(id, attributes) {
    const supplierKey = dataset.key([supplierKind, id]);

    return new Promise((resolve, reject) => {
      dataset.get(supplierKey, (err, entity) => {
        if (err) {
          return reject(err);
        }

        return resolve(entity);
      });
    })
    .then(entity => {
      const data = entity ? _.assign({}, entity.data, attributes) : initialiseModel(attributes, id);

      return save(data, supplierKey)
        .then(entity => new Supplier(entity))
        .then(supplier => {
          Object.defineProperty(supplier, '_inserted', {value: (entity === undefined)});
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
  },

  delete(id) {
    const key = dataset.key([supplierKind, id]);

    return new Promise((resolve, reject) => {
      dataset.delete(key, err => {
        if (err) {
          return reject(err);
        }

        resolve();
      });
    });
  }
};
