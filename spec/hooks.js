'use strict';

const _ = require('lodash');
const bluebird = require('bluebird');
const nock = require('nock');
const dataset = require('../lib/dataset');
const auth0 = require('../lib/auth0_client');
const auth0Stubber = require('./auth0_stubber');

const preloadPostcodeData = () => {
  const entities = [
    {key: dataset.key(['Postcode', 'EC2Y9AR']), data: {postcode: 'EC2Y9AR', place: 'Islington', district: 'Islington', region: 'London', county: 'Greater London', country: 'England'}},
    {key: dataset.key(['Postcode', 'SE228LY']), data: {postcode: 'SE228LY', place: '', district: 'Southwark', region: 'London', county: 'Greater London', country: 'England'}}
  ];

  return new Promise((resolve, reject) => {
    dataset.save(entities, err => err ? reject(err) : resolve());
  });
};

const preloadProductData = () => {
  const entities = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i =>
    ({key: dataset.key(['Product', i.toString()]), data: {name: 'test product', price: 5, _metadata_created: new Date(), _metadata_updated: new Date()}}));

  return new Promise((resolve, reject) => {
    dataset.save(entities, err => err ? reject(err) : resolve());
  });
};

module.exports.deleteTestData = kind => {
  const query = dataset.createQuery(kind).select('__key__');

  return new Promise((resolve, reject) => {
    dataset.runQuery(query, (err, res) => {
      if (err) {
        console.error(err);
        console.log(`Error getting keys to delete ${kind} data`);

        reject(err);
      }

      const keys = _.map(res, 'key');
      dataset.delete(keys, err => {
        if (err) {
          console.error(err);
          console.log(`Error deleting ${kind} data`);

          reject(err);
        }

        resolve();
      });
    });
  });
};

before(() => {
  nock.recorder.rec({
    dont_print: true,
    output_objects: true
  });

  return Promise.all([
    preloadPostcodeData(),
    preloadProductData()
  ]);
});

beforeEach(() => {
  auth0Stubber.enable();
});

afterEach(() => {
  auth0Stubber.disable();

  return Promise.all([
    module.exports.deleteTestData('Supplier'),
    module.exports.deleteTestData('Depot'),
    module.exports.deleteTestData('SupplierLinkedProduct')
  ]);
});

after(function () {
  this.timeout(5000);
  const nockCallObjects = nock.recorder.play();
  const createdInAuth0 = _(nockCallObjects)
    .filter({
      path: '/api/users/',
      scope: `https://${process.env.AUTH0_DOMAIN}:443`,
      method: 'POST',
      status: 200
    })
    .map(r => r.response.user_id)
    .value();

  return bluebird.mapSeries(createdInAuth0, id => bluebird.fromCallback(callback => auth0.deleteUser(id, callback)))
    .then(() => Promise.all([
      module.exports.deleteTestData('Postcode'),
      module.exports.deleteTestData('Product')
    ]));
});
