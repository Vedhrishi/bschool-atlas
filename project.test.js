const test = require('node:test');
const assert = require('node:assert');
const P = require('./project.js');
global.window = {};
require('./data/countries.js');
const { COUNTRY_DATA: D, FX_DATA: FX } = global.window;

test('month arithmetic', () => {
  assert.strictEqual(P.monthsBetween('2026-10', '2036-10'), 120);
  assert.strictEqual(P.ymString(P.ym('2026-12') + 1), '2027-01');
});

test('growth compounds yearly and works backwards', () => {
  assert.ok(Math.abs(P.growth(10, '2026-01', '2028-01') - 1.21) < 1e-9);
  assert.ok(Math.abs(P.growth(10, '2026-01', '2026-01') - 1) < 1e-12);
  assert.ok(P.growth(10, '2026-01', '2025-01') < 1);
});

test('fx is unchanged at as-of date and drifts with inflation gap', () => {
  assert.strictEqual(P.fxRate(FX, 'INR', FX.asOf), FX.currencies.INR.perUsd);
  assert.ok(P.fxRate(FX, 'INR', '2036-10') > FX.currencies.INR.perUsd);
  assert.ok(Math.abs(P.fxRate(FX, 'EUR', '2036-10') - FX.currencies.EUR.perUsd) < 1e-9);
  assert.ok(Math.abs(P.convert(FX, 100, 'USD', 'INR', FX.asOf) - 9497) < 1e-6);
  assert.ok(Math.abs(P.convert(FX, P.convert(FX, 100, 'GBP', 'INR', '2030-01'), 'INR', 'GBP', '2030-01') - 100) < 1e-9);
});

test('yearly and monthly tables have the right length and dates', () => {
  const yr = P.table('2026-10', 11, 12, (at) => ({ v: P.growth(5, '2026-10', at) }));
  assert.strictEqual(yr.length, 11);
  assert.strictEqual(yr[10].at, '2036-10');
  assert.strictEqual(P.table('2026-10', 121, 1, () => ({})).length, 121);
});

test('country data: every figure is dated, sourced and in a known currency', () => {
  const conts = ['AF', 'AS', 'EU', 'NA', 'OC', 'SA'];
  for (const c of D.countries) {
    assert.ok(conts.includes(c.continent), c.code);
    assert.ok(FX.currencies[c.currency], c.code + ' currency');
    for (const k of ['tuition', 'living', 'postSalary']) {
      const f = c[k];
      if (!f) continue;
      assert.ok(f.value > 0 && /^\d{4}-\d{2}$/.test(f.asOf), c.code + ' ' + k);
      assert.ok(c.sources[f.src] && /^https:\/\//.test(c.sources[f.src].url), c.code + ' ' + k + ' source');
      assert.ok(['school', 'publisher'].includes(f.confidence));
    }
  }
});

test('countryProgram converts and reports gaps', () => {
  const gb = D.countries.find((c) => c.code === 'GB');
  const r = P.countryProgram(FX, gb, 'GBP', gb.tuition.asOf, { fee: 0, sal: 0 });
  assert.strictEqual(r.fields.tuition, 123950);
  assert.ok(r.missing.includes('living cost'));
  const inr = P.countryProgram(FX, gb, 'INR', FX.asOf);
  assert.ok(inr.fields.tuition > 12000000 && inr.fields.postSalary > 8000000);
  const za = D.countries.find((c) => c.code === 'ZA');
  assert.ok(P.countryProgram(FX, za, 'ZAR', FX.asOf).missing.includes('starting salary'));
});
