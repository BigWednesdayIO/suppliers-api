'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const dataset = require('./dataset');

const getEntityById = id => {
  const query = dataset.createQuery('Supplier').filter('id =', id);

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

const save = (supplier, key) => {
  const method = key ? 'update' : 'insert_auto_id';
  key = key || dataset.key('Supplier');

  return new Promise((resolve, reject) => {
    dataset.save({key, method, data: supplier}, err => {
      if (err) {
        return reject(err);
      }

      resolve(supplier);
    });
  });
};

module.exports.create = supplier => {
  supplier.id = cuid();
  supplier.created_at = new Date();

  return save(supplier);
};

module.exports.get = id => {
  return getEntityById(id)
    .then(entity => (entity ? entity.data : undefined));
};

module.exports.upsert = supplier => {
  return getEntityById(supplier.id)
    .then(entity => {
      if (entity) {
        supplier.created_at = entity.data.created_at;

        return save(supplier, entity.key)
          .then(supplier => {
            Object.defineProperty(supplier, '_inserted', {value: false});
            return supplier;
          });
      }

      supplier.created_at = new Date();

      return save(supplier)
        .then(supplier => {
          Object.defineProperty(supplier, '_inserted', {value: true});
          return supplier;
        });
    });
};

module.exports.find = () => {
  const query = dataset.createQuery('Supplier');

  return new Promise((resolve, reject) => {
    dataset.runQuery(query, (err, res) => {
      if (err) {
        return reject(err);
      }

      const suppliers = _.map(res, 'data');
      resolve(suppliers);
    });
  });
};
