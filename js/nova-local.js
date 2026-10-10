/**
 * NOVA - built-in assistant (works with no server, no API key).
 * ai-support.js uses it automatically whenever the /api/chat server is not reachable
 * (for example on Live Server / static hosting), so NOVA always answers.
 * Understands English, Tamil and Tanglish keywords.
 */
(function () {
  const has = (t, words) => words.some(w => t.includes(w));

  const FAQ = [
    { k: ['hello', 'hi ', 'hey', 'vanakkam', 'vanakam', 'epdi iruka', 'how are you'], a: () =>
      "Vanakkam! 👋 I'm **NOVA**, the TVU Books Shop assistant.\n\nAsk me things like:\n* *\"Computer Science books under 200\"*\n* *\"Show my orders\"*\n* *\"How do I become a seller?\"*\n* *\"Where are the question papers?\"*" },
    { k: ['become a seller', 'sell my', 'sell book', 'seller', 'sell pana', 'vikka', 'list my book', 'list book'], a: () =>
      "**To sell books on TVU Books Shop:**\n1. Sign up / log in.\n2. On the home page click **Become a Seller** and complete the seller form.\n3. Open **Menu → My Listed Books** and add your book (title, author, category, price, stock and a cover photo).\n4. When a student orders, you see it in **Menu → Seller Orders** and confirm the handover date." },
    { k: ['how to buy', 'how do i buy', 'buy panna', 'order panna', 'how to order', 'cod', 'cash on delivery', 'payment'], a: () =>
      "**To buy a book:**\n1. Open a book and press **Add to Cart** (or **Buy Now** for a single book).\n2. In **Cart** press **Place Order** and enter your name, phone and handover address.\n3. Pay in **Cash on Delivery** when the seller hands over the book on campus.\n\nTrack everything under the 🛍 **Orders** icon." },
    { k: ['question paper', 'previous year', 'old paper', 'qp', 'syllabus', 'exam paper'], a: () =>
      "📝 Open **Menu → Previous Year Question Papers**. Pick your department, search by subject or year, open any paper and use **Print / Save as PDF**.\n\nOpen the page here: [Question Papers](download-syllabus.html#papers)" },
    { k: ['wishlist', 'favourite', 'favorite', 'saved books'], a: () =>
      "💖 Tap the **heart** on any book to save it. Your list is under the ♡ icon in the header, where you can also move books to the cart." },
    { k: ['cart', 'basket'], a: () =>
      "🛒 Your cart is under the cart icon in the header. You can change quantity, remove books, save for later and place the order from there." },
    { k: ['profile', 'photo', 'mobile number', 'phone number', 'my details'], a: () =>
      "👤 Click your name at the top right → **My Profile**. You can change your name, mobile number, department, address and **choose your own photo**." },
    { k: ['login', 'log in', 'sign up', 'signup', 'register', 'password', 'account'], a: () =>
      "Use the **Sign Up** button at the top right. You can continue with **Google** or an email and password. If you already have an account, use the small **Login** link inside the popup. Forgot your password? Choose Login → *Forgot password?*." },
    { k: ['thank', 'nandri', 'super', 'great'], a: () => "You're welcome! 😊 Anything else I can help you find?" }
  ];

  function parseBudget(t) {
    const m = t.match(/(?:under|below|less than|max|within|kulla|keela|₹|rs\.?)\s*(\d{2,5})/) || t.match(/(\d{2,5})\s*(?:rupees|rs|₹)?\s*(?:kulla|keela|below|under)/);
    return m ? Number(m[1]) : null;
  }

  async function allBooksForSearch() {
    let list = (window.SEED_BOOKS || []).slice();
    try {
      if (window.isFirebaseConfigured && window.isFirebaseConfigured() && window.db) {
        const snap = await db.collection('books').limit(200).get();
        const live = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(b => !(window.isHiddenBook && window.isHiddenBook(b)));
        list = live.concat(list);
      }
    } catch (e) { /* offline catalogue only */ }
    return list;
  }

  const STOP = new Set(['books', 'book', 'show', 'me', 'find', 'need', 'want', 'for', 'the', 'a', 'an', 'of', 'in', 'on', 'under', 'below', 'above', 'price', 'cheap', 'best', 'any', 'have', 'you', 'is', 'are', 'there', 'ena', 'iruku', 'venum', 'kaattu', 'kaamchu', 'tell', 'please', 'with', 'and', 'to', 'my', 'i', 'rs', 'rupees', 'kulla', 'keela', 'bsc', 'msc', 'ba', 'bcom', 'study', 'material', 'materials']);

  async function searchBooks(text) {
    const budget = parseBudget(text);
    const words = text.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w));
    const all = await allBooksForSearch();
    let scored = all.map(b => {
      const hay = `${b.title} ${b.author} ${b.category} ${b.kind || ''}`.toLowerCase();
      let score = 0;
      words.forEach(w => { if (hay.includes(w)) score += (b.category || '').toLowerCase().includes(w) ? 3 : 2; });
      if (b.stock !== undefined && Number(b.stock) <= 0) score -= 1;
      return { b, score };
    });
    if (words.length) scored = scored.filter(x => x.score > 0);
    if (budget) scored = scored.filter(x => (Number(x.b.discountedPrice) || Number(x.b.originalPrice) || 0) <= budget);
    scored.sort((x, y) => y.score - x.score || (Number(y.b.rating) || 0) - (Number(x.b.rating) || 0));
    return { books: scored.slice(0, 4).map(x => x.b), budget, words, total: scored.length };
  }

  async function myOrders() {
    if (!window.auth || !auth.currentUser) return null;
    try {
      const snap = await db.collection('orders').where('customerId', '==', auth.currentUser.uid).get();
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const ts = o => (o.createdAt && o.createdAt.toMillis) ? o.createdAt.toMillis() : 0;
      return list.sort((a, b) => ts(b) - ts(a)).slice(0, 3);
    } catch (e) { return []; }
  }

  // Shared memory so "I want to buy it" works after books were shown (until the user orders / starts a new search)
  window.novaContext = window.novaContext || { lastBooks: [] };
  window.novaSearchBooks = searchBooks;
  const BUY = ['buy', 'order', 'purchase', 'vaang', 'vanga', 'venum', 'vendum', 'vaanga', 'checkout', 'book pannu', 'confirm', 'i want it', 'i will take', 'add it'];
  window.novaIsBuyIntent = t => has(' ' + String(t || '').toLowerCase() + ' ', BUY);

  window.novaLocalReply = async function (message) {
    const t = ' ' + String(message || '').toLowerCase().trim() + ' ';

    // 0. Buying: show the books we were just talking about, ready to order
    if (window.novaIsBuyIntent(t) && window.novaContext.lastBooks.length && !has(t, ['how to', 'how do'])) {
      const picks = window.novaContext.lastBooks.slice(0, 3);
      return { reply: `Great choice! 🛒 Tap **Buy** on the book you want and I'll open the Cash on Delivery order form${picks.length > 1 ? ' (these are the books we just looked at)' : ''}:`, books: picks };
    }

    // 1. My orders
    if (has(t, ['my order', 'order status', 'track', 'where is my', 'enga order', 'en order', 'orders ah', 'order kaattu', 'show my orders'])) {
      if (!window.auth || !auth.currentUser) return { reply: "Please **Sign Up / Login** first, then I can show your orders. 🔐" };
      const orders = await myOrders();
      if (!orders || !orders.length) return { reply: "You have no orders yet. Add a book to the cart and place your first order! 🛒" };
      return { reply: `Here are your **latest ${orders.length} order${orders.length > 1 ? 's' : ''}**. Full list: 🛍 Orders icon in the header.`, orders };
    }

    // 2. Help / FAQ topics
    for (const f of FAQ) { if (has(t, f.k)) return { reply: f.a() }; }

    // 3. Departments overview
    if (has(t, ['department', 'departments', 'subjects available', 'what categories'])) {
      const names = (window.TVU_DEPARTMENTS || []).map(d => d.name).join(', ');
      return { reply: `We have books for these departments: **${names}**.\n\nTell me a subject, for example *\"Database Management Systems books\"*.` };
    }

    // 4. Default: book search
    const r = await searchBooks(t);
    if (r.books.length) {
      window.novaContext.lastBooks = r.books;
      const extra = r.budget ? ` under **₹${r.budget}**` : '';
      return { reply: `I found **${r.total.toLocaleString('en-IN')}** matching book${r.total > 1 ? 's' : ''}${extra}. Here are the top ${r.books.length}:`, books: r.books };
    }
    return { reply: "I couldn't find a matching book. Try a subject or department, like *\"Physics books\"*, *\"Tamil literature\"* or *\"Commerce books under 250\"*. I can also help with **orders, cart, selling books and question papers**." };
  };
})();
