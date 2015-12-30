'use strict';

const dataset = require('./dataset');

const supplierKind = 'Supplier';
const depotKind = 'Depot';
const linkedProductKind = 'SupplierLinkedProduct';
const priceAdjustmentKind = 'SupplierProductPriceAdjustment';

module.exports.supplierKey = supplierId => {
  if (!supplierId) {
    throw new Error('Missing supplier identifier');
  }

  return dataset.key([supplierKind, supplierId]);
};

module.exports.supplierQuery = () => dataset.createQuery(supplierKind).order('_metadata_created');

module.exports.depotKey = (supplierId, depotId) => {
  if (!supplierId) {
    throw new Error('Missing supplier identifier');
  }

  if (!depotId) {
    throw new Error('Missing depot identifier');
  }

  const key = module.exports.supplierKey(supplierId);

  key.path.push(depotKind, depotId);
  return key;
};

module.exports.depotQuery = () => dataset.createQuery(depotKind).order('_metadata_created');

module.exports.linkedProductKey = (supplierId, linkedProductId) => {
  if (!supplierId) {
    throw new Error('Missing supplier identifier');
  }

  if (!linkedProductId) {
    throw new Error('Missing linked product identifier');
  }

  const key = module.exports.supplierKey(supplierId);

  key.path.push(linkedProductKind, linkedProductId);
  return key;
};

module.exports.linkedProductQuery = () => dataset.createQuery(linkedProductKind).order('_metadata_created');

module.exports.priceAdjustmentKey = (supplierId, linkedProductId, priceAdjustmentId) => {
  if (!supplierId) {
    throw new Error('Missing supplier identifier');
  }

  if (!linkedProductId) {
    throw new Error('Missing linked product identifier');
  }

  if (!priceAdjustmentId) {
    throw new Error('Missing price adjustment identifier');
  }

  const key = module.exports.linkedProductKey(supplierId, linkedProductId);

  key.path.push(priceAdjustmentKind, priceAdjustmentId);
  return key;
};
