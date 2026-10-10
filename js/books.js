/**
 * TVU Books Shop - Browse Books Controller
 * Categories (group + department chips), search with suggestions, sort, stock filter.
 * Books are loaded one page (24) at a time from Firestore and more arrive automatically while scrolling,
 * so the page stays fast with thousands of books.
 */

let allBooks = [];            // books currently shown (used by wishlist / buy-now helpers below)
let fsBooks = [];             // live books loaded for the current filter
let fsCursor = null;
let fsDone = false;
let loadingPage = false;
let reqId = 0;
let userWishlistIds = new Set();
let selectedBookForOrder = null;
let io = null;

const state = { cat: 'All', group: 'All', q: '', sort: 'newest', stock: 'all' };

document.addEventListener('DOMContentLoaded', () => { initBooksPage(); });

window.addEventListener('authStateChanged', (e) => {
  if (e.detail.user) loadUserWishlist(e.detail.user.uid);
  else { userWishlistIds.clear(); renderGrid(); }
});

function initBooksPage() {
  const params = new URLSearchParams(window.location.search);
  state.q = (params.get('q') || '').trim();
  state.cat = params.get('cat') || 'All';
  state.group = params.get('group') || 'All';

  // Typing a department name in the search = open that department
  const dep = TVUBooks.findDepartment(state.q);
  if (dep) { state.cat = dep.name; state.q = ''; }
  const d2 = TVUBooks.findDepartment(state.cat);
  if (d2) state.group = d2.group; else if (state.cat !== 'All') state.cat = 'All';

  const search = document.getElementById('catalog-search');
  if (search) {
    search.value = state.q;
    if (window.TVUSuggest) TVUSuggest.attach(search, {
      onSubmit: (q) => { state.q = q; reload(); },
      onDepartment: (name) => selectDepartment(name)
    });
    // live filtering while typing (light debounce)
    let t; search.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { if (state.q !== search.value.trim()) { state.q = search.value.trim(); reload(); } }, 450); });
  }
  const sort = document.getElementById('catalog-sort'), stock = document.getElementById('catalog-stock');
  if (sort) sort.addEventListener('change', () => { state.sort = sort.value; reload(); });
  if (stock) stock.addEventListener('change', () => { state.stock = stock.value; renderGrid(); });

  buildChips();
  setupOrderForm();
  setupScrollLoader();
  reload();
}

/* ---------- category chips ---------- */
function buildChips() {
  const groups = TVUBooks.groups();
  const gEl = document.getElementById('cat-groups'), dEl = document.getElementById('cat-depts'), dl = document.getElementById('cat-dept-label');
  if (!gEl || !dEl) return;
  gEl.innerHTML = `<button class="cat-chip ${state.group === 'All' && state.cat === 'All' ? 'active' : ''}" data-g="All">All Books</button>` +
    groups.map(g => `<button class="cat-chip ${state.group === g.name ? 'active' : ''}" data-g="${bcEsc(g.name)}">${bcEsc(g.name)}</button>`).join('');
  const g = groups.find(x => x.name === state.group);
  if (g) {
    dl.style.display = '';
    dEl.innerHTML = `<button class="cat-chip sub ${state.cat === 'All' ? 'active' : ''}" data-d="All">All ${bcEsc(g.name)}</button>` +
      g.departments.map(n => `<button class="cat-chip sub ${state.cat === n ? 'active' : ''}" data-d="${bcEsc(n)}">${bcEsc(n)}</button>`).join('');
  } else { dl.style.display = 'none'; dEl.innerHTML = ''; }
  gEl.onclick = (e) => { const b = e.target.closest('[data-g]'); if (!b) return; state.group = b.dataset.g; state.cat = 'All'; buildChips(); reload(); };
  dEl.onclick = (e) => { const b = e.target.closest('[data-d]'); if (!b) return; state.cat = b.dataset.d; buildChips(); reload(); };
}

function selectDepartment(name) {
  const d = TVUBooks.findDepartment(name);
  if (!d) return;
  state.cat = d.name; state.group = d.group; state.q = '';
  const s = document.getElementById('catalog-search'); if (s) s.value = '';
  buildChips(); reload();
}

/* ---------- loading ---------- */
function filterArgs() {
  const a = { search: state.q, sort: state.sort };
  if (state.cat !== 'All') a.category = state.cat;
  else if (state.group !== 'All') {
    const g = TVUBooks.groups().find(x => x.name === state.group);
    if (g) a.categories = g.departments;
  }
  return a;
}

function reload() {
  reqId++;
  fsBooks = []; fsCursor = null; fsDone = false; loadingPage = false;
  try {
    const p = new URLSearchParams();
    if (state.cat !== 'All') p.set('cat', state.cat); else if (state.group !== 'All') p.set('group', state.group);
    if (state.q) p.set('q', state.q);
    history.replaceState(null, '', 'books.html' + (p.toString() ? '?' + p : ''));
  } catch (e) {}
  const grid = document.getElementById('books-catalog-grid');
  if (grid) grid.innerHTML = '<div class="skeleton-card"></div>'.repeat(8);
  loadNextPage();
}

async function loadNextPage() {
  if (fsDone || loadingPage) return;
  loadingPage = true;
  const my = reqId;
  const live = window.isFirebaseConfigured && window.isFirebaseConfigured();
  try {
    if (live) {
      const r = await TVUBooks.fetchPage(Object.assign({ cursor: fsCursor }, filterArgs()));
      if (my !== reqId) return;
      fsBooks = fsBooks.concat(r.books); fsCursor = r.cursor; fsDone = r.done;
      window.TVU_LIVE_BOOKS = (window.TVU_LIVE_BOOKS || []).concat(r.books).slice(-400);
    } else fsDone = true;
  } catch (error) {
    if (my !== reqId) return;
    console.warn('Could not load live books (showing starter books):', error.message || error);
    fsDone = true;
  }
  loadingPage = false;
  renderGrid();
  if (auth.currentUser && !userWishlistIds.size && !window.__wlTried) { window.__wlTried = true; loadUserWishlist(auth.currentUser.uid); }
}

async function loadUserWishlist(uid) {
  try {
    const snapshot = await db.collection('users').doc(uid).collection('wishlist').get();
    userWishlistIds.clear();
    snapshot.forEach(doc => userWishlistIds.add(doc.id));
  } catch (err) { console.warn(err); }
  renderGrid();
}

/* ---------- rendering ---------- */
function renderGrid() {
  const container = document.getElementById('books-catalog-grid');
  if (!container) return;
  if (loadingPage && !fsBooks.length && !fsDone) return;     // skeletons stay until the first page arrives

  const a = filterArgs();
  const seeds = fsDone ? TVUBooks.seedsFor({ category: a.category, group: state.group !== 'All' && !a.category ? state.group : null, search: state.q }) : [];
  let list = fsBooks.concat(seeds);

  if (state.stock === 'in-stock') list = list.filter(b => b.stock === undefined || Number(b.stock) > 0);
  const price = b => Number(b.discountedPrice) || Number(b.originalPrice) || 0;
  if (state.sort === 'price-low') list.sort((x, y) => price(x) - price(y));
  else if (state.sort === 'price-high') list.sort((x, y) => price(y) - price(x));
  allBooks = list;

  const countEl = document.getElementById('catalog-count');
  if (countEl) {
    const label = state.cat !== 'All' ? state.cat : (state.group !== 'All' ? state.group : 'all departments');
    countEl.textContent = `Showing ${list.length}${fsDone ? '' : '+'} book${list.length === 1 ? '' : 's'}` + (state.q ? ` for "${state.q}"` : ` in ${label}`);
  }

  if (!list.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">🔍</div>
        <h3 class="empty-state-title">No matching books found</h3>
        <p class="empty-state-text">Try another department or different search words.</p>
      </div>`;
    return;
  }
  container.innerHTML = list.map(book => renderBookCard(book, userWishlistIds.has(book.id))).join('') +
    (fsDone ? '' : `<div id="scroll-sentinel" class="scroll-sentinel" style="grid-column:1/-1;"></div><div style="grid-column:1/-1;text-align:center;margin:.5rem 0;"><button class="btn btn-outline btn-sm" onclick="loadNextPage()">${loadingPage ? 'Loading...' : 'Load more books'}</button></div>`);
  observeSentinel();
}

function setupScrollLoader() {
  if (!('IntersectionObserver' in window)) return;
  io = new IntersectionObserver((entries) => { if (entries.some(e => e.isIntersecting)) loadNextPage(); }, { rootMargin: '600px' });
}
function observeSentinel() {
  if (!io) return;
  io.disconnect();
  const s = document.getElementById('scroll-sentinel');
  if (s) io.observe(s);
}
window.loadNextPage = loadNextPage;

async function toggleWishlist(bookId, event) {
  if (event) event.stopPropagation();

  if (!auth.currentUser) {
    requireLogin("Please login to add books to your wishlist.");
    return;
  }

  const book = allBooks.find(b => b.id === bookId);
  if (!book) return;

  const uid = auth.currentUser.uid;
  const wishRef = db.collection('users').doc(uid).collection('wishlist').doc(bookId);

  try {
    if (userWishlistIds.has(bookId)) {
      await wishRef.delete();
      userWishlistIds.delete(bookId);
      showToast("Removed from wishlist", "info");
    } else {
      await wishRef.set({
        bookId: book.id,
        title: book.title,
        author: book.author || '',
        category: book.category || 'General',
        originalPrice: Number(book.originalPrice) || 0,
        discountedPrice: Number(book.discountedPrice) || 0,
        imageUrl: book.imageUrl || '',
        sellerName: book.sellerName || '',
        sellerId: book.sellerId || '',
        sellerEmail: book.sellerEmail || '',
        isSeed: !!book.isSeed,
        addedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      userWishlistIds.add(bookId);
      showToast("Added to wishlist", "success");
    }
    renderGrid();
  } catch (error) {
    console.error("Wishlist error:", error);
    showToast("Could not update wishlist", "error");
  }
}

function initiateBuyNow(bookId) {
  if (!auth.currentUser) {
    requireLogin("Please login to place an order.");
    return;
  }

  const book = allBooks.find(b => b.id === bookId);
  if (!book) return;

  selectedBookForOrder = book;

  document.getElementById('modal-book-img').src = book.imageUrl || 'https://via.placeholder.com/90';
  document.getElementById('modal-book-title').textContent = book.title;
  document.getElementById('modal-book-seller').textContent = `Seller: ${book.sellerName || 'TVU Member'}`;
  document.getElementById('modal-book-price').textContent = formatINR(book.discountedPrice || book.originalPrice);
  document.getElementById('order-qty').value = 1;
  document.getElementById('modal-order-total').textContent = formatINR(book.discountedPrice || book.originalPrice);

  const user = auth.currentUser;
  const nameInput = document.getElementById('order-cust-name');
  if (nameInput) nameInput.value = user.displayName || '';

  openModal('buy-now-modal');
}

function setupOrderForm() {
  const form = document.getElementById('order-checkout-form');
  const qtyInput = document.getElementById('order-qty');

  if (qtyInput) {
    qtyInput.addEventListener('input', () => {
      if (!selectedBookForOrder) return;
      let qty = parseInt(qtyInput.value) || 1;
      if (qty < 1) qty = 1;
      const unitPrice = Number(selectedBookForOrder.discountedPrice) || Number(selectedBookForOrder.originalPrice) || 0;
      document.getElementById('modal-order-total').textContent = formatINR(unitPrice * qty);
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!selectedBookForOrder || !auth.currentUser) return;

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalBtnHtml = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="spinner"></span> Placing order...`;

      const user = auth.currentUser;
      const name = document.getElementById('order-cust-name').value.trim();
      const phone = document.getElementById('order-cust-phone').value.trim();
      const address = document.getElementById('order-cust-address').value.trim();
      const quantity = parseInt(qtyInput.value) || 1;

      if (!name || !phone || !address) {
        showToast("Please complete all required fields.", "warning");
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
        return;
      }

      const unitPrice = Number(selectedBookForOrder.discountedPrice) || Number(selectedBookForOrder.originalPrice) || 0;
      const totalAmount = unitPrice * quantity;

      const orderPayload = {
        orderId: 'TVU-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase(),
        customerId: user.uid,
        userId: user.uid,
        customerName: name,
        customerEmail: user.email || '',
        customerPhone: phone,
        customerAddress: address,
        sellerId: selectedBookForOrder.sellerId || '',
        sellerName: selectedBookForOrder.sellerName || 'TVU Seller',
        sellerEmail: selectedBookForOrder.sellerEmail || '',
        bookId: selectedBookForOrder.id,
        bookTitle: selectedBookForOrder.title,
        bookImageUrl: selectedBookForOrder.imageUrl || '',
        quantity: quantity,
        originalPrice: Number(selectedBookForOrder.originalPrice) || 0,
        discountedPrice: unitPrice,
        unitPrice: unitPrice,
        totalAmount: totalAmount,
        paymentMethod: "Cash on Delivery",
        paymentStatus: "Cash on Delivery",
        orderStatus: "waiting_for_confirmation",
        sellerConfirmed: false,
        deliveryDate: null,
        deliveryDateRaw: null,
        deliveryStatus: "Waiting for Confirmation",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      try {
        const docRef = await db.collection('orders').add(orderPayload);
        orderPayload.id = docRef.id;

        if (!selectedBookForOrder.isSeed && selectedBookForOrder.stock !== undefined && selectedBookForOrder.stock > 0) {
          const newStock = Math.max(0, selectedBookForOrder.stock - quantity);
          await db.collection('books').doc(selectedBookForOrder.id).update({
            stock: newStock,
            availability: newStock > 0 ? "In Stock" : "Out of Stock"
          });
        }

        closeModal('buy-now-modal');
        form.reset();

        document.getElementById('confirmed-order-id').textContent = `#${orderPayload.orderId}`;
        openModal('order-confirmed-modal');
        triggerConfettiCelebration();
        showToast("Order placed successfully!", "success");

        if (typeof sendNewOrderSellerEmail === 'function') {
          sendNewOrderSellerEmail(orderPayload);
        } else if (typeof sendSellerOrderNotification === 'function') {
          sendSellerOrderNotification(orderPayload);
        }
        loadBooks();
      } catch (err) {
        console.error("Order error:", err);
        showToast("Failed to place order: " + err.message, "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
    });
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function loadBooks() { reload(); }
window.loadBooks = loadBooks;
window.toggleWishlist = toggleWishlist;
window.initiateBuyNow = initiateBuyNow;
