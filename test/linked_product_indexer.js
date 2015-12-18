'use strict';

const events = require('events');
const nock = require('nock');

const expect = require('chai').expect;

const linkedProductModel = new events.EventEmitter();
const indexingApi = `http://${process.env.ORDERABLE_INDEXING_API_SVC_SERVICE_HOST}:${process.env.ORDERABLE_INDEXING_API_SVC_SERVICE_PORT}`;

require('../lib/linked_product_indexer')(linkedProductModel);

describe('Linked product indexer', () => {
  let indexingRequest;
  let indexingRequestBody;

  beforeEach(() => {
    indexingRequest = nock(indexingApi)
      .post('/indexing_jobs')
      .reply(200, (uri, body) => indexingRequestBody = JSON.parse(body));
  });

  afterEach(() => nock.cleanAll());

  const model = {id: 'lp1', price: 12, was_price: 21, product_id: 'p1'};
  const key = {path: ['Supplier', 's1', 'SupplierLinkedProduct', 'lp1']};

  ['inserted', 'updated', 'deleted'].forEach(e => {
    describe(`on ${e}`, () => {
      beforeEach(done => {
        if (e === 'deleted') {
          linkedProductModel.emit(e, key);
        } else {
          linkedProductModel.emit(e, model, key);
        }

        setImmediate(done);
      });

      it('makes an indexing request', () => {
        expect(indexingRequest.isDone()).to.equal(true, 'Expected indexing request not made');
      });

      it('sets trigger_type to "linked_product"', () => {
        expect(indexingRequestBody).to.have.property('trigger_type', 'linked_product');
      });

      let indexingAction;
      switch (e) {
        case 'inserted':
          indexingAction = 'add';
          break;
        case 'updated':
          indexingAction = 'update';
          break;
        case 'deleted':
          indexingAction = 'remove';
          break;
        default:
          throw new Error('Unsupported model event');
      }

      it(`sets action to "${indexingAction}"`, () => {
        expect(indexingRequestBody).to.have.property('action', indexingAction);
      });

      it('sets indexing data', () => {
        expect(indexingRequestBody).to.have.property('data');
      });

      it('includes model id in data', () => {
        expect(indexingRequestBody.data).to.have.property('id', model.id);
      });

      if (e !== 'deleted') {
        it('includes price in data', () => {
          expect(indexingRequestBody.data).to.have.property('price', model.price);
        });

        it('includes was_price in data', () => {
          expect(indexingRequestBody.data).to.have.property('was_price', model.was_price);
        });

        it('includes product_id in data', () => {
          expect(indexingRequestBody.data).to.have.property('product_id', model.product_id);
        });

        it('includes supplier_id in data', () => {
          expect(indexingRequestBody.data).to.have.property('supplier_id', 's1');
        });
      }
    });
  });
});
