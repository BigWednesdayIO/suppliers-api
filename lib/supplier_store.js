'use strict';

const _ = require('lodash');
const auth0 = require('./auth0_client');
const bluebird = require('bluebird');
const dataset = require('./dataset');
const datastoreModel = require('gcloud-datastore-model')(dataset);

class SupplierExistsError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SupplierExistsError';
  }
}
class InvalidPasswordError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidPasswordError';
  }
}

const auth0ErrorMap = {
  user_exists: SupplierExistsError,
  invalid_password: InvalidPasswordError
};

const supplierStore = Object.create(datastoreModel);

supplierStore.insert = (key, entity) => {
  return bluebird.fromCallback(callback => {
    return auth0.createUser({
      connection: process.env.AUTH0_CONNECTION,
      email: entity.email,
      password: entity.password
    }, callback);
  })
  .then(auth0User => {
    return datastoreModel.insert(key, _.omit(entity, 'password'))
      .catch(err => {
        return bluebird.fromCallback(callback => auth0.deleteUser(auth0User.user_id, () => callback(err)));
      });
  }, err => {
    if (auth0ErrorMap[err.code]) {
      throw new auth0ErrorMap[err.code]();
    }
    throw err;
  });
};

module.exports = supplierStore;
