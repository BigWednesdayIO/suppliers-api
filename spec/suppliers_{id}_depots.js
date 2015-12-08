'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const expect = require('chai').expect;

const specRequest = require('./spec_request');
const depotParameters = require('./parameters/depot');

describe('/suppliers/{id}/depots', () => {
  describe('post', () => {
    const createPayload = depotParameters();
    let supplier;
    let createResponse;

    beforeEach(() => {
      return specRequest({url: '/suppliers', method: 'POST', payload: {name: 'Supplier 1', email: `${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'}})
        .then(response => {
          supplier = response.result;
          return specRequest({url: `/suppliers/${supplier.id}/depots`, method: 'POST', payload: createPayload});
        })
        .then(response => {
          createResponse = response;
        });
    });

    it('returns http 404 for a non existant supplier', () => {
      return specRequest({url: '/suppliers/123/depots', method: 'POST', payload: createPayload})
        .then(response => {
          expect(response.statusCode).to.equal(404);
          expect(response.result).to.have.property('message', 'Supplier "123" not found.');
        });
    });

    it('returns http 201 for a new depot', () => {
      expect(createResponse.statusCode).to.equal(201);
    });

    it('returns created resource location', () => {
      expect(createResponse.headers.location).to.equal(`/suppliers/${supplier.id}/depots/${createResponse.result.id}`);
    });

    it('returns created and updated dates', () => {
      expect(createResponse.result._metadata.created).to.be.a('date');
      expect(createResponse.result._metadata.updated).to.be.a('date');
    });

    it('returns the created resource', () => {
      expect(_.omit(createResponse.result, '_metadata', 'id')).to.deep.equal(createPayload);
    });

    describe('validation', () => {
      const requiredFields = ['name', 'delivery_countries', 'delivery_regions', 'delivery_counties', 'delivery_districts', 'delivery_places'];

      requiredFields.forEach(field => {
        it(`requires ${field}`, () => {
          const payload = _.omit(createPayload, field);

          return specRequest({url: '/suppliers/1/depots', method: 'POST', payload})
            .then(response => {
              expect(response.statusCode).to.equal(400);
              expect(response.result.message).to.equal(`child "${field}" fails because ["${field}" is required]`);
            });
        });
      });

      it('requires name to be a string', () => {
        const payload = _.omit(createPayload, 'name');
        payload.name = 123;

        return specRequest({url: '/suppliers/1/depots', method: 'POST', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "name" fails because ["name" must be a string]');
          });
      });

      const stringArrayFields = ['delivery_countries', 'delivery_regions', 'delivery_counties', 'delivery_districts', 'delivery_places'];

      stringArrayFields.forEach(field => {
        it(`requires ${field} to be an array`, () => {
          const payload = _.assign({}, createPayload, {[field]: 1});

          return specRequest({url: '/suppliers/1/depots', method: 'POST', payload})
            .then(response => {
              expect(response.statusCode).to.equal(400);
              expect(response.result.message).to.equal(`child "${field}" fails because ["${field}" must be an array]`);
            });
        });

        it(`requires ${field} items to be strings`, () => {
          const payload = _.assign({}, createPayload, {[field]: [1]});

          return specRequest({url: '/suppliers/1/depots', method: 'POST', payload})
            .then(response => {
              expect(response.statusCode).to.equal(400);
              expect(response.result.message).to.equal(`child "${field}" fails because ["${field}" at position 0 fails because ["0" must be a string]]`);
            });
        });
      });

      it('does not allow _metadata', () => {
        const payload = _.clone(createPayload);
        payload._metadata = {created: new Date()};

        return specRequest({url: '/suppliers/1/depots', method: 'POST', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('"_metadata" is not allowed');
          });
      });
    });
  });

  describe('get', () => {
    let supplier1;
    let supplier2;

    const depots = [
      _.assign(depotParameters(), {name: 'Depot 1'}),
      _.assign(depotParameters(), {name: 'Depot 2'}),
      _.assign(depotParameters(), {name: 'Depot 3'})
    ];

    let createdDepot1;
    let createdDepot2;
    let createdDepot3;
    let getResponse;

    beforeEach(() => {
      return specRequest({url: '/suppliers', method: 'POST', payload: {name: 'Supplier 1', email: `${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'}})
        .then(response => {
          supplier1 = response.result;
          return specRequest({url: '/suppliers', method: 'POST', payload: {name: 'Supplier 2', email: `${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'}});
        })
        .then(response => {
          supplier2 = response.result;
          return specRequest({url: `/suppliers/${supplier1.id}/depots`, method: 'POST', payload: depots[2]});
        })
        .then(response => {
          createdDepot3 = response.result;
          return specRequest({url: `/suppliers/${supplier1.id}/depots`, method: 'POST', payload: depots[0]});
        })
        .then(response => {
          createdDepot1 = response.result;
          return specRequest({url: `/suppliers/${supplier1.id}/depots`, method: 'POST', payload: depots[1]});
        })
        .then(response => {
          createdDepot2 = response.result;
          return specRequest({url: `/suppliers/${supplier2.id}/depots`, method: 'POST', payload: _.assign(depotParameters(), {name: 'Supplier 2 depot'})});
        })
        .then(() => specRequest({url: `/suppliers/${supplier1.id}/depots`, method: 'GET'}))
        .then(response => getResponse = response);
    });

    it('returns http 404 for a non existant supplier', () => {
      return specRequest({url: '/suppliers/123/depots', method: 'GET'})
        .then(response => {
          expect(response.statusCode).to.equal(404);
          expect(response.result).to.have.property('message', 'Supplier "123" not found.');
        });
    });

    it('returns the depots for the supplier', () => {
      expect(_.map(getResponse.result, 'id')).to.be.deep.equal([createdDepot3.id, createdDepot1.id, createdDepot2.id]);
    });

    it('returns the created and updated dates of the depots', () => {
      [createdDepot3, createdDepot1, createdDepot2].forEach((createdDepot, index) => {
        expect(getResponse.result[index]).to.have.property('_metadata');
        expect(getResponse.result[index]._metadata.created).to.deep.equal(createdDepot._metadata.created);
        expect(getResponse.result[index]._metadata.updated).to.deep.equal(createdDepot._metadata.updated);
      });
    });

    it('returns the depot resource attributes', () => {
      [createdDepot3, createdDepot1, createdDepot2].forEach((createdDepot, index) => {
        expect(_.omit(getResponse.result[index], 'id', '_metadata')).to.deep.equal(_.omit(createdDepot, 'id', '_metadata'));
      });
    });
  });

  describe('delete', () => {
    let supplier;
    let createdDepot;

    beforeEach(() => {
      return specRequest({url: '/suppliers', method: 'POST', payload: {name: 'Supplier', email: `${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'}})
        .then(response => {
          supplier = response.result;
          return specRequest({url: `/suppliers/${supplier.id}/depots`, method: 'POST', payload: depotParameters()});
        })
        .then(response => createdDepot = response.result);
    });

    it('returns http 404 when supplier does not exist', () => {
      return specRequest({url: '/suppliers/123/depots/1', method: 'DELETE'})
        .then(response => {
          expect(response.statusCode).to.equal(404);
          expect(response.result).to.have.property('message', 'Supplier "123" not found.');
        });
    });

    it('returns http 404 when depot does not exist', () => {
      return specRequest({url: `/suppliers/${supplier.id}/depots/2`, method: 'DELETE'})
        .then(response => expect(response.statusCode).to.equal(404));
    });

    it('returns http 204', () => {
      return specRequest({url: `/suppliers/${supplier.id}/depots/${createdDepot.id}`, method: 'DELETE'})
        .then(response => expect(response.statusCode).to.equal(204));
    });
  });
});
