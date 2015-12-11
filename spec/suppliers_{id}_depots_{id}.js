'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const expect = require('chai').expect;

const specRequest = require('./spec_request');
const depotParameters = require('./parameters/depot');
const signJwt = require('./sign_jwt');

describe('/suppliers/{id}/depots/{id}', () => {
  describe('put', () => {
    let token;
    let updateResponse;
    let createResponse;
    let getUpdatedResponse;
    const updatePayload = _.assign(depotParameters(), {name: 'A new name'});

    beforeEach(() =>
      specRequest({url: '/suppliers', method: 'POST', payload: {name: 'Supplier', email: `${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'}})
        .then(response => {
          token = signJwt({scope: [`supplier:${response.result.id}`]});
          return specRequest({url: `${response.headers.location}/depots`, method: 'POST', payload: depotParameters(), headers: {authorization: token}});
        })
        .then(response => {
          createResponse = response;
          return specRequest({url: response.headers.location, method: 'PUT', payload: updatePayload, headers: {authorization: token}});
        })
        .then(response => updateResponse = response)
        .then(() => specRequest({url: createResponse.headers.location, method: 'GET', headers: {authorization: token}}))
        .then(response => getUpdatedResponse = response));

    it('returns http 404 when supplier does not exist', () => {
      return specRequest({url: '/suppliers/123/depots/1', method: 'PUT', payload: depotParameters(), headers: {authorization: signJwt({scope: ['supplier:123']})}})
        .then(response => {
          expect(response.statusCode).to.equal(404);
          expect(response.result).to.have.property('message', 'Supplier "123" not found.');
        });
    });

    it('returns http 403 when updating depot without correct scope', () => {
      return specRequest({url: '/suppliers/123/depots/1', method: 'PUT', payload: depotParameters(), headers: {authorization: signJwt({scope: ['supplier:555']})}})
        .then(response => {
          expect(response.statusCode).to.equal(403);
          expect(response.result.message).match(/Insufficient scope/);
        });
    });

    it('returns http 200', () => {
      expect(updateResponse.statusCode).to.equal(200);
    });

    it('returns the id', () => {
      expect(updateResponse.result.id).to.equal(createResponse.result.id);
    });

    it('returns created date', () => {
      expect(updateResponse.result._metadata.created).to.deep.equal(createResponse.result._metadata.created);
    });

    it('progresses the updated date', () => {
      expect(updateResponse.result._metadata.updated).to.be.a('date');
      expect(updateResponse.result._metadata.updated.toISOString()).to.be.above(createResponse.result._metadata.updated.toISOString());
    });

    it('returns the updated depot resource', () => {
      expect(_.omit(updateResponse.result, '_metadata', 'id')).to.deep.equal(updatePayload);
    });

    it('persists the update', () => {
      expect(getUpdatedResponse.result).to.deep.equal(updateResponse.result);
    });

    describe('validation', () => {
      const token = signJwt({scope: ['supplier:1']});
      it('rejects id', () => {
        const payload = _.assign({id: '1'}, depotParameters());

        return specRequest({url: '/suppliers/1/depots/1', method: 'PUT', payload, headers: {authorization: token}})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('"id" is not allowed');
          });
      });

      const requiredFields = ['name', 'delivery_countries', 'delivery_regions', 'delivery_counties', 'delivery_districts', 'delivery_places'];

      requiredFields.forEach(field => {
        it(`requires ${field}`, () => {
          const payload = _.omit(depotParameters(), field);

          return specRequest({url: '/suppliers/1/depots/1', method: 'PUT', payload, headers: {authorization: token}})
            .then(response => {
              expect(response.statusCode).to.equal(400);
              expect(response.result.message).to.equal(`child "${field}" fails because ["${field}" is required]`);
            });
        });
      });

      it('requires name to be a string', () => {
        const payload = _.omit(depotParameters(), 'name');
        payload.name = 123;

        return specRequest({url: '/suppliers/1/depots/1', method: 'PUT', payload, headers: {authorization: token}})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "name" fails because ["name" must be a string]');
          });
      });

      const stringArrayFields = ['delivery_countries', 'delivery_regions', 'delivery_counties', 'delivery_districts', 'delivery_places'];

      stringArrayFields.forEach(field => {
        it(`requires ${field} to be an array`, () => {
          const payload = _.assign({}, depotParameters(), {[field]: 1});

          return specRequest({url: '/suppliers/1/depots/1', method: 'PUT', payload, headers: {authorization: token}})
            .then(response => {
              expect(response.statusCode).to.equal(400);
              expect(response.result.message).to.equal(`child "${field}" fails because ["${field}" must be an array]`);
            });
        });

        it(`requires ${field} items to be strings`, () => {
          const payload = _.assign({}, depotParameters(), {[field]: [1]});

          return specRequest({url: '/suppliers/1/depots/1', method: 'PUT', payload, headers: {authorization: token}})
            .then(response => {
              expect(response.statusCode).to.equal(400);
              expect(response.result.message).to.equal(`child "${field}" fails because ["${field}" at position 0 fails because ["0" must be a string]]`);
            });
        });
      });

      it('does not allow _metadata', () => {
        const payload = _.assign({_metadata: {created: new Date()}}, depotParameters());

        return specRequest({url: '/suppliers/1/depots/1', method: 'PUT', payload, headers: {authorization: token}})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('"_metadata" is not allowed');
          });
      });
    });
  });

  describe('get', () => {
    let supplier;
    let token;
    let getResponse;
    let createResponse;
    const depot = depotParameters();

    beforeEach(() =>
      specRequest({url: '/suppliers', method: 'POST', payload: {name: 'Supplier', email: `${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'}})
        .then(response => {
          supplier = response.result;
          token = signJwt({scope: [`supplier:${response.result.id}`]});
          return specRequest({url: `${response.headers.location}/depots`, method: 'POST', payload: depot, headers: {authorization: token}});
        })
        .then(response => {
          createResponse = response;
          return specRequest({url: response.headers.location, method: 'GET', headers: {authorization: token}});
        })
        .then(response => getResponse = response));

    it('returns http 404 when supplier does not exist', () => {
      return specRequest({url: '/suppliers/123/depots/1', method: 'GET', headers: {authorization: signJwt({scope: ['supplier:123']})}})
        .then(response => {
          expect(response.statusCode).to.equal(404);
          expect(response.result).to.have.property('message', 'Supplier "123" not found.');
        });
    });

    it('returns http 404 when depot does not exist', () => {
      return specRequest({url: `/suppliers/${supplier.id}/depots/2`, method: 'GET', headers: {authorization: token}})
        .then(response => {
          expect(response.statusCode).to.equal(404);
        });
    });

    it('returns http 403 when requesting depot without correct scope', () => {
      return specRequest({url: `/suppliers/${supplier.id}/depots/2`, method: 'GET', headers: {authorization: signJwt({scope: ['supplier:555']})}})
        .then(response => {
          expect(response.statusCode).to.equal(403);
          expect(response.result.message).match(/Insufficient scope/);
        });
    });

    it('returns http 200', () => {
      expect(getResponse.statusCode).to.equal(200);
    });

    it('returns the depot id', () => {
      expect(getResponse.result.id).to.equal(createResponse.result.id);
    });

    it('returns created and updated dates', () => {
      expect(getResponse.result._metadata.created).to.deep.equal(createResponse.result._metadata.created);
      expect(getResponse.result._metadata.updated).to.deep.equal(createResponse.result._metadata.updated);
    });

    it('returns the resource', () => {
      expect(_.omit(getResponse.result, '_metadata', 'id')).to.deep.equal(depotParameters());
    });
  });

  describe('delete', () => {
    let supplier;
    let token;
    let createResponse;

    beforeEach(() => {
      return specRequest({url: '/suppliers', method: 'POST', payload: {name: 'Supplier', email: `${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'}})
        .then(response => {
          supplier = response.result;
          token = signJwt({scope: [`supplier:${response.result.id}`]});
          return specRequest({url: `/suppliers/${supplier.id}/depots`, method: 'POST', payload: depotParameters(), headers: {authorization: token}});
        })
        .then(response => createResponse = response);
    });

    it('returns http 404 when supplier does not exist', () => {
      return specRequest({url: '/suppliers/123/depots/1', method: 'DELETE', headers: {authorization: signJwt({scope: ['supplier:123']})}})
        .then(response => {
          expect(response.statusCode).to.equal(404);
          expect(response.result).to.have.property('message', 'Supplier "123" not found.');
        });
    });

    it('returns http 403 when deleting depot without correct scope', () => {
      return specRequest({url: '/suppliers/123/depots/1', method: 'DELETE', headers: {authorization: signJwt({scope: ['supplier:555']})}})
        .then(response => {
          expect(response.statusCode).to.equal(403);
          expect(response.result.message).match(/Insufficient scope/);
        });
    });

    it('returns http 404 when depot does not exist', () => {
      return specRequest({url: `/suppliers/${supplier.id}/depots/2`, method: 'DELETE', headers: {authorization: token}})
        .then(response => expect(response.statusCode).to.equal(404));
    });

    it('returns http 204', () => {
      return specRequest({url: createResponse.headers.location, method: 'DELETE', headers: {authorization: token}})
        .then(response => expect(response.statusCode).to.equal(204));
    });
  });
});
