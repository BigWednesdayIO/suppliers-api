'use strict';

const _ = require('lodash');

const projectId = process.env.GCLOUD_PROJECT_ID;
const credentials = process.env.GCLOUD_KEY;

const dataset = require('gcloud').datastore.dataset({
  projectId,
  credentials: JSON.parse(new Buffer(credentials, 'base64').toString('ascii'))
});

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
