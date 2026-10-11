/**
 * TVU Books Shop - Previous Year Question Papers catalogue (55 papers)
 * 1 paper per unique subject, exactly 55 question papers including 5 B.Sc Computer Science papers.
 */
(function () {
  const SESSIONS = ['April', 'November'];
  const YEARS = [2024, 2023, 2022, 2021, 2020];
  const TYPES = ['Regular', 'Arrear'];
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  const TARGET = 55; // Mottham 55 question papers

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const combos = [];
  const seenSubjects = new Set();

  // 1. B.Sc Computer Science kosam 5 direct subjects
  const csSubjects = [
    { code: 'CS101', name: 'Programming in C', sem: 0, topics: ['Variables & Constants', 'Control Structures', 'Arrays & Strings', 'Functions & Pointers', 'File Management'] },
    { code: 'CS201', name: 'Data Structures and Algorithms', sem: 1, topics: ['Arrays & Stacks', 'Queues & Linked Lists', 'Trees & Graphs', 'Sorting Techniques', 'Searching Algorithms'] },
    { code: 'CS301', name: 'Java Programming', sem: 2, topics: ['Object Oriented Concepts', 'Classes & Methods', 'Inheritance & Packages', 'Exception Handling', 'Multithreading & Applets'] },
    { code: 'CS401', name: 'Relational Database Management Systems', sem: 3, topics: ['Data Models & Schemas', 'ER Modeling', 'Relational Algebra', 'SQL Queries & Joins', 'Normalization & Transactions'] },
    { code: 'CS501', name: 'Operating Systems', sem: 4, topics: ['OS Structures', 'Process Scheduling', 'Synchronization & Deadlocks', 'Memory Management & Paging', 'File Systems'] }
  ];

  csSubjects.forEach((s, idx) => {
    seenSubjects.add(s.code.toLowerCase());
    combos.push({
      d: { degree: 'B.Sc Computer Science', name: 'B.Sc Computer Science' },
      s: s,
      si: s.sem,
      y: YEARS[idx % YEARS.length],
      se: SESSIONS[idx % SESSIONS.length],
      t: 'Regular'
    });
  });

  // 2. Migatha departments nundi 50 distinct subjects ni add chesthundhi
  const deptsWithPapers = (window.TVU_DEPARTMENTS || []).filter(d => !d.books);
  deptsWithPapers.forEach(d => {
    (d.subjects || []).forEach((s, si) => {
      const subjectKey = (s.code || s.name || '').trim().toLowerCase();
      if (!seenSubjects.has(subjectKey) && combos.length < TARGET) {
        seenSubjects.add(subjectKey);
        const y = YEARS[si % YEARS.length];
        const se = SESSIONS[si % SESSIONS.length];
        const t = TYPES[si % TYPES.length];
        combos.push({ d, s, si, y, se, t });
      }
    });
  });

  const papers = [];
  const index = new Map();

  combos.slice(0, TARGET).forEach((c, i) => {
    const id = 'qp-' + String(i + 1).padStart(5, '0');
    const p = {
      id, isSample: true, status: 'approved', isActive: true,
      department: c.d.degree || c.d.name, deptName: c.d.name || c.d.degree,
      subjectName: c.s.name, subjectCode: c.s.code,
      examYear: `${c.se} ${c.y}`, year: c.y, session: c.se, examType: c.t,
      semester: ROMAN[c.si % 6],
      fileName: `${c.s.code}_${c.se}_${c.y}${c.t === 'Arrear' ? '_Arrear' : ''}.pdf`,
      topics: c.s.topics || ['Fundamental Concepts', 'Core Principles', 'Practical Applications'],
      viewUrl: 'paper-view.html?id=' + id
    };
    papers.push(p);
    index.set(id, p);
  });

  window.SEED_PAPERS = papers;
  window.getSeedPaper = id => index.get(id) || null;

  /** Builds the full question paper */
  window.buildPaperContent = function (p) {
    const r = rng(parseInt(p.id.slice(3), 10) * 104729);
    const topics = (p.topics && p.topics.length) ? p.topics.slice() : ['Introduction', 'Core Concepts', 'Advanced Topics'];
    const mix = () => {
      const a = topics.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    const pick = arr => arr[Math.floor(r() * arr.length)];

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
      const t1 = bT[i * 2] || 'concept', t2 = bT[i * 2 + 1] || 'method';
      partB.push({
        a: `${pick(['Explain', 'Describe', 'Discuss', 'Elaborate on'])} ${t1.toLowerCase()}.`,
        b: `${pick(['Write briefly on', 'Discuss', 'Explain', 'Give an account of'])} ${t2.toLowerCase()} with suitable examples.`
      });
    }

    const cT = mix().concat(mix());
    const partC = [];
    for (let i = 0; i < 5; i++) {
      const t = cT[i] || 'topic';
      partC.push(`${pick(['Describe', 'Discuss in detail', 'Critically examine', 'Explain'])} ${t.toLowerCase()}${pick([' with neat diagrams wherever necessary.', ' with suitable illustrations.', ' and highlight its applications.', ' and comment on its importance.'])}`);
    }

    return { partA, partB, partC };
  };
})();