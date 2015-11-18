'use strict';

const Model = require('./model');

class SupplierModel extends Model {
  constructor() {
    super();

    this._kind = 'Supplier';
  }
}

module.exports = new SupplierModel();
