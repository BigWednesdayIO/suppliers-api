'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const sinon = require('sinon');

const dataset = require('../lib/dataset');
const entities = require('../lib/dataset_entities');
const auth0Client = require('../lib/auth0_client');
const supplierStore = require('../lib/supplier_store');
const datastoreModel = require('gcloud-datastore-model')(dataset);

describe('Supplier store', () => {
  const supplierKey = entities.supplierKey('supplier-a');
  const fakeAuth0Id = 'auth0|987654321';

  let sandbox;
  let insertStub;
  let updateStub;
  let createUserStub;
  let deleteUserStub;
  let updateUserEmailStub;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();

    insertStub = sandbox.stub(datastoreModel.constructor.prototype, 'insert', (key, body) => {
      if (body.email === 'fail_to_persist@bigwednesday.io') {
        return Promise.reject('Cannot save');
      }
      return Promise.resolve(body);
    });

    updateStub = sandbox.stub(datastoreModel.constructor.prototype, 'update', (key, body) => {
      if (body.email === 'fail_to_persist@bigwednesday.io') {
        return Promise.reject('Cannot save');
      }
      return Promise.resolve(body);
    });

    createUserStub = sandbox.stub(auth0Client, 'createUser', (params, callback) => {
      if (params.email === 'existing@bigwednesday.io') {
        const auth0UserExistsError = new Error();
        auth0UserExistsError.code = 'user_exists';
        return callback(auth0UserExistsError);
      }
      if (params.password === 'weak') {
        const auth0InvalidPasswordError = new Error();
        auth0InvalidPasswordError.code = 'invalid_password';
        return callback(auth0InvalidPasswordError);
      }

      callback(null, {
        user_id: 'auth0|987654321',
        email: params.email
      });
    });

    deleteUserStub = sandbox.stub(auth0Client, 'deleteUser', (id, callback) => {
      callback();
    });

    updateUserEmailStub = sandbox.stub(auth0Client, 'updateUserEmail', (id, email, verify, callback) => {
      callback();
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('insert', () => {
    let created;

    const createParams = {email: 'test@bigwednesday.io', password: '12345'};

    beforeEach(() => {
      return supplierStore.insert(supplierKey, createParams)
        .then(result => {
          created = result;
        });
    });

    it('creates user in auth0', () => {
      sinon.assert.calledOnce(createUserStub);
      sinon.assert.calledWith(
        createUserStub,
        sinon.match(createParams)
      );
    });

    it('persists supplier', () => {
      sinon.assert.calledOnce(insertStub);
      sinon.assert.calledWith(insertStub, sinon.match(supplierKey), sinon.match({
        email: createParams.email,
        _hidden: {auth0Id: fakeAuth0Id}
      }));
    });

    it('does not persist password', () => {
      sinon.assert.calledWith(insertStub, sinon.match.any, sinon.match(body => !body.hasOwnProperty('password')));
    });

    it('does not return password', () => {
      expect(created.password).not.to.be.ok;
    });

    it('removes user from auth0 if persistence fails', () => {
      return supplierStore.insert(supplierKey, {email: 'fail_to_persist@bigwednesday.io', password: '12345'})
        .then(() => {
          throw new Error('Create supplier should fail');
        }, () => {
          sinon.assert.calledOnce(deleteUserStub);
          sinon.assert.calledWith(deleteUserStub, sinon.match('auth0|987654321'));
        });
    });

    it('returns customer attributes', () => {
      const attributeParams = _.omit(createParams, 'password');
      const createdAttributes = _.omit(created, ['id', '_metadata']);
      expect(createdAttributes).to.eql(_.assign(attributeParams, {_hidden: {auth0Id: fakeAuth0Id}}));
    });

    it('errors when supplier exists', () => {
      return supplierStore.insert(supplierKey, {email: 'existing@bigwednesday.io', password: '12345'})
        .then(() => {
          throw new Error('Insert supplier should fail for existing user');
        }, err => {
          expect(err.name).to.equal('SupplierExistsError');
          expect(err instanceof Error).to.equal(true);
        });
    });

    it('errors for password to weak', () => {
      return supplierStore.insert(supplierKey, {email: 'test@bigwednesday.io', password: 'weak'})
        .then(() => {
          throw new Error('Insert supplier should fail');
        }, err => {
          expect(err.name).to.equal('InvalidPasswordError');
          expect(err instanceof Error).to.equal(true);
        });
    });
  });

  describe('update', () => {
    let updated;

    const existingSupplier = {
      id: 'supplier-a',
      email: 'existing@bigwednesday.io',
      name: 'supplier king',
      _metadata: {created: new Date(), updated: new Date()}
    };

    const updateParams = {
      email: 'updated@bigwednesday.io',
      name: 'Updated name'
    };

    beforeEach(() => {
      sandbox.stub(datastoreModel.constructor.prototype, 'get', key => {
        if (_.eq(key, supplierKey)) {
          return Promise.resolve(Object.assign({_hidden: {auth0Id: fakeAuth0Id}}, _.omit(existingSupplier, 'id')));
        }

        const error = new Error();
        error.name = 'EntityNotFoundError';
        return Promise.reject(error);
      });

      return supplierStore
        .update(supplierKey, updateParams)
        .then(supplier => {
          updated = supplier;
        });
    });

    it('persists updated attributes', () => {
      sinon.assert.calledOnce(updateStub);
      sinon.assert.calledWith(updateStub, sinon.match(supplierKey), sinon.match(_.assign(updateParams, {_hidden: {auth0Id: fakeAuth0Id}})));
    });

    it('returns updated resource', () => {
      expect(_.omit(updated, 'id', '_metadata')).to.eql(_.assign(updateParams, {_hidden: {auth0Id: fakeAuth0Id}}));
    });

    it('updates email address in auth0', () => {
      sinon.assert.calledOnce(updateUserEmailStub);
      sinon.assert.calledWith(updateUserEmailStub, fakeAuth0Id, updateParams.email, true);
    });

    it('errors on non-existent customer', () => {
      return supplierStore
        .update(entities.supplierKey('unkown-supplier'), updateParams)
        .then(() => {
          throw new Error('Error expected');
        }, err => {
          expect(err.name).to.equal('EntityNotFoundError');
          expect(err instanceof Error).to.equal(true);
        });
    });
  });
});
