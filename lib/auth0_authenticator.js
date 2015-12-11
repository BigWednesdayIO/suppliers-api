'use strict';

const request = require('request');
const jsonwebtoken = require('jsonwebtoken');

class AuthenticationFailedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationFailedError';
  }
}

class Authenticator {
  constructor(auth0Config) {
    this.config = auth0Config;
    this.authUrl = `https://${this.config.domain}/oauth/ro`;
  }

  authenticate(email, password) {
    const self = this;

    const args = Array.prototype.slice.call(arguments);
    let callback;
    let scope;

    switch (args.length) {
      case 3:
        callback = args[2];
        scope = 'openid';
        break;
      case 4:
        callback = args[3];
        scope = ['openid'].concat(args[2]).join(' ');
        break;
      default:
        throw new Error('Invalid number of arguments');
    }

    request.post(self.authUrl, {
      body: {
        client_id: self.config.clientId,
        username: email,
        password,
        connection: self.config.connection,
        grant_type: 'password',
        scope
      },
      headers: {'Content-Type': 'application/json'},
      json: true
    }, (err, response, body) => {
      if (err) {
        return callback(err);
      }

      if (response.statusCode !== 200) {
        return callback(new AuthenticationFailedError());
      }

      jsonwebtoken.verify(body.id_token, new Buffer(self.config.secret, 'base64'), (err, result) => {
        if (err) {
          return callback(err);
        }
        callback(null, {payload: result, encoded: body.id_token});
      });
    });
  }
}

module.exports = Authenticator;

