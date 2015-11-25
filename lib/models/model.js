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

const initialiseModel = (attributes, id) => {
  return _.assign({id: id || cuid(), _metadata_created: new Date()}, attributes);
};

class Model {
  get dataset() {
    return dataset;
  }

  create(path, model) {
    const data = initialiseModel(model);

    return save(data, dataset.key(path.concat(data.id)))
      .then(this._entityToModel);
  }

  get(path) {
    return new Promise((resolve, reject) => {
      dataset.get(dataset.key(path), (err, entity) => {
        if (err) {
          return reject(err);
        }

        return resolve(entity ? this._entityToModel(entity) : undefined);
      });
    });
  }

  upsert(path, model) {
    const key = dataset.key(path);

    return new Promise((resolve, reject) => {
      dataset.get(key, (err, entity) => {
        if (err) {
          return reject(err);
        }

        return resolve(entity);
      });
    })
    .then(entity => {
      const id = _.last(path);
      let data;

      if (entity) {
        data = _.assign({id, _metadata_created: entity.data._metadata_created}, model);
      } else {
        data = initialiseModel(model, id);
      }

      return save(data, key)
        .then(this._entityToModel)
        .then(model => {
          Object.defineProperty(model, '_inserted', {value: (entity === undefined)});
          return model;
        });
    });
  }

  _runQuery(query) {
    return new Promise((resolve, reject) => {
      this.dataset.runQuery(query, (err, results) => {
        if (err) {
          return reject(err);
        }

        resolve(_.map(results, this._entityToModel));
      });
    });
  }

  _entityToModel(entity) {
    const model = {};

    _.assign(model, _.pick(entity.data, (value, property) => !property.startsWith('_metadata_')));
    model._metadata = {created: entity.data._metadata_created};

    return model;
  }

  delete(path) {
    const key = dataset.key(path);

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
