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
  const supplierId = _.last(key.path);
  return bluebird.fromCallback(callback => {
    return auth0.createUser({
      connection: process.env.AUTH0_CONNECTION,
      email: entity.email,
      password: entity.password,
      supplier_id: supplierId,
      scope: [`supplier:${supplierId}`]
    }, callback);
  })
  .then(auth0User => {
    return datastoreModel.insert(key, _.assign(_.omit(entity, 'password'), {_hidden: {auth0Id: auth0User.user_id}}))
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

supplierStore.update = (key, entity) => {
  return datastoreModel.get(key)
    .then(currentEntity => {
      const p = Promise.resolve();

      if (currentEntity.email !== entity.email) {
        p.then(() =>
          bluebird.fromCallback(callback => {
            const verifyEmail = true;
            return auth0.updateUserEmail(currentEntity._hidden.auth0Id, entity.email, verifyEmail, callback);
          })
        );
      }

      return p.then(() =>
        datastoreModel.update(key, _.assign({_hidden: currentEntity._hidden}, entity))
      );
    });
};

supplierStore.delete = key => {
  return datastoreModel.get(key)
    .then(currentEntity => {
      return datastoreModel.delete(key)
        .then(() => {
          return bluebird.fromCallback(callback => {
            return auth0.deleteUser(currentEntity._hidden.auth0Id, callback);
          });
        });
    });
};

module.exports = supplierStore;
