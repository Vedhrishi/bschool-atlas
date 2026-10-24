const test = require('node:test');
const assert = require('node:assert');
const F = require('./finance.js');

const base = {
  currentSalary: 1000000, currentGrowth: 6, postSalary: 2500000, postGrowth: 8,
  tuition: 2400000, living: 0, programYears: 2, loan: 0, loanRate: 10,
  loanTermYears: 7, discountRate: 8, horizonYears: 20,
};

test('emi matches the standard formula', () => {
  // 1,000,000 at 12% p.a. for 1 year -> 88,848.79 per month
  assert.ok(Math.abs(F.emi(1000000, 12, 1) - 88848.79) < 0.01);
  assert.strictEqual(F.emi(0, 10, 5), 0);
  assert.ok(Math.abs(F.emi(120000, 0, 1) - 10000) < 1e-9);
});

test('npv discounts end-of-year flows', () => {
  assert.ok(Math.abs(F.npv(0.1, [110]) - 100) < 1e-9);
  assert.ok(Math.abs(F.npv(0.1, [0, 121]) - 100) < 1e-9);
});

test('irr recovers the rate', () => {
  assert.ok(Math.abs(F.irr([-100, 110]) - 0.1) < 1e-6);
  assert.strictEqual(F.irr([10, 10]), null);
});

test('payback interpolates within the year', () => {
  assert.ok(Math.abs(F.payback([-100, 50, 100]) - 2.5) < 1e-9);
  assert.strictEqual(F.payback([-100, 10]), null);
});

test('good MBA scenario has positive NPV and a payback', () => {
  const r = F.analyse(base);
  assert.ok(r.npv > 0);
  assert.ok(r.payback !== null && r.payback > 2);
});

test('break-even salary gives NPV of ~0', () => {
  const r = F.analyse(base);
  const flows = F.mbaCashFlows({ ...base, postSalary: r.breakEvenSalary }).flows;
  assert.ok(Math.abs(F.npv(0.08, flows)) < 1);
  assert.ok(r.breakEvenSalary < base.postSalary);
});

test('same salary after a costly MBA never pays back', () => {
  const r = F.analyse({ ...base, postSalary: 1000000 });
  assert.ok(r.npv < 0);
  assert.strictEqual(r.payback, null);
});

test('loan is capped and produces repayments', () => {
  const r = F.analyse({ ...base, loan: 99999999 });
  assert.strictEqual(r.loan, base.tuition);
  assert.ok(r.emiMonthly > 0 && r.totalInterest > 0);
});

test('tax of zero matches the untaxed model; tax shrinks the gain', () => {
  const a = F.analyse(base), b = F.analyse({ ...base, tax: 0 });
  assert.strictEqual(a.npv, b.npv);
  assert.ok(F.analyse({ ...base, tax: 30 }).npv < a.npv);
});

test('scholarship lowers cost and loan; bonus raises NPV', () => {
  const a = F.analyse({ ...base, loan: 99999999 });
  const b = F.analyse({ ...base, loan: 99999999, scholarship: 1000000 });
  assert.ok(b.loan < a.loan && b.npv > a.npv);
  assert.ok(F.analyse({ ...base, bonus: 500000 }).npv > F.analyse(base).npv);
});

test('real terms lowers the discount rate when inflation is positive', () => {
  assert.ok(F.effectiveRate({ discountRate: 9, real: true, inflation: 5 }) < 0.09);
  assert.strictEqual(F.effectiveRate({ discountRate: 9, real: false, inflation: 5 }), 0.09);
});

test('sensitivity rises with salary and falls with discount rate', () => {
  const g = F.sensitivity(base, [1500000, 2500000, 3500000], [6, 10]);
  assert.ok(g[0][0] < g[1][0] && g[1][0] < g[2][0]);
  assert.ok(g[1][0] > g[1][1]);
});

test('scenarios are ordered and expected NPV is a weighted mean', () => {
  const n = F.scenarios(base, [-0.25, 0, 0.25]);
  assert.ok(n[0] < n[1] && n[1] < n[2]);
  assert.ok(Math.abs(F.expectedNpv([0, 100], [50, 50]) - 50) < 1e-9);
  assert.ok(Math.abs(F.expectedNpv([0, 100], [1, 3]) - 75) < 1e-9);
  assert.strictEqual(F.expectedNpv([1], [0]), null);
});

test('csv escapes commas and quotes', () => {
  assert.strictEqual(F.toCsv([['a', 'b,c'], [1, 'x"y']]), 'a,"b,c"\n1,"x""y"');
});

test('required salary for payback pays back in exactly the target', () => {
  const need = F.requiredSalaryForPayback(base, 5);
  const pb = F.payback(F.mbaCashFlows({ ...base, postSalary: need }).flows);
  assert.ok(pb <= 5 + 1e-6 && pb > 4.9);
  assert.ok(F.requiredSalaryForPayback(base, 3) > need);
  assert.strictEqual(F.requiredSalaryForPayback(base, 1), null);
});

test('amortization clears the balance and matches EMI interest', () => {
  const rows = F.amortization(1000000, 12, 3);
  assert.strictEqual(rows.length, 3);
  assert.ok(rows[2].balance < 1e-6);
  const paidPrincipal = rows.reduce((a, r) => a + r.principal, 0);
  assert.ok(Math.abs(paidPrincipal - 1000000) < 1e-3);
  const interest = rows.reduce((a, r) => a + r.interest, 0);
  assert.ok(Math.abs(interest - (F.emi(1000000, 12, 3) * 36 - 1000000)) < 1e-3);
  assert.deepStrictEqual(F.amortization(0, 10, 5), []);
});

test('rating bands follow IRR spread', () => {
  assert.strictEqual(F.rating(0.25, 9), 'Strong');
  assert.strictEqual(F.rating(0.14, 9), 'Reasonable');
  assert.strictEqual(F.rating(0.095, 9), 'Marginal');
  assert.strictEqual(F.rating(0.05, 9), 'Poor');
  assert.strictEqual(F.rating(null, 9), 'Poor');
});
