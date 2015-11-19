'use strict';

const Model = require('./model');

const supplierKind = 'Supplier';

class SupplierModel extends Model {
  create(supplier) {
    return super.create([supplierKind], supplier);
  }

  get(id) {
    return super.get([supplierKind, id]);
  }

  upsert(id, supplier) {
    return super.upsert([supplierKind, id], supplier);
  }

  find() {
    const query = super.dataset.createQuery(supplierKind).order('_metadata_created');
    return super._runQuery(query);
  }

  delete(id) {
    return super.delete([supplierKind, id]);
  }
}

module.exports = new SupplierModel();
module.exports.kind = supplierKind;
