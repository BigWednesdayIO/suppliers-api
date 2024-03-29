'use strict';

const expect = require('chai').expect;

const datasetEntities = require('../lib/dataset_entities');

describe('Dataset entities', () => {
  describe('supplier key', () => {
    let key;

    before(() => {
      key = datasetEntities.supplierKey('myid123');
    });

    it('creates a key containing the supplier kind', () => {
      expect(key.path.indexOf('Supplier')).to.equal(0, 'Expected first part of key to be Supplier');
    });

    it('creates a key containing the supplier id', () => {
      expect(key.path.indexOf('myid123')).to.equal(1, 'Expected second part of key to be the supplier id');
    });

    it('errors when supplier id is not provided', () => {
      expect(() => datasetEntities.supplierKey()).to.throw(Error, /Missing supplier identifier/);
    });
  });

  describe('depot key', () => {
    let key;

    before(() => {
      key = datasetEntities.depotKey('supplierid123', 'depotidabc');
    });

    it('creates a key containing the supplier kind', () => {
      expect(key.path.indexOf('Supplier')).to.equal(0, 'Expected first part of key to be Supplier');
    });

    it('creates a key containing the supplier id', () => {
      expect(key.path.indexOf('supplierid123')).to.equal(1, 'Expected second part of key to be the supplier id');
    });

    it('creates a key containing the depot kind', () => {
      expect(key.path.indexOf('Depot')).to.equal(2, 'Expected third part of key to be Depot');
    });

    it('creates a key containing the depot id', () => {
      expect(key.path.indexOf('depotidabc')).to.equal(3, 'Expected fourth part of key to be the depot id');
    });

    it('errors when supplier id is not provided', () => {
      expect(() => datasetEntities.depotKey()).to.throw(Error, /Missing supplier identifier/);
    });

    it('errors when depot id is not provided', () => {
      expect(() => datasetEntities.depotKey('supplierid')).to.throw(Error, /Missing depot identifier/);
    });
  });

  describe('linked product key', () => {
    let key;

    before(() => {
      key = datasetEntities.linkedProductKey('supplierid123', 'linkedproduct999');
    });

    it('creates a key containing the supplier kind', () => {
      expect(key.path.indexOf('Supplier')).to.equal(0, 'Expected first part of key to be Supplier');
    });

    it('creates a key containing the supplier id', () => {
      expect(key.path.indexOf('supplierid123')).to.equal(1, 'Expected second part of key to be the supplier id');
    });

    it('creates a key containing the linked product kind', () => {
      expect(key.path.indexOf('SupplierLinkedProduct')).to.equal(2, 'Expected third part of key to be SupplierLinkedProduct');
    });

    it('creates a key containing the linked product id', () => {
      expect(key.path.indexOf('linkedproduct999')).to.equal(3, 'Expected fourth part of key to be the linked product id');
    });

    it('errors when supplier id is not provided', () => {
      expect(() => datasetEntities.linkedProductKey()).to.throw(Error, /Missing supplier identifier/);
    });

    it('errors when linked product id is not provided', () => {
      expect(() => datasetEntities.linkedProductKey('supplierid')).to.throw(Error, /Missing linked product identifier/);
    });
  });

  describe('price adjustment key', () => {
    let key;

    before(() => {
      key = datasetEntities.priceAdjustmentKey('supplier123', 'linkedproduct999', 'priceadjustmentabc');
    });

    it('creates a key containing the supplier kind', () => {
      expect(key.path.indexOf('Supplier')).to.equal(0, 'Expected first part of key to be Supplier');
    });

    it('creates a key containing the supplier id', () => {
      expect(key.path.indexOf('supplier123')).to.equal(1, 'Expected second part of key to be the supplier id');
    });

    it('creates a key containing the linked product kind', () => {
      expect(key.path.indexOf('SupplierLinkedProduct')).to.equal(2, 'Expected third part of key to be SupplierLinkedProduct');
    });

    it('creates a key containing the linked product id', () => {
      expect(key.path.indexOf('linkedproduct999')).to.equal(3, 'Expected fourth part of key to be the linked product id');
    });

    it('creates a key containing the price adjustment kind', () => {
      expect(key.path.indexOf('SupplierProductPriceAdjustment')).to.equal(4, 'Expected fourth part of key to be SupplierProductPriceAdjustment');
    });

    it('creates a key containing the price adjustment id', () => {
      expect(key.path.indexOf('priceadjustmentabc')).to.equal(5, 'Expected fourth part of key to be the price adjustment id');
    });

    it('errors when supplier id is not provided', () => {
      expect(() => datasetEntities.priceAdjustmentKey()).to.throw(Error, /Missing supplier identifier/);
    });

    it('errors when linked product id is not provided', () => {
      expect(() => datasetEntities.priceAdjustmentKey('supplierid')).to.throw(Error, /Missing linked product identifier/);
    });

    it('errors when price adjustment id is not provided', () => {
      expect(() => datasetEntities.priceAdjustmentKey('supplierid', 'linkedproductid')).to.throw(Error, /Missing price adjustment identifier/);
    });
  });

  ['Supplier', 'Depot'].forEach(kind => {
    const fn = `${kind.substr(0, 1).toLowerCase() + kind.substr(1)}Query`;

    it(`${fn} generates a query for the ${kind} kind`, () => {
      expect(datasetEntities[fn]().kinds).to.deep.equal([kind]);
    });

    it(`${fn} sets a default order on created date`, () => {
      expect(datasetEntities[fn]().orders).to.deep.equal([{name: '_metadata_created', sign: '+'}]);
    });
  });

  it('linkedProductQuery generates a query for the SupplierLinkedProduct kind', () => {
    expect(datasetEntities.linkedProductQuery().kinds).to.deep.equal(['SupplierLinkedProduct']);
  });

  it('linkedProductQuery sets a default order on created date', () => {
    expect(datasetEntities.linkedProductQuery().orders).to.deep.equal([{name: '_metadata_created', sign: '+'}]);
  });

  it('priceAdjustmentQuery generates a query for the SupplierProductPriceAdjustment kind', () => {
    expect(datasetEntities.priceAdjustmentQuery().kinds).to.deep.equal(['SupplierProductPriceAdjustment']);
  });

  it('priceAdjustmentQuery sets a default order on created date', () => {
    expect(datasetEntities.priceAdjustmentQuery().orders).to.deep.equal([{name: '_metadata_created', sign: '+'}]);
  });
});
