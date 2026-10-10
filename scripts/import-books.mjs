/**
 * Bulk import / fix books  (works for 15,000+ books)
 *
 *   node scripts/import-books.mjs books.json          -> add every book from the JSON file
 *   node scripts/import-books.mjs --backfill          -> add search keywords to books that do not have them
 *
 * Needs the Firebase Admin key in .env (FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY, or FIREBASE_SERVICE_ACCOUNT_KEY).
 * books.json = array of: { title, author, category, originalPrice, discountedPrice, stock, description,
 *                           imageUrl (front cover), backImageUrl (back cover), sellerName }
 * category must be one of the department names (Tamil, English, Computer Science ...).
 */
import 'dotenv/config';
import fs from 'fs';
import admin from 'firebase-admin';

const cred = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY))
  : admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    });
admin.initializeApp({ credential: cred });
const db = admin.firestore();

const STOP = new Set(['the', 'and', 'of', 'for', 'to', 'in', 'on', 'by']);
const words = s => String(s || '').toLowerCase().replace(/[^a-z0-9\u0B80-\u0BFF\s]/g, ' ').split(/\s+/).filter(w => w.length > 1);
function keywords(b) {
  const set = new Set();
  [b.title, b.title, b.author, b.category].forEach(s => words(s).forEach(w => {
    if (STOP.has(w)) return;
    set.add(w);
    for (let i = 3; i < w.length; i++) set.add(w.slice(0, i));
  }));
  return Array.from(set).slice(0, 80);
}

async function importFile(file) {
  const list = JSON.parse(fs.readFileSync(file, 'utf8'));
  let batch = db.batch(), n = 0, total = 0;
  for (const b of list) {
    const ref = db.collection('books').doc();
    const orig = Number(b.originalPrice) || 0, disc = Number(b.discountedPrice) || orig;
    const stock = b.stock === undefined ? 5 : Number(b.stock);
    batch.set(ref, {
      bookId: ref.id, title: b.title, author: b.author || '', category: b.category || 'Other',
      description: b.description || '', notes: b.notes || '',
      sellerId: b.sellerId || 'tvu-book-bank', sellerName: b.sellerName || 'TVU Book Bank', sellerEmail: b.sellerEmail || '',
      originalPrice: orig, discountedPrice: disc,
      discountPercentage: orig > disc ? Math.round(((orig - disc) / orig) * 100) : 0,
      imageUrl: b.imageUrl || '', backImageUrl: b.backImageUrl || '',
      stock, availability: stock > 0 ? 'In Stock' : 'Out of Stock',
      rating: Number(b.rating) || 0, ratingCount: Number(b.ratingCount) || 0,
      searchKeywords: keywords(b),
      createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    n++; total++;
    if (n === 400) { await batch.commit(); batch = db.batch(); n = 0; console.log('imported', total); }
  }
  if (n) await batch.commit();
  console.log('Done. Imported', total, 'books.');
}

async function backfill() {
  let last = null, fixed = 0;
  for (;;) {
    let q = db.collection('books').orderBy(admin.firestore.FieldPath.documentId()).limit(400);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach(d => { if (!d.data().searchKeywords) { batch.update(d.ref, { searchKeywords: keywords(d.data()) }); fixed++; } });
    await batch.commit();
    last = snap.docs[snap.docs.length - 1];
    console.log('checked up to', last.id, '- fixed so far', fixed);
  }
  console.log('Done. Updated', fixed, 'books.');
}

const arg = process.argv[2];
if (arg === '--backfill') await backfill();
else if (arg) await importFile(arg);
else console.log('Usage: node scripts/import-books.mjs books.json   |   node scripts/import-books.mjs --backfill');
process.exit(0);
