'use strict';

const _ = require('lodash');
const request = require('request');

const Model = require('./model');

const supplierKind = 'Supplier';

const buildDatastoreKeyPath = id => {
  return id ? [supplierKind, id] : [supplierKind];
};

const getPostcodeData = postcode => {
  return new Promise((resolve, reject) => {
    request({url: `http://10.35.65.188:32782/postcodes/${postcode}`}, (err, response, body) => {
      if (err) {
        return reject(err);
      }

      if (response.statusCode !== 200) {
        return reject(new Error(`Postcodes API HTTP error ${response.statusCode}`));
      }

      resolve(JSON.parse(body));
    });
  });
};

class SupplierModel extends Model {
  create(supplier) {
    return super.create(buildDatastoreKeyPath(), supplier);
  }

  get(id) {
    return super.get(buildDatastoreKeyPath(id));
  }

  upsert(id, supplier) {
    return super.upsert(buildDatastoreKeyPath(id), supplier);
  }

  find() {
    const query = super.dataset.createQuery(supplierKind).order('_metadata_created');
    return super._runQuery(query);
  }

  findByDeliveryPostcode(postcode) {
    const dataset = super.dataset;
    const entityToModel = super._entityToModel;

    return getPostcodeData(postcode)
    .then(postcodeData => {
      const filters = [
        {field: 'delivery_countries', value: postcodeData.country},
        {field: 'delivery_regions', value: postcodeData.region},
        {field: 'delivery_counties', value: postcodeData.county},
        {field: 'delivery_districts', value: postcodeData.district},
        {field: 'delivery_places', value: postcodeData.place}
      ];

      // datastore has no OR operator so need to run individual queries for each field
      // the following code could trigger up to 5 I/O operations in parallel and use all 4 libuv worker threads in a single request
      // increase the limit with UV_THREADPOOL_SIZE env variable?
      const depotQueries = filters
        .filter(f => f.value)
        .map(q => {
          const query = dataset.createQuery('Depot').filter(`${q.field} =`, q.value);

          return new Promise((resolve, reject) => {
            dataset.runQuery(query, (err, entities) => {
              if (err) {
                return reject(err);
              }

              resolve(entities.map(e => e.key));
            });
          });
        });

      return Promise.all(depotQueries);
    })
    .then(depotKeys => {
      const supplierKeys = _.flatten(depotKeys).map(key => dataset.key(key.path.slice(0, 2)));

      if (supplierKeys.length === 0) {
        return [];
      }

      return new Promise((resolve, reject) => {
        dataset.get(_.uniq(supplierKeys), (err, entities) => {
          if (err) {
            return reject(err);
          }

          resolve(entities.map(entityToModel));
        });
      });
    });
  }

  delete(id) {
    return super.delete(buildDatastoreKeyPath(id));
  }
}

module.exports = new SupplierModel();
module.exports.kind = supplierKind;
