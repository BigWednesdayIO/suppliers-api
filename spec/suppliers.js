'use strict';

const _ = require('lodash');
const bluebird = require('bluebird');
const cuid = require('cuid');
const expect = require('chai').expect;
const specRequest = require('./spec_request');

describe('/suppliers', () => {
  const createSupplierPayload = {
    name: 'A Supplier',
    email: `${cuid()}@bigwednesday.io`,
    password: '8u{F0*W1l5'
  };

  describe('post', () => {
    let createResponse;

    beforeEach(() => {
      return specRequest({url: '/suppliers', method: 'POST', payload: createSupplierPayload})
        .then(response => {
          createResponse = response;
        });
    });

    it('returns http 201', () => {
      expect(createResponse.statusCode).to.equal(201);
    });

    it('returns a generated supplier id', () => {
      expect(createResponse.result).to.have.property('id');
      expect(createResponse.result.id).to.match(/^c.{24}$/);
    });

    it('returns the supplier resource', () => {
      expect(_.omit(createResponse.result, '_metadata', 'id')).to.deep.equal(_.omit(createSupplierPayload, 'password'));
    });

    it('returns created resource location', () => {
      expect(createResponse.headers.location).to.equal(`/suppliers/${createResponse.result.id}`);
    });

    describe('validation', () => {
      it('requires email', () => {
        const payload = _.omit(createSupplierPayload, 'email');

        return specRequest({url: '/suppliers', method: 'POST', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "email" fails because ["email" is required]');
          });
      });

      it('requires correct email format', () => {
        const payload = _.clone(createSupplierPayload);
        payload.email = 'bigwednesday.io';

        return specRequest({url: '/suppliers', method: 'POST', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "email" fails because ["email" must be a valid email]');
          });
      });

      it('requires password', () => {
        const payload = _.omit(createSupplierPayload, 'password');

        return specRequest({url: '/suppliers', method: 'POST', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "password" fails because ["password" is required]');
          });
      });

      it('requires name', () => {
        const payload = _.omit(createSupplierPayload, 'name');

        return specRequest({url: '/suppliers', method: 'POST', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "name" fails because ["name" is required]');
          });
      });

      it('requires name to be a string', () => {
        const payload = _.omit(createSupplierPayload, 'name');
        payload.name = 123;

        return specRequest({url: '/suppliers', method: 'POST', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "name" fails because ["name" must be a string]');
          });
      });

      it('does not allow _metadata', () => {
        const payload = _.clone(createSupplierPayload);
        payload._metadata = {created: new Date()};

        return specRequest({url: '/suppliers', method: 'POST', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('"_metadata" is not allowed');
          });
      });
    });
  });

  describe('get', () => {
    const suppliers = [
      {name: 'Supplier A', email: `${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'},
      {name: 'Supplier B', email: `${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'},
      {name: 'Supplier C', email: `${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'}
    ];
    let createdSuppliers;

    beforeEach(() => {
      return bluebird.mapSeries([1, 0, 2], i => specRequest({url: '/suppliers', method: 'POST', payload: suppliers[i]}))
        .then(responses => {
          createdSuppliers = responses.map(r => r.result);
        });
    });

    it('returns all suppliers', () => {
      return specRequest({url: '/suppliers', method: 'GET'})
        .then(response => {
          expect(response.statusCode).to.equal(200);
          expect(response.result).to.eql(createdSuppliers);
        });
    });

    describe('with delivery to postcode', () => {
      beforeEach(() => {
        return specRequest({url: `/suppliers/${_.find(createdSuppliers, {name: 'Supplier A'}).id}/depots`, method: 'POST', payload: {name: 'depot 1', delivery_countries: [], delivery_regions: [], delivery_counties: [], delivery_districts: ['Southwark'], delivery_places: []}})
          .then(() => specRequest({url: `/suppliers/${_.find(createdSuppliers, {name: 'Supplier B'}).id}/depots`, method: 'POST', payload: {name: 'depot 1', delivery_countries: ['England'], delivery_regions: [], delivery_counties: [], delivery_districts: [], delivery_places: []}}));
      });

      it('filters out suppliers that do not deliver to the postcode', () => {
        return Promise.all([
          specRequest({url: '/suppliers?deliver_to=ec2y9ar', method: 'GET'}),
          specRequest({url: '/suppliers?deliver_to=se228ly', method: 'GET'})
        ])
        .then(responses => {
          const result1 = responses[0].result.map(supplier => _.omit(supplier, '_metadata', 'id'));
          expect(result1).to.deep.equal([_.omit(suppliers[1], 'password')]);

          const result2 = responses[1].result.map(supplier => _.omit(supplier, '_metadata', 'id'));
          expect(result2).to.deep.equal([_.omit(suppliers[1], 'password'), _.omit(suppliers[0], 'password')]);
        });
      });

      it('returns http 400 when not a valid postcode format', () => {
        const invalidPostcodes = ['111', 'fooEC29ARbar'];

        return Promise.all(invalidPostcodes.map(postcode => specRequest({url: `/suppliers?deliver_to=${postcode}`, method: 'get'})))
        .then(responses => {
          responses.forEach(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.match(/^child "deliver_to" fails because \["deliver_to" with value ".*" fails to match the postcode pattern\]$/);
          });
        });
      });

      it('returns http 400 when the postcode is not a real postcode', () => {
        return specRequest({url: '/suppliers?deliver_to=ab113de', method: 'get'})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "deliver_to" fails because ["deliver_to" with value "ab113de" is not a known postcode]');
          });
      });
    });
  });
});
