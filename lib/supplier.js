'use strict';

const _ = require('lodash');

const dataset = require('./dataset');
const DatastoreModel = require('gcloud-datastore-model')(dataset);

class SupplierModel {
  findByDeliveryLocations(locations) {
    const filters = [
      {field: 'delivery_countries', value: locations.country},
      {field: 'delivery_regions', value: locations.region},
      {field: 'delivery_counties', value: locations.county},
      {field: 'delivery_districts', value: locations.district},
      {field: 'delivery_places', value: locations.place}
    ];

    // datastore has no OR operator so need to run individual queries for each field
    // the following code could trigger up to 5 I/O operations in parallel and use all 4 libuv worker threads in a single request
    // increase the limit with UV_THREADPOOL_SIZE env variable?
    const depotQueries = filters
      .filter(f => f.value)
      .map(q => {
        const query = dataset.depotQuery().filter(`${q.field} =`, q.value).select('__key__');

        return new Promise((resolve, reject) => {
          dataset.runQuery(query, (err, entities) => {
            if (err) {
              return reject(err);
            }

            resolve(entities.map(e => e.key));
          });
        });
      });

    return Promise.all(depotQueries).then(depotKeys => {
      const supplierKeys = _.flatten(depotKeys).map(key => dataset.key(key.path.slice(0, 2)));

      if (supplierKeys.length === 0) {
        return [];
      }

      return DatastoreModel.getMany(_.uniq(supplierKeys));
    });
  }
}

module.exports = new SupplierModel();
