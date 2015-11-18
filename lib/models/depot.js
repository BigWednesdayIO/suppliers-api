'use strict';

const Model = require('./model');

class DepotModel extends Model {
  constructor() {
    super();

    this._kind = 'Depot';
  }
}

module.exports = new DepotModel();
