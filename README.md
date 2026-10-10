# ✅ LATEST UPDATE (v6) – READ THIS FIRST

## 1. Admin login (do this once)
1. Open `js/firebase-config.js` and put YOUR Google email in `TVU_ADMIN_EMAILS` (replace `REPLACE_WITH_OWNER_EMAIL@gmail.com`).
2. Open `firestore.rules`, put the same email in `isOwnerEmail()`, then Firebase Console → Firestore → Rules → **Publish**.
3. Open `/admin/login.html` → sign in with that Google account (or an email/password account created in Firebase → Authentication).
   Anybody else sees "Access Denied".

## 2. Speed – what changed
- Books load **24 at a time** (scroll for more) – the whole `books` collection is never downloaded.
- Header/menu appears instantly; profile data loads in the background; no Firestore write on every page.
- Scripts are `defer`red, Google Fonts no longer block the page, logo shrunk 108 KB → 38 KB, Cloudinary images are requested small (`f_auto,q_auto,w_420`).
- Firestore local cache + auto long-polling are on. Admin dashboard loads only the newest rows.
- Search uses `searchKeywords` saved with every book. **For books added before this update run once:**  
  `npm install` then `node scripts/import-books.mjs --backfill`
- Add thousands of books quickly: fill a JSON file like `scripts/books-sample.json` and run  
  `node scripts/import-books.mjs books.json`  (needs the Firebase Admin key in `.env`)
- No extra Firestore indexes are needed.

## 3. Pages
- **Home**: only the search box (with department/book suggestions) + horizontal swipe rows + vertical grid.
- **Browse Books**: category chips (Arts & Humanities / Sciences / Computer & IT / Commerce & Management → departments), sort, stock, infinite scroll.
- **Book page**: front + back cover photos, Similar books row. Sellers can upload a back cover in *Seller → My Books*.
- **NOVA AI**: round logo only; the "Ask NOVA AI" text slides out of the logo and back in. Needs `GEMINI_API_KEY` in `.env` (`npm start`) or on Vercel → Settings → Environment Variables.

---

# TVU Books Shop 📚

> **Thiruvalluvar University Academic Textbook & Study Material Marketplace**  
> A lightweight, clean, responsive, and fully functional university-level book buying and selling web application built with **HTML5, Vanilla CSS, Vanilla JavaScript, Firebase (Auth, Firestore, Storage), and EmailJS**.

---

## 🏛️ Features Overview

- **Official University Branding**: Features the official Thiruvalluvar University emblem and academic color styling.
- **Google Sign-In**: One-click Google authentication with automatic customer profile creation in `customers/{uid}`.
- **Seller Hub**: Separate seller onboarding (`sellers/{uid}`) without destroying customer status.
- **Dynamic Book Inventory**:
  - Direct image upload from browser to **Firebase Storage** (`book-images/{sellerId}/{bookId}/`).
  - Automatic discount percentage computation (`((MRP - Discounted) / MRP) * 100`).
  - Edit pricing, stock availability, notes, or replace cover image dynamically.
- **Student Discovery**:
  - Live search by title, author, or department category.
  - Department filtering (Engineering, Computer Science, Mathematics, Science, Commerce, Arts, Study Materials, etc.).
  - Sort by Price (Low to High, High to Low) or Newest.
- **Personalized Wishlist**: Private saved items in `users/{uid}/wishlist/{bookId}`.
- **Cash on Delivery (COD) Checkout**: Instant order creation in `orders/{orderId}` with campus handover details.
- **Interactive Celebration**: Lightweight canvas confetti celebration + pop checkmark modal upon successful order creation.
- **Automated Seller Email Alerts**: EmailJS seller dispatch with buyer contact and delivery address.
- **Subtle Home Page Butterfly Animation**: Elegant, non-intrusive CSS/JS butterfly that gracefully flutters and perches on UI elements (respects `prefers-reduced-motion`).

---

## 📂 Project Structure

```
d:/anti tvu project/
├── index.html              # Home page with hero, dynamic catalog & butterfly
├── books.html              # Full catalog with search, filter & sorting
├── book-details.html       # Single book view with seller info & buy modal
├── wishlist.html           # Saved items page
├── orders.html             # Customer order history
├── seller.html             # Seller registration & onboarding
├── seller-books.html       # Seller book inventory & Add/Edit modal
├── seller-orders.html      # Seller incoming orders & COD collection
│
├── css/
│   ├── style.css           # Core academic design tokens, components & modals
│   └── responsive.css      # Mobile drawer and adaptive breakpoints
│
├── js/
│   ├── firebase-config.js  # Centralized Firebase initialization & keys
│   ├── auth.js             # Google auth state & dynamic header
│   ├── email-service.js    # EmailJS order dispatch service
│   ├── notifications.js    # Toasts, modals, formatters & canvas confetti
│   ├── butterfly.js        # Smooth Home page animated butterfly
│   ├── home.js             # Home page catalog controller
│   ├── books.js            # Catalog filter & search controller
│   ├── book-details.js     # Single book view controller
│   ├── wishlist.js         # Customer wishlist controller
│   ├── orders.js           # Customer orders controller
│   ├── seller.js           # Seller onboarding controller
│   ├── seller-books.js     # Seller inventory & Firebase Storage upload
│   └── seller-orders.js    # Seller incoming orders controller
│
├── assets/
│   └── tvu-logo.png        # Official Thiruvalluvar University Crest
│
├── firestore.rules         # Security rules for Cloud Firestore
├── storage.rules           # Security rules for Firebase Storage
└── README.md               # Complete setup and deployment guide
```

---

## 🚀 Setup & Configuration Guide

### 1. Firebase Project Creation
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project**, name it `tvu-books-materials` (or your preferred name), and complete setup.

### 2. Google Authentication Setup
1. In the Firebase Console left menu, navigate to **Build > Authentication**.
2. Click **Get Started**, select **Sign-in method**, and choose **Google**.
3. Enable Google provider, select your project support email, and click **Save**.
4. In the **Authorized domains** tab, add your localhost and your Vercel deployment domain (e.g., `tvu-books.vercel.app`).

### 3. Cloud Firestore Setup
1. In Firebase Console, navigate to **Build > Firestore Database**.
2. Click **Create database**, select a region close to your users (e.g., `asia-south1` / Mumbai), and start in **Production mode**.
3. Go to the **Rules** tab and paste the contents of `firestore.rules`.
4. Click **Publish**.

#### Firestore Collections Schema:
- **`customers/{uid}`**:
  - `uid` (string)
  - `name` (string)
  - `email` (string)
  - `profileImage` (string URL)
  - `role`: `"customer"`
  - `createdAt` (timestamp)
  - `updatedAt` (timestamp)
- **`sellers/{uid}`**:
  - `uid` (string)
  - `name` (string)
  - `email` (string)
  - `phone` (string)
  - `university` (string)
  - `department` (string)
  - `description` (string)
  - `profileImage` (string URL)
  - `role`: `"seller"`
  - `createdAt` (timestamp)
  - `updatedAt` (timestamp)
- **`books/{bookId}`**:
  - `bookId` (string)
  - `title` (string)
  - `author` (string)
  - `category` (string)
  - `description` (string)
  - `notes` (string)
  - `sellerId` (string)
  - `sellerName` (string)
  - `sellerEmail` (string)
  - `originalPrice` (number)
  - `discountedPrice` (number)
  - `discountPercentage` (number)
  - `imageUrl` (Cloudinary CDN secure HTTPS URL)
  - `stock` (number)
  - `availability` (`"In Stock"` | `"Out of Stock"`)
  - `createdAt` (timestamp)
  - `updatedAt` (timestamp)
- **`users/{uid}/wishlist/{bookId}`**:
  - `bookId`, `title`, `author`, `category`, `discountedPrice`, `originalPrice`, `imageUrl`, `sellerName`, `addedAt`
- **`orders/{orderId}`**:
  - `orderId` (string, e.g. `TVU-XXXXX`)
  - `customerId`, `customerName`, `customerEmail`, `customerPhone`, `customerAddress`
  - `sellerId`, `sellerName`, `sellerEmail`
  - `bookId`, `bookTitle`, `bookImageUrl`, `quantity`, `originalPrice`, `discountedPrice`, `totalAmount`
  - `paymentMethod`: `"Cash on Delivery"`
  - `orderStatus`: `"Confirmed"` | `"Delivered"`
  - `createdAt` (timestamp), `updatedAt` (timestamp)

### 4. Cloudinary Setup (Free Image Storage & CDN)
1. Sign up for a free account at [Cloudinary.com](https://cloudinary.com/).
2. On your **Cloudinary Dashboard**, locate and copy your **Cloud name** (e.g. `dxyz123ab`).
3. Click the **Settings (gear icon)** in the top right / bottom left.
4. Navigate to **Upload** (or **Upload Presets**).
5. Scroll down to **Upload presets** and click **Add upload preset**.
6. Set:
   - **Upload preset name**: e.g. `tvu_books_preset` (or keep the generated name).
   - **Signing Mode**: Select **Unsigned** (crucial for client-side uploads).
   - **Folder**: `tvu_books` (optional).
7. Click **Save**.
8. Open `js/cloudinary-service.js` and paste your Cloud Name and Upload Preset:
   ```javascript
   const CLOUDINARY_CONFIG = {
     cloudName: "your_cloud_name",
     uploadPreset: "your_unsigned_upload_preset",
     folder: "tvu_books"
   };
   ```
*(Note: Never place your Cloudinary API Secret in frontend code.)*

### 5. EmailJS Setup (Seller Order Notifications)
1. Sign up at [EmailJS.com](https://www.emailjs.com/).
2. Create an **Email Service** (e.g. Gmail). Note down your `Service ID`.
3. Create an **Email Template** with subject `New Book Order - TVU Books Shop` and parameters:
   - `{{to_name}}`, `{{to_email}}`, `{{order_id}}`, `{{customer_name}}`, `{{customer_phone}}`, `{{delivery_address}}`, `{{book_title}}`, `{{quantity}}`, `{{total_amount}}`, `{{payment_method}}`, `{{order_date}}`.
4. Copy your `Template ID` and `Public Key` (Account > API Keys).
5. Open `js/email-service.js` and fill in:
   ```javascript
   const EMAILJS_CONFIG = {
     serviceId: "your_service_id",
     templateId: "your_template_id",
     publicKey: "your_public_key"
   };
   ```

### 6. Connect Firebase Config in Code
Open `js/firebase-config.js` and paste your web app credentials:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "tvu-books-materials.firebaseapp.com",
  projectId: "tvu-books-materials",
  storageBucket: "tvu-books-materials.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef..."
};
```

---

## 💻 Local Testing Instructions

Because Firebase Authentication and modern web scripts require HTTP/HTTPS origin (not `file:///`), run a simple local web server:

### Option A: VS Code Live Server
Right-click `index.html` and select **Open with Live Server** (runs at `http://127.0.0.1:5500`).

### Option B: Python HTTP Server
Run in the project directory:
```bash
python -m http.server 8000
```
Open `http://localhost:8000` in your browser.

### Option C: Node `npx serve`
```bash
npx serve .
```

---

## 🌐 GitHub & Vercel Deployment Instructions

### 1. Push to GitHub
Initialize your git repository and push to GitHub:
```bash
git init
git add .
git commit -m "Initial commit: TVU Books Shop"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/tvu-books-materials.git
git push -u origin main
```

### 2. Deploy to Vercel
1. Go to [Vercel](https://vercel.com/) and click **Add New > Project**.
2. Import your `tvu-books-materials` GitHub repository.
3. Keep default settings (Framework Preset: **Other**, Root Directory: `./`).
4. Click **Deploy**.
5. Once deployed, copy your production domain (e.g. `tvu-books-materials.vercel.app`).
6. **Important**: Go to Firebase Console > Authentication > Settings > **Authorized Domains**, and add `tvu-books-materials.vercel.app`.

---

## 📋 Final Verification Checklist

| Item | Requirement | Status |
| :--- | :--- | :---: |
| 1 | Official TVU logo in header | ✅ |
| 2 | Google Sign-in & separate `customers/{uid}` profile | ✅ |
| 3 | Seller registration & separate `sellers/{uid}` profile | ✅ |
| 4 | Image upload directly to Firebase Storage (`book-images/`) | ✅ |
| 5 | Image URL saved in Firestore (`books/{bookId}`) | ✅ |
| 6 | Real-time discount calculation (`30% OFF`) | ✅ |
| 7 | Live catalog fetching & category chips | ✅ |
| 8 | Search by title, author, and category | ✅ |
| 9 | Single Book Details view with study notes | ✅ |
| 10 | Customer Wishlist (`users/{uid}/wishlist`) | ✅ |
| 11 | Cash on Delivery (COD) only payment mode | ✅ |
| 12 | Confetti celebration & checkmark pop upon order success | ✅ |
| 13 | EmailJS seller notification on new order | ✅ |
| 14 | Customer "My Orders" view | ✅ |
| 15 | Seller "My Listed Books" (Add, Edit, Replace Image, Delete) | ✅ |
| 16 | Seller "Incoming Orders" view | ✅ |
| 17 | Floating animated butterfly with gentle perching & reduced-motion check | ✅ |
| 18 | Secure Firestore & Storage security rules | ✅ |
| 19 | Mobile, Tablet & Desktop responsive layout | ✅ |
| 20 | Zero code edits or redeployments required for new book uploads | ✅ |

---

© 2026 TVU Books Shop • Thiruvalluvar University
#   s i t e c h e c k i n g 
 
 
---

## 🆕 v2 Update (Login, Cart, Profile, Flipkart-style product page)

- **Login / Sign Up popup** – blue *Login* button + *Sign Up*; each offers **Continue with Google** or **Email + Password**.
  - Sign Up with an account that already exists → *"You already have an account… Please login."*
  - Login with an account that does not exist → *"No account found… Please sign up first."*
  - Forgot-password email link included.
  - **Enable it once:** Firebase Console → Authentication → Sign-in method → **Email/Password → Enable**.
- **New header:** `Home · ♡ Wishlist · 🛒 Cart · ☰ Menu · 🛍 Orders · Login/Sign Up (or your profile)` with live count badges.
  - **Menu** contains only *Previous Year Question Papers* and *NOVA AI Support*.
- **Profile page** (`profile.html`) – name, Gmail (read-only), mobile number, department, year, address. New users are sent here right after sign-up.
- **Cart** (`cart.html`) – quantity, remove, save-for-later, price details and COD checkout (one order per book). Stored at `users/{uid}/cart/{bookId}`.
- **Flipkart-style product page** (`book-details.html`) – big cover, Add to Cart / Buy Now, offers, delivery, specifications and similar books.
- **Starter catalogue of 1500 books** (`js/catalog-seed.js`) – generated names, categories and prices, sold by *TVU Book Bank*. Turn off with `window.TVU_SEED_ENABLED = false;` before the script loads.
- **Deploy the new rule:** publish `firestore.rules` (adds the `cart` rule).

## 🆕 v3 Update
- Header: `Home · ♡ Wishlist · 🛒 Cart · 🛍 Orders · ☰ Menu · [Sign Up / Profile]` – a single **Sign Up** button; the popup has *Continue with Google*, email sign-up and a small "Already have an account? Login" link.
- Flipkart-style book cards (`js/book-card.js`): offer %, category and stock now sit next to the price, never on the cover image. Every starter-catalogue cover has its own colour.
- Profile page: automatic Google photo + **Choose your photo** (and *Use Google photo* to reset).
- Fixed: *Orders* "query requires an index" error (orders & seller books are sorted in the browser now), cart *permission denied* (falls back to a browser cart until you publish `firestore.rules`), "No books available" flash while loading.
- "Sell Your Books" button renamed **Become a Seller**.
- Test listings *Yksia*, *Empty*, *Book* are hidden (`window.TVU_HIDDEN_BOOK_TITLES` in `js/catalog-seed.js`). Delete them in Firebase to remove them permanently.

## 🆕 v4 Update
- **Site name:** TVU Books Shop (titles, headings, footers, emails).
- **Header:** full width – logo at the far left, profile at the far right. Menu = *Previous Year Question Papers* (+ Seller Dashboard / My Listed Books / Seller Orders for sellers). Profile menu = *My Profile* + *Log Out*.
- **15,000 books** (`js/catalog-seed.js`) for 15 departments + Study Materials + General – every cover has its own colour and layout. Home shows 12, Books page loads 24 at a time.
- **5,000 question papers** (`js/papers-seed.js`) for 15 departments, 2013–2025, April/November, Regular/Arrear. Click *Open Question Paper* → full Part A/B/C paper → **Print / Save as PDF**. The *Download Syllabus* tab has been removed.
  - These are **model papers written from each subject's unit topics**, not scans of official papers. Upload real scanned papers from the Admin Dashboard (or let students submit them) – they appear first.
- **NOVA AI** now always works: it uses your `/api/chat` Gemini server when it is running, otherwise a built-in assistant (book search by subject/budget, orders, cart, selling, question papers, English/Tamil/Tanglish).
- **Admin Dashboard** (`admin/dashboard.html`): new Overview, Orders, Users and Books pages next to the question-paper/syllabus tools. Publish `firestore.rules` again (admins can now delete books).
- Mobile and "Desktop site" mode: no sideways scrolling, 2-column book grid on phones, wrapped department chips.

## 🆕 v5 Update
- **Header:** the Home page shows logo + university name + Wishlist, Cart, Orders, Menu and your profile. **Every other page shows only Home and Profile** (no duplicate Home / breadcrumb).
- **Home page:** only the search bar (press Enter → opens *Browse Books* with the results). Department chips removed; the category filter lives on *Browse Books* (search + 3 filters in one row).
- **Departments (15):** Tamil, English, Economics, History · Mathematics, Physics, Chemistry, Botany, Zoology, Biotechnology · Computer Science, Information Technology, Computer Applications (MCA) · Commerce, Business Administration.
- **Starter books:** 4 per department = **60 books** (fast loading) with a **front and back cover** (click *Front / Back* on the book page). Publisher name on the covers: change `window.TVU_PUBLISHER` in `js/catalog-seed.js`.
- **Question papers:** 5,000 model papers for the same 15 departments (loaded only on the papers page).
- **NOVA AI button:** logo only; the text slides out of the logo (never covers books on mobile).
- **NOVA + Gemini:** (1) Node server with `GEMINI_API_KEY` in `.env` → used automatically, (2) or paste a key in `js/firebase-config.js` (`TVU_GEMINI_API_KEY`) to use Gemini straight from the browser, (3) otherwise the built-in assistant. Say "I want to buy it" and the books being discussed appear with a Buy button.
- **Admin is owner-only:** put your email in `TVU_ADMIN_EMAILS` (`js/firebase-config.js`) **and** in `isOwnerEmail()` (`firestore.rules`), publish the rules, then open `/admin/login.html` (Google or email + password). The old "first person becomes admin" rule and the `role: admin` loophole are removed. There is no link to the admin from the public site.
- **Logo flash fixed:** fonts no longer block the stylesheet and the header has critical inline CSS.
