(function () {
  const W = window.WORLD, D = window.COUNTRY_DATA, FX = window.FX_DATA, P = window.Project;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const byCode = Object.fromEntries(D.countries.map((c) => [c.code, c]));
  const FIGS = [['tuition', 'fig.tuition', 'fee'], ['living', 'fig.living', 'fee'], ['postSalary', 'fig.postSalary', 'sal']];
  const cname = (c) => I18N.country(c.code, c.name);
  const LBL = { 'tuition': 'f.tuition', 'living cost': 'f.living', 'starting salary': 'f.salary', 'programme length': 'f.length' };
  const tl = (list) => list.map((x) => t(LBL[x] || x)).join(', ');
  // Zoom framing: leave out territories that would stretch the view (Russia's far east, French Guiana, Pacific islands).
  const FRAME_SKIP = { EU: ['RU', 'FR'], OC: null };
  const OC_FRAME = ['AU', 'NZ', 'PG'];
  const HORIZON = { from: FX.asOf, years: 10 };

  let current = { cont: null, country: null };
  // Each destination gets its own bright accent; airport codes make the boarding pass feel real.
  const ACCENTS = ['var(--a)', 'var(--c3)', 'var(--b)', 'var(--c4)', 'var(--c5)'];
  const accentOf = Object.fromEntries(D.countries.map((c, i) => [c.code, ACCENTS[i % ACCENTS.length]]));
  const AIRPORT = { IN: 'HYD', CN: 'PVG', GB: 'LHR', FR: 'CDG', ES: 'MAD', US: 'SFO', CA: 'YYZ', AU: 'SYD', ZA: 'CPT' };

  // Plain-word anchors (e.g. #europe, #united-kingdom) so links to a view work when shared.
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const CONT_SLUG = Object.fromEntries(Object.entries(W.continents).map(([k, v]) => [k, slug(v)]));
  const countryHash = (code) => '#' + slug(byCode[code].name);
  const contHash = (cont) => '#' + CONT_SLUG[cont];

  // ---- formatting ----
  const fmt = (v, cur) => (v === null || v === undefined || !isFinite(v)) ? '—'
    : new Intl.NumberFormat(cur === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(v);
  const rate = (v) => (v >= 100 ? v.toFixed(2) : v.toFixed(4));
  const label = (at) => I18N.monthYear(at);
  const at = () => $('atYear').value + '-' + String(Number($('atMonth').value)).padStart(2, '0');
  const disp = () => $('dispCur').value;
  const extra = (kind) => Number($(kind === 'fee' ? 'feeExtra' : 'salExtra').value) || 0;
  const est = (c, key, when) => {
    const f = c[key];
    if (!f) return null;
    return P.projectFigure(FX, f, c.currency, when, extra(FIGS.find((x) => x[0] === key)[2]));
  };

  // ---- controls ----
  function initControls() {
    monthOptions();
    const y0 = Number(FX.asOf.slice(0, 4));
    let years = '';
    for (let y = y0 - 2; y <= y0 + HORIZON.years; y++) years += '<option>' + y + '</option>';
    $('atYear').innerHTML = years;
    // Default to this month, kept inside the table range.
    const now = new Date();
    let n = now.getFullYear() * 12 + now.getMonth();
    n = Math.min(Math.max(n, P.ym((y0 - 2) + '-01')), P.ym(FX.asOf) + HORIZON.years * 12);
    const d = P.ymString(n);
    $('atYear').value = d.slice(0, 4); $('atMonth').value = String(Number(d.slice(5)));
    $('dispCur').innerHTML = Object.keys(FX.currencies).map((c) => '<option>' + c + '</option>').join('');
    $('dispCur').value = FX.currencies[window.MBAApp.currency] ? window.MBAApp.currency : 'USD';
    $('checked').textContent = t('map.checked', { date: label(D.checked) });
    $('trustDate').textContent = t('trust.updated', { date: label(D.checked) });
    ['atMonth', 'atYear', 'dispCur', 'feeExtra', 'salExtra'].forEach((id) => $(id).addEventListener('input', renderPanels));
  }

  function monthOptions() {
    const v = $('atMonth').value;
    $('atMonth').innerHTML = Array.from({ length: 12 }, (_, i) => '<option value="' + (i + 1) + '">' + I18N.monthName(i + 1) + '</option>').join('');
    if (v) $('atMonth').value = v;
  }

  // ---- map ----
  function drawMap() {
    const svg = $('world');
    svg.setAttribute('viewBox', '0 0 ' + W.width + ' ' + W.height);
    svg.innerHTML = W.countries.map((c) => {
      const has = !!byCode[c.id];
      return '<path class="cty' + (has ? ' has' : '') + '" data-id="' + c.id + '" data-cont="' + c.continent + '" d="' + c.d + '"' + (has ? ' style="--cty:' + accentOf[c.id] + '"' : '') +
        (has ? ' tabindex="0" role="button" aria-label="' + esc(c.name) + '"' : '') + '><title>' + esc(c.name) + '</title></path>';
    }).join('') + flightLayer();
    svg.addEventListener('click', (e) => {
      const city = e.target.closest('.city'); if (city) { go(countryHash(city.dataset.id)); return; }
      const p = e.target.closest('path.cty'); if (!p) return;
      if (current.cont !== p.dataset.cont) go(contHash(p.dataset.cont));
      else if (byCode[p.dataset.id]) go(countryHash(p.dataset.id));
    });
    svg.addEventListener('keydown', (e) => {
      const p = e.target.closest('path.has');
      if (p && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); go(countryHash(p.dataset.id)); }
    });
    svg.addEventListener('mousemove', (e) => {
      const p = e.target.closest('path.cty'), tip = $('tip');
      if (!p) { tip.hidden = true; return; }
      const name = I18N.country(p.dataset.id, W.countries.find((c) => c.id === p.dataset.id).name);
      tip.textContent = name + ' · ' + t('cont.' + p.dataset.cont) + (byCode[p.dataset.id] ? ' · ' + t('map.dataAvail') : '');
      const box = $('mapwrap').getBoundingClientRect();
      tip.style.left = (e.clientX - box.left + 12) + 'px'; tip.style.top = (e.clientY - box.top + 12) + 'px';
      tip.hidden = false;
    });
    svg.addEventListener('mouseleave', () => { $('tip').hidden = true; });

    contChips();
    $('contlist').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) go(b.dataset.c ? contHash(b.dataset.c) : '#map'); });
  }

  function contChips() {
    $('contlist').innerHTML = '<button type="button" data-c="">' + t('map.world') + '</button>' + Object.keys(W.continents).map((c) => {
      const n = D.countries.filter((x) => x.continent === c).length;
      return '<button type="button" data-c="' + c + '">' + t('cont.' + c) + ' <span>' + (n ? t('map.withData', { n }) : t('map.noData')) + '</span></button>';
    }).join('');
    highlightChips();
  }
  function highlightChips() {
    $('contlist').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.c || null) === current.cont)));
  }

  // Flight paths between the cities that have data, with pulsing dots and moving planes.
  function flightLayer() {
    const cs = W.cities.filter((c) => byCode[c.id]);
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pairs = [];
    cs.forEach((a, i) => {
      const near = cs.filter((b) => b !== a).sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y));
      [near[0], near[2]].forEach((b) => { if (b && !pairs.some(([x, y]) => (x === b && y === a) || (x === a && y === b))) pairs.push([a, b]); });
    });
    let g = '<g class="flights">';
    pairs.forEach(([a, b], i) => {
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, d = Math.hypot(b.x - a.x, b.y - a.y);
      const path = 'M' + a.x + ' ' + a.y + ' Q' + mx.toFixed(1) + ' ' + (my - d * 0.28).toFixed(1) + ' ' + b.x + ' ' + b.y;
      g += '<path class="arc" style="--arc:' + accentOf[a.id] + '" d="' + path + '"></path>';
      if (!still) g += '<circle class="plane" r="1.7"><animateMotion dur="' + (5 + (i % 4)) + 's" begin="' + (i * 0.7).toFixed(1) + 's" repeatCount="indefinite" path="' + path + '"></animateMotion></circle>';
    });
    cs.forEach((c) => {
      g += '<circle class="ring" style="--cty:' + accentOf[c.id] + '" cx="' + c.x + '" cy="' + c.y + '" r="2.6"></circle>' +
        '<circle class="city" style="--cty:' + accentOf[c.id] + '" data-id="' + c.id + '" cx="' + c.x + '" cy="' + c.y + '" r="2.6"><title>' + esc(c.name) + ', ' + esc(byCode[c.id].name) + '</title></circle>';
    });
    return g + '</g>';
  }

  function frame(cont) {
    const svg = $('world');
    if (!cont) { svg.setAttribute('viewBox', '0 0 ' + W.width + ' ' + W.height); return; }
    const paths = [...svg.querySelectorAll('path.cty[data-cont="' + cont + '"]')].filter((p) =>
      cont === 'OC' ? OC_FRAME.includes(p.dataset.id) : !(FRAME_SKIP[cont] || []).includes(p.dataset.id));
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    paths.forEach((p) => { const b = p.getBBox(); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height); });
    const pad = 12, w = x1 - x0 + pad * 2, h = y1 - y0 + pad * 2;
    // Keep the map's aspect ratio so the zoom does not distort.
    const ratio = W.width / W.height;
    const vw = Math.max(w, h * ratio), vh = vw / ratio;
    svg.setAttribute('viewBox', [x0 - pad - (vw - w) / 2, y0 - pad - (vh - h) / 2, vw, vh].map((v) => v.toFixed(1)).join(' '));
  }

  function highlight() {
    $('world').querySelectorAll('path.cty').forEach((p) => {
      p.classList.toggle('dim', !!current.cont && p.dataset.cont !== current.cont);
      p.classList.toggle('sel', p.dataset.id === current.country);
    });
    $('contlist').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.c || null) === current.cont)));
  }

  // ---- panels ----
  function contPanel() {
    const el = $('contpanel');
    if (!current.cont) { el.hidden = true; return; }
    el.hidden = false;
    const list = D.countries.filter((c) => c.continent === current.cont);
    const when = at(), dc = disp();
    let h = '<h2>' + esc(t('cont.title', { cont: t('cont.' + current.cont), date: label(when) })) + '</h2>';
    if (!list.length) { el.innerHTML = h + '<p>' + esc(t('cont.none')) + '</p>'; return; }
    h += '<div class="scroll"><table class="data"><tr><th>' + t('th.country') + '</th><th>' + t('th.programme') + '</th><th>' + t('th.tuition', { cur: dc }) + '</th><th>' + t('th.salary', { cur: dc }) + '</th><th>' + t('th.ratio') + '</th><th></th></tr>';
    list.forEach((c) => {
      const tu = P.convert(FX, est(c, 'tuition', when), c.currency, dc, when);
      const s = P.convert(FX, est(c, 'postSalary', when), c.currency, dc, when);
      h += '<tr><td>' + esc(cname(c)) + '</td><td>' + esc(c.programme) + '</td><td>' + (c.tuition ? fmt(tu, dc) : t('nodata')) + '</td><td>' + (c.postSalary ? fmt(s, dc) : t('nodata')) +
        '</td><td>' + (c.tuition && c.postSalary ? (s / tu).toFixed(2) + '×' : '—') + '</td><td><a href="' + countryHash(c.code) + '">' + t('th.details') + '</a></td></tr>';
    });
    el.innerHTML = h + '</table></div><p class="note">' + esc(t('cont.note')) + '</p>';
  }

  function priceRows(c, step, count) {
    return P.table(HORIZON.from, count, step, (when) => {
      const r = { fx: P.fxRate(FX, c.currency, when) };
      FIGS.forEach(([k]) => { r[k] = est(c, k, when); });
      r.tuitionDisp = r.tuition === null ? null : P.convert(FX, r.tuition, c.currency, disp(), when);
      return r;
    });
  }
  function priceTable(c, rows) {
    const cols = FIGS.filter(([k]) => c[k]);
    let h = '<table class="data"><tr><th>' + t('th.month') + '</th>' + cols.map(([, l]) => '<th>' + t(l) + ' (' + c.currency + ')</th>').join('') +
      '<th>' + t('th.perUsd', { cur: c.currency }) + '</th>' + (c.tuition && disp() !== c.currency ? '<th>' + t('th.tuition', { cur: disp() }) + '</th>' : '') + '</tr>';
    rows.forEach((r) => {
      h += '<tr><td>' + label(r.at) + '</td>' + cols.map(([k]) => '<td>' + fmt(r[k], c.currency) + '</td>').join('') + '<td>' + rate(r.fx) + '</td>' +
        (c.tuition && disp() !== c.currency ? '<td>' + fmt(r.tuitionDisp, disp()) + '</td>' : '') + '</tr>';
    });
    return h + '</table>';
  }

  function countryPanel() {
    const el = $('countrypanel');
    const c = byCode[current.country];
    if (!c) { el.hidden = true; return; }
    el.hidden = false;
    const when = at(), dc = disp();
    let h = '<h2>' + esc(cname(c)) + ' · ' + esc(c.programme) + '</h2>' +
      '<p class="warn">' + esc(t('c.warn', { date: label(when) })) + '</p>' +
      '<div class="scroll"><table class="data"><tr><th>' + t('th.figure') + '</th><th>' + t('th.reported') + '</th><th>' + esc(t('th.estimated', { date: label(when) })) + '</th><th>' + t('th.in', { cur: dc }) + '</th><th>' + t('th.source') + '</th></tr>';
    FIGS.forEach(([k, l]) => {
      const f = c[k];
      if (!f) { h += '<tr><td>' + t(l) + '</td><td colspan="4" class="muted">' + t('c.noFig') + '</td></tr>'; return; }
      const e = est(c, k, when), s = c.sources[f.src];
      h += '<tr><td>' + t(l) + '</td><td>' + fmt(f.value, c.currency) + '<br><span class="muted">' + label(f.asOf) + '</span></td><td>' + fmt(e, c.currency) + '</td><td>' +
        fmt(P.convert(FX, e, c.currency, dc, when), dc) + '</td><td><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.label) + '</a><br><span class="muted">' +
        t(f.confidence === 'school' ? 'c.school' : 'c.publisher') + '. ' + esc(f.note) + '</span></td></tr>';
    });
    h += '</table></div>' + (I18N.lang !== 'en' ? '<p class="muted">' + t('c.notesEn') + '</p>' : '');
    if (c.programMonths) h += '<p>' + t('c.length', { n: c.programMonths }) + '</p>';
    if (c.missing) h += '<p class="muted">' + esc(c.missing) + '</p>';
    h += '<div class="actions"><button type="button" data-load="A">' + t('c.loadA') + '</button><button type="button" data-load="B" class="ghost">' + t('c.loadB') + '</button>' +
      '<button type="button" class="ghost" data-copy="year">' + t('c.copyYear') + '</button><button type="button" class="ghost" data-copy="month">' + t('c.copyMonth') + '</button><button type="button" class="ghost web-only" data-print>' + t('b.print') + '</button><span class="muted" data-said role="status"></span></div>';
    h += '<h3>' + esc(t('c.tableTitle', { from: label(HORIZON.from), to: label(P.ymString(P.ym(HORIZON.from) + HORIZON.years * 12)) })) + '</h3>' +
      '<p class="note">' + esc(t('c.tableNote')) + '</p>' +
      '<div class="scroll">' + priceTable(c, priceRows(c, 12, HORIZON.years + 1)) + '</div>' +
      '<details><summary>' + t('c.monthly', { n: HORIZON.years * 12 + 1 }) + '</summary><div class="scroll">' + priceTable(c, priceRows(c, 1, HORIZON.years * 12 + 1)) + '</div></details>';
    el.innerHTML = h;
    el.querySelectorAll('[data-load]').forEach((b) => b.addEventListener('click', () => load(c, b.dataset.load)));
    el.querySelector('[data-print]').addEventListener('click', () => window.print());
    el.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', () => {
      const rows = b.dataset.copy === 'year' ? priceRows(c, 12, HORIZON.years + 1) : priceRows(c, 1, HORIZON.years * 12 + 1);
      const cols = FIGS.filter(([k]) => c[k]);
      const text = [['Month'].concat(cols.map(([, l]) => l + ' (' + c.currency + ')'), [c.currency + ' per USD'])].concat(
        rows.map((r) => [label(r.at)].concat(cols.map(([k]) => Math.round(r[k])), [rate(r.fx)]))).map((r) => r.join('\t')).join('\n');
      copyText(text, el.querySelector('[data-said]'));
    }));
  }

  function fxPanel() {
    const curs = Object.keys(FX.currencies).filter((c) => c !== FX.base);
    const tbl = (step, count) => {
      let h = '<table class="data"><tr><th>' + t('th.month') + '</th>' + curs.map((c) => '<th>' + c + '</th>').join('') + '</tr>';
      P.table(HORIZON.from, count, step, (when) => Object.fromEntries(curs.map((c) => [c, P.fxRate(FX, c, when)]))).forEach((r) => {
        h += '<tr><td>' + label(r.at) + '</td>' + curs.map((c) => '<td>' + rate(r[c]) + '</td>').join('') + '</tr>';
      });
      return h + '</table>';
    };
    $('fxpanel').innerHTML = '<h2>' + esc(t('fx.title', { n: HORIZON.years })) + '</h2>' +
      '<p class="note">' + esc(t('fx.note', { date: label(FX.asOf) })) + '</p>' +
      '<div class="scroll">' + tbl(12, HORIZON.years + 1) + '</div>' +
      '<details><summary>' + t('fx.monthly') + '</summary><div class="scroll">' + tbl(1, HORIZON.years * 12 + 1) + '</div></details>' +
      '<h3>' + t('fx.assump') + '</h3><div class="scroll"><table class="data"><tr><th>' + t('th.currency') + '</th><th>' + t('th.rate') + '</th><th>' + t('th.rateSrc') + '</th><th>' + t('th.infl') + '</th><th>' + t('th.basis') + '</th></tr>' +
      Object.entries(FX.currencies).map(([c, v]) => '<tr><td>' + c + '</td><td>' + rate(v.perUsd) + '</td><td>' + esc(v.rateNote) + '</td><td>' + v.inflation + '%</td><td>' + esc(v.inflationNote) + '</td></tr>').join('') +
      '</table></div><p class="note">' + FX.sources.map((s) => '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.label) + '</a>').join(' · ') + '</p>' +
      '<div class="actions"><button type="button" class="ghost" id="fxCopy">' + t('fx.copy') + '</button><button type="button" class="ghost web-only" id="fxPrint">' + t('b.print') + '</button><span class="muted" id="fxSaid" role="status"></span></div>';
    $('fxPrint').addEventListener('click', () => window.print());
    $('fxCopy').addEventListener('click', () => {
      const rows = P.table(HORIZON.from, HORIZON.years * 12 + 1, 1, (when) => Object.fromEntries(curs.map((c) => [c, P.fxRate(FX, c, when)])));
      copyText([['Month'].concat(curs.map((c) => c + ' per USD'))].concat(rows.map((r) => [label(r.at)].concat(curs.map((c) => rate(r[c]))))).map((r) => r.join('\t')).join('\n'), $('fxSaid'));
    });
  }

  // Clipboard writes must run inside the click; if refused, show the text so it can be copied by hand.
  function copyText(text, said) {
    const fallback = () => {
      let ta = said.parentNode.querySelector('textarea');
      if (!ta) { ta = document.createElement('textarea'); ta.rows = 4; ta.style.flexBasis = '100%'; ta.setAttribute('aria-label', 'Text to copy'); said.parentNode.appendChild(ta); }
      ta.value = text; ta.select(); said.textContent = t('copy.manual');
    };
    try { navigator.clipboard.writeText(text).then(() => { said.textContent = t('copy.done'); }, fallback); } catch (e) { fallback(); }
  }

  function renderPanels() { contPanel(); countryPanel(); fxPanel(); }

  // ---- load into calculator ----
  function load(c, key) {
    const when = at(), cur = window.MBAApp.currency;
    const r = P.countryProgram(FX, c, cur, when, { fee: extra('fee'), sal: extra('sal') });
    window.MBAApp.loadProgram(key, r.fields);
    const note = $('loadnote');
    note.hidden = false;
    note.innerHTML = t('load.note', { prog: esc(c.programme), key, used: tl(r.used), date: label(when),
      conv: c.currency !== cur ? t('load.conv', { cur, rate: rate(P.convert(FX, 1, c.currency, cur, when)), from: c.currency }) : '',
      missing: r.missing.length ? t('load.missing', { list: tl(r.missing) }) : '' });
    go('#calc');
    if (window.Fun) window.Fun.confetti(innerWidth / 2, innerHeight / 3);
  }

  // ---- routing ----
  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
  function setView(v) {
    document.body.dataset.view = v;
    $('home').hidden = v !== 'map'; $('calc').hidden = v !== 'calc'; $('india').hidden = v !== 'india';
    document.dispatchEvent(new CustomEvent('viewchange', { detail: v }));
  }
  // Scroll a section into view once the view has rendered; hidden sections fall back to the view's top.
  function scrollToSection(id, fallback) {
    requestAnimationFrame(() => {
      const el = $(id);
      const target = el && !el.hidden ? el : fallback ? $(fallback) : null;
      if (target) target.scrollIntoView({ block: 'start', behavior: 'smooth' }); else window.scrollTo(0, 0);
    });
  }
  function route() {
    const h = location.hash.slice(1);
    // Section anchors from the sidebar (#finder, #rates, #glossary...), defined in nav.js.
    const sec = (window.NAV_SECTIONS || {})[h];
    if (sec) {
      setView(sec.view);
      if (sec.view === 'calc') window.MBAApp.refresh();
      if (sec.view === 'calc' && sec.id === 'glossary') $('glossary').open = true;
      if (sec.view === 'map') { current = { cont: null, country: null }; frame(null); highlight(); renderPanels(); }
      scrollToSection(sec.id, sec.fallback);
      return;
    }
    if (h === 'calc') { setView('calc'); window.MBAApp.refresh(); window.scrollTo(0, 0); return; }
    if (h === 'india') { setView('india'); window.scrollTo(0, 0); return; }
    setView('map');
    const cont = Object.keys(CONT_SLUG).find((k) => CONT_SLUG[k] === h);
    const ctry = D.countries.find((c) => slug(c.name) === h);
    if (ctry) current = { cont: ctry.continent, country: ctry.code };
    else if (cont) current = { cont, country: null };
    else current = { cont: null, country: null };
    frame(current.cont); highlight(); renderPanels();
    if (ctry) $('countrypanel').scrollIntoView({ block: 'start' });
    else if (cont) $('mapwrap').scrollIntoView({ block: 'center' });
  }

  // Print the full month-by-month tables too.
  let opened = [];
  window.addEventListener('beforeprint', () => { opened = [...document.querySelectorAll('details:not([open])')]; opened.forEach((d) => { d.open = true; }); });
  window.addEventListener('afterprint', () => { opened.forEach((d) => { d.open = false; }); });

  // ---- 30-second check and departures board ----
  const complete = D.countries.filter((c) => c.tuition && c.postSalary);
  const LOCALE_CUR = { IN: 'INR', GB: 'GBP', US: 'USD', CA: 'CAD', AU: 'AUD', ZA: 'ZAR', CN: 'CNY', FR: 'EUR', ES: 'EUR', DE: 'EUR', IT: 'EUR', NL: 'EUR', IE: 'EUR' };
  const compactMoney = (v, cur) => (v === null || !isFinite(v)) ? '—'
    : new Intl.NumberFormat(cur === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency: cur, notation: 'compact', maximumFractionDigits: 1 }).format(v);

  // Example pre-MBA salaries per currency, only so the check opens with a plausible number. Visitors replace it.
  const EXAMPLE_SALARY = { INR: 1500000, USD: 85000, EUR: 60000, GBP: 50000, CNY: 250000, CAD: 75000, AUD: 90000, ZAR: 450000 };

  function destOptions() {
    const v = $('qDest').value;
    $('qDest').innerHTML = complete.map((c) => '<option value="' + c.code + '">' + esc(cname(c) + ' · ' + c.programme.split(' (')[0]) + '</option>').join('');
    if (v) $('qDest').value = v;
  }

  function quickInit() {
    const region = (navigator.language || '').split('-')[1];
    const cur = LOCALE_CUR[region] || 'INR';
    $('qCur').innerHTML = Object.keys(FX.currencies).map((c) => '<option>' + c + '</option>').join('');
    $('qCur').value = cur;
    $('qSalary').value = EXAMPLE_SALARY[cur] || 60000;
    destOptions();
    $('qDest').value = cur === 'INR' ? 'GB' : 'US';
    let prevCur = cur;
    $('qCur').addEventListener('input', () => {
      $('qSalary').value = EXAMPLE_SALARY[$('qCur').value] || Math.round(P.convert(FX, Number($('qSalary').value) || 0, prevCur, $('qCur').value, P.nowYm()) / 1000) * 1000;
      prevCur = $('qCur').value; quick(); board();
    });
    ['qSalary', 'qDest'].forEach((id) => $(id).addEventListener('input', quick));
    $('quick').addEventListener('submit', (e) => {
      e.preventDefault();
      const c = byCode[$('qDest').value], cur2 = $('qCur').value;
      window.MBAApp.setCurrency(cur2);
      window.MBAApp.setShared({ currentSalary: Number($('qSalary').value) || 0 });
      const r = P.countryProgram(FX, c, cur2, P.nowYm());
      window.MBAApp.loadProgram('A', r.fields);
      const note = $('loadnote');
      note.hidden = false;
      note.innerHTML = t('load.quick', { prog: esc(c.programme), missing: r.missing.length ? t('load.missing', { list: tl(r.missing) }) : '' });
      go('#calc');
      if (window.Fun) window.Fun.confetti(innerWidth / 2, innerHeight / 3);
    });
    quick();
  }

  let lastRating = null;
  function quick() {
    const c = byCode[$('qDest').value], cur = $('qCur').value, now = P.nowYm();
    const f = P.countryProgram(FX, c, cur, now).fields;
    const p = { currentSalary: Number($('qSalary').value) || 0, currentGrowth: 6, postGrowth: 8, discountRate: 9, horizonYears: 20, tax: 20,
      postSalary: f.postSalary, tuition: f.tuition, living: f.living || 0, programYears: f.programYears || 2, loan: 0, loanRate: 10, loanTermYears: 7 };
    const r = Finance.analyse(p);
    const rating = Finance.rating(r.irr, 9);
    const city = W.cities.find((x) => x.id === c.code);
    $('qCity').textContent = city ? city.name : c.name;
    $('qCode').textContent = AIRPORT[c.code] || c.code;
    const st = (l, v, cls, num) => '<div class="stat"><b class="' + (cls || '') + '"' + (num !== undefined ? ' data-to="' + num + '"' : '') + '>' + v + '</b><span>' + l + '</span></div>';
    $('qOut').innerHTML =
      st(t('q.payback'), r.payback === null ? t('q.over', { n: 20 }) : t('q.years', { n: r.payback.toFixed(1) }), r.payback === null ? 'neg' : '') +
      st(t('q.value'), fmt(r.npv, cur), r.npv >= 0 ? 'pos' : 'neg', r.npv) +
      st(t('q.salaryThere'), fmt(f.postSalary, cur), '', f.postSalary) +
      '<div class="stat"><b><span class="stamp ' + rating.toLowerCase() + (rating !== lastRating ? ' pop' : '') + '">' + t('r.' + rating) + '</span></b><span>' + t('q.verdict') + '</span></div>';
    // Count money up from zero so the result lands with a little drama.
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      $('qOut').querySelectorAll('b[data-to]').forEach((b) => {
        const to = Number(b.dataset.to), t0 = performance.now();
        const step = (t) => { const k = Math.min(1, (t - t0) / 650), e = 1 - Math.pow(1 - k, 3); b.textContent = fmt(to * e, cur); if (k < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      });
    }
    if (rating === 'Strong' && lastRating !== 'Strong' && lastRating !== null && window.Fun) {
      const box = $('qOut').getBoundingClientRect();
      window.Fun.confetti(box.left + box.width / 2, box.top + box.height / 2);
    }
    lastRating = rating;
    $('qNote').textContent = t('q.note', { src: c.sources.map((s) => s.label.split(':')[0]).filter((v, i, a) => a.indexOf(v) === i).join(', '), date: label(now) }) + (c.living ? '' : ' ' + t('q.noLiving'));
    rank();
  }

  // Ranking: every destination with full data, sorted by how fast the visitor's own salary pays it back.
  function rank() {
    const cur = $('qCur').value, now = P.nowYm(), sal = Number($('qSalary').value) || 0;
    const rows = complete.map((c) => {
      const f = P.countryProgram(FX, c, cur, now).fields;
      const r = Finance.analyse({ currentSalary: sal, currentGrowth: 6, postGrowth: 8, discountRate: 9, horizonYears: 20, tax: 20,
        postSalary: f.postSalary, tuition: f.tuition, living: f.living || 0, programYears: f.programYears || 2, loan: 0, loanRate: 10, loanTermYears: 7 });
      return { c, r };
    }).sort((x, y) => (x.r.payback ?? 99) - (y.r.payback ?? 99));
    const max = Math.max(...rows.map((x) => x.r.payback ?? 20), 1);
    $('rankBars').innerHTML = rows.map(({ c, r }, i) => {
      const w = r.payback === null ? 100 : Math.max(6, (r.payback / max) * 100);
      return '<a class="rbar" href="' + countryHash(c.code) + '" style="--w:' + w.toFixed(1) + '%;--cty:' + accentOf[c.code] + ';--i:' + i + '">' +
        '<span class="rname"><b>' + (i + 1) + '</b> ' + esc((c.short || c.programme) + ' · ' + cname(c)) + '</span>' +
        '<span class="rtrack"><span class="rfill"></span></span>' +
        '<span class="rval">' + (r.payback === null ? t('rank.never') : t('q.years', { n: r.payback.toFixed(1) })) + '</span></a>';
    }).join('');
  }

  function langInit() {
    $('lang').innerHTML = Object.entries(I18N.LANGS).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('');
    $('lang').value = I18N.lang;
    $('lang').addEventListener('input', () => I18N.setLang($('lang').value));
    document.addEventListener('langchange', () => {
      monthOptions(); destOptions(); contChips(); quick();
      $('checked').textContent = t('map.checked', { date: label(D.checked) });
      $('trustDate').textContent = t('trust.updated', { date: label(D.checked) });
      frame(current.cont); highlight(); renderPanels();
    });
  }

  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let boardTimer = null;
  function board() {
    const cur = $('qCur').value, now = P.nowYm();
    const rows = D.countries.map((c) => {
      const city = (W.cities.find((x) => x.id === c.code) || { name: c.name }).name;
      const t = c.tuition ? compactMoney(P.convert(FX, P.projectFigure(FX, c.tuition, c.currency, now, 2), c.currency, cur, now), cur) : '—';
      const s = c.postSalary ? compactMoney(P.convert(FX, P.projectFigure(FX, c.postSalary, c.currency, now, 1), c.currency, cur, now), cur) : '—';
      return { code: c.code, cells: [city.toUpperCase(), (c.short || c.programme.split(' ')[0]).toUpperCase(), t.toUpperCase(), s.toUpperCase()], ok: !!(c.tuition && c.postSalary) };
    });
    $('boardRows').innerHTML = rows.map((r) => '<div class="brow" role="link" tabindex="0" data-code="' + r.code + '" aria-label="' + esc(r.cells[0] + ', ' + r.cells[1] + ', tuition ' + r.cells[2] + ', salary ' + r.cells[3]) + '">' +
      r.cells.map((t) => '<span class="flaps" aria-hidden="true">' + [...t].map((ch) => '<i data-c="' + esc(ch) + '">' + esc(ch === ' ' ? '\u00a0' : ch) + '</i>').join('') + '</span>').join('') +
      '<span class="flaps" aria-hidden="true">' + [...(r.ok ? 'FULL' : 'PART')].map((ch) => '<i class="' + (r.ok ? 'status-ok' : 'status-part') + '">' + ch + '</i>').join('') + '</span></div>').join('');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Split-flap: every character spins through random letters, then settles, row by row.
    const cells = [...$('boardRows').querySelectorAll('i[data-c]')].filter((i) => i.dataset.c.trim() && /[A-Z0-9]/.test(i.dataset.c));
    cells.forEach((i, n) => { i.dataset.left = String(6 + Math.floor(n / 6) % 14 + Math.floor(Math.random() * 6)); i.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]; });
    clearInterval(boardTimer);
    boardTimer = setInterval(() => {
      let busy = 0;
      cells.forEach((i) => {
        const left = Number(i.dataset.left);
        if (left <= 0) return;
        busy++; i.dataset.left = String(left - 1);
        i.textContent = left === 1 ? i.dataset.c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        i.classList.remove('flip'); void i.offsetWidth; i.classList.add('flip');
      });
      if (!busy) clearInterval(boardTimer);
    }, 70);
  }
  $('boardRows').addEventListener('click', (e) => { const r = e.target.closest('.brow'); if (r) go(countryHash(r.dataset.code)); });
  $('boardRows').addEventListener('keydown', (e) => { const r = e.target.closest('.brow'); if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); go(countryHash(r.dataset.code)); } });

  langInit();
  quickInit();
  board();
  $('dispCur') && initControls();
  drawMap();
  window.addEventListener('hashchange', route);
  route();
})();
