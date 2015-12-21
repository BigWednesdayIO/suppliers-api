'use strict';

const expect = require('chai').expect;
const nock = require('nock');

const mapper = require('../lib/linked_product_mapper');

const linkedProduct = {id: '1', product_id: '2'};
const linkedProduct2 = {id: '1', product_id: '2'};
const notFoundLinkedProduct = {id: '2', product_id: 'notfound'};
const testProduct = {id: '2', name: 'product name', price: 15.00};

describe('Linked product mapper', () => {
  beforeEach(() => {
    nock(
      `http://${process.env.PRODUCTS_API_SVC_SERVICE_HOST}:${process.env.PRODUCTS_API_SVC_SERVICE_PORT}`,
      {reqheaders: {authorization: `${process.env.BIGWEDNESDAY_JWT}`, host: () => true}})
      .get('/products?id[]=2')
      .reply(200, [testProduct])
      .get('/products?id[]=notfound')
      .reply(200, [])
      .get('/products?id[]=2&id[]=notfound')
      .reply(200, [testProduct])
      .get('/products?id[]=error')
      .reply(500, 'A product api error');
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('returns the linked product', () =>
    mapper.toModel(linkedProduct)
      .then(model => expect(model).to.deep.equal(linkedProduct)));

  it('does not include the expanded product by default', () =>
    mapper.toModel(linkedProduct)
      .then(model => expect(model).to.not.have.property('product')));

  it('includes the associated product when expanded', () =>
    mapper.toModel(linkedProduct, ['product'])
      .then(model => expect(model.product).to.deep.equal(testProduct)));

  it('does not include product_id when product is expanded', () =>
    mapper.toModel(linkedProduct, ['product'])
      .then(model => expect(model).to.not.have.property('product_id')));

  it('does not expand products that cannot be found', () =>
    mapper.toModel(notFoundLinkedProduct, ['product'])
      .then(model => {
        expect(model).to.have.property('product_id');
        expect(model).to.not.have.property('product');
      }));

  it('errors when non 200 response is returned from product api', () =>
    mapper.toModel({id: '3', product_id: 'error'}, ['product'])
      .then(() => {
        throw new Error('Expected error');
      }, err => {
        expect(err).to.be.an('error');
        expect(err).to.have.property('message', 'Products API error response [500]. A product api error');
      }));

  it('expands products for multiple linked products', () =>
    mapper.toModelArray([linkedProduct, linkedProduct2, notFoundLinkedProduct], ['product'])
      .then(models => {
        expect(models).to.have.length(3);

        expect(models[0]).to.have.property('product');
        expect(models[0]).to.not.have.property('product_id');
        expect(models[0].product).to.deep.equal(testProduct);

        expect(models[1]).to.have.property('product');
        expect(models[1]).to.not.have.property('product_id');
        expect(models[1].product).to.deep.equal(testProduct);

        expect(models[2]).to.not.have.property('product');
        expect(models[2]).to.have.property('product_id');
      }));

  it('does nothing for an empty set of linked products', () =>
    mapper.toModelArray([], ['product'])
      .then(models => {
        expect(models).to.be.an('array');
        expect(models).to.be.empty;
      }));
});
