// India & exams page: profile-based college finder (exam, score, category, gender, salary, budget),
// payback for the visitor, shortlist, side-by-side comparison, fee-vs-salary chart, exam guide and college table.
(function () {
  const ID = window.INDIA_DATA;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const EX = Object.fromEntries(ID.exams.map((e) => [e.code, e]));
  // Starting value per exam (a typical score, so the finder opens with results) and the gap that counts as "close".
  const START = { CAT: 95, XAT: 90, NMAT: 210, SNAP: 95, CMAT: 95, MAHCET: 98, GMAT: 655, IELTS: 7, TOEFL: 100 };
  const CLOSE = { pct: 3, score: 15, band: 0.5 };
  const CLOSE_BY = { GMAT: 30, TOEFL: 6 };
  const all = ID.colleges.map((c) => Object.assign({ abroad: false }, c)).concat(ID.abroad.map((c) => Object.assign({ abroad: true, nirf: null }, c)));
  const byName = Object.fromEntries(all.map((c) => [c.name, c]));
  const examsWithData = ID.exams.filter((e) => all.some((c) => c.cutoffs[e.code]));
  const examLabel = (code) => (code === 'MAHCET' ? 'MAH-CET' : code);
  let exam = 'CAT', tableSort = { key: 'nirf', dir: 1 }, compare = [];

  // Shortlist lives in this browser only.
  let shortlist = [];
  try { shortlist = JSON.parse(localStorage.getItem('bsa-shortlist') || '[]').filter((n) => byName[n]); } catch (e) {}
  const saveShort = () => { try { localStorage.setItem('bsa-shortlist', JSON.stringify(shortlist)); } catch (e) {} };

  const lakh = (v) => (v === null || v === undefined || !isFinite(v)) ? '—'
    : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 }).format(v);
  const fmtBand = (code, lo, hi) => {
    const e = EX[code], top = e.unit === 'pct' ? 100 : e.unit === 'band' ? 9 : null;
    const n = (v) => (Number.isInteger(v) ? String(v) : String(+v.toFixed(2)));
    const range = hi >= (top || Infinity) || hi === lo ? n(lo) + '+' : n(lo) + '–' + n(hi);
    return range + (e.unit === 'pct' ? ' %ile' : '');
  };
  const src = (key) => ID.sources[key];

  // ---- profile ----
  const profile = () => ({
    score: Number($('examScore').value), cat: $('pCat').value, gender: $('pGender').value,
    salary: Math.max(0, Number($('pSalary').value) || 0), budget: Number($('pBudget').value) > 0 ? Number($('pBudget').value) * 100000 : null, sort: $('pSort').value,
  });

  // Payback and value added for this visitor, from the college's fee and average salary (assumptions match the 30-second check).
  const roiCache = new Map();
  function roi(c, salary) {
    if (!c.fee || !c.salary) return null;
    const key = c.name + '|' + salary;
    if (!roiCache.has(key)) {
      const years = /ISB|PGPX/.test(c.name) ? 1 : 2;
      const r = Finance.analyse({ currentSalary: salary, currentGrowth: 6, postGrowth: 8, discountRate: 9, horizonYears: 20, tax: 20,
        postSalary: c.salary[0], tuition: c.fee[0], living: 0, programYears: years, loan: 0, loanRate: 10, loanTermYears: 7 });
      roiCache.set(key, { payback: r.payback, npv: r.npv });
    }
    return roiCache.get(key);
  }
  const paybackText = (r) => (!r ? '—' : r.payback === null ? t('rank.never') : t('in.years', { n: r.payback.toFixed(1) }));

  // Band used for this visitor: the gender-specific XAT band when the school publishes one.
  function bandFor(c, p) {
    const cut = c.cutoffs[exam];
    if (!cut) return null;
    if (exam === 'XAT' && p.gender && c.gender && c.gender[p.gender]) return { lo: c.gender[p.gender][0], hi: c.gender[p.gender][1], cut, gendered: true };
    return { lo: cut[0], hi: cut[1], cut, gendered: false };
  }

  const sorters = {
    payback: (p) => (x, y) => ((roi(x.c, p.salary) || {}).payback ?? 99) - ((roi(y.c, p.salary) || {}).payback ?? 99),
    fee: () => (x, y) => (x.c.fee ? x.c.fee[0] : 1e12) - (y.c.fee ? y.c.fee[0] : 1e12),
    salary: () => (x, y) => (y.c.salary ? y.c.salary[0] : 0) - (x.c.salary ? x.c.salary[0] : 0),
    nirf: () => (x, y) => (x.c.nirf || 999) - (y.c.nirf || 999),
  };

  function tabs() {
    $('examTabs').innerHTML = examsWithData.map((e) => '<button type="button" role="tab" aria-selected="' + (e.code === exam) + '" data-ex="' + e.code + '">' + examLabel(e.code) + '</button>').join('');
  }
  function pickExam(code) { exam = code; $('examScore').value = START[code]; tabs(); finder(); }

  function card(c, b, p, extra) {
    const s = src(b.cut[2]), r = roi(c, p.salary), on = shortlist.includes(c.name), cmp = compare.includes(c.name);
    return '<article class="college"><div class="ctop"><b>' + esc(c.name) + '</b>' + (c.nirf ? '<span class="nirf">NIRF #' + c.nirf + '</span>' : '') + '</div>' +
      '<span class="muted">' + esc(c.city) + '</span>' +
      '<span class="cband">' + esc(t(b.gendered ? 'in.genderBand' : 'in.band', { b: fmtBand(exam, b.lo, b.hi) })) + '</span>' +
      (extra ? '<span class="catmin">' + esc(extra) + '</span>' : '') +
      (b.cut[3] && !b.gendered ? '<span class="muted">' + esc(b.cut[3]) + '</span>' : '') +
      (c.fee || c.salary ? '<div class="cstats"><span><small>' + t('in.fee') + '</small>' + lakh(c.fee && c.fee[0]) + '</span><span><small>' + t('in.salary') + '</small>' + lakh(c.salary && c.salary[0]) + '</span><span><small>' + t('in.paybackYou') + '</small>' + paybackText(r) + '</span></div>' : '<span class="muted">' + t('in.noFee') + '</span>') +
      '<div class="cfoot">' + (s ? '<a class="csrc" href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.label.split(':')[0]) + '</a>' : '<span></span>') +
      '<span class="cbtns"><label class="cmp"><input type="checkbox" data-cmp="' + esc(c.name) + '"' + (cmp ? ' checked' : '') + '> ' + t('in.cmp') + '</label>' +
      '<button type="button" class="star' + (on ? ' on' : '') + '" data-star="' + esc(c.name) + '" aria-pressed="' + on + '" aria-label="' + esc(t('in.star')) + ': ' + esc(c.name) + '">★</button></span></div></article>';
  }

  function finder() {
    const e = EX[exam], p = profile();
    $('examScale').textContent = e.name + ' · ' + e.scale;
    const gap = CLOSE_BY[exam] || CLOSE[e.unit];
    let rows = all.filter((c) => c.cutoffs[exam]).map((c) => ({ c, b: bandFor(c, p) }));
    const before = rows.length;
    if (p.budget) rows = rows.filter((r) => !r.c.fee || r.c.fee[0] <= p.budget);
    const hidden = before - rows.length;
    const reach = [], catOk = [], close = [], stretch = [];
    rows.forEach((r) => {
      const min = exam === 'CAT' && p.cat !== 'GEN' && r.c.cat ? r.c.cat[p.cat] : undefined;
      if (p.score >= r.b.lo) reach.push(r);
      else if (min !== undefined && p.score >= min) { r.note = t('in.catMinNote', { v: min }); catOk.push(r); }
      else if (p.score >= r.b.lo - gap) close.push(r);
      else stretch.push(r);
    });
    const sorter = sorters[p.sort](p);
    [reach, catOk, close, stretch].forEach((g) => g.sort(sorter));
    $('finderHead').textContent = (before ? t('in.headline', { n: reach.length + catOk.length }) : t('in.none')) + (hidden ? ' ' + t('in.overBudget', { n: hidden }) : '');
    const group = (cls, key, list) => list.length ? '<div class="cgroup ' + cls + '"><h3>' + t(key) + ' <span class="count">' + list.length + '</span></h3><div class="cgrid">' +
      list.map((r) => card(r.c, r.b, p, r.note)).join('') + '</div></div>' : '';
    $('finderOut').innerHTML = group('g-reach', 'in.reach', reach) + group('g-cat', 'in.catMin', catOk) + group('g-close', 'in.close', close) + group('g-stretch', 'in.stretch', stretch);
    renderCompare(); renderShort(); chart(); table();
  }

  // ---- compare ----
  function renderCompare() {
    const p = profile(), list = compare.map((n) => byName[n]).filter(Boolean);
    $('compareCard').hidden = !list.length;
    if (!list.length) return;
    const row = (label, f) => '<tr><th>' + label + '</th>' + list.map((c) => '<td>' + f(c) + '</td>').join('') + '</tr>';
    $('compareTable').innerHTML = '<tr><th></th>' + list.map((c) => '<th>' + esc(c.name) + ' <button type="button" class="ghost tiny" data-uncmp="' + esc(c.name) + '">' + t('in.remove') + '</button></th>').join('') + '</tr>' +
      row(t('th.rank'), (c) => c.nirf || '—') + row(t('th.city'), (c) => esc(c.city)) +
      row(t('in.fee'), (c) => lakh(c.fee && c.fee[0])) + row(t('in.salary'), (c) => lakh(c.salary && c.salary[0])) +
      row(t('in.paybackYou'), (c) => paybackText(roi(c, p.salary))) +
      row(t('q.value'), (c) => { const r = roi(c, p.salary); return r ? lakh(r.npv) : '—'; }) +
      row(t('th.exams'), (c) => Object.entries(c.cutoffs).map(([k, v]) => '<span class="chip">' + examLabel(k) + ' ' + fmtBand(k, v[0], v[1]) + '</span>').join(' ') || '—') +
      row(t('in.category') + ' (' + $('pCat').selectedOptions[0].text + ')', (c) => (c.cat && c.cat[p.cat] !== undefined ? 'CAT ' + c.cat[p.cat] + '+ %ile' : '—'));
  }

  // ---- shortlist ----
  function renderShort() {
    const p = profile();
    $('shortList').innerHTML = shortlist.length ? '<div class="cgrid">' + shortlist.map((n) => {
      const c = byName[n];
      return '<article class="college short"><div class="ctop"><b>' + esc(c.name) + '</b><button type="button" class="ghost tiny" data-star="' + esc(n) + '">' + t('in.remove') + '</button></div>' +
        '<span class="muted">' + esc(c.city) + (c.nirf ? ' · NIRF #' + c.nirf : '') + '</span>' +
        '<div class="cstats"><span><small>' + t('in.fee') + '</small>' + lakh(c.fee && c.fee[0]) + '</span><span><small>' + t('in.salary') + '</small>' + lakh(c.salary && c.salary[0]) + '</span><span><small>' + t('in.paybackYou') + '</small>' + paybackText(roi(c, p.salary)) + '</span></div>' +
        '<span class="muted">' + Object.entries(c.cutoffs).map(([k, v]) => examLabel(k) + ' ' + fmtBand(k, v[0], v[1])).join(' · ') + '</span></article>';
    }).join('') + '</div>' : '<p class="muted">' + t('in.shortEmpty') + '</p>';
  }
  function shortText() {
    const p = profile();
    return shortlist.map((n, i) => {
      const c = byName[n];
      return (i + 1) + '. ' + c.name + ' (' + c.city + ')' + (c.nirf ? ', NIRF #' + c.nirf : '') + ' | ' + t('in.fee') + ' ' + lakh(c.fee && c.fee[0]) + ' | ' + t('in.salary') + ' ' + lakh(c.salary && c.salary[0]) +
        ' | ' + t('in.paybackYou') + ' ' + paybackText(roi(c, p.salary)) + ' | ' + Object.entries(c.cutoffs).map(([k, v]) => examLabel(k) + ' ' + fmtBand(k, v[0], v[1])).join(', ');
    }).join('\n') + '\n' + t('img.footer');
  }
  function toggleStar(name) {
    shortlist = shortlist.includes(name) ? shortlist.filter((n) => n !== name) : shortlist.concat([name]);
    saveShort(); finder();
  }

  // ---- fee vs salary chart ----
  function chart() {
    const pts = ID.colleges.filter((c) => c.fee && c.salary);
    const W = 760, H = 420, m = { l: 56, r: 16, t: 16, b: 44 };
    const xmax = Math.ceil(Math.max(...pts.map((c) => c.fee[0])) / 500000) * 5, ymax = Math.ceil(Math.max(...pts.map((c) => c.salary[0])) / 500000) * 5;
    const x = (v) => m.l + (v / 100000 / xmax) * (W - m.l - m.r), y = (v) => H - m.b - (v / 100000 / ymax) * (H - m.t - m.b);
    let g = '';
    for (let i = 0; i <= 5; i++) {
      const xv = (xmax * i) / 5, yv = (ymax * i) / 5;
      g += '<line x1="' + x(xv * 1e5) + '" x2="' + x(xv * 1e5) + '" y1="' + m.t + '" y2="' + (H - m.b) + '" stroke="var(--line)"/><text x="' + x(xv * 1e5) + '" y="' + (H - m.b + 16) + '" text-anchor="middle" font-size="11" fill="var(--muted)">₹' + xv + 'L</text>';
      g += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y(yv * 1e5) + '" y2="' + y(yv * 1e5) + '" stroke="var(--line)"/><text x="' + (m.l - 6) + '" y="' + (y(yv * 1e5) + 4) + '" text-anchor="end" font-size="11" fill="var(--muted)">₹' + yv + 'L</text>';
    }
    g += '<text x="' + (W / 2) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="12" fill="var(--muted)">' + esc(t('in.fee')) + '</text>';
    g += '<text x="14" y="' + (H / 2) + '" text-anchor="middle" font-size="12" fill="var(--muted)" transform="rotate(-90 14 ' + (H / 2) + ')">' + esc(t('in.salary')) + '</text>';
    // Reference line: one year of salary equals the whole fee.
    const lim = Math.min(xmax, ymax) * 1e5;
    g += '<line x1="' + x(0) + '" y1="' + y(0) + '" x2="' + x(lim) + '" y2="' + y(lim) + '" stroke="var(--muted)" stroke-dasharray="4 4"/>';
    const colors = ['var(--a)', 'var(--c3)', 'var(--b)', 'var(--c4)', 'var(--c5)'];
    // Label a dot only when its label has room; shortlisted and better-known (lower NIRF) colleges get first pick.
    const placed = [];
    const order = pts.slice().sort((a, b) => (shortlist.includes(b.name) - shortlist.includes(a.name)) || ((a.nirf || 999) - (b.nirf || 999)));
    const labelled = new Set();
    order.forEach((c) => {
      const cx = x(c.fee[0]), cy = y(c.salary[0]), w = c.name.replace(/\s*\(.*\)/, '').length * 6.2;
      const box = [cx + 8, cy - 8, cx + 10 + w, cy + 7];
      if (box[2] > W || placed.some((p) => !(box[2] < p[0] || box[0] > p[2] || box[3] < p[1] || box[1] > p[3]))) return;
      placed.push(box); labelled.add(c.name);
    });
    pts.forEach((c, i) => {
      const cx = x(c.fee[0]), cy = y(c.salary[0]), on = shortlist.includes(c.name);
      const short = labelled.has(c.name) ? c.name.replace(/\s*\(.*\)/, '') : '';
      g += '<g class="dot' + (on ? ' on' : '') + '" data-star="' + esc(c.name) + '" tabindex="0" role="button" aria-label="' + esc(c.name + ': ' + lakh(c.fee[0]) + ', ' + lakh(c.salary[0])) + '">' +
        '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + (on ? 8 : 6) + '" fill="' + colors[i % colors.length] + '"/>' +
        '<text x="' + (cx + 9).toFixed(1) + '" y="' + (cy + 4).toFixed(1) + '" font-size="10.5" fill="var(--text)">' + esc(short) + '</text><title>' + esc(c.name) + '</title></g>';
    });
    $('feeChart').innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="min-width:560px">' + g + '</svg>';
  }

  function examGrid() {
    $('examGrid').innerHTML = ID.exams.map((e) => '<article class="exam"><div class="ecode">' + examLabel(e.code) + '</div><b>' + esc(e.name) + '</b>' +
      '<dl><div><dt>' + t('in.by') + '</dt><dd>' + esc(e.by) + '</dd></div><div><dt>' + t('in.scale') + '</dt><dd>' + esc(e.scale) + '</dd></div>' +
      '<div><dt>' + t('in.when') + '</dt><dd>' + esc(e.when) + '</dd></div><div><dt>' + t('in.used') + '</dt><dd>' + esc(e.usedBy) + '</dd></div></dl>' +
      (e.url ? '<a href="' + esc(e.url) + '" target="_blank" rel="noopener">' + t('in.site') + ' ↗</a>' : '') + '</article>').join('');
  }

  // ---- college table (sortable) ----
  function table() {
    const p = profile(), q = ($('collegeSearch').value || '').trim().toLowerCase();
    const val = {
      nirf: (c) => c.nirf || 999, name: (c) => c.name, city: (c) => c.city, fee: (c) => (c.fee ? c.fee[0] : 1e12),
      salary: (c) => (c.salary ? -c.salary[0] : 0), payback: (c) => { const r = roi(c, p.salary); return r && r.payback !== null ? r.payback : 99; },
    };
    const list = ID.colleges.filter((c) => !q || (c.name + ' ' + c.city).toLowerCase().includes(q)).sort((a, b) => {
      const va = val[tableSort.key](a), vb = val[tableSort.key](b);
      return (typeof va === 'string' ? va.localeCompare(vb) : va - vb) * tableSort.dir;
    });
    const th = (key, label) => '<th><button type="button" class="sorter" data-sort="' + key + '" aria-sort="' + (tableSort.key === key ? (tableSort.dir > 0 ? 'ascending' : 'descending') : 'none') + '">' + label + (tableSort.key === key ? (tableSort.dir > 0 ? ' ▲' : ' ▼') : '') + '</button></th>';
    $('collegeTable').innerHTML = '<tr>' + th('nirf', t('th.rank')) + th('name', t('th.college')) + th('city', t('th.city')) + th('fee', t('in.fee')) + th('salary', t('in.salary')) + th('payback', t('in.paybackYou')) + '<th>' + t('th.exams') + '</th><th></th></tr>' +
      list.map((c) => {
        const cuts = Object.entries(c.cutoffs), on = shortlist.includes(c.name);
        return '<tr><td class="num">' + (c.nirf || '—') + '</td><td><b>' + esc(c.name) + '</b></td><td>' + esc(c.city) + '</td><td class="num">' + lakh(c.fee && c.fee[0]) + '</td><td class="num">' + lakh(c.salary && c.salary[0]) + '</td><td class="num">' + paybackText(roi(c, p.salary)) + '</td><td>' +
          (cuts.length ? cuts.map(([k, v]) => '<span class="chip">' + examLabel(k) + ' ' + fmtBand(k, v[0], v[1]) + '</span>').join(' ') : '<span class="muted">' + t('in.noCut') + '</span>') +
          '</td><td><button type="button" class="star' + (on ? ' on' : '') + '" data-star="' + esc(c.name) + '" aria-pressed="' + on + '" aria-label="' + esc(t('in.star')) + ': ' + esc(c.name) + '">★</button></td></tr>';
      }).join('');
    $('indiaSources').innerHTML = t('in.sources') + ': ' + Object.values(ID.sources).map((s) => '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.label) + '</a>').join(' · ');
  }

  // ---- events ----
  $('examTabs').addEventListener('click', (e) => { const b = e.target.closest('button[data-ex]'); if (b) pickExam(b.dataset.ex); });
  ['examScore', 'pCat', 'pGender', 'pSalary', 'pBudget', 'pSort'].forEach((id) => $(id).addEventListener('input', finder));
  $('collegeSearch').addEventListener('input', table);
  $('india').addEventListener('click', (e) => {
    const s = e.target.closest('[data-star]'); if (s) { toggleStar(s.dataset.star); return; }
    const u = e.target.closest('[data-uncmp]'); if (u) { compare = compare.filter((n) => n !== u.dataset.uncmp); finder(); return; }
    const so = e.target.closest('[data-sort]');
    if (so) { tableSort = { key: so.dataset.sort, dir: tableSort.key === so.dataset.sort ? -tableSort.dir : 1 }; table(); }
  });
  $('india').addEventListener('keydown', (e) => { const d = e.target.closest('g.dot'); if (d && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleStar(d.dataset.star); } });
  $('india').addEventListener('change', (e) => {
    const c = e.target.closest('[data-cmp]'); if (!c) return;
    const n = c.dataset.cmp;
    if (c.checked && !compare.includes(n)) {
      if (compare.length >= 3) { c.checked = false; $('finderHead').textContent = t('in.cmpMax'); return; }
      compare.push(n);
    } else if (!c.checked) compare = compare.filter((x) => x !== n);
    renderCompare();
    if (compare.length) $('compareCard').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  $('shortCopy').addEventListener('click', () => {
    const text = shortText(), said = $('shortSaid');
    try { navigator.clipboard.writeText(text).then(() => { said.textContent = t('msg.summary'); }, () => { said.textContent = t('copy.manual'); }); } catch (e) { said.textContent = t('copy.manual'); }
  });
  $('shortPrint').addEventListener('click', () => window.print());
  document.addEventListener('langchange', () => { finder(); examGrid(); });

  $('examScore').value = START[exam];
  tabs(); finder(); examGrid();
})();
