// Pure finance functions. No DOM access, so they can be unit tested in Node.

function emi(principal, annualRatePct, years) {
  const n = Math.round(years * 12);
  if (principal <= 0 || n <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function npv(rate, flows) {
  // flows[0] is received at the end of year 1.
  return flows.reduce((sum, cf, i) => sum + cf / Math.pow(1 + rate, i + 1), 0);
}

function irr(flows) {
  const f = (r) => npv(r, flows);
  let lo = -0.9, hi = 5;
  if (f(lo) * f(hi) > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (f(lo) * f(mid) <= 0) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

// Years until cumulative flows turn non-negative, linearly interpolated. null if never.
function payback(flows) {
  let cum = 0;
  for (let i = 0; i < flows.length; i++) {
    const prev = cum;
    cum += flows[i];
    if (cum >= 0 && i > 0 && prev < 0) return i + (-prev / flows[i]);
    if (cum >= 0 && i === 0) return 0;
  }
  return null;
}

// Incremental yearly cash flow of doing the MBA versus staying in the current job.
// Assumptions: pre-tax; loan is disbursed at the start, interest accrues during the
// program, and repayment starts after the program as level annual payments.
function mbaCashFlows(p) {
  const L = Math.max(1, Math.round(p.programYears));
  const H = Math.max(L + 1, Math.round(p.horizonYears));
  const keep = 1 - (p.tax || 0) / 100;
  const tuition = Math.max(0, p.tuition - (p.scholarship || 0));
  const loan = Math.min(p.loan, tuition + p.living * L);
  const balance = loan * Math.pow(1 + p.loanRate / 100, L);
  const annualRepay = emi(balance, p.loanRate, p.loanTermYears) * 12;
  const flows = [];
  for (let t = 1; t <= H; t++) {
    const base = p.currentSalary * keep * Math.pow(1 + p.currentGrowth / 100, t - 1);
    let mba;
    if (t <= L) {
      mba = -(tuition / L) - p.living + loan / L;
    } else {
      const k = t - L;
      mba = p.postSalary * keep * Math.pow(1 + p.postGrowth / 100, k - 1);
      if (k === 1) mba += (p.bonus || 0) * keep;
      if (k <= p.loanTermYears) mba -= annualRepay;
    }
    flows.push(mba - base);
  }
  return { flows, loan, balance, annualRepay };
}

// Discount rate actually used: nominal, or real (inflation-adjusted) when p.real is set.
function effectiveRate(p) {
  const d = p.discountRate / 100;
  return p.real ? (1 + d) / (1 + (p.inflation || 0) / 100) - 1 : d;
}

function analyse(p) {
  const { flows, loan, balance, annualRepay } = mbaCashFlows(p);
  const rate = effectiveRate(p);
  const cumulative = [];
  flows.reduce((c, cf) => (cumulative.push(c + cf), c + cf), 0);
  const totalInterest = annualRepay * Math.min(p.loanTermYears, flows.length - Math.max(1, Math.round(p.programYears))) - loan;
  return {
    flows, cumulative, loan, balance, annualRepay,
    npv: npv(rate, flows),
    irr: irr(flows),
    payback: payback(flows),
    emiMonthly: annualRepay / 12,
    totalInterest: Math.max(0, totalInterest),
    breakEvenSalary: breakEvenSalary(p, rate),
  };
}

// Post-MBA starting salary at which NPV = 0 (bisection; NPV rises with salary).
function breakEvenSalary(p, rate = p.discountRate / 100) {
  const f = (s) => npv(rate, mbaCashFlows({ ...p, postSalary: s }).flows);
  let lo = 0, hi = Math.max(p.postSalary, p.currentSalary, 1) * 50;
  if (f(hi) < 0) return null;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) >= 0) hi = mid; else lo = mid;
  }
  return hi;
}

// NPV grid: rows = post-MBA starting salaries, columns = discount rates (%).
function sensitivity(p, salaries, ratesPct) {
  return salaries.map((sal) =>
    ratesPct.map((r) => analyse({ ...p, postSalary: sal, discountRate: r }).npv));
}

// NPV for each shift (e.g. -0.25, 0, 0.25) applied to the post-MBA salary.
function scenarios(p, shifts) {
  return shifts.map((sh) => analyse({ ...p, postSalary: p.postSalary * (1 + sh) }).npv);
}

// Probability-weighted NPV. Probabilities are normalised so they need not sum to 100.
function expectedNpv(npvs, probs) {
  const total = probs.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  return npvs.reduce((sum, v, i) => sum + (v * probs[i]) / total, 0);
}

function toCsv(rows) {
  const cell = (v) => {
    const t = String(v);
    return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  };
  return rows.map((r) => r.map(cell).join(',')).join('\n');
}

// Salary after the MBA needed to pay back within `years`. null if not reachable.
function requiredSalaryForPayback(p, years) {
  const ok = (sal) => {
    const pb = payback(mbaCashFlows({ ...p, postSalary: sal }).flows);
    return pb !== null && pb <= years;
  };
  let hi = Math.max(p.postSalary, p.currentSalary, 1) * 50;
  if (!ok(hi)) return null;
  let lo = 0;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) hi = mid; else lo = mid;
  }
  return hi;
}

// Year-by-year loan repayment after the program, from monthly EMI amortisation.
function amortization(principal, annualRatePct, years) {
  const n = Math.round(years * 12);
  const out = [];
  if (principal <= 0 || n <= 0) return out;
  const r = annualRatePct / 100 / 12;
  const pay = emi(principal, annualRatePct, years);
  let bal = principal;
  for (let y = 1; y <= Math.ceil(n / 12); y++) {
    let interest = 0, paid = 0;
    for (let m = 0; m < 12 && (y - 1) * 12 + m < n; m++) {
      const i = bal * r;
      interest += i; paid += pay - i; bal -= pay - i;
    }
    out.push({ year: y, interest, principal: paid, balance: Math.max(0, bal) });
  }
  return out;
}

// Plain-language rating from how far the IRR beats the discount rate.
function rating(irrValue, discountRatePct) {
  if (irrValue === null) return 'Poor';
  const spread = irrValue * 100 - discountRatePct;
  if (spread >= 10) return 'Strong';
  if (spread >= 3) return 'Reasonable';
  if (spread >= 0) return 'Marginal';
  return 'Poor';
}

const api = { emi, npv, irr, payback, mbaCashFlows, analyse, breakEvenSalary, effectiveRate, sensitivity, scenarios, expectedNpv, toCsv, requiredSalaryForPayback, amortization, rating };
if (typeof module !== 'undefined') module.exports = api;
if (typeof window !== 'undefined') window.Finance = api;
