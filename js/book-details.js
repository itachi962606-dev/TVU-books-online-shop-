/**
 * TVU Books Shop - Book Details Controller (Flipkart-style product page)
 * Loads books/{bookId} (or a starter-catalogue book), handles Add to Cart, Buy Now (COD) & wishlist
 */

let currentBook = null;
let isCurrentBookWishlisted = false;
let similarPicks = [];

document.addEventListener('DOMContentLoaded', () => { initBookDetailsPage(); });

// Re-check wishlist when the user logs in/out
window.addEventListener('authStateChanged', async (e) => {
  if (!currentBook) return;
  isCurrentBookWishlisted = false;
  if (e.detail.user) {
    try {
      const wishDoc = await db.collection('users').doc(e.detail.user.uid).collection('wishlist').doc(currentBook.id).get();
      isCurrentBookWishlisted = wishDoc.exists;
    } catch (err) { /* ignore */ }
  }
  renderBookDetails();
});

async function initBookDetailsPage() {
  const bookId = new URLSearchParams(window.location.search).get('id');
  if (!bookId) { showErrorState("No book specified in URL."); return; }
  setupOrderForm();
  await loadBookDetails(bookId);
}

async function loadBookDetails(bookId) {
  const container = document.getElementById('book-details-wrapper');
  if (!container) return;

  // Starter catalogue books live in the browser, not in Firestore
  if (bookId.startsWith('seed-')) {
    const seed = window.getSeedBook && window.getSeedBook(bookId);
    if (!seed) { showErrorState("The requested book listing could not be found."); return; }
    currentBook = seed;
    if (auth.currentUser) {
      try { isCurrentBookWishlisted = (await db.collection('users').doc(auth.currentUser.uid).collection('wishlist').doc(bookId).get()).exists; } catch (e) {}
    }
    document.title = seed.title + ' | TVU Books Shop';
    renderBookDetails();
    loadSimilarBooks();
    return;
  }

  if (!window.isFirebaseConfigured()) { showErrorState("Please configure Firebase in js/firebase-config.js to load live book details."); return; }

  try {
    const doc = await db.collection('books').doc(bookId).get();
    if (!doc.exists) { showErrorState("The requested book listing could not be found or has been removed."); return; }
    currentBook = { id: doc.id, ...doc.data() };
    document.title = currentBook.title + ' | TVU Books Shop';

    if (auth.currentUser) {
      const wishDoc = await db.collection('users').doc(auth.currentUser.uid).collection('wishlist').doc(bookId).get();
      isCurrentBookWishlisted = wishDoc.exists;
    }
    renderBookDetails();
    loadSimilarBooks();
  } catch (error) {
    console.error("Error loading book details:", error);
    showErrorState("Failed to load book: " + error.message);
  }
}

/** Front cover + back cover (a neat back cover is generated when the seller did not upload one) */
function bookGallery(b, fallback) {
  const front = b.imageUrl || fallback;
  let back = b.backImageUrl;
  if (!back) {
    if (!b._genBack && window.TVU_makeBackCover) { try { Object.defineProperty(b, '_genBack', { value: window.TVU_makeBackCover(b), enumerable: false, writable: true }); } catch (e) {} }
    back = b._genBack || '';
  }
  return [front].concat(back ? [back] : []);
}

function fkStars(rating) {
  const r = Number(rating);
  return r ? r.toFixed(1) : '4.2';
}

function renderBookDetails() {
  const container = document.getElementById('book-details-wrapper');
  if (!container || !currentBook) return;
  const b = currentBook;

  const orig = Number(b.originalPrice) || 0;
  const disc = Number(b.discountedPrice) || orig;
  const pct = (orig > 0 && disc < orig) ? Math.round(((orig - disc) / orig) * 100) : 0;
  const isInStock = (b.stock === undefined || Number(b.stock) > 0);
  const inCart = window.cartItemIds && window.cartItemIds.has(b.id);
  const eta = new Date(Date.now() + 3 * 86400000).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const fallback = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&auto=format&fit=crop&q=80';
  const gallery = bookGallery(b, fallback);

  const specs = [
    ['Title', b.title],
    ['Author / Faculty', b.author || 'Academic Faculty'],
    ['Category', b.category || 'General'],
    b.edition ? ['Edition', b.edition] : null,
    b.kind ? ['Type', b.kind] : null,
    b.language ? ['Language', b.language] : null,
    b.pages ? ['Pages', b.pages] : null,
    ['Sold by', b.sellerName || 'TVU Seller'],
    ['Listed on', b.createdAt ? formatDate(b.createdAt) : 'TVU Book Bank catalogue'],
  ].filter(Boolean);

  container.innerHTML = `
    <div class="fk-product">
      <!-- LEFT: image + buttons -->
      <div class="fk-left">
        <div class="fk-img-box">
          <button class="fk-heart ${isCurrentBookWishlisted ? 'active' : ''}" onclick="toggleDetailsWishlist()" title="${isCurrentBookWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}" aria-label="Wishlist">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="${isCurrentBookWishlisted ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          </button>
          ${gallery.length > 1 ? `<div class="fk-thumbs">${gallery.map((g, i) => `<button type="button" class="fk-thumb ${i === 0 ? 'active' : ''}" onclick="setDetailsImage(${i})" aria-label="${i === 0 ? 'Front cover' : 'Back cover'}"><img src="${escapeHTML(g)}" alt=""><span>${i === 0 ? 'Front' : 'Back'}</span></button>`).join('')}</div>` : ''}
          <img id="fk-main-img" src="${escapeHTML(gallery[0])}" alt="${escapeHTML(b.title)}" class="fk-main-img" onerror="this.src='${fallback}'">
        </div>
        <div class="fk-btn-row">
          ${inCart
            ? `<a href="cart.html" class="fk-btn fk-btn-cart">GO TO CART</a>`
            : `<button class="fk-btn fk-btn-cart" onclick="addCurrentToCart()" ${!isInStock ? 'disabled' : ''}>
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="21" r="1.5"/><circle cx="20" cy="21" r="1.5"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" fill="none" stroke="currentColor" stroke-width="2"/></svg>
                 ADD TO CART
               </button>`}
          <button class="fk-btn fk-btn-buy" onclick="initiateBuyNowFromDetails()" ${!isInStock ? 'disabled' : ''}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 3 14h7l-1 8 10-12h-7z"/></svg>
            BUY NOW
          </button>
        </div>
      </div>

      <!-- RIGHT: info -->
      <div class="fk-right">
        <div class="fk-cat">${escapeHTML(b.category || 'General')}</div>
        <h1 class="fk-title">${escapeHTML(b.title)}</h1>
        <div class="fk-rating-row">
          <span class="fk-rating-pill">${fkStars(b.rating)} ★</span>
          <span class="fk-rating-count">${b.ratingCount ? b.ratingCount.toLocaleString('en-IN') + ' Ratings' : 'New listing'}</span>
          <span class="fk-assured">✔ TVU Student Marketplace</span>
        </div>

        ${pct > 0 ? `<div class="fk-deal">Special price</div>` : ''}
        <div class="fk-price-line">
          <span class="fk-price">${formatINR(disc)}</span>
          ${orig > disc ? `<span class="fk-mrp">${formatINR(orig)}</span>` : ''}
          ${pct > 0 ? `<span class="fk-pct">${pct}% off</span>` : ''}
        </div>
        <div class="fk-stock ${isInStock ? 'in' : 'out'}">${isInStock ? (b.stock !== undefined && Number(b.stock) <= 3 ? `Hurry, only ${Number(b.stock)} left!` : 'In Stock') : 'Currently out of stock'}</div>

        <div class="fk-section">
          <div class="fk-section-title">Available offers</div>
          <ul class="fk-offers">
            <li><b>Cash on Delivery</b> available – pay when you receive the book.</li>
            <li><b>Free campus handover</b> – no delivery charges inside the university.</li>
            <li><b>Student-to-student pricing</b> – up to ${pct || 'Great'}${pct ? '%' : ''} below the MRP.</li>
          </ul>
        </div>

        <div class="fk-section fk-delivery">
          <div class="fk-label">Delivery</div>
          <div><b>Estimated by ${eta}</b> <span class="fk-green">| Free</span><div class="fk-muted">Handover on campus after the seller confirms your order.</div></div>
        </div>
        <div class="fk-section fk-delivery">
          <div class="fk-label">Seller</div>
          <div><b class="fk-link">${escapeHTML(b.sellerName || 'TVU Seller')}</b><div class="fk-muted">Pay the seller in cash at handover.</div></div>
        </div>

        <div class="fk-section">
          <div class="fk-section-title">Description</div>
          <p class="fk-desc">${escapeHTML(b.description || 'No detailed description provided by the seller.')}</p>
          ${b.notes ? `<div class="fk-notes"><b>Seller notes:</b> ${escapeHTML(b.notes)}</div>` : ''}
        </div>

        <div class="fk-section">
          <div class="fk-section-title">Specifications</div>
          <table class="fk-spec">
            ${specs.map(([k, v]) => `<tr><td>${escapeHTML(k)}</td><td>${escapeHTML(String(v))}</td></tr>`).join('')}
          </table>
        </div>
      </div>
    </div>

    <div id="similar-books" class="fk-similar"></div>
  `;
  paintSimilar();
}

function setDetailsImage(i) {
  if (!currentBook) return;
  const list = bookGallery(currentBook, '');
  const img = document.getElementById('fk-main-img');
  if (img && list[i]) img.src = list[i];
  document.querySelectorAll('.fk-thumb').forEach((t, idx) => t.classList.toggle('active', idx === i));
}
window.setDetailsImage = setDetailsImage;

async function addCurrentToCart() {
  if (!currentBook) return;
  const ok = await addToCart(currentBook, 1);
  if (ok) {
    window.cartItemIds = window.cartItemIds || new Set();
    window.cartItemIds.add(currentBook.id);
    renderBookDetails();
  }
}

async function loadSimilarBooks() {
  if (!currentBook) return;
  const me = currentBook;
  const pool = window.SEED_BOOKS || [];
  const same = pool.filter(x => x.category === me.category && x.id !== me.id);
  let h = 0; for (const ch of me.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rot = list => { const s = list.length ? h % list.length : 0; return list.slice(s).concat(list.slice(0, s)); };
  let picks = rot(same);

  if (!me.isSeed && window.isFirebaseConfigured()) {
    try {
      const snap = await db.collection('books').where('category', '==', me.category || 'General').limit(10).get();
      const live = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => x.id !== me.id && !(window.isHiddenBook && window.isHiddenBook(x)));
      picks = live.concat(picks);
    } catch (e) { /* similar books are optional */ }
  }
  // not enough in the same department? fill with other books so the row is never empty
  if (picks.length < 8) {
    let more = [];
    try {
      const r = await TVUBooks.fetchPage({ limit: 12 });
      more = r.books.filter(x => x.id !== me.id);
    } catch (e) {}
    const have = new Set(picks.map(x => x.id));
    more.concat(rot(pool.filter(x => x.id !== me.id))).forEach(x => { if (!have.has(x.id) && picks.length < 8) { have.add(x.id); picks.push(x); } });
  }
  similarPicks = picks.slice(0, 8);
  paintSimilar();
}

function paintSimilar() {
  const picks = similarPicks;
  const el = document.getElementById('similar-books');
  if (!el || !picks.length) { if (el) el.style.display = 'none'; return; }
  el.style.display = '';
  el.innerHTML = `
    <div class="fk-similar-head">
      <h2 class="fk-similar-title">Similar books you may like</h2>
      <a href="books.html?cat=${encodeURIComponent(currentBook.category || 'All')}" class="btn btn-outline btn-sm">View all books →</a>
    </div>
    <div class="fk-similar-grid">
      ${picks.map(p => {
        const o = Number(p.originalPrice) || 0, d = Number(p.discountedPrice) || o;
        const off = o > d ? Math.round((o - d) / o * 100) : 0;
        return `<a class="fk-sim-card" href="book-details.html?id=${encodeURIComponent(p.id)}">
          <img src="${escapeHTML(p.imageUrl || '')}" alt="${escapeHTML(p.title)}" loading="lazy">
          <div class="fk-sim-title">${escapeHTML(p.title)}</div>
          <div><b>${formatINR(d)}</b> ${o > d ? `<span class="fk-mrp">${formatINR(o)}</span> <span class="fk-pct">${off}% off</span>` : ''}</div>
        </a>`;
      }).join('')}
    </div>`;
}

function showErrorState(msg) {
  const container = document.getElementById('book-details-wrapper');
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3 class="empty-state-title">Book Not Found</h3>
        <p class="empty-state-text">${msg}</p>
        <a href="books.html" class="btn btn-primary">Browse Available Books</a>
      </div>
    `;
  }
}

async function toggleDetailsWishlist() {
  if (!auth.currentUser) {
    requireLogin("Please login to add books to your wishlist.");
    return;
  }

  if (!currentBook) return;

  const uid = auth.currentUser.uid;
  const wishRef = db.collection('users').doc(uid).collection('wishlist').doc(currentBook.id);

  try {
    if (isCurrentBookWishlisted) {
      await wishRef.delete();
      isCurrentBookWishlisted = false;
      showToast("Removed from wishlist", "info");
    } else {
      await wishRef.set({
        bookId: currentBook.id,
        title: currentBook.title,
        author: currentBook.author || '',
        category: currentBook.category || 'General',
        originalPrice: Number(currentBook.originalPrice) || 0,
        discountedPrice: Number(currentBook.discountedPrice) || 0,
        imageUrl: currentBook.imageUrl || '',
        sellerName: currentBook.sellerName || '',
        addedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      isCurrentBookWishlisted = true;
      showToast("Added to wishlist", "success");
    }
    renderBookDetails();
  } catch (err) {
    showToast("Failed to update wishlist: " + err.message, "error");
  }
}

function initiateBuyNowFromDetails() {
  if (!auth.currentUser) {
    requireLogin("Please login to place an order.");
    return;
  }

  if (!currentBook) return;

  document.getElementById('modal-book-img').src = currentBook.imageUrl || 'https://via.placeholder.com/90';
  document.getElementById('modal-book-title').textContent = currentBook.title;
  document.getElementById('modal-book-seller').textContent = `Seller: ${currentBook.sellerName || 'TVU Member'}`;
  document.getElementById('modal-book-price').textContent = formatINR(currentBook.discountedPrice || currentBook.originalPrice);
  document.getElementById('order-qty').value = 1;
  document.getElementById('modal-order-total').textContent = formatINR(currentBook.discountedPrice || currentBook.originalPrice);

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
      if (!currentBook) return;
      let qty = parseInt(qtyInput.value) || 1;
      if (qty < 1) qty = 1;
      const unitPrice = Number(currentBook.discountedPrice) || Number(currentBook.originalPrice) || 0;
      document.getElementById('modal-order-total').textContent = formatINR(unitPrice * qty);
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentBook || !auth.currentUser) return;

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
        showToast("Please fill all required fields.", "warning");
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
        return;
      }

      const unitPrice = Number(currentBook.discountedPrice) || Number(currentBook.originalPrice) || 0;
      const totalAmount = unitPrice * quantity;

      const orderPayload = {
        orderId: 'TVU-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase(),
        customerId: user.uid,
        userId: user.uid,
        customerName: name,
        customerEmail: user.email || '',
        customerPhone: phone,
        customerAddress: address,
        sellerId: currentBook.sellerId || '',
        sellerName: currentBook.sellerName || 'TVU Seller',
        sellerEmail: currentBook.sellerEmail || '',
        bookId: currentBook.id,
        bookTitle: currentBook.title,
        bookImageUrl: currentBook.imageUrl || '',
        quantity: quantity,
        originalPrice: Number(currentBook.originalPrice) || 0,
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

        if (!currentBook.isSeed && currentBook.stock !== undefined && currentBook.stock > 0) {
          const newStock = Math.max(0, currentBook.stock - quantity);
          await db.collection('books').doc(currentBook.id).update({
            stock: newStock,
            availability: newStock > 0 ? "In Stock" : "Out of Stock"
          });
          currentBook.stock = newStock;
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
        renderBookDetails();
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

window.toggleDetailsWishlist = toggleDetailsWishlist;
window.initiateBuyNowFromDetails = initiateBuyNowFromDetails;
window.addCurrentToCart = addCurrentToCart;
