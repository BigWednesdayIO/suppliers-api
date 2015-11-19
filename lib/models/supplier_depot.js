'use strict';

const Model = require('./model');

const supplierKind = require('./supplier').kind;
const depotKind = 'Depot';

class SupplierDepotModel extends Model {
  create(supplierId, depot) {
    return super.create([supplierKind, supplierId, depotKind], depot);
  }

  get(supplierId, depotId) {
    return super.get([supplierKind, supplierId, depotKind, depotId]);
  }

  upsert(supplierId, depotId, depot) {
    return super.upsert([supplierKind, supplierId, depotKind, depotId], depot);
  }

  find(supplierId) {
    const supplierKey = super.dataset.key([supplierKind, supplierId]);
    const query = super.dataset.createQuery(depotKind).hasAncestor(supplierKey).order('_metadata_created');

    return super._runQuery(query);
  }

  delete(supplierId, depotId) {
    return super.delete([supplierKind, supplierId, depotKind, depotId]);
  }
}

module.exports = new SupplierDepotModel();
