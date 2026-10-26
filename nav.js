// Sidebar: topic navigation, site search (colleges, countries, exams, topics, glossary), smart queries
// such as "SC CAT 80" or "under 10 lakh", recommended searches, mobile drawer and scroll-spy.
(function () {
  // ---------- pure helpers (also used by nav.test.js) ----------

  // Sidebar anchors that point at a section inside one of the three views.
  const NAV_SECTIONS = {
    overview: { view: 'map', id: 'hero' },
    ranking: { view: 'map', id: 'rank' },
    atlas: { view: 'map', id: 'atlas' },
    rates: { view: 'map', id: 'fxpanel' },
    sources: { view: 'map', id: 'sources' },
    glossary: { view: 'calc', id: 'glossary' },
    finder: { view: 'india', id: 'finderCard' },
    shortlist: { view: 'india', id: 'shortCard' },
    checklist: { view: 'india', id: 'checklistCard' },
    compare: { view: 'india', id: 'compareCard', fallback: 'finderCard' },
    chart: { view: 'india', id: 'chartCard' },
    colleges: { view: 'india', id: 'collegesCard' },
    exams: { view: 'india', id: 'examsCard' },
  };

  // Turn a typed query into finder settings: exam, score, category, gender, budget (₹ lakh) and sort order.
  function parseQuery(q) {
    let s = ' ' + String(q || '').toLowerCase().replace(/[,₹]/g, ' ') + ' ';
    const out = {};
    const b = s.match(/(?:under|below|less than|within|upto|up to|max|<)\s*(\d+(?:\.\d+)?)\s*(?:l|lakh|lakhs|lac|lacs)?\b/);
    if (b) { out.budget = +b[1]; s = s.replace(b[0], ' '); }
    const e = s.match(/\b(cat|xat|nmat|snap|cmat|mah[\s-]?cet|gmat|gre|ielts|toefl)\b/);
    if (e) { out.exam = e[1].replace(/[\s-]/g, '').toUpperCase(); s = s.replace(e[0], ' '); }
    const n = s.match(/(\d+(?:\.\d+)?)/);
    if (n && out.exam) out.score = +n[1];
    if (/\bsc\b/.test(s)) out.cat = 'SC';
    else if (/\bst\b/.test(s)) out.cat = 'ST';
    else if (/\b(obc|nc-obc|ncobc)\b/.test(s)) out.cat = 'OBC';
    else if (/\bews\b/.test(s)) out.cat = 'EWS';
    else if (/\b(pwd|pwbd|disabled|disability)\b/.test(s)) out.cat = 'PWD';
    else if (/\b(general|gen)\b/.test(s)) out.cat = 'GEN';
    if (/\b(female|women|woman|girl|girls)\b/.test(s)) out.gender = 'F';
    else if (/\b(male|men|man|boy|boys)\b/.test(s)) out.gender = 'M';
    if (/\b(payback|roi|value|worth)\b/.test(s)) out.sort = 'payback';
    else if (/\b(cheap|cheapest|affordable|low fee|lowest fee)\b/.test(s)) out.sort = 'fee';
    else if (/\b(salary|package|placement|placements)\b/.test(s)) out.sort = 'salary';
    return Object.keys(out).length ? out : null;
  }

  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const ALIASES = {
    GB: 'uk britain england london', US: 'usa america united states', IN: 'india', CN: 'china shanghai', FR: 'france paris',
    ES: 'spain madrid', CA: 'canada toronto', AU: 'australia sydney', ZA: 'south africa cape town',
  };
  const GLOSSARY = ['npv', 'payback', 'irr', 'discount', 'breakeven', 'emi'];
  const GLOSS_WORDS = { npv: 'npv net present value', payback: 'payback period', irr: 'irr return investment', discount: 'discount rate', breakeven: 'break-even breakeven salary', emi: 'emi loan instalment monthly' };

  // Search items for colleges, countries, exams and glossary terms. Topic items are added by the page.
  function buildIndex(INDIA, COUNTRIES) {
    const items = [];
    INDIA.colleges.forEach((c) => items.push({ type: 'college', key: c.name, label: c.name, sub: c.city + (c.nirf ? ' · NIRF #' + c.nirf : ''),
      hay: (c.name + ' ' + c.city + ' ' + c.name.replace(/^IIM\b/, 'indian institute of management') + ' ' + Object.keys(c.cutoffs).join(' ')).toLowerCase() }));
    INDIA.abroad.forEach((c) => items.push({ type: 'college', key: c.name, abroad: true, exam: Object.keys(c.cutoffs)[0], label: c.name, sub: c.city,
      hay: (c.name + ' ' + c.city + ' ' + Object.keys(c.cutoffs).join(' ')).toLowerCase() }));
    COUNTRIES.countries.forEach((c) => items.push({ type: 'country', key: c.code, label: c.name, sub: c.programme, hash: '#' + slug(c.name),
      hay: (c.name + ' ' + c.programme + ' ' + (c.short || '') + ' ' + (ALIASES[c.code] || '')).toLowerCase() }));
    INDIA.exams.forEach((e) => items.push({ type: 'exam', key: e.code, label: e.code === 'MAHCET' ? 'MAH-CET' : e.code, sub: e.name,
      hay: (e.code + ' ' + e.name + ' ' + e.by + (e.code === 'MAHCET' ? ' mah cet mba cet' : '')).toLowerCase() }));
    GLOSSARY.forEach((g) => items.push({ type: 'term', key: g, label: g, sub: '', hay: GLOSS_WORDS[g] }));
    return items;
  }

  // On equal matches, countries come before colleges (so "uk" opens the United Kingdom, not a London school).
  const TYPE_ORDER = { country: 0, college: 1, exam: 2, term: 3, topic: 4 };
  // Every word of the query must appear; names that start with the query rank first.
  function search(items, q, limit) {
    const query = String(q || '').trim().toLowerCase();
    if (!query) return [];
    const words = query.split(/\s+/);
    return items.map((it) => {
      const hay = it.hay + ' ' + String(it.label).toLowerCase();
      if (!words.every((w) => hay.includes(w))) return null;
      const lab = String(it.label).toLowerCase();
      return { it, rank: lab.startsWith(query) ? 0 : lab.includes(query) ? 1 : 2 };
    }).filter(Boolean).sort((a, b) => a.rank - b.rank || TYPE_ORDER[a.it.type] - TYPE_ORDER[b.it.type]).slice(0, limit || 12).map((r) => r.it);
  }

  const api = { NAV_SECTIONS, parseQuery, buildIndex, search, slug };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window === 'undefined') return;
  window.NAV_SECTIONS = NAV_SECTIONS;
  document.addEventListener('DOMContentLoaded', init);

  // ---------- page ----------
  function init() {
    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const INDIA = window.INDIA_DATA, COUNTRIES = window.COUNTRY_DATA;
    const LINKEDIN = 'https://www.linkedin.com/in/vedhrishi-pasupuleti';
    const mobile = () => matchMedia('(max-width: 1023px)').matches;
    const examHasData = (code) => INDIA.colleges.concat(INDIA.abroad).some((c) => c.cutoffs[code]);

    const GROUPS = [
      { g: 'sb.start', items: [['overview', 'sb.overview'], ['ranking', 'sb.ranking']] },
      { g: 'sb.india', items: [['finder', 'sb.finder'], ['shortlist', 'sb.shortlist'], ['checklist', 'sb.checklist'], ['compare', 'sb.compare'], ['chart', 'sb.chart'], ['colleges', 'sb.colleges'], ['exams', 'sb.exams']] },
      { g: 'sb.abroad', items: [['atlas', 'sb.map'], ['countries', 'sb.countries'], ['rates', 'sb.rates']] },
      { g: 'sb.tools', items: [['calc', 'sb.calc'], ['glossary', 'sb.glossary']] },
      { g: 'sb.about', items: [['sources', 'sb.sources'], ['author', 'sb.author']] },
    ];
    const RECS = [
      ['rec.cat95', 'CAT 95'], ['rec.payback', 'best payback'], ['rec.under10', 'under 10 lakh'], ['rec.xatW', 'XAT 90 female'],
      ['rec.scst', 'SC CAT 80'], ['rec.iima', 'IIM Ahmedabad'], ['rec.uk', 'United Kingdom'], ['rec.ielts', 'IELTS 7'],
    ];

    // ---- sidebar ----
    function renderNav() {
      const count = window.IndiaPage ? window.IndiaPage.shortlistCount() : 0;
      $('sbNav').innerHTML = GROUPS.map((grp) => '<div class="sb-group"><p class="sb-label">' + t(grp.g) + '</p><ul>' + grp.items.map(([k, label]) => {
        if (k === 'author') return '<li><a class="sb-item" href="' + LINKEDIN + '" target="_blank" rel="noopener">' + t(label) + ' <span class="ext">↗</span></a></li>';
        if (k === 'countries') {
          return '<li><details class="sb-sub"><summary class="sb-item">' + t(label) + '</summary><ul>' + COUNTRIES.countries.map((c) =>
            '<li><a class="sb-item sb-child" href="#' + slug(c.name) + '" data-key="country-' + c.code + '">' + esc(I18N.country(c.code, c.name)) + '<span class="muted"> · ' + esc(c.short || '') + '</span></a></li>').join('') + '</ul></details></li>';
        }
        return '<li><a class="sb-item" href="#' + k + '" data-key="' + k + '">' + t(label) + (k === 'shortlist' ? ' <span class="badge" id="shortBadge"' + (count ? '' : ' hidden') + '>' + count + '</span>' : '') + '</a></li>';
      }).join('') + '</ul></div>').join('');
      markActive();
    }
    function renderChips() {
      $('recChips').innerHTML = RECS.map(([k, q]) => '<button type="button" class="chip-btn ghost" data-q="' + esc(q) + '">' + t(k) + '</button>').join('');
    }

    // ---- search ----
    const index = buildIndex(INDIA, COUNTRIES);
    let results = [], active = -1;
    const TOPIC_KEYS = [];
    GROUPS.forEach((grp) => grp.items.forEach(([k, label]) => { if (k !== 'author' && k !== 'countries') TOPIC_KEYS.push([k, label]); }));
    const topicItems = () => TOPIC_KEYS.map(([k, label]) => ({ type: 'topic', key: k, label: t(label), sub: t(GROUPS.find((g) => g.items.some((i) => i[0] === k)).g), hay: (t(label) + ' ' + k).toLowerCase() }));
    const termItem = (it) => Object.assign({}, it, { label: t('gloss.' + it.key + '.t'), sub: t('gloss.' + it.key + '.d').slice(0, 70) + '…', hay: it.hay + ' ' + t('gloss.' + it.key + '.t').toLowerCase() });

    function describe(p) {
      const parts = [];
      if (p.exam) parts.push((p.exam === 'MAHCET' ? 'MAH-CET' : p.exam) + (p.score !== undefined ? ' ' + p.score : ''));
      if (p.cat) parts.push({ GEN: 'General', EWS: 'EWS', OBC: 'OBC-NCL', SC: 'SC', ST: 'ST', PWD: 'PwD' }[p.cat]);
      if (p.gender) parts.push(t(p.gender === 'F' ? 'in.gF' : 'in.gM'));
      if (p.budget) parts.push(t('res.under', { n: p.budget }));
      if (p.sort) parts.push(t({ payback: 'in.sPayback', fee: 'in.sFee', salary: 'in.sSalary' }[p.sort]));
      return parts.join(' · ');
    }

    function runSearch(q) {
      const smart = parseQuery(q);
      if (smart && smart.exam && !examHasData(smart.exam)) { delete smart.exam; delete smart.score; }
      const smartOk = smart && Object.keys(smart).length && (smart.exam || smart.budget || smart.sort || smart.cat || smart.gender);
      const found = search(index.map((it) => (it.type === 'term' ? termItem(it) : it)).concat(topicItems()), q, 14);
      results = (smartOk ? [{ type: 'smart', label: t('res.find', { d: describe(smart) }), sub: '', smart }] : []).concat(found);
      active = results.length ? 0 : -1;
      return results;
    }

    const GROUP_LABEL = { smart: 'res.smart', college: 'res.college', country: 'res.country', exam: 'res.exam', topic: 'res.topic', term: 'res.term' };
    function renderResults() {
      const box = $('navResults'), q = $('navSearch').value.trim();
      if (!q) { box.hidden = true; $('navSearch').setAttribute('aria-expanded', 'false'); return; }
      runSearch(q);
      let html = '', lastType = null;
      if (!results.length) html = '<p class="sb-empty">' + t('res.empty') + '</p>';
      results.forEach((r, i) => {
        if (r.type !== lastType) { html += '<p class="sb-rhead">' + t(GROUP_LABEL[r.type]) + '</p>'; lastType = r.type; }
        const label = r.type === 'country' ? I18N.country(r.key, r.label) : r.label;
        html += '<div class="sb-opt' + (i === active ? ' on' : '') + '" role="option" id="opt' + i + '" data-i="' + i + '" aria-selected="' + (i === active) + '"><b>' + esc(label) + '</b>' + (r.sub ? '<span>' + esc(r.sub) + '</span>' : '') + '</div>';
      });
      box.innerHTML = html;
      box.hidden = false;
      $('navSearch').setAttribute('aria-expanded', 'true');
      $('navSearch').setAttribute('aria-activedescendant', active >= 0 ? 'opt' + active : '');
    }

    // Change view through the hash so the back button works; re-run the route when the hash is unchanged.
    function goHash(hash, after) {
      if (location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = hash;
      if (after) setTimeout(after, 30);
    }
    function choose(r) {
      if (!r) return;
      if (r.type === 'smart') goHash('#finder', () => window.IndiaPage.setProfile(r.smart));
      else if (r.type === 'college' && r.abroad) goHash('#finder', () => window.IndiaPage.setProfile({ exam: r.exam }));
      else if (r.type === 'college') goHash('#colleges', () => window.IndiaPage.focusCollege(r.key));
      else if (r.type === 'country') goHash(r.hash);
      else if (r.type === 'exam') goHash('#finder', () => window.IndiaPage.setProfile({ exam: r.key }));
      else if (r.type === 'topic') goHash('#' + r.key);
      else if (r.type === 'term') goHash('#glossary');
      $('navResults').hidden = true;
      $('navSearch').setAttribute('aria-expanded', 'false');
      if (mobile()) closeDrawer();
    }
    function runQuery(q) { runSearch(q); choose(results[0]); }

    $('navSearch').addEventListener('input', renderResults);
    $('navSearch').addEventListener('focus', () => { if ($('navSearch').value.trim()) renderResults(); });
    $('navSearch').addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!results.length) return;
        active = (active + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
        $('navResults').querySelectorAll('.sb-opt').forEach((o) => { const on = Number(o.dataset.i) === active; o.classList.toggle('on', on); o.setAttribute('aria-selected', on); if (on) o.scrollIntoView({ block: 'nearest' }); });
        $('navSearch').setAttribute('aria-activedescendant', 'opt' + active);
      } else if (e.key === 'Enter') { e.preventDefault(); choose(results[active]); }
      else if (e.key === 'Escape') { $('navSearch').value = ''; renderResults(); if (mobile()) closeDrawer(); }
    });
    $('navResults').addEventListener('mousedown', (e) => { const o = e.target.closest('.sb-opt'); if (o) { e.preventDefault(); choose(results[Number(o.dataset.i)]); } });
    document.addEventListener('click', (e) => { if (!e.target.closest('.sb-search')) $('navResults').hidden = true; });
    $('recChips').addEventListener('click', (e) => { const b = e.target.closest('[data-q]'); if (b) runQuery(b.dataset.q); });

    // ---- drawer (tablet and phone) ----
    function openDrawer(focusSearch) {
      document.body.classList.add('sb-open'); $('sbScrim').hidden = false; $('menuBtn').setAttribute('aria-expanded', 'true');
      setTimeout(() => (focusSearch ? $('navSearch') : $('sbClose')).focus(), 50);
    }
    function closeDrawer() {
      if (!document.body.classList.contains('sb-open')) return;
      document.body.classList.remove('sb-open'); $('sbScrim').hidden = true; $('menuBtn').setAttribute('aria-expanded', 'false'); $('menuBtn').focus();
    }
    $('menuBtn').addEventListener('click', () => openDrawer(false));
    $('searchBtn').addEventListener('click', () => openDrawer(true));
    $('sbClose').addEventListener('click', closeDrawer);
    $('sbScrim').addEventListener('click', closeDrawer);
    $('sbNav').addEventListener('click', (e) => { if (e.target.closest('a.sb-item') && mobile()) closeDrawer(); });

    // ---- collapse rail (desktop: sidebar can be closed to give the content more room) ----
    function setCollapsed(on) {
      document.body.classList.toggle('sb-collapsed', on);
      $('sbToggle').setAttribute('aria-expanded', String(!on));
      try { localStorage.setItem('sbCollapsed', on ? '1' : '0'); } catch (e) {}
    }
    $('sbToggle').addEventListener('click', () => setCollapsed(!document.body.classList.contains('sb-collapsed')));
    setCollapsed(document.body.classList.contains('sb-collapsed'));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('sb-open')) closeDrawer();
      const typing = /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);
      if (e.key === '/' && !typing) { e.preventDefault(); if (mobile()) openDrawer(true); else $('navSearch').focus(); }
      if (e.key === '[' && !typing && !mobile()) { e.preventDefault(); setCollapsed(!document.body.classList.contains('sb-collapsed')); }
    });

    // ---- active item: follows the hash and, within a view, the scroll position ----
    const VIEW_KEYS = { map: ['overview', 'ranking', 'atlas', 'rates', 'sources'], india: ['finder', 'shortlist', 'checklist', 'compare', 'chart', 'colleges', 'exams'], calc: ['calc', 'glossary'] };
    function markActive() {
      const view = document.body.dataset.view || 'map';
      const keys = VIEW_KEYS[view] || [];
      // The active section is the one whose top most recently passed the top of the window.
      let current = keys[0], best = -Infinity;
      keys.forEach((k) => {
        const sec = NAV_SECTIONS[k], el = sec ? $(sec.id) : $(view);
        if (!el || el.hidden) return;
        const top = el.getBoundingClientRect().top;
        if (top < 140 && top > best) { best = top; current = k; }
      });
      const h = location.hash.slice(1);
      const country = COUNTRIES.countries.find((c) => slug(c.name) === h);
      document.querySelectorAll('#sbNav .sb-item[data-key]').forEach((a) => {
        const on = country ? a.dataset.key === 'country-' + country.code : a.dataset.key === current;
        a.classList.toggle('active', on);
        if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
      });
      if (country) { const d = document.querySelector('#sbNav details.sb-sub'); if (d) d.open = true; }
    }
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; markActive(); $('toTop').hidden = window.scrollY < 700; }); }
    }, { passive: true });
    window.addEventListener('hashchange', () => setTimeout(markActive, 400));
    document.addEventListener('viewchange', () => setTimeout(markActive, 50));
    $('toTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    // ---- shortlist badge, language ----
    document.addEventListener('shortlistchange', (e) => {
      const b = $('shortBadge'); if (!b) return;
      b.textContent = e.detail; b.hidden = !e.detail;
    });
    document.addEventListener('langchange', () => { renderNav(); renderChips(); renderSources(); if (!$('navResults').hidden) renderResults(); });

    // ---- data & sources section ----
    function renderSources() {
      const uniq = (list) => list.filter((s, i, a) => a.findIndex((x) => x.url === s.url) === i);
      const groups = [
        ['src.india', uniq(Object.values(INDIA.sources))],
        ['src.abroad', uniq(COUNTRIES.countries.flatMap((c) => c.sources))],
        ['src.fx', uniq(window.FX_DATA.sources)],
        ['src.map', [{ label: 'Natural Earth (public domain), via world-atlas', url: 'https://www.naturalearthdata.com/' }]],
      ];
      $('sourcesList').innerHTML = groups.map(([k, list]) => '<div><h3>' + t(k) + '</h3><ul>' + list.map((s) => '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.label) + '</a></li>').join('') + '</ul></div>').join('');
    }

    renderNav(); renderChips(); renderSources();
    I18N.apply(document.getElementById('sidebar'));
  }
})();
