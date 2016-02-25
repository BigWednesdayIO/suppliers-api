'use strict';

const _ = require('lodash');
const bluebird = require('bluebird');
const cuid = require('cuid');
const expect = require('chai').expect;
const specRequest = require('./spec_request');
const auth0Stubber = require('./auth0_stubber');
const signJwt = require('./sign_jwt');

const linkedProductParameters = require('./parameters/linked_product');

describe('/suppliers', function () {
  this.timeout(5000);

  let createSupplierPayload;

  describe('post', () => {
    let createResponse;

    beforeEach(() => {
      auth0Stubber.disable();
      createSupplierPayload = {
        name: 'A Supplier',
        email: `${cuid()}@bigwednesday.io`,
        about: 'Lorem ipsum dolor sit amet...',
        password: '8u{F0*W1l5',
        facebook: 'coventgarden.supply',
        twitter: '@garden_covent',
        website: 'http://www.coventgardensupply.co.uk/',
        initials: 'As',
        colour: '#F44336',
        banner_image: 'http://lorempixel.com/1000/200/food/10/',
        logo: 'http://placehold.it/80x80?text=A Supplier',
        has_memberships: true,
        purchase_restrictions: 'none',
        delivery_charge: 0,
        delivery_lead_time: 1
      };

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

      it('requires about to be a string', () => {
        const payload = _.omit(createSupplierPayload, 'about');
        payload.about = 123;

        return specRequest({url: '/suppliers', method: 'POST', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "about" fails because ["about" must be a string]');
          });
      });

      it('requires facebook to be a string', () => {
        const payload = _.omit(createSupplierPayload, 'facebook');
        payload.facebook = 123;

        return specRequest({url: '/suppliers', method: 'POST', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "facebook" fails because ["facebook" must be a string]');
          });
      });

      it('requires twitter to be a string', () => {
        const payload = _.omit(createSupplierPayload, 'twitter');
        payload.twitter = 123;

        return specRequest({url: '/suppliers', method: 'POST', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "twitter" fails because ["twitter" must be a string]');
          });
      });

      it('requires website to be a string', () => {
        const payload = _.omit(createSupplierPayload, 'website');
        payload.website = 123;

        return specRequest({url: '/suppliers', method: 'POST', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "website" fails because ["website" must be a string]');
          });
      });

      it('requires initials to be a string', () => {
        const payload = _.omit(createSupplierPayload, 'initials');
        payload.initials = 123;

        return specRequest({url: '/suppliers', method: 'POST', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "initials" fails because ["initials" must be a string]');
          });
      });

      it('requires colour to be a string', () => {
        const payload = _.omit(createSupplierPayload, 'colour');
        payload.colour = 123;

        return specRequest({url: '/suppliers', method: 'POST', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "colour" fails because ["colour" must be a string]');
          });
      });

      it('requires banner_image to be a string', () => {
        const payload = _.omit(createSupplierPayload, 'banner_image');
        payload.banner_image = 123;

        return specRequest({url: '/suppliers', method: 'POST', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "banner_image" fails because ["banner_image" must be a string]');
          });
      });

      it('requires logo to be a string', () => {
        const payload = _.omit(createSupplierPayload, 'logo');
        payload.logo = 123;

        return specRequest({url: '/suppliers', method: 'POST', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "logo" fails because ["logo" must be a string]');
          });
      });

      it('requires has_memberships to be a boolean', () => {
        const payload = _.omit(createSupplierPayload, 'has_memberships');
        payload.has_memberships = 123;

        return specRequest({url: '/suppliers', method: 'POST', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "has_memberships" fails because ["has_memberships" must be a boolean]');
          });
      });

      it('requires purchase_restrictions to be a string', () => {
        const payload = _.omit(createSupplierPayload, 'purchase_restrictions');
        payload.purchase_restrictions = 123;

        return specRequest({url: '/suppliers', method: 'POST', payload})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "purchase_restrictions" fails because ["purchase_restrictions" must be a string]');
          });
      });

      describe('delivery charge', () => {
        it('requires a number', () => {
          const payload = _.omit(createSupplierPayload, 'delivery_charge');
          payload.delivery_charge = '£3.99';

          return specRequest({url: '/suppliers', method: 'POST', payload})
            .then(response => {
              expect(response.statusCode).to.equal(400);
              expect(response.result.message).to.equal('child "delivery_charge" fails because ["delivery_charge" must be a number]');
            });
        });

        it('is zero or more', () => {
          const payload = _.omit(createSupplierPayload, 'delivery_charge');
          payload.delivery_charge = -3.99;

          return specRequest({url: '/suppliers', method: 'POST', payload})
            .then(response => {
              expect(response.statusCode).to.equal(400);
              expect(response.result.message).to.equal('child "delivery_charge" fails because ["delivery_charge" must be larger than or equal to 0]');
            });
        });
      });

      describe('delivery lead time', () => {
        it('requires a number', () => {
          const payload = _.omit(createSupplierPayload, 'delivery_lead_time');
          payload.delivery_lead_time = 'one day';

          return specRequest({url: '/suppliers', method: 'POST', payload})
            .then(response => {
              expect(response.statusCode).to.equal(400);
              expect(response.result.message).to.equal('child "delivery_lead_time" fails because ["delivery_lead_time" must be a number]');
            });
        });

        it('requires an integer', () => {
          const payload = _.omit(createSupplierPayload, 'delivery_lead_time');
          payload.delivery_lead_time = 2.5;

          return specRequest({url: '/suppliers', method: 'POST', payload})
            .then(response => {
              expect(response.statusCode).to.equal(400);
              expect(response.result.message).to.equal('child "delivery_lead_time" fails because ["delivery_lead_time" must be an integer]');
            });
        });

        it('requires a value of at least 1', () => {
          const payload = _.omit(createSupplierPayload, 'delivery_lead_time');
          payload.delivery_lead_time = 0;

          return specRequest({url: '/suppliers', method: 'POST', payload})
            .then(response => {
              expect(response.statusCode).to.equal(400);
              expect(response.result.message).to.equal('child "delivery_lead_time" fails because ["delivery_lead_time" must be larger than or equal to 1]');
            });
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
    let tokens;

    beforeEach(() => {
      return bluebird.mapSeries([1, 0, 2], i => specRequest({url: '/suppliers', method: 'POST', payload: suppliers[i]}))
        .then(responses => {
          createdSuppliers = responses.map(r => r.result);
          tokens = createdSuppliers.reduce((accum, s) => {
            accum[s.id] = signJwt({scope: [`supplier:${s.id}`]});
            return accum;
          }, {});
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
        return specRequest({
          url: `/suppliers/${createdSuppliers[1].id}/depots`,
          method: 'POST',
          headers: {authorization: tokens[createdSuppliers[1].id]},
          payload: {name: 'depot 1', delivery_countries: [], delivery_regions: [], delivery_counties: [], delivery_districts: ['Southwark'], delivery_places: []}})
        .then(() => specRequest({
          url: `/suppliers/${createdSuppliers[0].id}/depots`,
          method: 'POST',
          headers: {authorization: tokens[createdSuppliers[0].id]},
          payload: {name: 'depot 1', delivery_countries: ['England'], delivery_regions: [], delivery_counties: [], delivery_districts: [], delivery_places: []}}));
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

    describe('who supply product', () => {
      let linkedProductIds;

      beforeEach(() => {
        linkedProductIds = [];

        return specRequest({
          url: `/suppliers/${createdSuppliers[0].id}/linked_products`,
          method: 'POST',
          headers: {authorization: tokens[createdSuppliers[0].id]},
          payload: linkedProductParameters
        })
        .then(response => {
          linkedProductIds.push(response.result.id);
          return specRequest({
            url: `/suppliers/${createdSuppliers[1].id}/linked_products`,
            method: 'POST',
            headers: {authorization: tokens[createdSuppliers[1].id]},
            payload: linkedProductParameters
          });
        })
        .then(response => {
          linkedProductIds.push(response.result.id);
          return specRequest({
            url: `/suppliers/${createdSuppliers[1].id}/linked_products`,
            method: 'POST',
            headers: {authorization: tokens[createdSuppliers[1].id]},
            payload: _.assign({}, linkedProductParameters, {product_id: 'abc'})
          });
        })
        .then(response => linkedProductIds.push(response.result.id));
      });

      it('filters out suppliers that do not supply the product', () => {
        return Promise.all([
          specRequest({url: '/suppliers?supplies_product=abc', method: 'GET'}),
          specRequest({url: '/suppliers?supplies_product=1', method: 'GET'})
        ])
        .then(_.spread((sellingAbc, selling1) => {
          const omitMetadata = r => _.omit(r, '_metadata');
          expect(sellingAbc.result.map(omitMetadata)).to.deep.equal([createdSuppliers[1]].map(omitMetadata));
          expect(selling1.result.map(omitMetadata)).to.deep.equal([createdSuppliers[0], createdSuppliers[1]].map(omitMetadata));
        }));
      });

      it('returns the id of the linked product as metadata', () => {
        return Promise.all([
          specRequest({url: '/suppliers?supplies_product=abc', method: 'GET'}),
          specRequest({url: '/suppliers?supplies_product=1', method: 'GET'})
        ])
        .then(_.spread((sellingAbc, selling1) => {
          expect(sellingAbc.result[0]._metadata).to.have.property('linked_product_id', linkedProductIds[2]);
          expect(selling1.result[0]._metadata).to.have.property('linked_product_id', linkedProductIds[0]);
          expect(selling1.result[1]._metadata).to.have.property('linked_product_id', linkedProductIds[1]);
        }));
      });
    });

    it('returns http 400 when deliver_to and supplies_product are used together', () => {
      return specRequest({url: '/suppliers?deliver_to=ec2y9ar&supplies_product=1'})
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result).to.have.property('message', '"deliver_to" must not exist simultaneously with [supplies_product]');
        });
    });
  });
});
