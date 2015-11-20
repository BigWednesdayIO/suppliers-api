'use strict';

const expect = require('chai').expect;
const postcodeRegexes = require('../lib/postcode_regexes');
const outwardRegex = postcodeRegexes.outwardCode;
const postcodeAreaRegex = postcodeRegexes.postcodeArea;

const validOutwardCodes = ['L1', 'l1', 'SE1', 'SE1P'];
const invalidOutwardCodes = ['1L', '12', '#', ' ', 'L 1', 'SE'];

const validPostcodeAreas = ['S', 'SE', 'sw'];
const invalidPostcodeAreas = ['123', '#', ' ', 'SE1'];

describe('Postcode regexes', () => {
  describe('outward code', () => {
    it('matches valid formats',
      () => validOutwardCodes.forEach(code => expect(code).to.match(outwardRegex)));

    it('does not match invalid formats',
      () => invalidOutwardCodes.forEach(code => expect(code).to.not.match(outwardRegex)));
  });

  describe('postcode areas', () => {
    it('matches valid formats',
      () => validPostcodeAreas.forEach(code => expect(code).to.match(postcodeAreaRegex)));

    it('does not match invalid formats',
      () => invalidPostcodeAreas.forEach(code => expect(code).to.not.match(postcodeAreaRegex)));
  });
});
