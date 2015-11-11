'use strict';

const _ = require('lodash');
const dataset = require('../lib/models/dataset');

after(done => {
  const query = dataset.createQuery('Supplier');

  dataset.runQuery(query, (err, res) => {
    if (err) {
      console.error(err);
      console.log('Error deleting Supplier data');

      return done(err);
    }

    const keys = _.map(res, 'key');
    dataset.delete(keys, err => {
      if (err) {
        console.error(err);
        console.log('Error deleting Supplier data');

        return done(err);
      }

      done();
    });
  });
});
