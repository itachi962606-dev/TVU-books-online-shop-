/**
 * TVU Books Shop - Books data service (fast, paginated)
 * Never downloads the whole "books" collection: it asks Firestore for ONE page at a time (24 books),
 * so the site stays quick even with 15,000+ books.
 *
 *  - Browse / Home : orderBy(createdAt) + limit(24) + startAfter(cursor)
 *  - Department    : where(category == X) + limit(24)               (no composite index needed)
 *  - Search        : where(searchKeywords array-contains word)      (keywords are saved with every book)
 *  - Older books without searchKeywords are still found by a small fallback scan of the newest 300.
 */
(function () {
  const PAGE = 24;
  const STOP = new Set(['the', 'and', 'of', 'for', 'to', 'in', 'on', 'by']);

  const words = s => String(s || '').toLowerCase().replace(/[^a-z0-9\u0B80-\u0BFF\s]/g, ' ').split(/\s+/).filter(w => w.length > 1);

  /** Words + 3..n letter prefixes of title, author and category (so "pyth" finds "Python"). */
  function buildKeywords(b) {
    const set = new Set();
    [b.title, b.title, b.author, b.category].forEach(s => words(s).forEach(w => {
      if (STOP.has(w)) return;
      set.add(w);
      for (let i = 3; i < w.length; i++) set.add(w.slice(0, i));
    }));
    return Array.from(set).slice(0, 80);
  }

  function matches(book, query) {
    const q = words(query);
    if (!q.length) return true;
    const hay = (String(book.title || '') + ' ' + String(book.author || '') + ' ' + String(book.category || '')).toLowerCase();
    return q.every(w => hay.includes(w));
  }

  const hidden = b => !!(window.isHiddenBook && window.isHiddenBook(b));

  /** Built-in starter books that match the department / search text (instant, no network). */
  function seedsFor(opts) {
    opts = opts || {};
    return (window.SEED_BOOKS || []).filter(b =>
      (!opts.category || opts.category === 'All' || b.category === opts.category) &&
      (!opts.group || b.group === opts.group) &&
      (!opts.search || matches(b, opts.search)));
  }

  function groups() {
    const out = [];
    (window.TVU_DEPARTMENTS || []).forEach(d => {
      let g = out.find(x => x.name === d.group);
      if (!g) { g = { name: d.group, departments: [] }; out.push(g); }
      g.departments.push(d.name);
    });
    return out;
  }

  function findDepartment(text) {
    const t = String(text || '').trim().toLowerCase();
    if (!t) return null;
    return (window.TVU_DEPARTMENTS || []).find(d => d.name.toLowerCase() === t) || null;
  }

  /** Cloudinary: ask for a small, auto-format image instead of the full-size upload. */
  function thumb(url, w) {
    try {
      if (url && url.indexOf('res.cloudinary.com') > -1 && url.indexOf('/upload/') > -1 && !/\/upload\/[a-z]_/.test(url)) {
        return url.replace('/upload/', '/upload/f_auto,q_auto,w_' + (w || 400) + '/');
      }
    } catch (e) {}
    return url;
  }

  /** One page of live books from Firestore. Returns { books, cursor, done }. */
  async function fetchPage(opts) {
    opts = opts || {};
    const limit = opts.limit || PAGE;
    if (!window.isFirebaseConfigured || !window.isFirebaseConfigured()) return { books: [], cursor: null, done: true };

    const first = words(opts.search).filter(w => !STOP.has(w)).sort((a, b) => b.length - a.length)[0];
    let q = db.collection('books');
    if (first) q = q.where('searchKeywords', 'array-contains', first);
    else if (opts.category && opts.category !== 'All') q = q.where('category', '==', opts.category);
    else if (opts.categories && opts.categories.length) q = q.where('category', 'in', opts.categories.slice(0, 30));
    else if (opts.sort === 'price-low') q = q.orderBy('discountedPrice', 'asc');
    else if (opts.sort === 'price-high') q = q.orderBy('discountedPrice', 'desc');
    else q = q.orderBy('createdAt', 'desc');
    if (opts.cursor) q = q.startAfter(opts.cursor);

    const snap = await q.limit(limit).get();
    let books = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(b => !hidden(b));
    if (first) books = books.filter(b => matches(b, opts.search) && (!opts.category || opts.category === 'All' || b.category === opts.category));

    // Older listings (saved before keywords existed) -> small fallback scan
    if (first && !opts.cursor && !snap.docs.length) {
      try {
        const s2 = await db.collection('books').orderBy('createdAt', 'desc').limit(300).get();
        books = s2.docs.map(d => ({ id: d.id, ...d.data() })).filter(b => !hidden(b) && matches(b, opts.search));
      } catch (e) {}
      return { books, cursor: null, done: true };
    }
    return { books, cursor: snap.docs[snap.docs.length - 1] || null, done: snap.docs.length < limit };
  }

  window.TVUBooks = { PAGE, fetchPage, buildKeywords, matches, seedsFor, groups, findDepartment, thumb, words };
  window.TVU_LIVE_BOOKS = window.TVU_LIVE_BOOKS || [];   // books already on screen (used by search suggestions)
})();
