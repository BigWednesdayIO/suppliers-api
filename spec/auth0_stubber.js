'use strict';

const auth0 = require('../lib/auth0_client');
const cuid = require('cuid');
const sinon = require('sinon');

class Stubber {
  enable() {
    this.sandbox = sinon.sandbox.create();

    this.sandbox.stub(auth0, 'createUser', (params, callback) => {
      callback(null, {user_id: `auth0|${cuid()}`, email: params.email});
    });
    this.sandbox.stub(auth0, 'deleteUser', (id, callback) => {
      callback();
    });
    this.sandbox.stub(auth0, 'updateUserEmail', (id, email, verify, callback) => {
      callback();
    });
  }

  disable() {
    this.sandbox.restore();
  }
}

module.exports = new Stubber();
