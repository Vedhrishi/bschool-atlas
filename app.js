(function () {
  const D = window.COUNTRY_DATA, FX = window.FX_DATA, P = window.Project;
  // Presets come from the sourced country data, projected to this month and converted to the chosen currency.
  const complete = D.countries.filter((c) => c.tuition && c.postSalary);
  const presetName = (c) => c.programme.split(' (')[0] + ' · ' + c.name;
  const PRESETS = Object.fromEntries(complete.map((c) => [presetName(c), c]).concat([['Custom', null]]));
  // A programme without a published length is treated as two years (the usual full-time MBA).
  const fromCountry = (c, cur) => Object.assign({ living: 0, scholarship: 0, bonus: 0, programYears: 2 }, P.countryProgram(FX, c, cur, P.nowYm()).fields);

  const SHARED = ['currency', 'currentGrowth', 'postGrowth', 'discountRate', 'horizonYears', 'currentSalary',
    'tax', 'inflation', 'real', 'targetPayback', 'shiftLow', 'shiftHigh', 'pLow', 'pBase', 'pHigh'];
  const PER = [
    ['name', 'Program name', 'text'], ['tuition', 'Total tuition', 'number'], ['scholarship', 'Scholarship / fee waiver', 'number'],
    ['living', 'Extra living cost per year', 'number'], ['programYears', 'Program length (years)', 'number'],
    ['postSalary', 'Starting salary after MBA (per year)', 'number'], ['bonus', 'Signing bonus (one-time)', 'number'],
    ['loan', 'Education loan', 'number'], ['loanRate', 'Loan interest (%/yr)', 'number'], ['loanTermYears', 'Loan term (years)', 'number'],
  ];
  const LOAN = { loan: 0, loanRate: 10, loanTermYears: 7 };
  // Fields shown up front; the rest sit under "More details".
  const BASIC = ['tuition', 'postSalary', 'loan'];
  const byCode = (code) => complete.find((c) => c.code === code);
  const defaults = {
    currency: 'INR', currentGrowth: 6, postGrowth: 8, discountRate: 9, horizonYears: 20, currentSalary: 1500000,
    tax: 20, inflation: 5, real: false, targetPayback: 5, shiftLow: -25, shiftHigh: 25, pLow: 25, pBase: 50, pHigh: 25,
    A: Object.assign({ preset: presetName(byCode('IN')) }, LOAN, fromCountry(byCode('IN'), 'INR')),
    B: Object.assign({ preset: presetName(byCode('GB')) }, LOAN, fromCountry(byCode('GB'), 'INR')),
  };

  const $ = (id) => document.getElementById(id);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  let state = load() || clone(defaults);

  // Inputs are remembered in this browser only, as a convenience.
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem('mba-roi-state') || 'null');
      if (!(s && s.A && s.B)) return null;
      ['A', 'B'].forEach((k) => { if (!(s[k].programYears > 0)) s[k].programYears = 2; });
      return Object.assign(clone(defaults), s);
    } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem('mba-roi-state', JSON.stringify(state)); } catch (e) {}
  }

  const money = (v) => {
    if (v === null || v === undefined || !isFinite(v)) return '—';
    const cur = state.currency;
    return new Intl.NumberFormat(cur === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(v);
  };
  const compact = (v) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const isNum = (el) => el.type === 'number';

  // Shared inputs
  SHARED.forEach((k) => {
    const el = $(k);
    if (el.type === 'checkbox') el.checked = !!state[k]; else el.value = state[k];
    el.addEventListener('input', () => {
      if (k === 'currency') { switchCurrency(el.value); return; }
      state[k] = el.type === 'checkbox' ? el.checked : isNum(el) ? Number(el.value) : el.value;
      update();
    });
  });

  // Changing currency converts every amount at this month's approximate exchange rate.
  const MONEY = ['tuition', 'scholarship', 'living', 'postSalary', 'bonus', 'loan'];
  function switchCurrency(to) {
    const from = state.currency, at = P.nowYm();
    const conv = (v) => Math.round(P.convert(FX, Number(v) || 0, from, to, at) || 0);
    state.currentSalary = conv(state.currentSalary);
    ['A', 'B'].forEach((key) => MONEY.forEach((m) => { state[key][m] = conv(state[key][m]); }));
    state.currency = to;
    syncInputs(); update();
  }

  // Per-program cards
  ['A', 'B'].forEach((key) => {
    const card = document.createElement('section');
    card.className = 'card ' + key.toLowerCase();
    const field = ([k, , type]) => '<label><span data-i18n="per.' + k + '"></span><input data-k="' + k + '" type="' + type + '"></label>';
    card.innerHTML = '<h2 data-prog="' + key + '">' + t('prog', { k: key }) + '</h2><div class="grid"><label><span data-i18n="per.preset"></span><select data-k="preset">' +
      presetOptions() + '</select></label>' +
      PER.filter(([k]) => BASIC.includes(k)).map(field).join('') + '</div>' +
      '<details class="opts"><summary data-i18n="more.prog"></summary><div class="grid">' + PER.filter(([k]) => !BASIC.includes(k)).map(field).join('') + '</div></details>' +
      '<div class="verdict" id="ver' + key + '"></div><div class="results" id="res' + key + '"></div>' +
      '<details class="opts"><summary data-i18n="more.deeper"></summary><div class="risk" id="risk' + key + '"></div></details>';
    $('scenarios').appendChild(card);
    I18N.apply(card);
    card.querySelectorAll('[data-k]').forEach((el) => {
      const k = el.dataset.k;
      el.value = state[key][k] ?? '';
      el.addEventListener('input', () => {
        if (k === 'preset') {
          state[key].preset = el.value;
          if (PRESETS[el.value]) Object.assign(state[key], fromCountry(PRESETS[el.value], state.currency));
          syncInputs();
        } else {
          state[key][k] = isNum(el) ? Number(el.value) : el.value;
          state[key].preset = 'Custom';
          card.querySelector('[data-k=preset]').value = 'Custom';
        }
        update();
      });
    });
  });
  function presetOptions() {
    return Object.keys(PRESETS).map((p) => {
      const c = PRESETS[p];
      return '<option value="' + esc(p) + '">' + esc(c ? (c.short || p.split(' · ')[0]) + ' · ' + I18N.country(c.code, c.name) : t('preset.custom')) + '</option>';
    }).join('');
  }
  function syncInputs() {
    SHARED.forEach((k) => { const el = $(k); if (el.type === 'checkbox') el.checked = !!state[k]; else el.value = state[k]; });
    document.querySelectorAll('#scenarios .card').forEach((card, i) => {
      const key = i === 0 ? 'A' : 'B';
      card.querySelectorAll('[data-k]').forEach((el) => { el.value = state[key][el.dataset.k] ?? ''; });
    });
  }

  function params(key, over) {
    const s = state[key];
    return Object.assign({
      currentSalary: state.currentSalary, currentGrowth: state.currentGrowth, postGrowth: state.postGrowth,
      discountRate: state.discountRate, horizonYears: state.horizonYears, tax: state.tax, real: state.real, inflation: state.inflation,
      postSalary: s.postSalary, tuition: s.tuition, scholarship: s.scholarship, bonus: s.bonus, living: s.living,
      programYears: s.programYears, loan: s.loan, loanRate: s.loanRate, loanTermYears: s.loanTermYears,
    }, over);
  }
  const shifts = () => [state.shiftLow / 100, 0, state.shiftHigh / 100];
  const probs = () => [state.pLow, state.pBase, state.pHigh];

  function render(key, r) {
    const cls = (v) => (v >= 0 ? 'pos' : 'neg');
    const st = (label, val, c) => '<div class="stat"><b class="' + (c || '') + '">' + val + '</b><span>' + label + '</span></div>';
    $('res' + key).innerHTML =
      st(t('s.npv'), money(r.npv), cls(r.npv)) +
      st(t('s.payback'), r.payback === null ? t('s.notWithin', { n: state.horizonYears }) : t('q.years', { n: r.payback.toFixed(1) })) +
      st(t('s.irr'), r.irr === null ? '—' : (r.irr * 100).toFixed(1) + '%') +
      st(t('s.breakeven'), money(r.breakEvenSalary)) +
      st(t('s.emi'), money(r.emiMonthly)) +
      st(t('s.interest'), money(r.totalInterest)) +
      st(t('s.verdict', { r: t('r.' + Finance.rating(r.irr, state.discountRate)) }), t('s.needed', { n: state.targetPayback, v: money(Finance.requiredSalaryForPayback(params(key), state.targetPayback)) }), '');
    const n = Finance.scenarios(params(key), shifts());
    const ev = Finance.expectedNpv(n, probs());
    $('risk' + key).innerHTML =
      st(t('s.pess', { p: state.shiftLow }), money(n[0]), cls(n[0])) +
      st(t('s.base'), money(n[1]), cls(n[1])) +
      st(t('s.opt', { p: state.shiftHigh }), money(n[2]), cls(n[2])) +
      st(t('s.ev'), money(ev), ev === null ? '' : cls(ev));
    const v = $('ver' + key);
    v.className = 'verdict ' + cls(r.npv);
    const unit = t(state.real ? 'unit.real' : 'unit.pv');
    v.textContent = r.npv >= 0 ? t('v.adds', { v: money(r.npv), unit }) : t('v.costs', { v: money(-r.npv), unit });
  }

  function banner(rs) {
    const [a, b] = rs, na = state.A.name, nb = state.B.name;
    let text;
    if (a.npv < 0 && b.npv < 0) text = t('ban.neither', { n: a.npv > b.npv ? na : nb });
    else {
      const w = a.npv >= b.npv ? ['A', na, a, nb, b] : ['B', nb, b, na, a];
      const faster = w[2].payback !== null && (w[4].payback === null || w[2].payback <= w[4].payback);
      text = t(faster ? 'ban.faster' : 'ban.slower', { w: w[1], v: money(w[2].npv - w[4].npv), l: w[3] });
    }
    $('banner').textContent = text;
  }

  function chart(rs) {
    const W = 700, H = 280, m = { l: 70, r: 12, t: 12, b: 28 };
    const n = rs[0].cumulative.length;
    const all = rs.flatMap((r) => r.cumulative).concat([0]);
    let lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    if (hi === lo) { hi += 1; lo -= 1; }
    const x = (i) => m.l + (i / (n - 1)) * (W - m.l - m.r);
    const y = (v) => H - m.b - ((v - lo) / (hi - lo)) * (H - m.t - m.b);
    let g = '';
    for (let i = 0; i <= 4; i++) { const v = lo + ((hi - lo) * i) / 4; g += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="var(--line)"/><text x="' + (m.l - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end" font-size="11" fill="var(--muted)">' + compact(v) + '</text>'; }
    for (let i = 0; i < n; i += Math.max(1, Math.round(n / 8))) g += '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11" fill="var(--muted)">Y' + (i + 1) + '</text>';
    g += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y(0) + '" y2="' + y(0) + '" stroke="var(--muted)" stroke-dasharray="4 3"/>';
    ['var(--a)', 'var(--b)'].forEach((c, k) => {
      g += '<polyline fill="none" stroke="' + c + '" stroke-width="2.5" points="' + rs[k].cumulative.map((v, i) => x(i) + ',' + y(v)).join(' ') + '"/>';
    });
    $('chart').innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '">' + g + '</svg>';
    $('legend').innerHTML = '<span><i style="background:var(--a)"></i>' + esc(state.A.name) + '</span><span><i style="background:var(--b)"></i>' + esc(state.B.name) + '</span><span>' + esc(t('legend.dash')) + '</span>';
  }

  function sensitivity() {
    const key = $('sensProg').value;
    const base = state[key].postSalary || 1;
    const salaries = [0.5, 0.75, 1, 1.25, 1.5].map((f) => Math.round(base * f));
    const rates = [5, 7, 9, 11, 13];
    const grid = Finance.sensitivity(params(key), salaries, rates);
    let h = '<tr><th>' + esc(t('sens.corner')) + '</th>' + rates.map((r) => '<th>' + r + '%</th>').join('') + '</tr>';
    grid.forEach((row, i) => {
      h += '<tr><th>' + money(salaries[i]) + '</th>' + row.map((v) => '<td class="' + (v >= 0 ? 'p' : 'n') + '">' + money(v) + '</td>').join('') + '</tr>';
    });
    $('sens').innerHTML = h;
  }

  function amort() {
    $('amort').innerHTML = ['A', 'B'].map((key, i) => {
      const r = last[i];
      const rows = Finance.amortization(r.balance, state[key].loanRate, state[key].loanTermYears);
      const body = rows.length ? rows.map((x) => '<tr><td>' + x.year + '</td><td>' + money(x.interest) + '</td><td>' + money(x.principal) + '</td><td>' + money(x.balance) + '</td></tr>').join('')
        : '<tr><td colspan="4">' + t('am.none') + '</td></tr>';
      return '<div class="scroll"><b>' + esc(state[key].name) + '</b><table class="amort"><tr><th>' + t('am.year') + '</th><th>' + t('am.interest') + '</th><th>' + t('am.principal') + '</th><th>' + t('am.balance') + '</th></tr>' + body + '</table></div>';
    }).join('');
  }

  function summaryPng() {
    const c = document.createElement('canvas'); c.width = 1200; c.height = 630;
    const g = c.getContext('2d');
    const css = getComputedStyle(document.documentElement);
    const v = (n) => css.getPropertyValue(n).trim();
    g.fillStyle = v('--bg'); g.fillRect(0, 0, 1200, 630);
    g.fillStyle = v('--text'); g.font = 'bold 44px system-ui, sans-serif'; g.fillText(t('hero.h1a') + ' ' + t('hero.h1b'), 60, 90);
    g.fillStyle = v('--muted'); g.font = '22px system-ui, sans-serif';
    g.fillText(t('img.assump', { tax: state.tax, d: state.discountRate, h: state.horizonYears }), 60, 128);
    ['A', 'B'].forEach((key, i) => {
      const r = last[i], x = 60 + i * 550;
      g.fillStyle = v('--card'); g.fillRect(x, 160, 530, 360);
      g.fillStyle = v(i ? '--b' : '--a'); g.fillRect(x, 160, 530, 8);
      g.fillStyle = v('--text'); g.font = 'bold 30px system-ui, sans-serif'; g.fillText(state[key].name.slice(0, 28), x + 24, 218);
      g.fillStyle = v(r.npv >= 0 ? '--good' : '--bad'); g.font = 'bold 44px system-ui, sans-serif'; g.fillText(money(r.npv), x + 24, 285);
      g.fillStyle = v('--muted'); g.font = '20px system-ui, sans-serif'; g.fillText(t('s.npv'), x + 24, 315);
      g.fillStyle = v('--text'); g.font = '26px system-ui, sans-serif';
      g.fillText(t('s.payback') + ': ' + (r.payback === null ? t('s.notWithin', { n: state.horizonYears }) : t('q.years', { n: r.payback.toFixed(1) })), x + 24, 375);
      g.fillText('IRR: ' + (r.irr === null ? '—' : (r.irr * 100).toFixed(1) + '%'), x + 24, 420);
      g.fillText(t('s.breakeven') + ': ' + money(r.breakEvenSalary), x + 24, 465);
      g.fillStyle = v('--muted'); g.font = '20px system-ui, sans-serif'; g.fillText(t('s.verdict', { r: t('r.' + Finance.rating(r.irr, state.discountRate)) }), x + 24, 502);
    });
    g.fillStyle = v('--text'); g.font = '24px system-ui, sans-serif'; g.fillText($('banner').textContent.slice(0, 80), 60, 568);
    g.fillStyle = v('--muted'); g.font = '18px system-ui, sans-serif'; g.fillText(t('img.footer'), 60, 604);
    return c;
  }

  function tsv(rs) {
    const rows = [['Year', state.A.name + ' yearly difference', state.A.name + ' cumulative', state.B.name + ' yearly difference', state.B.name + ' cumulative']];
    rs[0].flows.forEach((_, i) => rows.push([i + 1, Math.round(rs[0].flows[i]), Math.round(rs[0].cumulative[i]), Math.round(rs[1].flows[i]), Math.round(rs[1].cumulative[i])]));
    return rows.map((r) => r.join('\t')).join('\n');
  }
  function summaryText(rs) {
    const line = (key, r) => state[key].name + ': ' + t('s.npv') + ' ' + money(r.npv) + ' · ' + t('s.payback') + ' ' + (r.payback === null ? t('s.notWithin', { n: state.horizonYears }) : t('q.years', { n: r.payback.toFixed(1) })) +
      ' · IRR ' + (r.irr === null ? '—' : (r.irr * 100).toFixed(1) + '%') + ' · ' + t('s.verdict', { r: t('r.' + Finance.rating(r.irr, state.discountRate)) });
    return t('hero.h1a') + ' ' + t('hero.h1b') + '\n' + line('A', rs[0]) + '\n' + line('B', rs[1]) + '\n' + $('banner').textContent +
      '\n' + t('l.currentSalary') + ': ' + money(state.currentSalary) + ' · ' + t('img.assump', { tax: state.tax, d: state.discountRate, h: state.horizonYears }) + '\n' + t('img.footer');
  }

  let last = null;
  const prevStats = {};
  function update() {
    const rs = ['A', 'B'].map((k) => Finance.analyse(params(k)));
    last = rs;
    render('A', rs[0]); render('B', rs[1]); banner(rs); chart(rs); sensitivity(); amort(); save();
    // Briefly highlight numbers that changed.
    document.querySelectorAll('#calc .stat b').forEach((b, i) => {
      if (prevStats[i] !== undefined && prevStats[i] !== b.textContent) { b.classList.remove('tick'); void b.offsetWidth; b.classList.add('tick'); }
      prevStats[i] = b.textContent;
    });
  }
  $('sensProg').addEventListener('input', sensitivity);

  const say = (msg) => { $('msg').textContent = msg; };
  // Clipboard writes must happen inside the click handler; fall back to showing the text to copy by hand.
  function copy(text, done) {
    const fallback = () => { const out = $('copyout'); out.hidden = false; out.value = text; out.select(); say(t('copy.manual')); };
    try { navigator.clipboard.writeText(text).then(() => say(done), fallback); } catch (e) { fallback(); }
  }
  $('copySummary').addEventListener('click', () => copy(summaryText(last), t('msg.summary')));
  $('copyTable').addEventListener('click', () => copy(tsv(last), t('msg.table')));
  $('png').addEventListener('click', () => {
    const img = $('cardimg');
    img.src = summaryPng().toDataURL('image/png');
    $('cardDl').href = img.src;
    $('cardwrap').hidden = false;
    say(t('msg.png'));
  });
  // Downloads and printing only work on a normal website, so these buttons show only there (data-host="web").
  $('csv').addEventListener('click', () => {
    const blob = new Blob([Finance.toCsv(tsv(last).split('\n').map((r) => r.split('\t')))], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = 'bschool-atlas.csv';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  });
  $('print').addEventListener('click', () => window.print());
  $('reset').addEventListener('click', () => { state = clone(defaults); syncInputs(); update(); say(t('msg.reset')); });

  update();

  document.addEventListener('langchange', () => {
    document.querySelectorAll('#scenarios [data-prog]').forEach((h) => { h.textContent = t('prog', { k: h.dataset.prog }); });
    document.querySelectorAll('#scenarios [data-k=preset]').forEach((sel, i) => { sel.innerHTML = presetOptions(); sel.value = state[i ? 'B' : 'A'].preset; });
    update();
  });

  // Hook used by the world map and quick check to fill the calculator.
  window.MBAApp = {
    get currency() { return state.currency; },
    setCurrency(c) { if (c !== state.currency) switchCurrency(c); },
    setShared(fields) { Object.assign(state, fields); syncInputs(); update(); },
    loadProgram(key, fields) {
      Object.assign(state[key], { scholarship: 0, bonus: 0, living: 0, programYears: 2 }, fields, { preset: 'Custom' });
      syncInputs(); update();
    },
    refresh() { update(); },
  };
})();
