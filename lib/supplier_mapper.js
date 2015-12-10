'use strict';

const _ = require('lodash');

const mapper = {
  toModel(entity) {
    return _.omit(entity, ['password', '_hidden']);
  }
};

module.exports = mapper;
