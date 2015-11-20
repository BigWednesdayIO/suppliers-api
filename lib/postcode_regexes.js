'use strict';

module.exports = {
  // outward code pattern based on valid formats as specified on https://en.wikipedia.org/wiki/Postcodes_in_the_United_Kingdom#Validation
  outwardCode: /^[A-Z]{1,2}[0-9][0-9A-Z]?$/i,
  postcodeArea: /^[A-Z]{1,2}$/i
};
