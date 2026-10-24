const test = require('node:test');
const assert = require('node:assert');
global.window = {};
require('./data/india.js');
const D = global.window.INDIA_DATA;

test('every cut-off has a known exam, a valid band and a source', () => {
  const exams = new Set(D.exams.map((e) => e.code));
  for (const c of D.colleges.concat(D.abroad)) {
    for (const [code, v] of Object.entries(c.cutoffs)) {
      assert.ok(exams.has(code), c.name + ' ' + code);
      assert.ok(v[0] <= v[1], c.name + ' band order');
      assert.ok(D.sources[v[2]] && /^https:\/\//.test(D.sources[v[2]].url), c.name + ' source');
    }
  }
});

test('NIRF ranks are unique and within 1-50', () => {
  const ranks = D.colleges.map((c) => c.nirf).filter((r) => r !== null);
  assert.strictEqual(new Set(ranks).size, ranks.length);
  assert.ok(ranks.every((r) => r >= 1 && r <= 50));
});

test('fees and salaries are sourced, dated and plausible', () => {
  for (const c of D.colleges) {
    for (const k of ['fee', 'salary']) {
      const v = c[k];
      if (!v) continue;
      assert.ok(v[0] > 100000 && v[0] < 10000000, c.name + ' ' + k + ' range');
      assert.ok(v[1] >= 2024 && v[1] <= 2027, c.name + ' ' + k + ' year');
      assert.ok(D.sources[v[2]], c.name + ' ' + k + ' source');
    }
  }
});

test('category minimums never exceed the General minimum', () => {
  for (const c of D.colleges.filter((x) => x.cat)) {
    for (const [k, v] of Object.entries(c.cat)) assert.ok(v <= c.cat.GEN, c.name + ' ' + k);
    if (c.cat.SC && c.cat.OBC) assert.ok(c.cat.SC <= c.cat.OBC, c.name + ' SC <= OBC');
  }
  const x = D.colleges.find((c) => c.gender);
  assert.ok(x.gender.F[0] <= x.gender.M[0]);
});
