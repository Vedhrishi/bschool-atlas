const test = require('node:test');
const assert = require('node:assert');
const N = require('./nav.js');
global.window = {};
require('./data/india.js');
require('./data/countries.js');
const { INDIA_DATA: INDIA, COUNTRY_DATA: COUNTRIES } = global.window;

test('smart queries become finder settings', () => {
  assert.deepStrictEqual(N.parseQuery('XAT 90 female'), { exam: 'XAT', score: 90, gender: 'F' });
  assert.deepStrictEqual(N.parseQuery('sc cat 80'), { exam: 'CAT', score: 80, cat: 'SC' });
  assert.deepStrictEqual(N.parseQuery('colleges under 10 lakh'), { budget: 10 });
  assert.deepStrictEqual(N.parseQuery('MAH-CET 99'), { exam: 'MAHCET', score: 99 });
  assert.deepStrictEqual(N.parseQuery('best payback'), { sort: 'payback' });
  assert.strictEqual(N.parseQuery('IIM Ahmedabad'), null);
  // "best" and "school" must not be read as ST or SC.
  assert.strictEqual(N.parseQuery('best school'), null);
  // A budget number is not mistaken for the exam score.
  assert.deepStrictEqual(N.parseQuery('CAT 95 under 20 lakh'), { exam: 'CAT', score: 95, budget: 20 });
});

test('search finds colleges, countries, exams and terms', () => {
  const idx = N.buildIndex(INDIA, COUNTRIES);
  assert.strictEqual(N.search(idx, 'ahmedabad')[0].label, 'IIM Ahmedabad');
  assert.strictEqual(N.search(idx, 'uk')[0].key, 'GB');
  assert.ok(N.search(idx, 'snap').some((r) => r.type === 'exam'));
  assert.ok(N.search(idx, 'npv').some((r) => r.type === 'term'));
  assert.ok(N.search(idx, 'pune').length >= 3);
  assert.deepStrictEqual(N.search(idx, ''), []);
});

test('every sidebar section points at a known view', () => {
  for (const [k, s] of Object.entries(N.NAV_SECTIONS)) assert.ok(['map', 'calc', 'india'].includes(s.view), k);
});
