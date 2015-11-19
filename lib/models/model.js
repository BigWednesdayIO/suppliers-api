'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const dataset = require('./dataset');

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

const entityToModel = entity => {
  const model = {};

  _.assign(model, _.pick(entity.data, (value, property) => !property.startsWith('_metadata_')));
  model._metadata = {created: entity.data._metadata_created};

  return model;
};

const initialiseModel = (attributes, id) => {
  return _.assign({id: id || cuid(), _metadata_created: new Date()}, attributes);
};

class Model {
  create(attributes) {
    const data = initialiseModel(attributes);

    return save(data, dataset.key([this._kind, data.id]))
      .then(entityToModel);
  }

  get(id) {
    return new Promise((resolve, reject) => {
      dataset.get(dataset.key([this._kind, id]), (err, entity) => {
        if (err) {
          return reject(err);
        }

        return resolve(entity ? entityToModel(entity) : undefined);
      });
    });
  }

  upsert(id, attributes) {
    const key = dataset.key([this._kind, id]);

    return new Promise((resolve, reject) => {
      dataset.get(key, (err, entity) => {
        if (err) {
          return reject(err);
        }

        return resolve(entity);
      });
    })
    .then(entity => {
      const data = entity ? _.assign({}, entity.data, attributes) : initialiseModel(attributes, id);

      return save(data, key)
        .then(entityToModel)
        .then(model => {
          Object.defineProperty(model, '_inserted', {value: (entity === undefined)});
          return model;
        });
    });
  }

  find(filters) {
    filters = filters || {};

    let query = dataset.createQuery(this._kind).order('_metadata_created');

    _.forOwn(filters, (value, key) => {
      query = query.filter(`${key} =`, value);
    });

    return new Promise((resolve, reject) => {
      dataset.runQuery(query, (err, results) => {
        if (err) {
          return reject(err);
        }

        resolve(_.map(results, entityToModel));
      });
    });
  }

  delete(id) {
    const key = dataset.key([this._kind, id]);

    return new Promise((resolve, reject) => {
      dataset.delete(key, err => {
        if (err) {
          return reject(err);
        }

        resolve();
      });
    });
  }
}

module.exports = Model;
