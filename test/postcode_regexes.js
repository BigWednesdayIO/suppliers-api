'use strict';

const expect = require('chai').expect;
const outwardRegex = require('../lib/postcode_regexes').outwardCode;

const validOutwardCodes = ['L1', 'l1', 'SE1', 'SE1P'];
const invalidOutwardCodes = ['1L', '12', '#', ' ', 'L 1', 'SE'];

describe('Postcode regexes', () => {
  describe('outward code', () => {
    it('matches valid outward code formats',
      () => validOutwardCodes.forEach(code => expect(code).to.match(outwardRegex)));

    it('does not match invalid outward code formats',
      () => invalidOutwardCodes.forEach(code => expect(code).to.not.match(outwardRegex)));
  });
});
