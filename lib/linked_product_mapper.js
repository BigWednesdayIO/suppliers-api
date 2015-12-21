'use strict';

const _ = require('lodash');
const request = require('request');

const productsApi = `http://${process.env.PRODUCTS_API_SVC_SERVICE_HOST}:${process.env.PRODUCTS_API_SVC_SERVICE_PORT}`;

const getProductData = ids =>
  new Promise((resolve, reject) => {
    const idsQuery = `id[]=${ids.join('&id[]=')}`;

    request({
      url: `${productsApi}/products?${idsQuery}`,
      headers: {authorization: process.env.BIGWEDNESDAY_JWT}
    }, (err, response, body) => {
      if (err) {
        return reject(err);
      }

      if (response.statusCode === 200) {
        resolve(JSON.parse(body));
      }

      reject(new Error(`Products API error response [${response.statusCode}]. ${body}`));
    });
  });

module.exports.toModel = (linkedProduct, expansions) => {
  if (!expansions || !expansions.length || expansions.indexOf('product') < 0) {
    return Promise.resolve(linkedProduct);
  }

  return getProductData([linkedProduct.product_id])
    .then(products => products.length ? Object.assign(_.omit(linkedProduct, 'product_id'), {product: products[0]}) : linkedProduct);
};

module.exports.toModelArray = (linkedProducts, expansions) => {
  if (!expansions || !expansions.length || expansions.indexOf('product') < 0) {
    return Promise.resolve(linkedProducts);
  }

  return getProductData(_.uniq(linkedProducts.map(p => p.product_id)))
    .then(products => linkedProducts.map(linkedProduct => {
      const product = products.find(p => p.id === linkedProduct.product_id);
      return product ? Object.assign(_.omit(linkedProduct, 'product_id'), {product}) : linkedProduct;
    }));
};
