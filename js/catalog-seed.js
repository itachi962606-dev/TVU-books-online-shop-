/**
 * TVU Books Shop - Starter Catalogue (15,000 books across every university department)
 * Deterministically generated: same books, prices and cover colours on every load.
 * Listed under the "TVU Book Bank" seller. Covers are drawn on demand (lazy), so the page stays fast.
 *
 * Turn the starter catalogue off with:  window.TVU_SEED_ENABLED = false;   (before this file loads)
 */

// Test/placeholder listings that should never be shown in the shop (case-insensitive exact title match).
// Delete them from Firebase (Firestore -> books) to remove them permanently.
window.TVU_HIDDEN_BOOK_TITLES = window.TVU_HIDDEN_BOOK_TITLES || ['Yksia', 'Yksla', 'Empty', 'Book'];
window.isHiddenBook = function (b) {
  const t = String((b && b.title) || '').trim().toLowerCase();
  return window.TVU_HIDDEN_BOOK_TITLES.some(x => String(x).trim().toLowerCase() === t);
};

/* ---------------------------------------------------------------------------
 * Departments -> subjects -> unit topics  (also used to build the question papers)
 * Format per subject:  "Subject name|topic 1;topic 2;...;topic 6"
 * ------------------------------------------------------------------------- */
window.TVU_DEPARTMENTS = [
  { name: 'Tamil', group: 'Arts & Humanities', degree: 'B.A Tamil', code: 'TA', subjects: [
    'Sangam Literature|Ettuthokai;Pathupattu;Akam poetry;Puram poetry;Sangam society;Poets of Sangam age',
    'Tamil Grammar|Eluthu;Sol;Porul;Yappu;Ani;Idaikkala ilakkanam',
    'Silappathikaram and Manimekalai|Epic structure;Kannagi;Kovalan;Manimekalai story;Social background;Literary beauty',
    'Modern Tamil Literature|Bharathiyar;Bharathidasan;Short story;Tamil novel;Free verse;Modern drama',
    'Thirukkural Studies|Aram;Porul;Inbam;Valluvar philosophy;Commentaries;Relevance today',
    'Tamil Folklore|Folk songs;Folk tales;Proverbs;Folk arts;Festivals;Folk beliefs',
    'History of Tamil Literature|Sangam period;Post Sangam period;Bhakti literature;Medieval literature;Colonial period;Contemporary literature'] },
  { name: 'English', group: 'Arts & Humanities', degree: 'B.A English', code: 'EN', subjects: [
    'British Literature|Chaucer and the Elizabethans;Metaphysical poets;Romantic poets;Victorian novel;Modern poetry;Twentieth century drama',
    'American Literature|Transcendentalism;Poe and Hawthorne;Whitman and Dickinson;Modern American novel;American drama;Contemporary poetry',
    'Indian Writing in English|Tagore;Early Indian novel;Mulk Raj Anand and R K Narayan;Contemporary poetry;Indian drama;Diaspora writing',
    'Shakespeare|Comedies;Tragedies;Histories;Romances;Sonnets;Shakespearean criticism',
    'Literary Criticism|Classical criticism;Neoclassical criticism;Romantic criticism;Modern criticism;New Criticism;Postcolonial theory',
    'Linguistics and Phonetics|Speech sounds;Phonemes;Morphology;Syntax;Semantics;Sociolinguistics',
    'Communicative English|Listening skills;Speaking skills;Reading comprehension;Writing skills;Business correspondence;Presentation skills'] },
  { name: 'Economics', group: 'Arts & Humanities', degree: 'B.A Economics', code: 'EC', subjects: [
    'Microeconomics|Demand and supply;Consumer behaviour;Production and cost;Market structures;Factor pricing;Welfare economics',
    'Macroeconomics|National income;Consumption and investment;Money and banking;Inflation;Business cycles;Monetary and fiscal policy',
    'Indian Economy|Planning in India;Agriculture;Industry;Services sector;Poverty and unemployment;Economic reforms',
    'Public Finance|Public revenue;Public expenditure;Public debt;Taxation;Fiscal federalism;Budget',
    'International Economics|Trade theories;Tariffs and quotas;Balance of payments;Exchange rates;WTO;Regional blocs',
    'Development Economics|Growth and development;Human development;Sustainable development;Population;Rural development;Inequality',
    'Statistics for Economics|Measures of central tendency;Dispersion;Correlation;Regression;Index numbers;Time series'] },
  { name: 'History', group: 'Arts & Humanities', degree: 'B.A History', code: 'HI', subjects: [
    'History of India|Indus valley civilization;Mauryan empire;Gupta age;Delhi sultanate;Mughal empire;British rule',
    'History of Tamil Nadu|Sangam age;Pallavas;Cholas;Pandyas;Vijayanagar and Nayaks;Modern Tamil Nadu',
    'Modern World History|French revolution;Industrial revolution;World War I;Russian revolution;World War II;Cold war',
    'Indian National Movement|Revolt of 1857;Early nationalists;Swadeshi movement;Gandhian era;Quit India movement;Partition and independence',
    'Ancient Indian Culture|Vedic culture;Jainism and Buddhism;Art and architecture;Education;Science and technology;Literature',
    'Medieval India|Rajputs;Delhi sultanate administration;Bhakti and Sufi movements;Vijayanagar empire;Mughal administration;Maratha power',
    'Archaeology and Epigraphy|Archaeological methods;Dating techniques;Megalithic culture;Inscriptions;Numismatics;Monuments'] },
  { name: 'Mathematics', group: 'Sciences', degree: 'B.Sc Mathematics', code: 'MA', subjects: [
    'Algebra|Groups and subgroups;Normal subgroups;Rings and ideals;Fields;Polynomial rings;Homomorphisms',
    'Real Analysis|Sequences and series;Limits and continuity;Differentiation;Riemann integration;Metric spaces;Uniform convergence',
    'Differential Equations|First order equations;Linear equations;Series solutions;Laplace transforms;Partial differential equations;Boundary value problems',
    'Linear Algebra|Vector spaces;Linear transformations;Matrices and determinants;Eigenvalues and eigenvectors;Inner product spaces;Canonical forms',
    'Numerical Methods|Solution of equations;Interpolation;Numerical differentiation;Numerical integration;Linear systems;Ordinary differential equations',
    'Probability and Statistics|Random variables;Probability distributions;Correlation and regression;Sampling theory;Testing of hypothesis;Analysis of variance',
    'Operations Research|Linear programming;Simplex method;Transportation problems;Assignment problems;Network analysis;Queueing theory'] },
  { name: 'Physics', group: 'Sciences', degree: 'B.Sc Physics', code: 'PH', subjects: [
    'Mechanics and Properties of Matter|Laws of motion;Work and energy;Rotational dynamics;Elasticity;Surface tension;Viscosity',
    'Thermodynamics|Laws of thermodynamics;Entropy;Heat engines;Kinetic theory;Phase transitions;Statistical distributions',
    'Optics|Interference;Diffraction;Polarization;Lasers;Fibre optics;Optical instruments',
    'Electricity and Magnetism|Electrostatics;Magnetostatics;Electromagnetic induction;Maxwell equations;AC circuits;Dielectrics',
    'Quantum Mechanics|Wave particle duality;Schrodinger equation;Operators and observables;Hydrogen atom;Angular momentum;Perturbation theory',
    'Solid State Physics|Crystal structure;X-ray diffraction;Lattice vibrations;Band theory;Semiconductors;Superconductivity',
    'Nuclear Physics|Nuclear structure;Radioactivity;Nuclear reactions;Fission and fusion;Particle detectors;Elementary particles'] },
  { name: 'Chemistry', group: 'Sciences', degree: 'B.Sc Chemistry', code: 'CH', subjects: [
    'Organic Chemistry|Reaction mechanisms;Stereochemistry;Aromaticity;Carbonyl compounds;Heterocycles;Named reactions',
    'Inorganic Chemistry|Periodic properties;Chemical bonding;Coordination compounds;Acids and bases;Metallurgy;Organometallics',
    'Physical Chemistry|Chemical kinetics;Thermochemistry;Electrochemistry;Phase rule;Surface chemistry;Photochemistry',
    'Analytical Chemistry|Titrimetric analysis;Gravimetric analysis;Chromatography;Spectroscopic methods;Errors in analysis;Electroanalytical methods',
    'Polymer Chemistry|Polymerization techniques;Molecular weight;Thermoplastics;Elastomers;Polymer degradation;Polymer processing',
    'Industrial Chemistry|Fertilizers;Cement and ceramics;Petroleum products;Soaps and detergents;Dyes and pigments;Water treatment',
    'Green Chemistry|Principles of green chemistry;Atom economy;Green solvents;Catalysis;Microwave synthesis;Waste minimisation'] },
  { name: 'Botany', group: 'Sciences', degree: 'B.Sc Botany', code: 'BO', subjects: [
    'Plant Anatomy|Meristems;Epidermal tissue system;Vascular tissues;Secondary growth;Root and stem anatomy;Leaf anatomy',
    'Plant Physiology|Water relations;Photosynthesis;Respiration;Mineral nutrition;Plant hormones;Photoperiodism',
    'Taxonomy of Angiosperms|Classification systems;Nomenclature;Herbarium techniques;Fabaceae and Solanaceae;Poaceae;Economic botany',
    'Plant Pathology|Fungal diseases;Bacterial diseases;Viral diseases;Disease management;Host parasite interaction;Seed pathology',
    'Plant Ecology|Ecosystem structure;Plant communities;Ecological succession;Biogeochemical cycles;Biodiversity;Conservation',
    'Genetics and Plant Breeding|Mendelian genetics;Linkage and crossing over;Mutation;Hybridization;Heterosis;Polyploidy',
    'Plant Biotechnology|Tissue culture;Genetic engineering;Transgenic plants;Molecular markers;Micropropagation;Biosafety'] },
  { name: 'Zoology', group: 'Sciences', degree: 'B.Sc Zoology', code: 'ZO', subjects: [
    'Animal Diversity|Protozoa;Porifera and Coelenterata;Annelida and Arthropoda;Mollusca;Echinodermata;Chordata',
    'Cell Biology|Cell organelles;Membrane structure;Cell cycle;Cell signalling;Cytoskeleton;Cancer biology',
    'Genetics|Mendelian inheritance;Sex determination;Chromosomal aberrations;Population genetics;Human genetics;Gene mapping',
    'Immunology|Innate immunity;Antigens and antibodies;Cell mediated immunity;Hypersensitivity;Vaccines;Autoimmunity',
    'Developmental Biology|Gametogenesis;Fertilization;Cleavage;Gastrulation;Organogenesis;Regeneration',
    'Animal Physiology|Digestion;Respiration;Circulation;Excretion;Nervous system;Endocrine system',
    'Entomology|Insect morphology;Insect classification;Economic insects;Pest management;Sericulture;Apiculture'] },
  { name: 'Biotechnology', group: 'Sciences', degree: 'B.Sc Biotechnology', code: 'BT', subjects: [
    'Cell and Molecular Biology|Cell structure;Cell division;DNA replication;Transcription and translation;Gene regulation;Cell signalling',
    'Genetic Engineering|Restriction enzymes;Cloning vectors;Gene libraries;Expression systems;Gene therapy;Biosafety and ethics',
    'Immunology and Immunotechnology|Innate immunity;Antigens and antibodies;Monoclonal antibodies;Vaccines;Hypersensitivity;Immunodiagnostics',
    'Bioprocess Technology|Fermentor design;Media formulation;Sterilization;Scale up;Downstream processing;Product recovery',
    'Plant Biotechnology|Tissue culture;Micropropagation;Transgenic plants;Molecular markers;Secondary metabolites;Biosafety',
    'Animal Biotechnology|Animal cell culture;Transgenic animals;Stem cells;Cloning;Reproductive biotechnology;Gene knockout',
    'Bioinformatics|Biological databases;Sequence alignment;Phylogenetic analysis;Protein structure prediction;Genomics;Proteomics'] },
  { name: 'Computer Science', group: 'Computer & Information Technology', degree: 'B.Sc Computer Science', code: 'CS', subjects: [
    'Data Structures and Algorithms|Arrays and linked lists;Stacks and queues;Trees and binary search trees;Graphs and traversals;Sorting and searching;Hashing',
    'Database Management Systems|ER modelling;Relational algebra;SQL queries;Normalization;Transactions and concurrency;Indexing and storage',
    'Operating Systems|Process management;CPU scheduling;Deadlocks;Memory management;Virtual memory;File systems',
    'Computer Networks|OSI and TCP/IP models;Data link layer;Network layer and routing;Transport layer;Application protocols;Network security',
    'Java Programming|Classes and objects;Inheritance and polymorphism;Exception handling;Multithreading;Collections framework;JDBC and applets',
    'Python Programming|Data types and control flow;Functions and modules;Lists, tuples and dictionaries;File handling;Object oriented Python;Libraries for data analysis',
    'Software Engineering|Software process models;Requirements engineering;Design concepts;Software testing;Project management;Software maintenance',
    'Artificial Intelligence|Problem solving and search;Knowledge representation;Expert systems;Machine learning basics;Natural language processing;Neural networks'] },
  { name: 'Information Technology', group: 'Computer & Information Technology', degree: 'B.Sc Information Technology', code: 'IT', subjects: [
    'Mobile Computing|Wireless networks;Cellular systems;Mobile IP;Mobile operating systems;Mobile application design;Security issues',
    'Web Technology|HTML and CSS;JavaScript;Server side scripting;Databases for the web;Web services;Web security',
    'Cloud Computing|Cloud models;Virtualization;Storage in the cloud;Cloud platforms;Cloud security;Migration to the cloud',
    'Cyber Security|Threats and attacks;Cryptography;Network defence;Malware;Digital forensics;Cyber laws',
    'Data Communication|Signals and transmission;Multiplexing;Error control;Switching;Network devices;Wireless standards',
    'Software Testing|Testing levels;Black box testing;White box testing;Test automation;Defect tracking;Quality assurance',
    'Big Data Analytics|Big data concepts;Hadoop ecosystem;MapReduce;NoSQL databases;Data visualisation;Analytics tools'] },
  { name: 'Computer Applications (MCA)', group: 'Computer & Information Technology', degree: 'MCA', code: 'CA', subjects: [
    'Advanced Java Programming|Servlets;JSP;JDBC;Spring framework;Hibernate;Web services',
    'Machine Learning|Supervised learning;Unsupervised learning;Model evaluation;Neural networks;Ensemble methods;Deployment',
    'Advanced Database Systems|Query optimisation;Distributed databases;Object oriented databases;Data warehousing;NoSQL;Database security',
    'Software Project Management|Project planning;Estimation techniques;Risk management;Scheduling;Quality management;Agile methods',
    'Data Mining|Data preprocessing;Association rules;Classification;Clustering;Outlier analysis;Web mining',
    'Network Security|Symmetric encryption;Public key cryptography;Authentication;Firewalls;IP security;Web security',
    'Design and Analysis of Algorithms|Asymptotic analysis;Divide and conquer;Greedy methods;Dynamic programming;Backtracking;NP completeness'] },
  { name: 'Commerce', group: 'Commerce & Management', degree: 'B.Com General', code: 'CO', subjects: [
    'Financial Accounting|Accounting concepts;Depreciation;Final accounts;Branch accounts;Partnership accounts;Consignment',
    'Cost Accounting|Cost concepts;Material costing;Labour costing;Overheads;Job and process costing;Marginal costing',
    'Management Accounting|Ratio analysis;Fund flow statement;Cash flow statement;Budgetary control;Standard costing;Break even analysis',
    'Business Law|Law of contract;Sale of goods;Negotiable instruments;Consumer protection;Partnership law;Company formation',
    'Income Tax Law and Practice|Residential status;Salary income;House property income;Business income;Capital gains;Assessment procedure',
    'Banking Theory and Practice|Banking system;Commercial banks;Central bank;Negotiable instruments;Electronic banking;Loans and advances',
    'Auditing|Audit principles;Vouching;Verification of assets;Company audit;Audit report;Audit of computerised systems',
    'Goods and Services Tax|GST structure;Registration;Input tax credit;Returns;Place of supply;Compliance'] },
  { name: 'Business Administration', group: 'Commerce & Management', degree: 'BBA', code: 'BA', subjects: [
    'Principles of Management|Planning;Organizing;Staffing;Directing;Controlling;Decision making',
    'Organisational Behaviour|Perception and learning;Motivation;Leadership;Group dynamics;Conflict management;Organisational culture',
    'Human Resource Management|Recruitment and selection;Training and development;Performance appraisal;Compensation;Industrial relations;Employee welfare',
    'Marketing Management|Marketing mix;Consumer behaviour;Segmentation and targeting;Product life cycle;Pricing strategies;Digital marketing',
    'Production Management|Plant location;Plant layout;Production planning;Inventory control;Quality control;Work study',
    'Entrepreneurship Development|Entrepreneurial traits;Project identification;Business plan;Sources of finance;Government schemes;Women entrepreneurs',
    'Research Methodology|Research design;Sampling;Data collection;Hypothesis testing;Data analysis;Report writing'] }
].map(d => ({ ...d, subjects: d.subjects.map((s, i) => {
  const [name, topics] = s.split('|');
  return { name, topics: topics.split(';'), code: d.code + String(101 + i * 7) };
}) }));

/* ---------------------------------------------------------------------------
 * Starter books: 4 textbooks per department (60 books) with front AND back covers.
 * Cover layout follows a classic Indian university-press textbook.
 * Change the publisher name shown on the covers here:
 * ------------------------------------------------------------------------- */
window.TVU_PUBLISHER = window.TVU_PUBLISHER || 'TVU ACADEMIC PRESS';

(function () {
  const SEEDS_ON = window.TVU_SEED_ENABLED !== false;

  const EDITIONS = ['2nd Edition', '3rd Edition', 'Revised Edition', '4th Edition'];
  const BOOKS_PER_DEPARTMENT = 4;

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function wrap(text, max, maxLines) {
    const words = String(text).split(' '); const lines = []; let cur = '';
    words.forEach(w => { if ((cur + ' ' + w).trim().length > max) { if (cur) lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
    if (cur) lines.push(cur);
    return lines.slice(0, maxLines || 6);
  }
  const svgUri = svg => 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);

  function palette(n) {
    const h = Math.round((n * 137.508) % 360);
    return {
      dark: `hsl(${h},60%,${17 + (n % 3) * 3}%)`,
      mid: `hsl(${(h + 28) % 360},62%,${32 + (n % 4) * 3}%)`,
      light: `hsl(${h},55%,94%)`,
      accent: `hsl(${(h + 175) % 360},85%,${72 + (n % 3) * 4}%)`,
      glow: `hsla(${(h + 175) % 360},90%,82%,.28)`
    };
  }

  /** FRONT cover: new-edition ribbon, large title, syllabus line, author and publisher strip */
  function frontCover(b, n) {
    const c = palette(n);
    const dots = [[60, 90, 38], [230, 60, 52], [250, 190, 30], [40, 230, 24], [160, 140, 70]]
      .map(([x, y, r], i) => `<circle cx="${(x + n * 13 * (i + 1)) % 300}" cy="${y}" r="${r}" fill="${c.glow}"/>`).join('');
    const tl = wrap(b.title.toUpperCase(), 14, 4);
    const ty = 178 - (tl.length - 1) * 17;
    const title = tl.map((l, i) => `<text x="150" y="${ty + i * 36}" text-anchor="middle" font-family="Georgia,serif" font-size="${tl.length > 2 ? 27 : 31}" font-weight="700" letter-spacing="1" fill="#fff">${esc(l)}</text>`).join('');
    return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.dark}"/><stop offset="1" stop-color="${c.mid}"/></linearGradient></defs><rect width="300" height="400" fill="url(#g)"/>${dots}
<rect x="0" y="0" width="300" height="34" fill="${c.dark}"/><text x="150" y="22" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="700" letter-spacing="3" fill="${c.accent}">NEW EDITION</text>
<text x="150" y="62" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" letter-spacing="2" fill="rgba(255,255,255,.8)">${esc(b.category.toUpperCase())}</text>
${title}
<line x1="95" y1="${ty + tl.length * 36 - 8}" x2="205" y2="${ty + tl.length * 36 - 8}" stroke="${c.accent}" stroke-width="2"/>
<text x="150" y="${ty + tl.length * 36 + 14}" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" fill="rgba(255,255,255,.9)">As per the University Syllabus</text>
<text x="150" y="${ty + tl.length * 36 + 29}" text-anchor="middle" font-family="Arial,sans-serif" font-size="9.5" fill="rgba(255,255,255,.8)">${esc(b.forCourse)}</text>
<text x="150" y="338" text-anchor="middle" font-family="Georgia,serif" font-size="13" font-style="italic" fill="#fff">${esc(b.author)}</text>
<rect x="0" y="352" width="300" height="48" fill="${c.dark}"/><circle cx="34" cy="376" r="13" fill="${c.accent}"/><text x="34" y="381" text-anchor="middle" font-family="Georgia,serif" font-size="13" font-weight="700" fill="${c.dark}">T</text>
<text x="58" y="373" font-family="Arial,sans-serif" font-size="12" font-weight="700" letter-spacing="1.5" fill="#fff">${esc(window.TVU_PUBLISHER)}</text><text x="58" y="388" font-family="Arial,sans-serif" font-size="8.5" letter-spacing="1" fill="rgba(255,255,255,.7)">THIRUVALLUVAR UNIVERSITY</text></svg>`);
  }

  /** BACK cover: about, what's inside (units), features, price and publisher strip */
  function backCover(b, n, topics) {
    const c = palette(n);
    const about = wrap(`${b.title} covers the complete ${b.category} syllabus in clear, exam oriented language with worked examples, key points and practice questions.`, 40, 4)
      .map((l, i) => `<text x="24" y="${96 + i * 15}" font-family="Arial,sans-serif" font-size="10.5" fill="#1f2937">${esc(l)}</text>`).join('');
    const units = topics.slice(0, 6).map((t, i) => `<text x="24" y="${196 + i * 15}" font-family="Arial,sans-serif" font-size="10" fill="#111827"><tspan font-weight="700" fill="${c.mid}">Unit ${['I', 'II', 'III', 'IV', 'V', 'VI'][i]}</tspan>  ${esc(t.length > 34 ? t.slice(0, 33) + '…' : t)}</text>`).join('');
    const feats = ['Syllabus based, unit wise coverage', 'Solved examples and review questions', 'Previous exam pattern questions'].map((t, i) => `<text x="24" y="${306 + i * 14}" font-family="Arial,sans-serif" font-size="9.5" fill="#374151">✔ ${esc(t)}</text>`).join('');
    return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400"><rect width="300" height="400" fill="${c.light}"/>
<rect width="300" height="52" fill="${c.dark}"/><text x="150" y="26" text-anchor="middle" font-family="Georgia,serif" font-size="14" font-weight="700" fill="#fff">${esc(wrap(b.title, 30, 1)[0])}</text><text x="150" y="42" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" letter-spacing="2" fill="${c.accent}">${esc(b.category.toUpperCase())}</text>
<text x="24" y="78" font-family="Arial,sans-serif" font-size="11" font-weight="700" letter-spacing="1.5" fill="${c.mid}">ABOUT THE BOOK</text>${about}
<text x="24" y="182" font-family="Arial,sans-serif" font-size="11" font-weight="700" letter-spacing="1.5" fill="${c.mid}">CONTENTS</text>${units}
<text x="24" y="294" font-family="Arial,sans-serif" font-size="11" font-weight="700" letter-spacing="1.5" fill="${c.mid}">FEATURES</text>${feats}
<rect x="214" y="296" width="64" height="40" rx="4" fill="#fff" stroke="${c.mid}"/><text x="246" y="311" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" fill="#6b7280">MRP</text><text x="246" y="327" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" font-weight="700" fill="${c.dark}">₹${b.originalPrice}</text>
<rect y="352" width="300" height="48" fill="${c.dark}"/><circle cx="34" cy="376" r="13" fill="${c.accent}"/><text x="34" y="381" text-anchor="middle" font-family="Georgia,serif" font-size="13" font-weight="700" fill="${c.dark}">T</text>
<text x="58" y="373" font-family="Arial,sans-serif" font-size="12" font-weight="700" letter-spacing="1.5" fill="#fff">${esc(b.publisher || window.TVU_PUBLISHER)}</text><text x="58" y="388" font-family="Arial,sans-serif" font-size="8.5" letter-spacing="1" fill="rgba(255,255,255,.7)">Campus Edition • Thiruvalluvar University</text></svg>`);
  }

  const books = [];
  const index = new Map();
  let n = 0;
  (SEEDS_ON ? window.TVU_DEPARTMENTS : []).forEach(d => {
    d.subjects.slice(0, BOOKS_PER_DEPARTMENT).forEach((s, si) => {
      n++;
      const r = rng(n * 7919);
      const edition = EDITIONS[(n + si) % EDITIONS.length];
      const original = Math.round((220 + r() * 260) / 5) * 5;
      const discPct = [10, 15, 20, 25, 30, 35][Math.floor(r() * 6)];
      const discounted = Math.max(25, Math.round((original * (100 - discPct) / 100) / 5) * 5);
      const id = 'seed-' + String(n).padStart(5, '0');
      const book = {
        id, isSeed: true, title: s.name,
        author: 'TVU ' + d.name.replace(/ \(MCA\)/, '') + ' Faculty Board',
        category: d.name, group: d.group, kind: 'Textbook', edition,
        forCourse: d.degree ? `For ${d.degree} Courses` : 'For University Courses',
        publisher: window.TVU_PUBLISHER,
        originalPrice: original, discountedPrice: discounted,
        stock: 2 + Math.floor(r() * 8),
        pages: 240 + Math.floor(r() * 360),
        language: d.name === 'Tamil' ? 'Tamil' : 'English',
        rating: Number((3.9 + r() * 1.0).toFixed(1)),
        ratingCount: 20 + Math.floor(r() * 600),
        sellerId: 'tvu-book-bank', sellerName: 'TVU Book Bank', sellerEmail: '',
        description: `${s.name} (${edition}) for Thiruvalluvar University ${d.name} students. Units covered: ${s.topics.join(', ')}. Condition: good, ready for campus handover.`,
        createdAt: null
      };
      let front = null, back = null;
      Object.defineProperty(book, 'imageUrl', { enumerable: true, configurable: true, get() { return front || (front = frontCover(book, n0(book))); } });
      Object.defineProperty(book, 'backImageUrl', { enumerable: true, configurable: true, get() { return back || (back = backCover(book, n0(book), s.topics)); } });
      books.push(book); index.set(id, book);
    });
  });
  function n0(b) { return parseInt(b.id.slice(5), 10); }

  /** Auto-generated back cover for books that only have a front photo (sellers' own books) */
  window.TVU_makeBackCover = function (book) {
    try {
      const desc = String(book.description || '');
      let topics = desc.split(/[.;,\n]/).map(s => s.trim()).filter(s => s.length > 3).slice(0, 6);
      if (topics.length < 3) topics = ['Complete syllabus coverage', 'Clear, exam oriented explanations', 'Solved examples', 'Review questions', 'Quick revision notes'];
      let h = 0; for (const ch of String(book.id || book.title || 'x')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const b = Object.assign({}, book, { title: book.title || 'Book', category: book.category || 'General', publisher: book.publisher || book.sellerName || window.TVU_PUBLISHER });
      return backCover(b, (h % 60) + 1, topics);
    } catch (e) { return ''; }
  };

  window.SEED_BOOKS = books;
  window.getSeedBook = id => index.get(id) || null;
})();
