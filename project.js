// Pure helpers to project dated prices and exchange rates forward in time. No DOM access.

// "YYYY-MM" -> months since year 0.
function ym(s) { const [y, m] = s.split('-').map(Number); return y * 12 + (m - 1); }
function ymString(n) { const y = Math.floor(n / 12), m = (n % 12) + 1; return y + '-' + String(m).padStart(2, '0'); }
function monthsBetween(from, to) { return ym(to) - ym(from); }

// Compound growth at `ratePct` per year over the months between two dates (negative = back in time).
function growth(ratePct, from, to) { return Math.pow(1 + ratePct / 100, monthsBetween(from, to) / 12); }

// Units of `cur` per USD at date `at`, drifting by inflation differential (relative purchasing-power parity).
function fxRate(fx, cur, at) {
  const c = fx.currencies[cur], u = fx.currencies[fx.base];
  if (!c) return null;
  return c.perUsd * Math.pow((1 + c.inflation / 100) / (1 + u.inflation / 100), monthsBetween(fx.asOf, at) / 12);
}

function convert(fx, value, from, to, at) {
  if (from === to) return value;
  const a = fxRate(fx, from, at), b = fxRate(fx, to, at);
  return a && b ? (value / a) * b : null;
}

// Value of a dated figure at `at`, in its own currency: local inflation plus an extra real growth rate.
function projectFigure(fx, fig, cur, at, extraPct) {
  const infl = fx.currencies[cur] ? fx.currencies[cur].inflation : 0;
  return fig.value * growth(infl + (extraPct || 0), fig.asOf, at);
}

// One row per month (or per year with step 12) from `from` for `count` steps.
function table(from, count, step, rowFn) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const at = ymString(ym(from) + i * step);
    out.push(Object.assign({ at }, rowFn(at)));
  }
  return out;
}

// Calculator fields for a country's programme, projected to `at` and converted to `cur`.
// Returns the fields plus which figures were filled and which were missing from the data.
const FIGURES = [['tuition', 'tuition', 'fee'], ['living', 'living cost', 'fee'], ['postSalary', 'starting salary', 'sal']];
function countryProgram(fx, c, cur, at, extras) {
  const ex = Object.assign({ fee: 2, sal: 1 }, extras);
  const fields = { name: c.programme.split(' (')[0] }, used = [], missing = [];
  FIGURES.forEach(([k, label, kind]) => {
    if (!c[k]) { missing.push(label); return; }
    fields[k] = Math.round(convert(fx, projectFigure(fx, c[k], c.currency, at, ex[kind]), c.currency, cur, at));
    used.push(label);
  });
  if (c.programMonths) { fields.programYears = Math.max(1, Math.round(c.programMonths / 12)); used.push('programme length'); }
  return { fields, used, missing };
}

function nowYm(date) { const d = date || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }

const projectApi = { ym, ymString, monthsBetween, growth, fxRate, convert, projectFigure, table, countryProgram, nowYm };
if (typeof module !== 'undefined') module.exports = projectApi;
if (typeof window !== 'undefined') window.Project = projectApi;
