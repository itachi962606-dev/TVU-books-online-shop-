/**
 * TVU Books Shop - Cart Page (Flipkart-style)
 */
let cartItems = [];
let cartUnsub = null;

window.addEventListener('authStateChanged', (e) => {
  if (cartUnsub) { cartUnsub(); cartUnsub = null; }
  if (!e.detail.user) { renderLoggedOut(); return; }
  cartUnsub = cartSubscribe(e.detail.user.uid, items => {
    cartItems = items;
    // Rebuild seed cover images that are not stored with the cart item
    cartItems.forEach(i => { if (i.isSeed && !i.imageUrl) { const sd = getSeedBook(i.id); if (sd) i.imageUrl = sd.imageUrl; } });
    renderCart();
  });
});

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
const unit = i => Number(i.discountedPrice) || Number(i.originalPrice) || 0;

function renderLoggedOut() {
  document.getElementById('cart-root').innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">🛒</div>
      <h3 class="empty-state-title">Sign up to see your cart</h3>
      <p class="empty-state-text">Your cart is saved to your account, so it is waiting for you on any device.</p>
      <button onclick="openAuthModal('signup')" class="btn btn-login-blue">Sign Up</button>
      <p class="auth-switch">Already have an account? <a href="#" class="auth-link" onclick="openAuthModal('login'); return false;">Login</a></p>
    </div>`;
}

function renderCart() {
  const root = document.getElementById('cart-root');
  if (!cartItems.length) {
    root.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🛒</div>
        <h3 class="empty-state-title">Your cart is empty</h3>
        <p class="empty-state-text">Add textbooks and study materials to your cart and they will show up here.</p>
        <a href="books.html" class="btn btn-primary">Browse Books</a>
      </div>`;
    return;
  }

  const count = cartItems.reduce((n, i) => n + (Number(i.quantity) || 1), 0);
  const mrp = cartItems.reduce((s, i) => s + (Number(i.originalPrice) || unit(i)) * (Number(i.quantity) || 1), 0);
  const total = cartItems.reduce((s, i) => s + unit(i) * (Number(i.quantity) || 1), 0);
  const saved = Math.max(0, mrp - total);

  root.innerHTML = `
    <div class="fk-cart-layout">
      <div class="fk-cart-list">
        <div class="fk-cart-head">My Cart (${cartItems.length})</div>
        ${cartItems.map(i => {
          const q = Number(i.quantity) || 1;
          const orig = Number(i.originalPrice) || 0;
          const off = orig > unit(i) ? Math.round((orig - unit(i)) / orig * 100) : 0;
          return `
          <div class="fk-cart-item">
            <a href="book-details.html?id=${encodeURIComponent(i.id)}" class="fk-cart-img"><img src="${esc(i.imageUrl || '')}" alt="${esc(i.title)}"></a>
            <div class="fk-cart-info">
              <a href="book-details.html?id=${encodeURIComponent(i.id)}" class="fk-cart-title">${esc(i.title)}</a>
              <div class="fk-cart-sub">By ${esc(i.author || 'Academic Faculty')} • ${esc(i.category)}</div>
              <div class="fk-cart-sub">Seller: ${esc(i.sellerName || 'TVU Seller')}</div>
              <div class="fk-cart-price">
                ${orig > unit(i) ? `<span class="fk-strike">${formatINR(orig)}</span>` : ''}
                <span class="fk-now">${formatINR(unit(i))}</span>
                ${off ? `<span class="fk-off">${off}% Off</span>` : ''}
              </div>
              <div class="fk-cart-actions">
                <div class="fk-qty">
                  <button onclick="changeQty('${i.id}', -1)" ${q <= 1 ? 'disabled' : ''} aria-label="Decrease">−</button>
                  <span>${q}</span>
                  <button onclick="changeQty('${i.id}', 1)" ${q >= Math.min(10, i.stock || 10) ? 'disabled' : ''} aria-label="Increase">+</button>
                </div>
                <button class="fk-link-btn" onclick="moveToWishlist('${i.id}')">SAVE FOR LATER</button>
                <button class="fk-link-btn" onclick="removeFromCart('${i.id}')">REMOVE</button>
              </div>
            </div>
          </div>`;
        }).join('')}
        <div class="fk-place-bar"><button class="fk-place-btn" onclick="openCheckout()">PLACE ORDER</button></div>
      </div>

      <aside class="fk-price-box">
        <div class="fk-price-title">PRICE DETAILS</div>
        <div class="fk-price-row"><span>Price (${count} item${count > 1 ? 's' : ''})</span><span>${formatINR(mrp)}</span></div>
        <div class="fk-price-row"><span>Discount</span><span class="fk-green">− ${formatINR(saved)}</span></div>
        <div class="fk-price-row"><span>Delivery Charges</span><span class="fk-green">FREE</span></div>
        <div class="fk-price-row fk-price-total"><span>Total Amount</span><span>${formatINR(total)}</span></div>
        ${saved > 0 ? `<div class="fk-green fk-save-note">You will save ${formatINR(saved)} on this order</div>` : ''}
        <div class="fk-cod-note">Payment: Cash on Delivery</div>
      </aside>
    </div>`;
}

async function changeQty(id, delta) {
  const item = cartItems.find(i => i.id === id);
  if (!item) return;
  const q = Math.max(1, Math.min(Math.min(10, item.stock || 10), (Number(item.quantity) || 1) + delta));
  try { await cartUpdate(auth.currentUser.uid, id, { quantity: q }); }
  catch (err) { showToast('Could not update quantity: ' + err.message, 'error'); }
}

async function removeFromCart(id) {
  try { await cartDelete(auth.currentUser.uid, id); showToast('Removed from cart', 'info'); }
  catch (err) { showToast('Could not remove item: ' + err.message, 'error'); }
}

async function moveToWishlist(id) {
  const item = cartItems.find(i => i.id === id);
  if (!item) return;
  const uid = auth.currentUser.uid;
  try {
    await db.collection('users').doc(uid).collection('wishlist').doc(id).set({
      bookId: id, title: item.title, author: item.author || '', category: item.category || 'General',
      originalPrice: Number(item.originalPrice) || 0, discountedPrice: Number(item.discountedPrice) || 0,
      imageUrl: item.imageUrl || '', sellerName: item.sellerName || '', sellerId: item.sellerId || '',
      sellerEmail: item.sellerEmail || '', isSeed: !!item.isSeed,
      addedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    await cartDelete(uid, id);
    showToast('Saved to wishlist', 'success');
  } catch (err) { showToast('Could not save for later: ' + err.message, 'error'); }
}

function openCheckout() {
  if (!cartItems.length) return;
  const cust = (window.getCurrentCustomer && window.getCurrentCustomer()) || {};
  const user = auth.currentUser;
  document.getElementById('co-name').value = cust.name || user.displayName || '';
  document.getElementById('co-phone').value = cust.phone || '';
  document.getElementById('co-address').value = cust.address || '';
  document.getElementById('co-total').textContent = formatINR(cartItems.reduce((s, i) => s + unit(i) * (Number(i.quantity) || 1), 0));
  openModal('cart-checkout-modal');
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('cart-checkout-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || !cartItems.length) return;

    const name = document.getElementById('co-name').value.trim();
    const phone = document.getElementById('co-phone').value.trim();
    const address = document.getElementById('co-address').value.trim();
    if (!name || !phone || !address) { showToast('Please fill in your name, phone and address.', 'warning'); return; }

    const btn = form.querySelector('button[type="submit"]');
    const html = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Placing order...';

    const placed = [];
    try {
      for (const item of cartItems) {
        const quantity = Number(item.quantity) || 1;
        const price = unit(item);
        const payload = {
          orderId: 'TVU-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase(),
          customerId: user.uid, userId: user.uid,
          customerName: name, customerEmail: user.email || '', customerPhone: phone, customerAddress: address,
          sellerId: item.sellerId || '', sellerName: item.sellerName || 'TVU Seller', sellerEmail: item.sellerEmail || '',
          bookId: item.id, bookTitle: item.title, bookImageUrl: item.isSeed ? '' : (item.imageUrl || ''),
          quantity, originalPrice: Number(item.originalPrice) || 0, discountedPrice: price, unitPrice: price,
          totalAmount: price * quantity,
          paymentMethod: 'Cash on Delivery', paymentStatus: 'Cash on Delivery',
          orderStatus: 'waiting_for_confirmation', sellerConfirmed: false,
          deliveryDate: null, deliveryDateRaw: null, deliveryStatus: 'Waiting for Confirmation',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        const ref = await db.collection('orders').add(payload);
        payload.id = ref.id;
        placed.push(payload);

        if (!item.isSeed && item.stock !== null && item.stock !== undefined && Number(item.stock) > 0) {
          const newStock = Math.max(0, Number(item.stock) - quantity);
          db.collection('books').doc(item.id).update({
            stock: newStock, availability: newStock > 0 ? 'In Stock' : 'Out of Stock',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }).catch(err => console.warn('Stock update skipped:', err.message));
        }
        if (typeof sendNewOrderSellerEmail === 'function') sendNewOrderSellerEmail(payload);
        else if (typeof sendSellerOrderNotification === 'function') sendSellerOrderNotification(payload);
        await cartDelete(user.uid, item.id);   // remove each item as soon as its order exists
      }

      closeModal('cart-checkout-modal');
      document.getElementById('confirmed-order-id').textContent = placed.length === 1 ? `#${placed[0].orderId}` : `${placed.length} orders placed`;
      document.getElementById('confirmed-summary').textContent = placed.length === 1
        ? 'Your order has been placed successfully in the university system.'
        : 'Your orders have been placed (one per seller item). Track them in My Orders.';
      openModal('order-confirmed-modal');
      triggerConfettiCelebration();
      // remember contact details for next time
      db.collection('customers').doc(user.uid).set({ phone, address, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(() => {});
    } catch (err) {
      console.error('Cart checkout failed:', err);
      showToast('Failed to place order: ' + err.message + (placed.length ? ` (${placed.length} item(s) were already ordered)` : ''), 'error', 6000);
    } finally {
      btn.disabled = false;
      btn.innerHTML = html;
    }
  });
});

window.changeQty = changeQty;
window.removeFromCart = removeFromCart;
window.moveToWishlist = moveToWishlist;
window.openCheckout = openCheckout;
