'use strict';

const _ = require('lodash');
const request = require('request');

const indexingApi = 'http://localhost:8888';

const makeIndexingRequest = (action, data) => {
  request.post({
    url: `${indexingApi}/indexing_jobs`,
    json: {
      trigger_type: 'linked_product',
      action,
      data
    }
  }, (err, response, body) => console.log(err, body));
};

const linkedProductIndexingData = (model, key) =>
  Object.assign(_.pick(model, 'id', 'price', 'was_price', 'product_id'), {supplier_id: key.path[1]});

module.exports = datastoreModel => {
  datastoreModel.on('inserted', (model, key) => makeIndexingRequest('add', linkedProductIndexingData(model, key)));

  datastoreModel.on('updated', (model, key) => makeIndexingRequest('update', linkedProductIndexingData(model, key)));

  datastoreModel.on('deleted', key => makeIndexingRequest('remove', {id: _.last(key.path)}));
};
