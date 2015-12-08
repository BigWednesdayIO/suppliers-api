'use strict';

const _ = require('lodash');
const dataset = require('../lib/dataset');

const preloadPostcodeData = () => {
  const entities = [
    {key: dataset.key(['Postcode', 'EC2Y9AR']), data: {postcode: 'EC2Y9AR', place: 'Islington', district: 'Islington', region: 'London', county: 'Greater London', country: 'England'}},
    {key: dataset.key(['Postcode', 'SE228LY']), data: {postcode: 'SE228LY', place: '', district: 'Southwark', region: 'London', county: 'Greater London', country: 'England'}}
  ];

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

before(() => preloadPostcodeData());

afterEach(() => Promise.all([
  module.exports.deleteTestData('Supplier'),
  module.exports.deleteTestData('Depot'),
  module.exports.deleteTestData('SupplierLinkedProduct')
]));

after(() => module.exports.deleteTestData('Postcode'));
