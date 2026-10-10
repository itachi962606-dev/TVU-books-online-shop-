/**
 * TVU Books Shop - Search box with live suggestions
 * Shows ONLY matching departments and books (nothing unrelated). Works on Home and Browse Books.
 *   TVUSuggest.attach(inputEl, { onSubmit(text), onDepartment(name) })
 */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function attach(input, opts) {
    if (!input || input.dataset.sg) return;
    input.dataset.sg = '1';
    opts = opts || {};
    const holder = input.closest('.search-input-group') || input.parentElement;
    const box = document.createElement('div');
    box.className = 'sg-box';
    box.setAttribute('role', 'listbox');
    holder.appendChild(box);
    input.setAttribute('autocomplete', 'off');

    let items = [], active = -1, timer = null, seq = 0, remote = [], remoteDone = true;

    const deptUrl = n => 'books.html?cat=' + encodeURIComponent(n);
    const bookUrl = id => 'book-details.html?id=' + encodeURIComponent(id);

    function deptMatches(q) {
      const t = q.toLowerCase();
      return (window.TVU_DEPARTMENTS || []).filter(d => d.name.toLowerCase().includes(t)).slice(0, 4);
    }
    function bookMatches(q) {
      const pool = (window.SEED_BOOKS || []).concat(window.TVU_LIVE_BOOKS || []);
      const seen = new Set(), out = [];
      pool.concat(remote).forEach(b => {
        if (!b || seen.has(b.id) || !window.TVUBooks.matches(b, q)) return;
        seen.add(b.id); out.push(b);
      });
      return out.slice(0, 6);
    }

    function render() {
      const q = input.value.trim();
      if (!q) { close(); return; }
      const depts = deptMatches(q), books = bookMatches(q);
      items = [];
      let html = '';
      if (depts.length) {
        html += '<div class="sg-head">Departments</div>';
        depts.forEach(d => {
          const i = items.push({ type: 'dept', name: d.name }) - 1;
          html += `<div class="sg-item" role="option" data-i="${i}"><span class="sg-ico">🏛️</span><span class="sg-main"><div class="sg-title">${esc(d.name)}</div><div class="sg-sub">${esc(d.group)} • see all books</div></span></div>`;
        });
      }
      if (books.length) {
        html += '<div class="sg-head">Books</div>';
        books.forEach(b => {
          const i = items.push({ type: 'book', id: b.id }) - 1;
          const price = Number(b.discountedPrice) || Number(b.originalPrice) || 0;
          html += `<div class="sg-item" role="option" data-i="${i}"><img src="${esc(window.TVUBooks.thumb(b.imageUrl || '', 80))}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><span class="sg-main"><div class="sg-title">${esc(b.title)}</div><div class="sg-sub">${esc(b.category || '')} • ${esc(b.author || '')}</div></span><span class="sg-price">₹${price}</span></div>`;
        });
      }
      if (!items.length) html = `<div class="sg-empty">${remoteDone ? 'No matching department or book found' : 'Searching...'}</div>`;
      box.innerHTML = html;
      box.classList.add('open');
      active = -1;
    }

    function close() { box.classList.remove('open'); active = -1; }

    function choose(it) {
      close();
      if (!it) return;
      if (it.type === 'dept') {
        if (opts.onDepartment) { input.value = ''; opts.onDepartment(it.name); } else window.location.href = deptUrl(it.name);
      } else window.location.href = bookUrl(it.id);
    }

    function submit() {
      const q = input.value.trim();
      close();
      const dep = window.TVUBooks.findDepartment(q);
      if (dep) { if (opts.onDepartment) { input.value = ''; opts.onDepartment(dep.name); } else window.location.href = deptUrl(dep.name); return; }
      if (opts.onSubmit) opts.onSubmit(q);
      else window.location.href = 'books.html' + (q ? '?q=' + encodeURIComponent(q) : '');
    }

    input.addEventListener('input', () => {
      render();
      clearTimeout(timer);
      const q = input.value.trim();
      remote = []; remoteDone = !(q.length >= 2);
      if (q.length < 2) return;
      const my = ++seq;
      timer = setTimeout(async () => {
        try {
          const r = await window.TVUBooks.fetchPage({ search: q, limit: 6 });
          if (my !== seq) return;
          remote = r.books;
        } catch (e) { /* suggestions are optional */ }
        remoteDone = true;
        if (my === seq) render();
      }, 250);
    });
    input.addEventListener('focus', () => { if (input.value.trim()) render(); });
    input.addEventListener('keydown', e => {
      const els = box.querySelectorAll('.sg-item');
      if (e.key === 'ArrowDown' && els.length) { e.preventDefault(); active = (active + 1) % els.length; }
      else if (e.key === 'ArrowUp' && els.length) { e.preventDefault(); active = (active - 1 + els.length) % els.length; }
      else if (e.key === 'Enter') { e.preventDefault(); if (active >= 0) choose(items[active]); else submit(); return; }
      else if (e.key === 'Escape') { close(); return; }
      else return;
      els.forEach((el, i) => { el.classList.toggle('active', i === active); if (i === active) el.scrollIntoView({ block: 'nearest' }); });
    });
    box.addEventListener('mousedown', e => {
      const el = e.target.closest('.sg-item');
      if (el) { e.preventDefault(); choose(items[Number(el.dataset.i)]); }
    });
    document.addEventListener('click', e => { if (!holder.contains(e.target)) close(); });
    const icon = holder.querySelector('svg');
    if (icon) { icon.style.pointerEvents = 'auto'; icon.style.cursor = 'pointer'; icon.addEventListener('click', submit); }
  }

  window.TVUSuggest = { attach };
})();
