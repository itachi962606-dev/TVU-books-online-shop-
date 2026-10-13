/**
 * TVU Books Shop - Home Page Controller
 * Fast start: the starter books appear instantly, live books arrive one page (24) at a time.
 * Layout (like Flipkart): horizontal swipe rows + a vertical grid.
 * Also: Wishlist toggle and the Buy Now (COD) flow.
 */

let allBooks = [];          // live books (newest first) + starter books
let fsBooks = [];           // live books loaded so far
let fsCursor = null;
let fsDone = false;
let booksLoaded = false;
let loadingMore = false;
let gridShown = 8;
let userWishlistIds = new Set();
let selectedBookForOrder = null;

document.addEventListener('DOMContentLoaded', () => { initHomePage(); });

// Re-fetch wishlist whenever auth state changes
window.addEventListener('authStateChanged', (e) => {
  if (e.detail.user) loadUserWishlist(e.detail.user.uid);
  else { userWishlistIds.clear(); renderBooksList(); }
});

function initHomePage() {
  setupSearchInput();
  setupOrderForm();
  showSkeletons();
  // 1) starter books are in memory -> show them straight away (no waiting for the network)
  allBooks = (window.SEED_BOOKS || []).slice();
  booksLoaded = true;
  renderBooksList();
  // 2) live books from Firestore: just the first page
  loadBooks();
}

function showSkeletons() {
  const rows = document.getElementById('home-rows');
  if (rows && !rows.children.length) {
    rows.innerHTML = `<section class="home-block"><div class="hrow-wrap"><div class="hrow">${'<div class="skeleton-card"></div>'.repeat(6)}</div></div></section>`;
  }
}

/** Load (or reload) the first page of live books */
async function loadBooks() {
  fsBooks = []; fsCursor = null; fsDone = false;
  await loadMoreLive();
}

async function loadMoreLive() {
  if (fsDone || loadingMore) return;
  if (!window.isFirebaseConfigured || !window.isFirebaseConfigured()) { fsDone = true; return; }
  loadingMore = true;
  try {
    const r = await TVUBooks.fetchPage({ cursor: fsCursor, limit: 24 });
    fsBooks = fsBooks.concat(r.books);
    fsCursor = r.cursor; fsDone = r.done;
    window.TVU_LIVE_BOOKS = fsBooks;
  } catch (error) {
    console.warn('Could not load live books (showing starter books):', error.message || error);
    fsDone = true;
  }
  loadingMore = false;
  allBooks = fsBooks.concat(window.SEED_BOOKS || []);
  if (auth.currentUser && !userWishlistIds.size) { loadUserWishlist(auth.currentUser.uid); } else renderBooksList();
}

async function loadUserWishlist(uid) {
  try {
    const snapshot = await db.collection('users').doc(uid).collection('wishlist').get();
    userWishlistIds.clear();
    snapshot.forEach(doc => userWishlistIds.add(doc.id));
  } catch (err) { console.warn("Could not fetch user wishlist:", err); }
  renderBooksList();
}

const priceOf = b => Number(b.discountedPrice) || Number(b.originalPrice) || 0;
const pctOf = b => { const o = Number(b.originalPrice) || 0, d = priceOf(b); return o > d ? (o - d) / o : 0; };

function rowHtml(title, sub, list) {
  if (!list.length) return '';
  return `
    <section class="home-block">
      <div class="home-block-head">
        <div><h2 class="home-block-title">${title}</h2><div class="home-block-sub">${sub}</div></div>
        <a href="books.html" class="btn btn-outline btn-sm">View all →</a>
      </div>
      <div class="hrow-wrap">
        <button class="hrow-btn prev" onclick="hrowScroll(this,-1)" aria-label="Previous">‹</button>
        <div class="hrow">${list.map(b => renderBookCard(b, userWishlistIds.has(b.id))).join('')}</div>
        <button class="hrow-btn next" onclick="hrowScroll(this,1)" aria-label="Next">›</button>
      </div>
    </section>`;
}

function hrowScroll(btn, dir) {
  const row = btn.parentElement.querySelector('.hrow');
  if (row) row.scrollBy({ left: dir * row.clientWidth * 0.8, behavior: 'smooth' });
}
window.hrowScroll = hrowScroll;

function renderBooksList() {
  if (!booksLoaded) return;
  const rows = document.getElementById('home-rows');
  const grid = document.getElementById('books-container');
  const more = document.getElementById('home-more');
  if (!grid) return;

  if (!allBooks.length) {
    if (rows) rows.innerHTML = '';
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">📖</div>
        <h3 class="empty-state-title">No books are currently available.</h3>
        <p class="empty-state-text">Be the first student or teacher to sell a book on campus!</p>
        <a href="seller.html" class="btn btn-primary btn-sm">Become a Seller</a>
      </div>`;
    if (more) more.style.display = 'none';
    return;
  }

  // Horizontal rows
  if (rows) {
    const fresh = allBooks.slice(0, 8);
    const discount = allBooks.filter(b => pctOf(b) > 0).sort((a, b) => pctOf(b) - pctOf(a)).slice(0, 8);
    const rated = allBooks.filter(b => Number(b.rating) > 0).sort((a, b) => Number(b.rating) - Number(a.rating)).slice(0, 8);
    const budget = allBooks.filter(b => priceOf(b) > 0 && priceOf(b) <= 250).slice(0, 8);
    rows.innerHTML =
      rowHtml('New arrivals', 'Latest books added to the shop', fresh) +
      rowHtml('Best discounts', 'Biggest savings on the MRP', discount) +
      rowHtml('Top rated', 'Loved by TVU students', rated) +
      rowHtml('Budget picks under ₹250', 'Pocket friendly textbooks', budget);
  }

  // Vertical grid
  const shown = allBooks.slice(0, gridShown);
  grid.innerHTML = shown.map(b => renderBookCard(b, userWishlistIds.has(b.id))).join('');
  if (more) more.style.display = (allBooks.length > gridShown || !fsDone) ? '' : 'none';
}

async function homeShowMore() {
  gridShown += 8;
  if (gridShown > allBooks.length && !fsDone) await loadMoreLive(); else renderBooksList();
}
window.homeShowMore = homeShowMore;

/** The ONLY search on the home page: suggestions while typing, Enter opens Browse Books with the results */
function setupSearchInput() {
  const input = document.getElementById('search-input');
  if (input && window.TVUSuggest) TVUSuggest.attach(input, {});
}

/**
 * Toggle Wishlist
 */
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
    renderBooksList();
  } catch (error) {
    console.error("Wishlist error:", error);
    showToast("Could not update wishlist: " + error.message, "error");
  }
}

/**
 * Initiate Buy Now Modal
 */
function initiateBuyNow(bookId) {
  if (!auth.currentUser) {
    requireLogin("Please login to place an order.");
    return;
  }

  const book = allBooks.find(b => b.id === bookId);
  if (!book) return;

  selectedBookForOrder = book;

  // Prefill order modal fields
  document.getElementById('modal-book-img').src = book.imageUrl || 'https://via.placeholder.com/90';
  document.getElementById('modal-book-title').textContent = book.title;
  document.getElementById('modal-book-seller').textContent = `Seller: ${book.sellerName || 'TVU Member'}`;
  document.getElementById('modal-book-price').textContent = formatINR(book.discountedPrice || book.originalPrice);
  document.getElementById('order-qty').value = 1;
  document.getElementById('modal-order-total').textContent = formatINR(book.discountedPrice || book.originalPrice);

  // Prefill user details from Google Auth
  const user = auth.currentUser;
  const nameInput = document.getElementById('order-cust-name');
  const phoneInput = document.getElementById('order-cust-phone');
  const addrInput = document.getElementById('order-cust-address');

  if (nameInput) nameInput.value = user.displayName || '';
  if (phoneInput && !phoneInput.value) phoneInput.value = '';
  if (addrInput && !addrInput.value) addrInput.value = '';

  openModal('buy-now-modal');
}

/**
 * Handle Order Form Submit
 */
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

      // Validation
      if (!name || !phone || !address) {
        showToast("Please fill in your Name, Phone Number, and Delivery Address.", "warning");
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
        return;
      }

      if (!window.isValidOrderMobileNumber(phone)) {
        showToast("Please enter a valid 10-digit mobile number.", "warning");
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
        // 1. Create order in Firestore
        const docRef = await db.collection('orders').add(orderPayload);
        orderPayload.id = docRef.id;

        // 2. Reduce stock if present
        if (!selectedBookForOrder.isSeed && selectedBookForOrder.stock !== undefined && selectedBookForOrder.stock > 0) {
          const newStock = Math.max(0, selectedBookForOrder.stock - quantity);
          await db.collection('books').doc(selectedBookForOrder.id).update({
            stock: newStock,
            availability: newStock > 0 ? "In Stock" : "Out of Stock"
          });
        }

        // Close checkout modal
        closeModal('buy-now-modal');
        form.reset();

        // 3. Show Success Celebration Modal ONLY after successful creation
        document.getElementById('confirmed-order-id').textContent = `#${orderPayload.orderId}`;
        openModal('order-confirmed-modal');
        triggerConfettiCelebration();
        showToast("Order placed successfully!", "success");

        // 4. Send EmailJS notification in background (Seller only)
        if (typeof sendNewOrderSellerEmail === 'function') {
          sendNewOrderSellerEmail(orderPayload);
        } else if (typeof sendSellerOrderNotification === 'function') {
          sendSellerOrderNotification(orderPayload);
        }

        // Reload catalog
        loadBooks();
      } catch (err) {
        console.error("Order placement failed:", err);
        showToast("Failed to place order: " + err.message, "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
    });
  }
}

// Utility HTML escape
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.loadBooks = loadBooks;
window.toggleWishlist = toggleWishlist;
window.initiateBuyNow = initiateBuyNow;
