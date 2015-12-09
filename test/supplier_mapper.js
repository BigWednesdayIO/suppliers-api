'use strict';

const expect = require('chai').expect;
const supplierMapper = require('../lib/supplier_mapper');

describe('Supplier mapper', () => {
  describe('toModel', () => {
    it('removes password', () => {
      expect(supplierMapper.toModel({password: '12345', name: 'Supplier A'})).to.eql({name: 'Supplier A'});
    });

    it('removes hidden', () => {
      expect(supplierMapper.toModel({_hidden: {auth0Id: '12345'}, name: 'Supplier A'})).to.eql({name: 'Supplier A'});
    });
  });
});
