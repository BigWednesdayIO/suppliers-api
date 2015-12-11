'use strict';

const nock = require('nock');
const expect = require('chai').expect;
const jsonwebtoken = require('jsonwebtoken');
const Authenticator = require('../lib/auth0_authenticator');

const testSecret = 'test-secret';
const testDomain = 'test-domain';
const testClient = 'test-client';
const testConnection = 'test-connection';

const testEmail = 'test@email.com';
const testPassword = 'password';

const sign = body => jsonwebtoken.sign(body, new Buffer(testSecret, 'base64'));

const mockAuth0 = options => {
  return nock(`https://${testDomain}`)
    .post('/oauth/ro', {
      client_id: testClient,
      username: testEmail,
      password: testPassword,
      connection: testConnection,
      grant_type: 'password',
      scope: options.scope || 'openid'
    })
    .reply(options.responseCode || 200, options.response || {id_token: sign({})});
};

describe('Auth0 authenticator', () => {
  let authenticator;

  beforeEach(() => {
    authenticator = new Authenticator({
      domain: testDomain,
      secret: testSecret,
      clientId: testClient,
      connection: testConnection
    });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('authenticates with Auth0', done => {
    const httpInterceptor = mockAuth0({scope: 'openid'});
    authenticator.authenticate(testEmail, testPassword, err => {
      expect(err).not.to.be.ok;

      expect(httpInterceptor.isDone()).to.equal(true);
      done();
    });
  });

  it('returns decoded jwt', done => {
    mockAuth0({scope: 'openid'});
    authenticator.authenticate(testEmail, testPassword, (err, result) => {
      console.log(result);
      expect(err).not.to.be.ok;
      expect(result.payload).to.have.keys('iat');
      done();
    });
  });

  it('includes encoded jwt', done => {
    mockAuth0({scope: 'openid'});
    authenticator.authenticate(testEmail, testPassword, (err, result) => {
      expect(err).not.to.be.ok;
      expect(sign(result.payload)).to.eql(result.encoded);
      done();
    });
  });

  it('allows additional scopes', done => {
    const tokenResponse = {email: testEmail, foo: 'bar'};
    mockAuth0({scope: 'openid email foo', response: {id_token: sign(tokenResponse)}});

    authenticator.authenticate(testEmail, testPassword, ['email', 'foo'], (err, result) => {
      expect(err).not.to.be.ok;
      expect(result.payload).to.have.keys(['iat', 'email', 'foo']);
      expect(result.payload.email).to.equal(testEmail);
      expect(result.payload.foo).to.equal('bar');
      done();
    });
  });

  it('errors on invalid password', done => {
    const invalidResponse = {
      error: 'invalid_user_password',
      error_description: 'Wrong email or password.'
    };
    mockAuth0({responseCode: 401, response: invalidResponse});

    authenticator.authenticate(testEmail, testPassword, err => {
      expect(err.name).to.equal('AuthenticationFailedError');
      expect(err instanceof Error).to.equal(true);
      done();
    });
  });

  it('errors on blocked user', done => {
    const blockedResponse = {
      error: 'unauthorized',
      error_description: 'user is blocked'
    };
    mockAuth0({responseCode: 500, response: blockedResponse});

    authenticator.authenticate(testEmail, testPassword, err => {
      expect(err.name).to.equal('AuthenticationFailedError');
      expect(err instanceof Error).to.equal(true);
      done();
    });
  });
});
