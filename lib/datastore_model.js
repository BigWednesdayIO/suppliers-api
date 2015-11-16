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

const save = (kind, data, key) => {
  const method = key ? 'update' : 'insert_auto_id';
  key = key || dataset.key(kind);

  return new Promise((resolve, reject) => {
    dataset.save({key, method, data}, err => {
      if (err) {
        return reject(err);
      }

      resolve(data);
    });
  });
};

const dataToModel = data => {
  if (!data) {
    return data;
  }

  const model = _.pick(data, (value, key) => !key.startsWith('_metadata_'));
  model._metadata = {created: data._metadata_created};
  return model;
};

module.exports = kind => {
  return {
    create(attributes) {
      const data = _.assign({id: cuid(), _metadata_created: new Date()}, attributes);

      return save(kind, data)
        .then(dataToModel);
    },

    get(id) {
      return getEntityById(kind, id)
        .then(entity => entity ? dataToModel(entity.data) : undefined);
    },

    upsert(id, attributes) {
      return getEntityById(kind, id)
        .then(entity => {
          if (entity) {
            const data = _.assign({}, entity.data, attributes);

            return save(kind, data, entity.key)
              .then(dataToModel)
              .then(model => {
                Object.defineProperty(model, '_inserted', {value: false});
                return model;
              });
          }

          const data = _.assign({id, _metadata_created: new Date()}, attributes);

          return save(kind, data)
            .then(dataToModel)
            .then(model => {
              Object.defineProperty(model, '_inserted', {value: true});
              return model;
            });
        });
    },

    find() {
      const query = dataset.createQuery(kind).order('_metadata_created');

      return new Promise((resolve, reject) => {
        dataset.runQuery(query, (err, results) => {
          if (err) {
            return reject(err);
          }

          const models = _.map(results, result => dataToModel(result.data));
          resolve(models);
        });
      });
    }
  };
};
