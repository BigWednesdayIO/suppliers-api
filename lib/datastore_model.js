'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const dataset = require('./dataset');

const getEntityById = (kind, id) => {
  const query = dataset.createQuery(kind).filter('id =', id);

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

const save = (kind, attributes, key) => {
  const method = key ? 'update' : 'insert_auto_id';
  key = key || dataset.key(kind);

  return new Promise((resolve, reject) => {
    dataset.save({key, method, data: attributes}, err => {
      if (err) {
        return reject(err);
      }

      resolve(attributes);
    });
  });
};

module.exports = kind => {
  return {
    create(attributes) {
      attributes.id = cuid();
      attributes.created_at = new Date();

      return save(kind, attributes);
    },

    get(id) {
      return getEntityById(kind, id)
        .then(entity => (entity ? entity.data : undefined));
    },

    upsert(id, attributes) {
      const model = _.assign({id}, attributes);

      return getEntityById(kind, id)
        .then(entity => {
          if (entity) {
            model.created_at = entity.data.created_at;

            return save(kind, model, entity.key)
              .then(savedModel => {
                Object.defineProperty(savedModel, '_inserted', {value: false});
                return savedModel;
              });
          }

          model.created_at = new Date();

          return save(kind, model)
            .then(savedModel => {
              Object.defineProperty(savedModel, '_inserted', {value: true});
              return savedModel;
            });
        });
    },

    find() {
      const query = dataset.createQuery(kind).order('created_at');

      return new Promise((resolve, reject) => {
        dataset.runQuery(query, (err, res) => {
          if (err) {
            return reject(err);
          }

          const models = _.map(res, 'data');
          resolve(models);
        });
      });
    }
  };
};
