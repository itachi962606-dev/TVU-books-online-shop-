/**
 * NOVA + Gemini (browser mode)
 * Used by ai-support.js when the /api/chat server is not running AND a Gemini key is set:
 *     window.TVU_GEMINI_API_KEY = 'your key';   (js/firebase-config.js)
 * NOVA looks up matching books in the shop catalogue, gives them to Gemini as context, and Gemini
 * answers any question about the books (in English / Tamil / Tanglish). When the user says they want
 * to buy, the books being discussed are shown with a Buy button.
 * IMPORTANT: a key placed in browser code is visible to visitors. For a public website run the Node
 * server (npm start) and keep GEMINI_API_KEY in .env instead - NOVA uses that automatically.
 */
(function () {
  const MODEL = () => window.TVU_GEMINI_MODEL || 'gemini-3.5-flash';

  const SYSTEM = `You are NOVA, the friendly assistant of TVU Books Shop, the student book marketplace of Thiruvalluvar University.
- Answer ANY question about books, subjects, syllabus topics, which book to choose, comparisons, study tips and how the shop works.
- Reply in the same language the student uses (English, Tamil or Tanglish). Keep answers short and clear (max ~120 words).
- Use ONLY the books listed in CATALOGUE for recommendations (never invent titles, prices or stock). Mention the price in rupees.
- Shop facts: payment is Cash on Delivery on campus; Add to Cart / Buy Now on every book; Orders icon on the home page shows orders; Menu has Previous Year Question Papers; sellers use "Become a Seller".
- If the student wants to buy / order, confirm warmly and put the exact book ids to offer in "bookIds" (the app shows Buy buttons).
- Website guide (answer questions about this website from it):
- Home (index.html): search box with suggestions, rows of books. Browse Books (books.html): categories (Arts & Humanities: Tamil, English, Economics, History | Sciences: Mathematics, Physics, Chemistry, Botany, Zoology, Biotechnology | Computer & IT: Computer Science, Information Technology, Computer Applications (MCA) | Commerce & Management: Commerce, Business Administration), sort and stock filters.
- Book page: front and back cover photos, price, offers, Add to Cart, Buy Now (Cash on Delivery on campus), similar books.
- Home header icons: Wishlist, Cart, My Orders, Menu (Previous Year Question Papers) and Profile. Other pages show only Home and Profile.
- Orders are Cash on Delivery: seller confirms, then handover on campus. Sellers: Become a Seller -> list books with front/back cover, price, stock.
- Syllabus and previous year question papers: download-syllabus.html. Admin portal (/admin) is only for the website owner.
- If the student asks anything about books (subjects, which book to pick, topics, comparisons, study tips) or about this website, answer clearly and helpfully, then suggest matching books from the shop when relevant.
- Respond ONLY as JSON: {"reply": "<markdown text>", "bookIds": ["<id>", ...]}  (bookIds may be empty).`;

  window.novaGeminiAvailable = () => !!window.TVU_GEMINI_API_KEY;

  window.novaGeminiReply = async function (message, history) {
    const key = window.TVU_GEMINI_API_KEY;
    if (!key) throw new Error('No Gemini key');

    // Catalogue context: books matching the message + the books we discussed last
    const found = window.novaSearchBooks ? (await window.novaSearchBooks(' ' + String(message).toLowerCase() + ' ')).books : [];
    const pool = [];
    const seen = new Set();
    (found.concat(window.novaContext ? window.novaContext.lastBooks : [])).forEach(b => { if (b && !seen.has(b.id)) { seen.add(b.id); pool.push(b); } });
    const extra = (window.SEED_BOOKS || []).filter(b => !seen.has(b.id)).slice(0, Math.max(0, 12 - pool.length));
    const catalogue = pool.concat(extra).slice(0, 12).map(b =>
      `id=${b.id} | ${b.title} | ${b.category} | by ${b.author || 'n/a'} | Rs.${b.discountedPrice || b.originalPrice} | ${b.stock === undefined || Number(b.stock) > 0 ? 'in stock' : 'out of stock'}${b.rating ? ' | rating ' + b.rating : ''}`
    ).join('\n');

    const contents = [];
    (history || []).slice(-8).forEach(m => {
      const text = m.content || m.text || '';
      if (text) contents.push({ role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user', parts: [{ text }] });
    });
    // History already contains the new message in some builds - avoid duplicates
    if (!contents.length || contents[contents.length - 1].role !== 'user' || contents[contents.length - 1].parts[0].text !== message) {
      contents.push({ role: 'user', parts: [{ text: message }] });
    }
    contents[contents.length - 1].parts[0].text += `\n\nCATALOGUE:\n${catalogue || '(no matching books)'}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL()}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents,
        generationConfig: { temperature: 0.6, responseMimeType: 'application/json' }
      }),
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error('Gemini error ' + res.status);
    const data = await res.json();
    const raw = (((data.candidates || [])[0] || {}).content || {}).parts;
    const text = raw && raw[0] ? raw[0].text : '';
    let parsed;
    try { parsed = JSON.parse(text.replace(/^```json|```$/g, '').trim()); } catch (e) { parsed = { reply: text || 'Sorry, I could not answer that.', bookIds: [] }; }

    const all = pool.concat(extra);
    let books = (parsed.bookIds || []).map(id => all.find(b => b.id === id) || (window.getSeedBook && window.getSeedBook(id))).filter(Boolean).slice(0, 4);
    if (!books.length && window.novaIsBuyIntent && window.novaIsBuyIntent(message) && window.novaContext.lastBooks.length) books = window.novaContext.lastBooks.slice(0, 3);
    if (!books.length && found.length && !window.novaIsBuyIntent(message)) books = found.slice(0, 3);
    if (books.length) window.novaContext.lastBooks = books;
    return { reply: parsed.reply || '', books };
  };
})();
