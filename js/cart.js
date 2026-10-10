/**
 * TVU Books Shop - Cart helpers (shared on every page)
 *
 * Cart is stored in Firestore at users/{uid}/cart/{bookId}.
 * If Firestore rules for the cart are not published yet (permission-denied), the cart
 * automatically falls back to this browser's localStorage so it keeps working.
 */

let cartBackend = 'firestore';                 // 'firestore' | 'local'
const CART_LOCAL_EVENT = 'tvu-cart-changed';

function cartCollection(uid) { return db.collection('users').doc(uid).collection('cart'); }

/* ---------- local fallback ---------- */
function localCartRead(uid) {
  try { return JSON.parse(localStorage.getItem('tvu_cart_' + uid) || '{}'); } catch (e) { return {}; }
}
function localCartWrite(uid, obj) {
  try { localStorage.setItem('tvu_cart_' + uid, JSON.stringify(obj)); } catch (e) { console.warn('Local cart save failed', e); }
  window.dispatchEvent(new Event(CART_LOCAL_EVENT));
}
function isPermissionError(err) {
  return !!err && (err.code === 'permission-denied' || /permission/i.test(err.message || ''));
}

/* ---------- storage API (used by every page) ---------- */
async function cartGet(uid, id) {
  if (cartBackend === 'firestore') {
    try { const s = await cartCollection(uid).doc(id).get(); return s.exists ? { id, ...s.data() } : null; }
    catch (err) { if (!isPermissionError(err)) throw err; cartBackend = 'local'; console.warn('Cart rules not published - using local cart.'); }
  }
  const o = localCartRead(uid); return o[id] ? { id, ...o[id] } : null;
}

async function cartSet(uid, id, data) {
  if (cartBackend === 'firestore') {
    try { await cartCollection(uid).doc(id).set({ ...data, addedAt: firebase.firestore.FieldValue.serverTimestamp() }); return; }
    catch (err) { if (!isPermissionError(err)) throw err; cartBackend = 'local'; console.warn('Cart rules not published - using local cart.'); }
  }
  const o = localCartRead(uid); o[id] = { ...data, addedAt: Date.now() }; localCartWrite(uid, o);
}

async function cartUpdate(uid, id, patch) {
  if (cartBackend === 'firestore') {
    try { await cartCollection(uid).doc(id).update(patch); return; }
    catch (err) { if (!isPermissionError(err)) throw err; cartBackend = 'local'; }
  }
  const o = localCartRead(uid); if (o[id]) { o[id] = { ...o[id], ...patch }; localCartWrite(uid, o); }
}

async function cartDelete(uid, id) {
  if (cartBackend === 'firestore') {
    try { await cartCollection(uid).doc(id).delete(); return; }
    catch (err) { if (!isPermissionError(err)) throw err; cartBackend = 'local'; }
  }
  const o = localCartRead(uid); delete o[id]; localCartWrite(uid, o);
}

/** Live cart listener. cb receives an array of items. Returns an unsubscribe function. */
function cartSubscribe(uid, cb) {
  let fsUnsub = null, stopped = false;
  const localHandler = () => cb(Object.entries(localCartRead(uid)).map(([id, v]) => ({ id, ...v })));

  const startLocal = () => {
    cartBackend = 'local';
    window.addEventListener(CART_LOCAL_EVENT, localHandler);
    window.addEventListener('storage', localHandler);
    localHandler();
  };

  if (cartBackend === 'local') { startLocal(); }
  else {
    fsUnsub = cartCollection(uid).onSnapshot(
      snap => { if (!stopped) cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))); },
      err => {
        if (stopped) return;
        if (isPermissionError(err)) { console.warn('Cart rules not published - using local cart.'); startLocal(); }
        else console.warn('Cart listener:', err.message);
      }
    );
  }
  return () => {
    stopped = true;
    if (fsUnsub) fsUnsub();
    window.removeEventListener(CART_LOCAL_EVENT, localHandler);
    window.removeEventListener('storage', localHandler);
  };
}

/**
 * Add a book to the signed-in user's cart (increments quantity if already there).
 * @returns {Promise<boolean>} true when added
 */
async function addToCart(book, qty = 1, opts = {}) {
  if (!requireLogin('Please login to add books to your cart.')) return false;
  if (!book) return false;

  const stock = book.stock === undefined ? 10 : Number(book.stock);
  if (stock <= 0) { showToast('This book is currently out of stock.', 'warning'); return false; }

  const uid = auth.currentUser.uid;
  try {
    const existing = await cartGet(uid, book.id);
    const maxQty = Math.min(10, stock || 10);
    const newQty = existing ? Math.min(maxQty, (Number(existing.quantity) || 1) + qty) : qty;

    await cartSet(uid, book.id, {
      bookId: book.id,
      title: book.title || '',
      author: book.author || '',
      category: book.category || 'General',
      imageUrl: book.isSeed ? '' : (book.imageUrl || ''),   // seed covers are rebuilt from the catalogue
      originalPrice: Number(book.originalPrice) || 0,
      discountedPrice: Number(book.discountedPrice) || Number(book.originalPrice) || 0,
      sellerId: book.sellerId || '',
      sellerName: book.sellerName || 'TVU Seller',
      sellerEmail: book.sellerEmail || '',
      stock: book.stock === undefined ? null : Number(book.stock),
      isSeed: !!book.isSeed,
      quantity: newQty
    });
    if (!opts.silent) showToast(existing ? 'Quantity updated in cart' : 'Added to cart', 'success');
    return true;
  } catch (err) {
    console.error('Add to cart failed:', err);
    showToast('Could not add to cart: ' + err.message, 'error');
    return false;
  }
}

/** Find a book (loaded list on page) by id then add it. Used by card buttons. */
function addToCartById(bookId, event) {
  if (event) { event.preventDefault(); event.stopPropagation(); }
  const list = (typeof allBooks !== 'undefined' && allBooks) ? allBooks : [];
  const book = list.find(b => b.id === bookId) || (window.getSeedBook && window.getSeedBook(bookId));
  if (!book) { showToast('Book not found.', 'error'); return; }
  return addToCart(book, 1);
}

window.addToCart = addToCart;
window.addToCartById = addToCartById;
window.cartCollection = cartCollection;
window.cartGet = cartGet; window.cartSet = cartSet; window.cartUpdate = cartUpdate; window.cartDelete = cartDelete;
window.cartSubscribe = cartSubscribe;
