'use strict';

const Model = require('./model');

const supplierKind = 'Supplier';

const buildDatastoreKeyPath = id => {
  return id ? [supplierKind, id] : [supplierKind];
};

class SupplierModel extends Model {
  create(supplier) {
    return super.create(buildDatastoreKeyPath(), supplier);
  }

  get(id) {
    return super.get(buildDatastoreKeyPath(id));
  }

  upsert(id, supplier) {
    return super.upsert(buildDatastoreKeyPath(id), supplier);
  }

  find() {
    const query = super.dataset.createQuery(supplierKind).order('_metadata_created');
    return super._runQuery(query);
  }

  delete(id) {
    return super.delete(buildDatastoreKeyPath(id));
  }
}

module.exports = new SupplierModel();
module.exports.kind = supplierKind;
