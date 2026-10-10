/**
 * TVU Books Shop - Profile Setup / Edit
 * Name, Email (read only), Mobile, Department, Year, Address -> customers/{uid}
 */
const DEPARTMENTS = ['Tamil', 'English', 'Economics', 'History', 'Mathematics', 'Physics', 'Chemistry', 'Botany', 'Zoology', 'Biotechnology', 'Computer Science', 'Information Technology', 'Computer Applications (MCA)', 'Commerce', 'Business Administration', 'Other'];
const YEARS = ['1st Year', '2nd Year', '3rd Year', 'PG - 1st Year', 'PG - 2nd Year', 'Research Scholar', 'Faculty / Staff'];

const pEsc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

window.addEventListener('authStateChanged', (e) => {
  if (!e.detail.user) { renderProfileLoggedOut(); return; }
  renderProfile(e.detail.user);
});

function renderProfileLoggedOut() {
  document.getElementById('profile-root').innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">👤</div>
      <h3 class="empty-state-title">Sign up to view your profile</h3>
      <p class="empty-state-text">Create an account or login to set up your name, email and mobile number.</p>
      <button onclick="openAuthModal('signup')" class="btn btn-login-blue">Sign Up</button>
      <p class="auth-switch">Already have an account? <a href="#" class="auth-link" onclick="openAuthModal('login'); return false;">Login</a></p>
    </div>`;
}

function renderProfile(user) {
  const c = window.getCurrentCustomer() || {};
  const isSetup = new URLSearchParams(location.search).get('setup') === '1';
  const photo = c.profileImage || user.photoURL || '';
  const name = c.name || user.displayName || '';
  const initial = (name || 'U').charAt(0).toUpperCase();

  document.getElementById('profile-root').innerHTML = `
    ${isSetup && !c.profileCompleted ? `<div class="profile-banner">🎉 Welcome to TVU Books! Please complete your profile so sellers and buyers can reach you.</div>` : ''}
    <div class="profile-head">
      <div class="profile-photo-wrap" id="pf-photo-wrap"></div>
      <div>
        <h1 class="profile-title">${pEsc(name || 'Your Profile')}</h1>
        <div class="profile-sub">${pEsc(user.email || c.email || '')}</div>
      </div>
    </div>

    <form id="profile-form" novalidate>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="pf-name">Full Name <span class="required">*</span></label>
          <input type="text" id="pf-name" class="form-control" value="${pEsc(name)}" placeholder="Your full name">
        </div>
        <div class="form-group">
          <label class="form-label" for="pf-email">Email (Gmail)</label>
          <input type="email" id="pf-email" class="form-control" value="${pEsc(user.email || c.email || '')}" readonly style="background:var(--bg-subtle);">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="pf-phone">Mobile Number <span class="required">*</span></label>
          <input type="tel" id="pf-phone" class="form-control" value="${pEsc(c.phone)}" maxlength="14" placeholder="10-digit mobile number">
        </div>
        <div class="form-group">
          <label class="form-label" for="pf-dept">Department</label>
          <select id="pf-dept" class="form-control">
            <option value="">Select department</option>
            ${DEPARTMENTS.map(d => `<option ${c.department === d ? 'selected' : ''}>${d}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="pf-year">Year / Role</label>
          <select id="pf-year" class="form-control">
            <option value="">Select year</option>
            ${YEARS.map(y => `<option ${c.year === y ? 'selected' : ''}>${y}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="pf-address">Default Delivery / Handover Address</label>
          <textarea id="pf-address" class="form-control" rows="2" placeholder="e.g. TVU Campus, Hostel Room 204">${pEsc(c.address)}</textarea>
        </div>
      </div>

      <div class="profile-actions">
        <button type="submit" class="btn btn-primary btn-lg" id="pf-save">Save Profile</button>
        <a href="orders.html" class="btn btn-outline btn-lg">My Orders</a>
        <button type="button" onclick="logoutUser()" class="btn btn-outline btn-lg" style="color:var(--danger,#dc2626);">Log Out</button>
      </div>
    </form>`;

  document.getElementById('profile-form').addEventListener('submit', saveProfile);
  paintPhoto(user);
}

/* ---------- profile photo: automatic (Google) + "Choose your photo" ---------- */
function paintPhoto(user) {
  const wrap = document.getElementById('pf-photo-wrap');
  if (!wrap) return;
  const c = window.getCurrentCustomer() || {};
  const photo = c.profileImage || user.photoURL || '';
  const name = c.name || user.displayName || 'U';
  wrap.innerHTML = `
    ${photo ? `<img src="${pEsc(photo)}" class="profile-avatar" referrerpolicy="no-referrer" alt="Profile photo">` : `<span class="profile-avatar profile-avatar-initial">${pEsc(name.charAt(0).toUpperCase())}</span>`}
    <div class="profile-photo-actions">
      <button type="button" class="profile-photo-btn" onclick="document.getElementById('pf-photo-input').click()">📷 Choose your photo</button>
      ${c.photoCustom ? `<button type="button" class="profile-photo-btn" onclick="resetPhoto()">Use ${user.photoURL ? 'Google' : 'default'} photo</button>` : ''}
    </div>
    <input type="file" id="pf-photo-input" accept="image/*" style="display:none;">`;
  document.getElementById('pf-photo-input').addEventListener('change', onPhotoChosen);
}

function resizeImageToDataUrl(file, size = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a valid image.'));
      img.onload = () => {
        const side = Math.min(img.width, img.height);            // centre-crop to a square
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        canvas.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function savePhoto(user, dataUrl, custom) {
  const patch = { profileImage: dataUrl, photoCustom: custom, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
  await db.collection('customers').doc(user.uid).set(patch, { merge: true });
  window.setCurrentCustomer({ ...(window.getCurrentCustomer() || {}), ...patch });
  window.renderHeader();
  paintPhoto(user);
}

async function onPhotoChosen(e) {
  const file = e.target.files && e.target.files[0];
  const user = auth.currentUser;
  if (!file || !user) return;
  if (!file.type.startsWith('image/')) return showToast('Please choose an image file.', 'warning');
  if (file.size > 8 * 1024 * 1024) return showToast('Image is too large (max 8 MB).', 'warning');
  try {
    const dataUrl = await resizeImageToDataUrl(file);
    await savePhoto(user, dataUrl, true);
    showToast('Profile photo updated!', 'success');
  } catch (err) {
    console.error('Photo upload failed:', err);
    showToast('Could not update photo: ' + err.message, 'error');
  }
}

async function resetPhoto() {
  const user = auth.currentUser;
  if (!user) return;
  try { await savePhoto(user, user.photoURL || '', false); showToast('Photo reset.', 'success'); }
  catch (err) { showToast('Could not reset photo: ' + err.message, 'error'); }
}
window.resetPhoto = resetPhoto;

async function saveProfile(e) {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return;

  const name = document.getElementById('pf-name').value.trim();
  const phone = document.getElementById('pf-phone').value.trim().replace(/[\s-]/g, '').replace(/^\+91/, '');
  if (name.length < 2) return showToast('Please enter your full name.', 'warning');
  if (!/^[6-9]\d{9}$/.test(phone)) return showToast('Enter a valid 10-digit mobile number.', 'warning');

  const btn = document.getElementById('pf-save');
  const html = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving...';

  const data = {
    name, phone,
    department: document.getElementById('pf-dept').value,
    year: document.getElementById('pf-year').value,
    address: document.getElementById('pf-address').value.trim(),
    profileCompleted: true,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    await db.collection('customers').doc(user.uid).set(data, { merge: true });
    if (user.displayName !== name) await user.updateProfile({ displayName: name });
    window.setCurrentCustomer({ ...(window.getCurrentCustomer() || {}), ...data });
    window.renderHeader();
    showToast('Profile saved successfully!', 'success');
    if (new URLSearchParams(location.search).get('setup') === '1') {
      setTimeout(() => { window.location.href = 'index.html'; }, 900);
    }
  } catch (err) {
    console.error('Profile save failed:', err);
    showToast('Could not save profile: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = html;
  }
}
