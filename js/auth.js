/**
 * TVU Books Shop - Authentication, Header & Account Management
 *
 * - Login / Sign Up modal: Continue with Google OR Email + Password
 * - "Already have an account" check on Sign Up, "No account found" check on Login
 * - Header: Home | Wishlist | Cart | Menu | Orders | Login-SignUp / Profile
 * - Live badge counts for Wishlist, Cart and Orders
 */

let currentAuthUser = null;
let currentCustomerData = null;
let currentSellerData = null;
let authFlowLock = false;      // true while a login/sign-up flow is deciding whether the account is valid
let authMode = 'login';        // 'login' | 'signup'
let countUnsubs = [];
const headerCounts = { wishlist: 0, cart: 0, orders: 0 };

const DEFAULT_AVATAR = '';
let hintUser = null;   // last known user (from localStorage) used only for the very first paint

/* ------------------------------------------------------------------ *
 * Auth state
 * ------------------------------------------------------------------ */
function initAuth() {
  if (typeof auth === 'undefined') {
    console.error("Firebase Auth instance not found.");
    return;
  }
  injectAuthModal();

  // Paint the header immediately (no waiting for Firebase / Firestore)
  try { hintUser = JSON.parse(localStorage.getItem('tvu_user_hint') || 'null'); } catch (e) { hintUser = null; }
  renderHeader();

  auth.onAuthStateChanged(async (user) => {
    currentAuthUser = user;
    if (authFlowLock) return;           // the login/sign-up flow will finish the job itself
    if (user) { hintUser = null; renderHeader(); }   // show the name / avatar right away
    await handleUserReady(user);
  });
}

async function handleUserReady(user, extra) {
  currentAuthUser = user;
  if (user) {
    try {
      await Promise.all([syncCustomerProfile(user, extra), fetchSellerProfile(user.uid)]);
    } catch (err) {
      console.error("Profile sync error:", err);
    }
    try {
      localStorage.setItem('tvu_user_hint', JSON.stringify({
        displayName: (currentCustomerData && currentCustomerData.name) || user.displayName || '',
        photoURL: (currentCustomerData && currentCustomerData.profileImage) || user.photoURL || '',
        email: user.email || '', seller: !!currentSellerData }));
    } catch (e) {}
    setTimeout(() => { if (currentAuthUser && currentAuthUser.uid === user.uid) startCountListeners(user.uid); }, 500);
  } else {
    currentCustomerData = null;
    currentSellerData = null;
    hintUser = null;
    try { localStorage.removeItem('tvu_user_hint'); } catch (e) {}
    stopCountListeners();
  }
  renderHeader();
  window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user } }));
}

/**
 * Create / update customers/{uid}. Never overwrites details the user edited in their profile.
 */
async function syncCustomerProfile(user, extra = {}) {
  if (!db) return;
  const customerRef = db.collection('customers').doc(user.uid);
  const doc = await customerRef.get();
  const now = firebase.firestore.FieldValue.serverTimestamp();
  const existing = doc.exists ? doc.data() : null;

  if (!existing) {
    const payload = {
      uid: user.uid,
      name: extra.name || user.displayName || 'University Member',
      email: user.email || '',
      phone: extra.phone || '',
      profileImage: user.photoURL || '',
      role: 'customer',
      profileCompleted: false,
      welcomeEmailSent: false,
      createdAt: now,
      updatedAt: now
    };
    await customerRef.set(payload);
    currentCustomerData = payload;

    if (user.email && typeof sendWelcomeEmail === 'function') {
      sendWelcomeEmail({ name: payload.name, email: user.email, uid: user.uid })
        .then((res) => { if (res && res.success) customerRef.update({ welcomeEmailSent: true }).catch(console.warn); })
        .catch((err) => console.warn("Welcome email dispatch notice (non-fatal):", err));
    }
  } else {
    const patch = {};
    if (!existing.name) patch.name = user.displayName || 'University Member';
    if (!existing.email && user.email) patch.email = user.email;
    if (!existing.profileImage && user.photoURL) patch.profileImage = user.photoURL;
    if (!existing.role) patch.role = 'customer';
    currentCustomerData = Object.assign({}, existing, patch);
    if (Object.keys(patch).length) { patch.updatedAt = now; customerRef.update(patch).catch(console.warn); }
  }
}

async function fetchSellerProfile(uid) {
  if (!db) return null;
  try {
    const sellerDoc = await db.collection('sellers').doc(uid).get();
    if (sellerDoc.exists) { currentSellerData = sellerDoc.data(); return currentSellerData; }
    currentSellerData = null;
    return null;
  } catch (err) {
    console.error("Error fetching seller status:", err);
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Login / Sign Up flows
 * ------------------------------------------------------------------ */
function friendlyAuthError(error) {
  switch (error && error.code) {
    case 'auth/email-already-in-use': return 'You already have an account with this email. Please login.';
    case 'auth/invalid-email': return 'That email address does not look right.';
    case 'auth/weak-password': return 'Password is too weak. Use at least 6 characters.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials': return 'Incorrect email or password. If you signed up with Google, use "Continue with Google". New here? Please sign up.';
    case 'auth/too-many-requests': return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/network-request-failed': return 'Network problem. Check your internet connection and try again.';
    case 'auth/operation-not-allowed': return 'Email/Password sign-in is not enabled. Enable it in Firebase Console → Authentication → Sign-in method.';
    case 'auth/popup-blocked': return 'Your browser blocked the Google popup. Allow popups for this site and try again.';
    case 'auth/unauthorized-domain': return 'This domain is not authorised in Firebase (Authentication → Settings → Authorized domains).';
    default: return (error && error.message) || 'Something went wrong. Please try again.';
  }
}

async function googleAuth(mode) {
  if (!window.isFirebaseConfigured()) {
    showAuthMessage("Please update js/firebase-config.js with your live Firebase keys.", 'error');
    return;
  }
  authFlowLock = true;
  setAuthBusy(true);
  try {
    const result = await auth.signInWithPopup(googleProvider);
    const isNew = !!(result.additionalUserInfo && result.additionalUserInfo.isNewUser);

    if (mode === 'signup' && !isNew) {
      await auth.signOut();
      switchAuthMode('login');
      showAuthMessage('You already have an account with this Google account. Please login.', 'error');
      return;
    }
    if (mode === 'login' && isNew) {
      try { await result.user.delete(); } catch (e) { await auth.signOut(); }
      switchAuthMode('signup');
      showAuthMessage('No account found for this Google account. Please sign up first.', 'error');
      return;
    }

    closeAuthModal();
    authFlowLock = false;
    await handleUserReady(result.user);
    if (mode === 'signup') {
      showToast("Account created! Please complete your profile.", "success");
      setTimeout(() => { window.location.href = 'profile.html?setup=1'; }, 700);
    } else {
      showToast(`Welcome back, ${(currentCustomerData && currentCustomerData.name || result.user.displayName || 'Student').split(' ')[0]}!`, "success");
      if (currentCustomerData && !currentCustomerData.phone) {
        showToast('Add your mobile number in your profile to place orders faster.', 'info', 5000);
      }
    }
  } catch (error) {
    console.error("Google auth failed:", error);
    if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
      showAuthMessage(friendlyAuthError(error), 'error');
    }
  } finally {
    authFlowLock = false;
    setAuthBusy(false);
  }
}

async function emailSignUp(e) {
  e.preventDefault();
  const name = document.getElementById('su-name').value.trim();
  const email = document.getElementById('su-email').value.trim();
  const phone = document.getElementById('su-phone').value.trim().replace(/[\s-]/g, '').replace(/^\+91/, '');
  const pw = document.getElementById('su-password').value;
  const pw2 = document.getElementById('su-password2').value;

  if (name.length < 2) return showAuthMessage('Please enter your full name.', 'error');
  if (!/^[6-9]\d{9}$/.test(phone)) return showAuthMessage('Enter a valid 10-digit mobile number.', 'error');
  if (pw.length < 6) return showAuthMessage('Password must be at least 6 characters.', 'error');
  if (pw !== pw2) return showAuthMessage('Passwords do not match.', 'error');

  authFlowLock = true;
  setAuthBusy(true);
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, pw);
    await cred.user.updateProfile({ displayName: name });
    closeAuthModal();
    authFlowLock = false;
    await handleUserReady(cred.user, { name, phone });
    showToast("Account created! Please complete your profile.", "success");
    setTimeout(() => { window.location.href = 'profile.html?setup=1'; }, 700);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      switchAuthMode('login');
      const el = document.getElementById('li-email'); if (el) el.value = email;
    }
    showAuthMessage(friendlyAuthError(error), 'error');
  } finally {
    authFlowLock = false;
    setAuthBusy(false);
  }
}

async function emailLogin(e) {
  e.preventDefault();
  const email = document.getElementById('li-email').value.trim();
  const pw = document.getElementById('li-password').value;
  if (!email || !pw) return showAuthMessage('Enter your email and password.', 'error');

  authFlowLock = true;
  setAuthBusy(true);
  try {
    const cred = await auth.signInWithEmailAndPassword(email, pw);
    closeAuthModal();
    authFlowLock = false;
    await handleUserReady(cred.user);
    showToast(`Welcome back, ${(currentCustomerData && currentCustomerData.name || 'Student').split(' ')[0]}!`, "success");
    if (currentCustomerData && !currentCustomerData.phone) {
      showToast('Add your mobile number in your profile to place orders faster.', 'info', 5000);
    }
  } catch (error) {
    showAuthMessage(friendlyAuthError(error), 'error');
  } finally {
    authFlowLock = false;
    setAuthBusy(false);
  }
}

async function forgotPassword() {
  const email = document.getElementById('li-email').value.trim();
  if (!email) return showAuthMessage('Type your email above first, then click "Forgot password?".', 'error');
  try {
    await auth.sendPasswordResetEmail(email);
    showAuthMessage('Password reset link sent. Check your inbox (and spam folder).', 'success');
  } catch (error) {
    showAuthMessage(friendlyAuthError(error), 'error');
  }
}

/** Kept for older pages that call loginWithGoogle(): now opens the Login popup. */
function loginWithGoogle() { openAuthModal('login'); }

/** Pages call this when an action needs a signed-in user. Returns true if signed in. */
function requireLogin(message) {
  if (auth.currentUser) return true;
  openAuthModal('login');
  if (message) showAuthMessage(message, 'info');
  return false;
}

async function logoutUser() {
  try {
    await auth.signOut();
    showToast("Signed out successfully", "success");
    setTimeout(() => { window.location.href = "index.html"; }, 400);
  } catch (error) {
    console.error("Logout failed:", error);
    showToast("Failed to sign out. Please try again.", "error");
  }
}

/* ------------------------------------------------------------------ *
 * Login / Sign Up modal
 * ------------------------------------------------------------------ */
const GOOGLE_SVG = `<svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/></svg>`;

function injectAuthModal() {
  if (document.getElementById('auth-modal')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="modal-backdrop" id="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div class="modal-dialog auth-dialog">
        <div class="modal-header">
          <h3 class="modal-title" id="auth-title">Login to your account</h3>
          <button class="modal-close-btn" onclick="closeAuthModal()" aria-label="Close">&times;</button>
        </div>
        <div class="modal-body">

          <div id="auth-message" class="auth-message" style="display:none;"></div>

          <button type="button" class="btn-google" id="auth-google-btn" onclick="googleAuth(authMode)">
            ${GOOGLE_SVG}<span id="auth-google-label">Continue with Google</span>
          </button>

          <div class="auth-divider"><span>or use email</span></div>

          <!-- LOGIN -->
          <form id="login-form" onsubmit="emailLogin(event)" aria-hidden="false" novalidate>
            <div class="form-group">
              <label class="form-label" for="li-email">Email</label>
              <input type="email" id="li-email" class="form-control" placeholder="you@example.com" autocomplete="email">
            </div>
            <div class="form-group">
              <label class="form-label" for="li-password">Password</label>
              <input type="password" id="li-password" class="form-control" placeholder="Your password" autocomplete="current-password">
              <div style="text-align:right; margin-top:.35rem;"><a href="#" onclick="forgotPassword(); return false;" class="auth-link">Forgot password?</a></div>
            </div>
            <button type="submit" class="btn btn-login-blue btn-lg" style="width:100%;" id="login-submit">Login</button>
            <p class="auth-switch">Don't have an account? <a href="#" class="auth-link" onclick="switchAuthMode('signup'); return false;">Sign Up</a></p>
          </form>

          <!-- SIGN UP -->
          <form id="signup-form" onsubmit="emailSignUp(event)" style="display:none;" aria-hidden="true" novalidate>
            <div class="form-group">
              <label class="form-label" for="su-name">Full Name</label>
              <input type="text" id="su-name" class="form-control" placeholder="Your full name" autocomplete="name">
            </div>
            <div class="form-group">
              <label class="form-label" for="su-email">Email</label>
              <input type="email" id="su-email" class="form-control" placeholder="you@example.com" autocomplete="email">
            </div>
            <div class="form-group">
              <label class="form-label" for="su-phone">Mobile Number</label>
              <input type="tel" id="su-phone" class="form-control" placeholder="10-digit mobile number" maxlength="14" autocomplete="tel">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="su-password">Password</label>
                <input type="password" id="su-password" class="form-control" placeholder="Min 6 characters" autocomplete="new-password">
              </div>
              <div class="form-group">
                <label class="form-label" for="su-password2">Confirm Password</label>
                <input type="password" id="su-password2" class="form-control" placeholder="Repeat password" autocomplete="new-password">
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-lg" style="width:100%;" id="signup-submit">Create Account</button>
            <p class="auth-switch">Already have an account? <a href="#" class="auth-link" onclick="switchAuthMode('login'); return false;">Login</a></p>
          </form>
        </div>
      </div>
    </div>`;
  document.body.appendChild(wrap.firstElementChild);
}

function openAuthModal(mode = 'login') {
  injectAuthModal();
  switchAuthMode(mode);
  showAuthMessage('');
  openModal('auth-modal');
}

function closeAuthModal() { closeModal('auth-modal'); }

function switchAuthMode(mode) {
  authMode = mode === 'signup' ? 'signup' : 'login';
  const isLogin = authMode === 'login';
  const set = (id, fn) => { const el = document.getElementById(id); if (el) fn(el); };
  set('auth-title', el => el.textContent = isLogin ? 'Login to your account' : 'Sign Up');
  set('auth-tab-login', el => el.classList.toggle('active', isLogin));
  set('auth-tab-signup', el => el.classList.toggle('active', !isLogin));
  set('login-form', el => {
    el.style.display = isLogin ? 'block' : 'none';
    el.setAttribute('aria-hidden', String(!isLogin));
  });
  set('signup-form', el => {
    el.style.display = isLogin ? 'none' : 'block';
    el.setAttribute('aria-hidden', String(isLogin));
  });
  set('auth-google-label', el => el.textContent = 'Continue with Google');
  showAuthMessage('');
}

function showAuthMessage(msg, type = 'error') {
  const el = document.getElementById('auth-message');
  if (!el) return;
  if (!msg) { el.style.display = 'none'; el.textContent = ''; return; }
  el.className = 'auth-message auth-message-' + type;
  el.textContent = msg;
  el.style.display = 'block';
}

function setAuthBusy(busy) {
  ['auth-google-btn', 'login-submit', 'signup-submit'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = busy;
  });
}

/* ------------------------------------------------------------------ *
 * Live counts (wishlist / cart / orders)
 * ------------------------------------------------------------------ */
function startCountListeners(uid) {
  stopCountListeners();
  const watch = (query, key) => {
    countUnsubs.push(query.onSnapshot(snap => {
      headerCounts[key] = snap.size;
      if (key === 'cart') { window.cartItemIds = new Set(snap.docs.map(d => d.id)); }
      updateBadges();
    }, err => console.warn(`Count listener (${key}):`, err.code || err.message)));
  };
  const userRef = db.collection('users').doc(uid);
  watch(userRef.collection('wishlist'), 'wishlist');
  if (typeof cartSubscribe === 'function') {
    countUnsubs.push(cartSubscribe(uid, items => {
      headerCounts.cart = items.length;
      window.cartItemIds = new Set(items.map(i => i.id));
      updateBadges();
    }));
  }
  watch(db.collection('orders').where('customerId', '==', uid), 'orders');
}

function stopCountListeners() {
  countUnsubs.forEach(fn => { try { fn(); } catch (e) {} });
  countUnsubs = [];
  headerCounts.wishlist = headerCounts.cart = headerCounts.orders = 0;
  window.cartItemIds = new Set();
}

function updateBadges() {
  [['badge-wishlist', 'wishlist'], ['badge-cart', 'cart'], ['badge-orders', 'orders']].forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el) return;
    const n = headerCounts[key];
    el.textContent = n > 99 ? '99+' : n;
    el.style.display = n > 0 ? 'flex' : 'none';
  });
}

/* ------------------------------------------------------------------ *
 * Header
 * ------------------------------------------------------------------ */
const ICON = {
  heart: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  cart: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`,
  bag: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
  menu: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  chevron: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>`
};

function escapeAttr(s) { return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

function renderHeader() {
  const headerContainer = document.getElementById('site-header-container');
  if (!headerContainer) return;

  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const isHome = currentPath === 'index.html' || currentPath === '';
  const user = currentAuthUser || hintUser;
  const isSeller = !!currentSellerData || !!(hintUser && hintUser.seller && !currentAuthUser);
  const displayName = (currentCustomerData && currentCustomerData.name) || (user && user.displayName) || 'Account';
  const firstName = displayName.split(' ')[0];
  const photo = (currentCustomerData && currentCustomerData.profileImage) || (user && user.photoURL) || '';
  const email = (user && user.email) || (currentCustomerData && currentCustomerData.email) || '';
  const active = (...pages) => pages.includes(currentPath) ? 'active' : '';

  const avatar = photo
    ? `<img src="${escapeAttr(photo)}" alt="" class="user-avatar-img" referrerpolicy="no-referrer" onerror="this.outerHTML='<span class=\\'user-avatar-initial\\'>${escapeAttr(firstName.charAt(0).toUpperCase())}</span>'">`
    : `<span class="user-avatar-initial">${escapeAttr(firstName.charAt(0).toUpperCase())}</span>`;

  // Profile (or Sign Up) - shown on every page
  const actionsHtml = user ? `
    <div class="user-menu">
      <button type="button" class="user-avatar-btn" id="user-menu-btn" aria-label="Open account menu" onclick="toggleUserDropdown(event)">
        ${avatar}
        <span class="user-name-label">${escapeAttr(firstName)}</span>
        ${ICON.chevron}
      </button>
      <div class="header-dropdown user-dropdown" id="user-dropdown-menu">
        <div class="dropdown-header">
          <div class="dropdown-user-name">${escapeAttr(displayName)}</div>
          <div class="dropdown-user-email">${escapeAttr(email)}</div>
        </div>
        <a href="profile.html" class="dropdown-item"><span class="dd-emoji">👤</span> My Profile</a>
        <div class="dropdown-divider"></div>
        <button type="button" onclick="logoutUser()" class="dropdown-item text-danger" style="width:100%;border:none;background:none;text-align:left;">
          <span class="dd-emoji">🚪</span> Log Out
        </button>
      </div>
    </div>
  ` : `
    <button type="button" onclick="openAuthModal('login')" class="btn btn-login-blue btn-sm">Login</button>
  `;

  let html;
  if (isHome) {
    // HOME PAGE: logo, university name and every shortcut
    html = `
    <header class="site-header">
      <div class="container header-inner">
        <a href="index.html" class="brand-wrapper" title="TVU Books Shop">
          <img src="assets/tvu-logo-sm.png" alt="Thiruvalluvar University Logo" class="brand-logo-img" width="48" height="48" onerror="this.style.display='none'">
          <div class="brand-text">
            <span class="brand-name">TVU Books Shop</span>
            <span class="brand-sub">Thiruvalluvar University</span>
          </div>
        </a>

        <div class="header-right">
          <nav class="header-nav" aria-label="Main navigation">
            <a href="index.html" class="hnav-link active">Home</a>

            <a href="wishlist.html" class="hnav-icon" title="Wishlist" aria-label="Wishlist">
              ${ICON.heart}<span class="hbadge" id="badge-wishlist" style="display:none;">0</span>
            </a>

            <a href="cart.html" class="hnav-icon" title="Cart" aria-label="Cart">
              ${ICON.cart}<span class="hbadge" id="badge-cart" style="display:none;">0</span>
            </a>

            <a href="orders.html" class="hnav-icon" title="My Orders" aria-label="My Orders">
              ${ICON.bag}<span class="hbadge" id="badge-orders" style="display:none;">0</span>
            </a>

            <div class="menu-wrap">
              <button type="button" class="hnav-menu-btn" id="menu-btn" onclick="toggleMenuDropdown(event)" aria-haspopup="true">
                ${ICON.menu}<span>Menu</span>
              </button>
              <div class="header-dropdown" id="menu-dropdown">
                <a href="download-syllabus.html#papers" class="dropdown-item">
                  <span class="dd-emoji">📝</span> Previous Year Question Papers
                </a>
                ${isSeller ? `
                  <div class="dropdown-divider"></div>
                  <a href="seller.html" class="dropdown-item"><span class="dd-emoji">🏪</span> Seller Dashboard</a>
                  <a href="seller-books.html" class="dropdown-item"><span class="dd-emoji">📚</span> My Listed Books</a>
                  <a href="seller-orders.html" class="dropdown-item"><span class="dd-emoji">📦</span> Seller Orders</a>
                ` : ''}
              </div>
            </div>
          </nav>
          <div class="header-actions">${actionsHtml}</div>
        </div>
      </div>
    </header>`;
  } else {
    // EVERY OTHER PAGE: only Home and Profile
    html = `
    <header class="site-header site-header-compact">
      <div class="container header-inner">
        <a href="index.html" class="home-pill" title="Back to Home">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>
          <span>Home</span>
        </a>
        <div class="header-actions">${actionsHtml}</div>
      </div>
    </header>`;
  }

  headerContainer.innerHTML = html;
  updateBadges();
  renderFloatingNovaWidget();
}

function renderFloatingNovaWidget() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  if (currentPath === 'ai-support.html') return;
  if (document.getElementById('nova-floating-widget')) return;
  const widget = document.createElement('a');
  widget.id = 'nova-floating-widget';
  widget.className = 'nova-floating-btn';
  widget.href = 'ai-support.html';
  widget.title = 'Ask NOVA AI';
  widget.setAttribute('aria-label', 'Ask NOVA AI');
  widget.innerHTML = '<span class="nova-floating-label">Ask NOVA AI</span><div class="nova-floating-icon">🦢</div>';
  document.body.appendChild(widget);
}

/** Open a page instantly: start fetching it as soon as the finger / mouse is on the link */
(function enablePrefetch() {
  const done = new Set();
  const go = (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank') return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || done.has(u.pathname) || u.pathname === location.pathname) return;
    done.add(u.pathname);
    const l = document.createElement('link'); l.rel = 'prefetch'; l.href = u.pathname; document.head.appendChild(l);
  };
  document.addEventListener('mouseover', go, { passive: true });
  document.addEventListener('touchstart', go, { passive: true });
})();

function closeAllDropdowns() {
  document.querySelectorAll('.header-dropdown.show').forEach(d => d.classList.remove('show'));
}
function toggleDropdownById(id, e) {
  if (e) e.stopPropagation();
  const dd = document.getElementById(id);
  if (!dd) return;
  const wasOpen = dd.classList.contains('show');
  closeAllDropdowns();
  if (!wasOpen) dd.classList.add('show');
}
function toggleUserDropdown(e) { toggleDropdownById('user-dropdown-menu', e); }
function toggleMenuDropdown(e) { toggleDropdownById('menu-dropdown', e); }

document.addEventListener('click', closeAllDropdowns);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllDropdowns(); });

/** Guard helper for protected pages */
function requireAuthentication(redirectUrl = 'index.html') {
  return new Promise((resolve) => {
    auth.onAuthStateChanged((user) => {
      if (!user) {
        showToast("Please login to access this page.", "warning");
        setTimeout(() => { window.location.href = redirectUrl; }, 1200);
      } else {
        resolve(user);
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', initAuth);

window.loginWithGoogle = loginWithGoogle;
window.googleAuth = googleAuth;
window.emailLogin = emailLogin;
window.emailSignUp = emailSignUp;
window.forgotPassword = forgotPassword;
window.requireLogin = requireLogin;
window.logoutUser = logoutUser;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.switchAuthMode = switchAuthMode;
window.requireAuthentication = requireAuthentication;
window.toggleUserDropdown = toggleUserDropdown;
window.toggleMenuDropdown = toggleMenuDropdown;
window.fetchSellerProfile = fetchSellerProfile;
window.renderHeader = renderHeader;
window.getCurrentCustomer = () => currentCustomerData;
window.setCurrentCustomer = (d) => { currentCustomerData = d; };
