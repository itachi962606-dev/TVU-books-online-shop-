/**
 * TVU Books Shop - Admin: Overview, Orders, Users and Books
 * Read-only monitoring for the shop, next to the existing question-paper and syllabus tools.
 */
const aoEsc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const aoTime = ts => { try { const d = ts && ts.toDate ? ts.toDate() : (ts ? new Date(ts) : null); return d ? d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'; } catch (e) { return '-'; } };
const aoMs = ts => (ts && ts.toMillis) ? ts.toMillis() : 0;

const aoData = { orders: [], users: [], books: [], sellers: [], loaded: {} };

window.onAdminSectionShown = function (name) {
  const stats = document.getElementById('paper-stats-grid');
  if (stats) stats.style.display = ['pending', 'approved', 'rejected', 'syllabuses'].includes(name) ? '' : 'none';
  if (['overview', 'orders', 'users', 'books'].includes(name)) loadShopData().then(() => renderShopSection(name));
};

async function loadShopData(force) {
  if (aoData.loaded.all && !force) return;
  // Only the newest rows are loaded (fast even with thousands of records)
  const get = async (col, key, limit) => {
    try {
      let snap;
      try { snap = await db.collection(col).orderBy('createdAt', 'desc').limit(limit).get(); }
      catch (e) { snap = await db.collection(col).limit(limit).get(); }
      aoData[key] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      aoData[key + 'More'] = snap.docs.length >= limit;
    } catch (e) { console.warn('Admin load ' + col + ':', e.message); aoData[key] = []; aoData[key + 'Error'] = e.message; }
  };
  await Promise.all([get('orders', 'orders', 300), get('customers', 'users', 300), get('books', 'books', 200), get('sellers', 'sellers', 200)]);
  aoData.loaded.all = true;
}

function renderShopSection(name) {
  if (name === 'overview') renderOverview();
  if (name === 'orders') renderOrders();
  if (name === 'users') renderUsers();
  if (name === 'books') renderBooks();
}

function statCard(icon, cls, val, label) {
  return `<div class="admin-stat-card"><div class="admin-stat-icon ${cls}">${icon}</div><div><div class="admin-stat-val">${val}</div><div class="admin-stat-label">${label}</div></div></div>`;
}

function renderOverview() {
  const el = document.getElementById('overview-root');
  if (!el) return;
  const orders = aoData.orders.slice().sort((a, b) => aoMs(b.createdAt) - aoMs(a.createdAt));
  const revenue = orders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
  const delivered = orders.filter(o => String(o.orderStatus || '').toLowerCase() === 'delivered').length;
  const seedBooks = (window.SEED_BOOKS || []).length, seedPapers = (window.SEED_PAPERS || []).length;
  const warn = aoData.ordersError ? `<div style="background:#fef2f2;color:#b91c1c;padding:.75rem 1rem;border-radius:8px;margin-bottom:1rem;">Orders could not be read: ${aoEsc(aoData.ordersError)} (publish the latest firestore.rules and make sure this account is in the <b>admins</b> collection).</div>` : '';

  el.innerHTML = `${warn}
    <div class="admin-stats-grid">
      ${statCard('👥', 'stat-icon-approved', aoData.users.length, 'Registered Users')}
      ${statCard('🏪', 'stat-icon-syllabus', aoData.sellers.length, 'Sellers')}
      ${statCard('📚', 'stat-icon-syllabus', aoData.books.length, 'Seller Listed Books')}
      ${statCard('📦', 'stat-icon-pending', orders.length, 'Total Orders')}
      ${statCard('💰', 'stat-icon-approved', '₹' + revenue.toLocaleString('en-IN'), 'Order Value (COD)')}
      ${statCard('✅', 'stat-icon-approved', delivered, 'Delivered Orders')}
    </div>
    <div class="admin-card" style="margin-bottom:1.25rem;">
      <div class="admin-card-header"><h2 class="admin-card-title">Built-in Catalogue</h2></div>
      <div style="padding:1rem 1.25rem; color:var(--admin-muted); line-height:1.7;">
        📘 <b>${seedBooks.toLocaleString('en-IN')}</b> starter books (TVU Book Bank) across <b>${(window.TVU_DEPARTMENTS || []).length}</b> categories<br>
        📝 <b>${seedPapers.toLocaleString('en-IN')}</b> model question papers across <b>${new Set((window.SEED_PAPERS || []).map(p => p.department)).size}</b> departments
      </div>
    </div>
    <div class="admin-card">
      <div class="admin-card-header"><h2 class="admin-card-title">Latest Orders</h2></div>
      <div class="admin-table-wrap">${ordersTable(orders.slice(0, 8))}</div>
    </div>`;
}

function ordersTable(list) {
  if (!list.length) return `<div style="text-align:center;padding:2.5rem;color:var(--admin-muted);">No orders yet.</div>`;
  return `<table class="admin-table"><thead><tr><th>Order</th><th>Book</th><th>Buyer</th><th>Seller</th><th>Qty</th><th>Total</th><th>Status</th><th>Placed</th></tr></thead><tbody>
    ${list.map(o => `<tr><td><b>${aoEsc(o.orderId || o.id)}</b></td><td>${aoEsc(o.bookTitle)}</td><td>${aoEsc(o.customerName)}<br><small>${aoEsc(o.customerPhone || '')}</small></td><td>${aoEsc(o.sellerName || '-')}</td><td>${aoEsc(o.quantity || 1)}</td><td>₹${aoEsc(o.totalAmount || 0)}</td><td>${aoEsc(String(o.orderStatus || 'placed').replace(/_/g, ' '))}</td><td>${aoTime(o.createdAt)}</td></tr>`).join('')}
  </tbody></table>`;
}

function renderOrders() {
  const el = document.getElementById('orders-root');
  if (el) el.innerHTML = ordersTable(aoData.orders.slice().sort((a, b) => aoMs(b.createdAt) - aoMs(a.createdAt)));
}

function renderUsers() {
  const el = document.getElementById('users-root');
  if (!el) return;
  const sellerIds = new Set(aoData.sellers.map(s => s.id));
  const list = aoData.users.slice().sort((a, b) => aoMs(b.createdAt) - aoMs(a.createdAt));
  el.innerHTML = !list.length ? `<div style="text-align:center;padding:2.5rem;color:var(--admin-muted);">No users yet.</div>` :
    `<table class="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Mobile</th><th>Department</th><th>Role</th><th>Joined</th></tr></thead><tbody>
    ${list.map(u => `<tr><td><b>${aoEsc(u.name)}</b></td><td>${aoEsc(u.email)}</td><td>${aoEsc(u.phone || '-')}</td><td>${aoEsc(u.department || '-')}</td><td>${u.role === 'admin' ? 'Admin' : (sellerIds.has(u.id) ? 'Seller' : 'Student')}</td><td>${aoTime(u.createdAt)}</td></tr>`).join('')}</tbody></table>`;
}

function renderBooks() {
  const el = document.getElementById('books-root');
  if (!el) return;
  const list = aoData.books.slice().sort((a, b) => aoMs(b.createdAt) - aoMs(a.createdAt));
  el.innerHTML = !list.length ? `<div style="text-align:center;padding:2.5rem;color:var(--admin-muted);">No seller-listed books yet. The ${(window.SEED_BOOKS || []).length.toLocaleString('en-IN')} starter books are built into the site.</div>` :
    `<table class="admin-table"><thead><tr><th>Title</th><th>Category</th><th>Seller</th><th>Price</th><th>Stock</th><th>Action</th></tr></thead><tbody>
    ${list.map(b => `<tr><td><b>${aoEsc(b.title)}</b><br><small>${aoEsc(b.author || '')}</small></td><td>${aoEsc(b.category)}</td><td>${aoEsc(b.sellerName || '-')}</td><td>₹${aoEsc(b.discountedPrice || b.originalPrice || 0)}</td><td>${aoEsc(b.stock == null ? '-' : b.stock)}</td><td><button class="btn-admin" style="background:#fef2f2;color:#b91c1c;" onclick="adminDeleteBook('${aoEsc(b.id)}')">🗑 Delete</button></td></tr>`).join('')}</tbody></table>`;
}

async function adminDeleteBook(id) {
  const b = aoData.books.find(x => x.id === id);
  if (!confirm(`Delete "${b ? b.title : id}" permanently from the shop?`)) return;
  try {
    await db.collection('books').doc(id).delete();
    aoData.books = aoData.books.filter(x => x.id !== id);
    renderBooks();
  } catch (e) { alert('Could not delete: ' + e.message + '\n(Publish the latest firestore.rules so admins can delete books.)'); }
}
window.adminDeleteBook = adminDeleteBook;
window.loadShopData = loadShopData;
