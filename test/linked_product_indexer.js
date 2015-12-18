'use strict';

const events = require('events');
const nock = require('nock');
const sinon = require('sinon');

const expect = require('chai').expect;

const linkedProductModel = new events.EventEmitter();
const indexingApi = `http://${process.env.ORDERABLE_INDEXING_API_SVC_SERVICE_HOST}:${process.env.ORDERABLE_INDEXING_API_SVC_SERVICE_PORT}`;

require('../lib/linked_product_indexer')(linkedProductModel);

describe.only('Linked product indexer', () => {
  let indexingRequest;
  let indexingRequestBody;
  let consoleErrorSpy;

  beforeEach(() => {
    indexingRequest = nock(indexingApi)
      .post('/indexing_jobs')
      .reply(202, (uri, body) => indexingRequestBody = JSON.parse(body));

    consoleErrorSpy = sinon.spy(console, 'error');
  });

  afterEach(() => {
    nock.cleanAll();
    consoleErrorSpy.restore();
  });

  const model = {id: 'lp1', price: 12, was_price: 21, product_id: 'p1'};
  const key = {path: ['Supplier', 's1', 'SupplierLinkedProduct', 'lp1']};

  ['inserted', 'updated', 'deleted'].forEach(e => {
    describe(`on ${e}`, () => {
      const emitEvent = () => {
        if (e === 'deleted') {
          linkedProductModel.emit(e, key);
        } else {
          linkedProductModel.emit(e, model, key);
        }
      };

      beforeEach(done => {
        emitEvent();
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

      it('logs errors making indexing request to console.error', done => {
        nock(indexingApi)
          .post('/indexing_jobs')
          .replyWithError('A non-HTTP error');

        emitEvent();
        setTimeout(() => {
          sinon.assert.calledOnce(consoleErrorSpy);
          expect(consoleErrorSpy.lastCall.args[0]).to.equal('Failed to make indexing request for linked product - A non-HTTP error');
          done();
        }, 500);
      });

      it('logs non-202 responses to console.error', done => {
        nock(indexingApi)
          .post('/indexing_jobs')
          .reply(500, {message: 'Internal Server Error'});

        emitEvent();
        setTimeout(() => {
          sinon.assert.calledOnce(consoleErrorSpy);
          expect(consoleErrorSpy.lastCall.args[0]).to.equal('Unexpected HTTP response 500 for linked product indexing request - {"message":"Internal Server Error"}');
          done();
        }, 500);
      });
    });
  });
});
