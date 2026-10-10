/**
 * TVU Books Shop - Previous Year Question Papers catalogue (5,000 papers)
 * Built from the department/subject/unit data in catalog-seed.js (load that file first).
 * Each entry opens a full question paper (Part A / B / C) in paper-view.html, ready to print or save as PDF.
 * NOTE: these are MODEL papers written from each subject's unit topics. Real scanned university papers
 * can be uploaded from the Admin Dashboard and are shown alongside them.
 */
(function () {
  const SESSIONS = ['April', 'November'];
  const YEARS = [];
  for (let y = 2025; y >= 2013; y--) YEARS.push(y);
  const TYPES = ['Regular', 'Arrear'];
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  const TARGET = 5000;

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const deptsWithPapers = (window.TVU_DEPARTMENTS || []).filter(d => !d.books);
  const combos = [];
  deptsWithPapers.forEach(d => d.subjects.forEach((s, si) => YEARS.forEach(y => SESSIONS.forEach(se => TYPES.forEach(t => combos.push({ d, s, si, y, se, t }))))));
  const sh = rng(77123);
  for (let i = combos.length - 1; i > 0; i--) { const j = Math.floor(sh() * (i + 1)); const x = combos[i]; combos[i] = combos[j]; combos[j] = x; }

  const papers = [];
  const index = new Map();
  combos.slice(0, TARGET).forEach((c, i) => {
    const id = 'qp-' + String(i + 1).padStart(5, '0');
    const p = {
      id, isSample: true, status: 'approved', isActive: true,
      department: c.d.degree, deptName: c.d.name,
      subjectName: c.s.name, subjectCode: c.s.code,
      examYear: `${c.se} ${c.y}`, year: c.y, session: c.se, examType: c.t,
      semester: ROMAN[c.si % 6],
      fileName: `${c.s.code}_${c.se}_${c.y}${c.t === 'Arrear' ? '_Arrear' : ''}.pdf`,
      topics: c.s.topics,
      viewUrl: 'paper-view.html?id=' + id
    };
    papers.push(p); index.set(id, p);
  });
  window.SEED_PAPERS = papers;
  window.getSeedPaper = id => index.get(id) || null;

  /** Builds the full question paper (deterministic per paper id). */
  window.buildPaperContent = function (p) {
    const r = rng(parseInt(p.id.slice(3), 10) * 104729);
    const topics = p.topics.slice();
    const mix = () => { const a = topics.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const pick = arr => arr[Math.floor(r() * arr.length)];

    const aT = [pick(['Define', 'What is meant by', 'State any two features of', 'List the important points of', 'Write a short note on', 'Mention the significance of'])];
    const partA = [];
    let pool = [];
    for (let i = 0; i < 10; i++) {
      if (!pool.length) pool = mix();
      const t = pool.pop();
      const lead = ['Define', 'What is meant by', 'State any two features of', 'List the important points of', 'Write a short note on', 'Mention the significance of'][(i + Math.floor(r() * 6)) % 6];
      partA.push(`${lead} ${t.toLowerCase()}${lead.startsWith('What') ? '?' : '.'}`);
    }
    const bT = mix().concat(mix());
    const partB = [];
    for (let i = 0; i < 5; i++) {
      const t1 = bT[i * 2], t2 = bT[i * 2 + 1] === bT[i * 2] ? bT[(i * 2 + 2) % bT.length] : bT[i * 2 + 1];
      partB.push({
        a: `${pick(['Explain', 'Describe', 'Discuss', 'Elaborate on'])} ${t1.toLowerCase()}.`,
        b: `${pick(['Write briefly on', 'Discuss', 'Explain', 'Give an account of'])} ${t2.toLowerCase()} with suitable examples.`
      });
    }
    const cT = mix().concat(mix());
    const partC = [];
    for (let i = 0; i < 5; i++) {
      partC.push(`${pick(['Describe', 'Discuss in detail', 'Critically examine', 'Explain'])} ${cT[i].toLowerCase()}${pick([' with neat diagrams wherever necessary.', ' with suitable illustrations.', ' and highlight its applications.', ' and comment on its importance.'])}`);
    }
    return { partA, partB, partC };
  };
})();
