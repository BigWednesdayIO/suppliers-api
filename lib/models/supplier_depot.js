'use strict';

const Model = require('./model');

const supplierKind = require('./supplier').kind;
const depotKind = 'Depot';

const buildDatastoreKeyPath = (supplierId, depotId) => {
  let path = [supplierKind, supplierId, depotKind];

  if (depotId) {
    path = path.concat(depotId);
  }

  return path;
};

class SupplierDepotModel extends Model {
  create(supplierId, depot) {
    return super.create(buildDatastoreKeyPath(supplierId), depot);
  }

  get(supplierId, depotId) {
    return super.get(buildDatastoreKeyPath(supplierId, depotId));
  }

  upsert(supplierId, depotId, depot) {
    return super.upsert(buildDatastoreKeyPath(supplierId, depotId), depot);
  }

  find(supplierId) {
    const supplierKey = super.dataset.key([supplierKind, supplierId]);
    const query = super.dataset.createQuery(depotKind).hasAncestor(supplierKey).order('_metadata_created');

    return super._runQuery(query);
  }

  delete(supplierId, depotId) {
    return super.delete(buildDatastoreKeyPath(supplierId, depotId));
  }
}

module.exports = new SupplierDepotModel();
