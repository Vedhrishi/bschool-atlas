// Country MBA data. One flagship programme per country, figures as reported by the cited source.
// A figure is only included when a school page or an established admissions/education publisher reports it;
// blog-only figures were left out. Every figure carries its currency and the month/year it refers to (asOf).
// confidence: "school" = the school's own page or report; "publisher" = GMAC, ClearAdmit, Careers360 and similar.
window.COUNTRY_DATA = {
  checked: '2026-10',
  countries: [
    {
      code: 'IN', short: 'ISB', name: 'India', continent: 'AS', currency: 'INR', programme: 'ISB Post Graduate Programme (PGP)', programMonths: 12,
      tuition: { value: 4178000, asOf: '2025-06', note: 'Tuition ₹38.78 lakh + admission fee ₹3 lakh, plus GST. Expected fee for 2025–27.', confidence: 'publisher', src: 0 },
      postSalary: { value: 3400000, asOf: '2025-06', note: 'Average CTC, Class of 2025 (₹37.29 lakh reported for 2026).', confidence: 'publisher', src: 1 },
      sources: [
        { label: 'Careers360: ISB Hyderabad fees', url: 'https://bschool.careers360.com/articles/isb-hyderabad-shortlist' },
        { label: 'IMS India: ISB PGP placement report 2025 vs 2026', url: 'https://www.imsindia.com/blog/one-year-mba/isb-pgp-placement-report-2025-vs-2026-average-packages-top-recruiters/' },
      ],
    },
    {
      code: 'CN', short: 'CEIBS', name: 'China', continent: 'AS', currency: 'CNY', programme: 'CEIBS MBA (Shanghai)', programMonths: 16,
      tuition: { value: 488000, asOf: '2026-01', note: 'Tuition for the 16-month MBA, 2026 intake.', confidence: 'publisher', src: 0 },
      postSalary: { value: 428400, asOf: '2024-06', note: 'Median starting salary (school-sourced figure reported by ClearAdmit; year approximate).', confidence: 'publisher', src: 0 },
      sources: [{ label: 'ClearAdmit: CEIBS school profile', url: 'https://clearadmit.com/school/ceibs' }],
    },
    {
      code: 'GB', short: 'LBS', name: 'United Kingdom', continent: 'EU', currency: 'GBP', programme: 'London Business School MBA',
      tuition: { value: 123950, asOf: '2026-08', note: 'Tuition for the August 2026 intake.', confidence: 'publisher', src: 0 },
      postSalary: { value: 92228, asOf: '2024-12', note: 'Mean salary, Class of 2024 employment report. Sign-on and year-end bonuses averaged a further £42,124.', confidence: 'publisher', src: 1 },
      sources: [
        { label: 'MiM in Europe: LBS MBA fees', url: 'https://www.mimineurope.com/programs/london-business-school-mba/fees' },
        { label: 'MiM in Europe: LBS MBA salary', url: 'https://www.mimineurope.com/programs/london-business-school-mba/salary' },
      ],
    },
    {
      code: 'FR', short: 'INSEAD', name: 'France', continent: 'EU', currency: 'EUR', programme: 'INSEAD MBA (Fontainebleau)', programMonths: 10,
      tuition: { value: 109860, asOf: '2026-01', note: 'Programme fee listed by INSEAD.', confidence: 'school', src: 0 },
      sources: [{ label: 'INSEAD: MBA employment statistics', url: 'https://www.insead.edu/master-programmes/master-business-administration/employment-statistics' }],
      missing: 'Salary is reported in US dollars only (average $121,439 for the 2025 class, Poets&Quants); not stored to avoid mixing currencies.',
    },
    {
      code: 'ES', short: 'IE', name: 'Spain', continent: 'EU', currency: 'EUR', programme: 'IE Business School International MBA (Madrid)', programMonths: 12,
      tuition: { value: 82300, asOf: '2023-01', note: 'Programme tuition.', confidence: 'publisher', src: 0 },
      postSalary: { value: 113770, asOf: '2022-12', note: 'Average starting salary (Class of 2022).', confidence: 'publisher', src: 1 },
      sources: [
        { label: 'GMAC: IE Business School MBA jobs and salary', url: 'https://www.gmac.com/resources/learners/business-careers/employers-salaries/ie-business-school-mba-jobs-salary-review' },
        { label: 'ClearAdmit: IE Business School', url: 'https://www.clearadmit.com/schools/ie-business-school/' },
      ],
    },
    {
      code: 'US', short: 'Stanford GSB', name: 'United States', continent: 'NA', currency: 'USD', programme: 'Stanford GSB MBA', programMonths: 24,
      tuition: { value: 171510, asOf: '2025-09', note: 'Two years at the 2025–26 tuition of $85,755 per year.', confidence: 'school', src: 0 },
      living: { value: 50016, asOf: '2025-09', note: 'Cost of attendance ($135,771, single student) minus tuition, 2025–26.', confidence: 'school', src: 0 },
      postSalary: { value: 185000, asOf: '2024-12', note: 'Median base salary, Class of 2024.', confidence: 'publisher', src: 1 },
      sources: [
        { label: 'Stanford GSB: School profile', url: 'https://www.gsb.stanford.edu/experience/about/school-profile' },
        { label: 'GMAC: Stanford MBA jobs and salary', url: 'https://www.gmac.com/resources/learners/business-careers/employers-salaries/stanford-mba-jobs-salary' },
      ],
    },
    {
      code: 'CA', short: 'Rotman', name: 'Canada', continent: 'NA', currency: 'CAD', programme: 'Rotman School of Management MBA (Toronto)',
      postSalary: { value: 104622, asOf: '2021-12', note: 'Average base salary, Class of 2021 (school report). Older figure.', confidence: 'school', src: 0 },
      sources: [{ label: 'Rotman Full-Time MBA Employment and Salary Report 2021–22', url: 'https://apps.rotman.utoronto.ca/Admissions/MBAFT/Documents/Rotman%20Full%20Time%20MBA%20Employment%20and%20Salary%20Report%202021-22.pdf' }],
      missing: 'Tuition: only blog figures were found, so none is stored.',
    },
    {
      code: 'AU', short: 'AGSM', name: 'Australia', continent: 'OC', currency: 'AUD', programme: 'AGSM @ UNSW Business School full-time MBA', programMonths: 12,
      tuition: { value: 86760, asOf: '2026-01', note: 'Estimated total for the 12-month full-time MBA, 2026 indicative fees.', confidence: 'school', src: 0 },
      sources: [{ label: 'UNSW: AGSM program fees', url: 'https://www.unsw.edu.au/business/our-schools/agsm/learn-with-us/agsm-programs/program-fees' }],
      missing: 'Salary: only blog figures were found, so none is stored.',
    },
    {
      code: 'ZA', short: 'UCT GSB', name: 'South Africa', continent: 'AF', currency: 'ZAR', programme: 'UCT Graduate School of Business full-time MBA',
      tuition: { value: 722000, asOf: '2026-01', note: 'Provisional 2026 fee for non-African students; R367,000 for African students. Plus R25,000 acceptance fee.', confidence: 'school', src: 0 },
      sources: [{ label: 'UCT GSB: MBA full-time fees', url: 'https://www.gsb.uct.ac.za/academic-programmes/mba-ft/mba-ft-fees/' }],
      missing: 'Salary: no dated, reliable figure was found.',
    },
  ],
  noData: { SA: 'No figures for South American programmes met the sourcing bar (only blog estimates were found).' },
};

// Exchange rates (units per 1 US dollar) and long-run inflation assumptions used to project values forward.
// Rates: ECB euro reference rates of 23 Oct 2026 converted to per-dollar, except INR and ZAR as noted.
window.FX_DATA = {
  asOf: '2026-10',
  base: 'USD',
  currencies: {
    USD: { perUsd: 1, inflation: 2, rateNote: 'Base currency', inflationNote: 'Federal Reserve 2% target' },
    EUR: { perUsd: 0.8934, inflation: 2, rateNote: 'ECB, 23 Oct 2026 (1 EUR = 1.1193 USD)', inflationNote: 'ECB 2% target' },
    GBP: { perUsd: 0.7480, inflation: 2, rateNote: 'ECB cross rate, 23 Oct 2026', inflationNote: 'Bank of England 2% target' },
    INR: { perUsd: 94.97, inflation: 4, rateNote: 'exchangerates.org.uk, 23 Oct 2026', inflationNote: 'RBI 4% target' },
    CNY: { perUsd: 6.6703, inflation: 2, rateNote: 'ECB cross rate, 23 Oct 2026', inflationNote: 'Assumption (no formal target used)' },
    CAD: { perUsd: 1.3995, inflation: 2, rateNote: 'ECB cross rate, 23 Oct 2026', inflationNote: 'Bank of Canada 2% target' },
    AUD: { perUsd: 1.4240, inflation: 2.5, rateNote: 'ECB cross rate, 23 Oct 2026', inflationNote: 'RBA 2–3% target midpoint' },
    ZAR: { perUsd: 16.3, inflation: 4.5, rateNote: 'poundsterlinglive.com, late Sep 2026 (no Oct figure found)', inflationNote: 'SARB 3–6% band midpoint' },
  },
  sources: [
    { label: 'ECB euro foreign exchange reference rates', url: 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html' },
    { label: 'exchangerates.org.uk: USD/INR history', url: 'https://www.exchangerates.org.uk/USD-INR-exchange-rate-history.html' },
    { label: 'Pound Sterling Live: ZAR/USD 2026 history', url: 'https://www.poundsterlinglive.com/history/ZAR-USD-2026' },
  ],
};
