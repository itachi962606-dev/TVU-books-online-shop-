# 📚 TVU Books Shop

> **Thiruvalluvar University – Textbook, Study Material & Question Paper Marketplace**

A lightweight, responsive web app where university students can browse, wishlist and buy textbooks (Cash on Delivery), and where sellers can list their own books. It also includes previous-year question papers, an admin dashboard, and **NOVA AI** – a Gemini-powered shopping and study assistant (English / Tamil / Tanglish).

Built with **HTML, CSS, vanilla JavaScript, Firebase (Auth + Firestore), Cloudinary, EmailJS** and a small **Node.js / Vercel** backend for the AI chat.

---

## ✨ Features

### For students (customers)
- **Login / Sign Up** with Google or Email + Password (with forgot-password).
- **Search** by title, author or department, with suggestions; **Browse Books** with category chips, sorting, stock filter and infinite scroll (24 books at a time).
- **Book page** with front/back cover, offers, specifications and similar books.
- **Wishlist**, **Cart** (quantity, save for later) and **Cash on Delivery** checkout.
- **My Orders** history and **Profile** (photo, mobile, department, year, address).
- **Previous Year Question Papers** (15 departments, 2013–2025) – open and print / save as PDF.
- **NOVA AI Support** – book recommendations by subject/budget, order help, selling help.

### For sellers
- **Become a Seller** onboarding (`sellers/{uid}`) without losing customer status.
- **My Listed Books** – add / edit / delete books, upload front & back covers (Cloudinary), auto discount %.
- **Seller Orders** – incoming orders; confirming sends the buyer an email with the delivery date.

### For the owner (admin)
- Owner-only **Admin Dashboard** (`/admin/login.html`): overview, orders, users, books, and question paper / syllabus management.

### Extras
- Email notifications via **EmailJS** (new order → seller, confirmation → customer).
- Confetti celebration on successful order, subtle butterfly animation (respects `prefers-reduced-motion`).
- Fully responsive (mobile, tablet, desktop).

---

## 🧰 Tech Stack

| Area | Technology |
| :--- | :--- |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Auth & Database | Firebase Authentication, Cloud Firestore (compat SDK) |
| Image hosting | Cloudinary (unsigned upload preset) |
| Email | EmailJS |
| AI assistant | Google Gemini (`@google/genai`), optional Groq, built-in offline fallback |
| Backend | Node.js + Express (local), Vercel serverless function (`/api/chat`) |
| Hosting | Vercel |

---

## 📂 Project Structure

```
├── index.html               # Home (search + book rows)
├── books.html               # Browse books (filters, sort, infinite scroll)
├── book-details.html        # Single book page
├── cart.html / wishlist.html / orders.html / profile.html
├── seller.html              # Seller onboarding
├── seller-books.html        # Seller inventory (add / edit / delete)
├── seller-orders.html       # Seller incoming orders
├── download-syllabus.html   # Previous year question papers
├── paper-view.html          # Question paper viewer (print / PDF)
├── ai-support.html          # NOVA AI chat page
│
├── admin/                   # Owner-only admin dashboard (login, dashboard, js, css)
├── api/
│   ├── chat.js              # /api/chat endpoint (Vercel / Express)
│   └── lib/                 # ai-service.js (Gemini/Groq), firestore-tools.js
├── css/                     # style.css, responsive.css, ai-support.css, syllabus.css
├── js/                      # Page controllers & services
│   ├── firebase-config.js   # Firebase keys + admin emails
│   ├── cloudinary-service.js, email-service.js
│   ├── nova-gemini.js, nova-local.js, ai-support.js   # NOVA AI
│   ├── catalog-seed.js, papers-seed.js                # Starter books & papers
│   └── ...
├── scripts/
│   ├── import-books.mjs     # Bulk import / backfill search keywords
│   ├── books-sample.json    # Sample import file
│   └── test-gemini.mjs      # Gemini connectivity check
│
├── server.js                # Local dev server (static files + /api/chat)
├── start-nova.bat           # Windows one-click start
├── firestore.rules          # Firestore security rules
├── storage.rules            # Storage security rules
├── vercel.json              # Vercel routing & caching
├── .env.example             # Environment variable template
└── SETUP-GEMINI.md          # NOVA AI / Gemini setup (Tanglish)
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS)
- A [Firebase](https://console.firebase.google.com/) project
- Free accounts on [Cloudinary](https://cloudinary.com/) and [EmailJS](https://www.emailjs.com/)
- (Optional) A free [Gemini API key](https://aistudio.google.com/apikey) for NOVA AI

### 1. Install
```bash
git clone <your-repo-url>
cd TVU-books-online-shop
npm install
```

### 2. Firebase
1. Create a project → **Authentication** → enable **Google** and **Email/Password**.
2. Create a **Firestore** database (e.g. region `asia-south1`).
3. Copy your web app config into `js/firebase-config.js`.
4. Paste `firestore.rules` (and `storage.rules` if you use Storage) into the Firebase Console and **Publish**.
5. Add `localhost` and your Vercel domain under **Authentication → Settings → Authorized domains**.

### 3. Admin (owner) access
1. In `js/firebase-config.js` put your email in `TVU_ADMIN_EMAILS`.
2. In `firestore.rules` put the **same email** in `isOwnerEmail()` and publish the rules.
3. Open `/admin/login.html` and sign in with that account. Anyone else sees *Access Denied*.

### 4. Cloudinary (book images)
Create an **Unsigned** upload preset, then set your cloud name and preset in `js/cloudinary-service.js`:
```js
const CLOUDINARY_CONFIG = { cloudName: "your_cloud_name", uploadPreset: "your_unsigned_preset", folder: "tvu_books" };
```
> Never put the Cloudinary API Secret in frontend code.

### 5. EmailJS (order emails)
Create a service and two templates (seller new order, customer confirmation), then fill `publicKey`, `serviceId` and template IDs in `js/email-service.js`.

### 6. Environment variables (NOVA AI + server)
```bash
cp .env.example .env
```
| Variable | Purpose |
| :--- | :--- |
| `GEMINI_API_KEY` / `AI_API_KEY` | Gemini key for NOVA AI |
| `AI_PROVIDER` | `gemini` or `groq` |
| `AI_MODEL` / `GEMINI_MODEL` | Model name |
| `PORT` | Local server port (default `3000`) |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` *or* `FIREBASE_SERVICE_ACCOUNT_KEY` | Service account (needed for NOVA's private data and bulk import) |

> ⚠️ **Never commit `.env`** (it is already in `.gitignore`).

### 7. Run locally
```bash
npm start
```
Open **http://localhost:3000**. On Windows you can double-click `start-nova.bat`.

Check Gemini: `npm run test-gemini`. Detailed AI setup: see [`SETUP-GEMINI.md`](SETUP-GEMINI.md).

> NOVA works even without a key – it falls back to a built-in assistant.

---

## 📦 Bulk Book Import

Add thousands of books at once from a JSON file (format: see `scripts/books-sample.json`; needs the Firebase Admin key in `.env`):
```bash
node scripts/import-books.mjs books.json     # import books
node scripts/import-books.mjs --backfill     # add search keywords to older books
```
Each book needs: `title, author, category, originalPrice, discountedPrice, stock, description, imageUrl, backImageUrl, sellerName`. `category` must be one of the department names.

---

## 🏛️ Departments

Tamil · English · Economics · History · Mathematics · Physics · Chemistry · Botany · Zoology · Biotechnology · Computer Science · Information Technology · Computer Applications (MCA) · Commerce · Business Administration

---

## 🗄️ Firestore Collections

| Collection | Description |
| :--- | :--- |
| `customers/{uid}` | Customer profile |
| `sellers/{uid}` | Seller profile |
| `books/{bookId}` | Book listings (with `searchKeywords`) |
| `orders/{orderId}` | COD orders (`Confirmed` / `Delivered`) |
| `users/{uid}/wishlist/{bookId}` | Saved books |
| `users/{uid}/cart/{bookId}` | Cart items |
| `admins` | Extra admins added by the owner |

---

## 🌐 Deploy to Vercel

1. Push the project to GitHub (without `.env`).
2. On [Vercel](https://vercel.com/) → **Add New → Project** → import the repo (Framework: **Other**).
3. Add environment variables (`GEMINI_API_KEY`, and optionally `FIREBASE_SERVICE_ACCOUNT_KEY`) under **Settings → Environment Variables**.
4. Deploy, then add the Vercel domain to Firebase **Authorized domains**.

`vercel.json` already routes `/api/chat` to the serverless function and caches static assets.

---

## 🔒 Security Notes

- Admin access is **owner-only** (email check in both the frontend config and Firestore rules); there is no public link to the admin pages.
- Keep the Firebase service account key, Gemini key and `.env` **out of Git**.
- Do not leave `TVU_GEMINI_API_KEY` in `js/firebase-config.js` on a public site – use the server key instead.
- Starter books and question papers are generated sample / model data, not official scans.

---

## 📄 License

MIT © TVU Books Shop – Thiruvalluvar University
