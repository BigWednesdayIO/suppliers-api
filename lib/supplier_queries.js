'use strict';

const _ = require('lodash');

const dataset = require('./dataset');
const datasetEntities = require('./dataset_entities');

const DatastoreModel = require('gcloud-datastore-model')(dataset);

const extractSupplierKey = key => dataset.key(key.path.slice(0, 2));

const getSuppliersFromChildEntityKeys = keys => {
  const supplierKeys = keys.map(extractSupplierKey);

  if (supplierKeys.length === 0) {
    return [];
  }

  return DatastoreModel.getMany(_.uniq(supplierKeys));
};

const enrichSuppliersWithLinkedProductIds = (suppliers, linkedProductKeys) => {
  return suppliers.map(supplier => {
    const linkedProductKey = linkedProductKeys.find(k => _.eq(extractSupplierKey(k), datasetEntities.supplierKey(supplier.id)));

    const result = Object.assign({}, supplier);
    result._metadata.linked_product_id = _.last(linkedProductKey.path);

    return result;
  });
};

module.exports.findByDeliveryLocations = locations => {
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
      const query = datasetEntities.depotQuery().filter(`${q.field} =`, q.value).select('__key__');

      return new Promise((resolve, reject) => {
        dataset.runQuery(query, (err, entities) => {
          if (err) {
            return reject(err);
          }

          resolve(entities.map(e => e.key));
        });
      });
    });

  return Promise.all(depotQueries)
    .then(depotKeys => getSuppliersFromChildEntityKeys(_.flatten(depotKeys)));
};

module.exports.findBySuppliedProduct = productId => {
  const linkedProductQuery = datasetEntities.linkedProductQuery().filter('product_id =', productId).select('__key__');

  return new Promise((resolve, reject) => {
    dataset.runQuery(linkedProductQuery, (err, entities) => {
      if (err) {
        return reject(err);
      }

      resolve(entities.map(e => e.key));
    });
  })
  .then(keys => Promise.all([getSuppliersFromChildEntityKeys(keys), keys]))
  .then(_.spread(enrichSuppliersWithLinkedProductIds));
};
