'use strict';

const cuid = require('cuid');

const projectId = process.env.GCLOUD_PROJECT_ID;
const credentials = process.env.GCLOUD_KEY;

const dataset = require('gcloud').datastore.dataset({
  projectId,
  credentials: JSON.parse(new Buffer(credentials, 'base64').toString('ascii'))
});

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
        return save(supplier, entity.key)
          .then(supplier => {
            Object.defineProperty(supplier, '_inserted', {value: false});
            return supplier;
          });
      }

      return save(supplier)
        .then(supplier => {
          Object.defineProperty(supplier, '_inserted', {value: true});
          return supplier;
        });
    });
};
