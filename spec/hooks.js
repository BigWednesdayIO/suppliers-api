'use strict';

const _ = require('lodash');
const dataset = require('../lib/dataset');

module.exports.deleteTestData = () => {
  const query = dataset.createQuery('Supplier');

  return new Promise((resolve, reject) => {
    dataset.runQuery(query, (err, res) => {
      if (err) {
        console.error(err);
        console.log('Error deleting Supplier data');

        reject(err);
      }

      const keys = _.map(res, 'key');
      dataset.delete(keys, err => {
        if (err) {
          console.error(err);
          console.log('Error deleting Supplier data');

          reject(err);
        }

        resolve();
      });
    });
  });
};

after(() => module.exports.deleteTestData());
