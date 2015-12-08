'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const sinon = require('sinon');

const dataset = require('../lib/dataset');
const auth0Client = require('../lib/auth0_client');
const supplierStore = require('../lib/supplier_store');

describe('Supplier store', () => {
  const fakeCreatedTimestamp = 1448450346461;
  let sandbox;
  let saveStub;
  let createUserStub;
  let deleteUserStub;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    sandbox.useFakeTimers(fakeCreatedTimestamp);

    saveStub = sandbox.stub(dataset, 'save', (args, callback) => {
      if (args.data.email === 'fail_to_persist@bigwednesday.io') {
        return callback('Cannot save');
      }
      callback();
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
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('insert', () => {
    let created;

    const createParams = {email: 'test@bigwednesday.io', password: '12345'};
    const supplierKey = ['Supplier', 'supplier-a'];

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
      sinon.assert.calledOnce(saveStub);
      sinon.assert.calledWith(saveStub, sinon.match({key: supplierKey, method: 'insert', data: _.omit(createParams, 'password')}));
    });

    it('does not persist password', () => {
      sinon.assert.calledWith(saveStub, sinon.match(value => {
        return !value.data.hasOwnProperty('password');
      }));
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
});
