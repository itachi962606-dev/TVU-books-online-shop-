/**
 * TVU Books Shop - Shared Flipkart-style book card
 * Offer / category / stock info sits next to the price, never on top of the cover image.
 */
function bcEsc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function renderBookCard(book, isWishlisted) {
  const orig = Number(book.originalPrice) || 0;
  const disc = Number(book.discountedPrice) || orig;
  const pct = (orig > 0 && disc < orig) ? Math.round(((orig - disc) / orig) * 100) : 0;
  const inStock = (book.stock === undefined || Number(book.stock) > 0);
  const fallback = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&auto=format&fit=crop&q=80';
  const href = 'book-details.html?id=' + encodeURIComponent(book.id);
  const rating = Number(book.rating) > 0
    ? `<div class="fkc-rating"><span class="fk-rating-pill">${Number(book.rating).toFixed(1)} ★</span><span class="fkc-count">(${Number(book.ratingCount || 0).toLocaleString('en-IN')})</span></div>` : '';

  return `
    <div class="book-card fkc">
      <div class="fkc-img" onclick="window.location.href='${href}'">
        <button class="wishlist-btn-card ${isWishlisted ? 'active' : ''}"
                onclick="toggleWishlist('${book.id}', event)"
                title="${isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}" aria-label="Wishlist">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="${isWishlisted ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        </button>
        <img src="${bcEsc((window.TVUBooks ? window.TVUBooks.thumb(book.imageUrl, 420) : book.imageUrl) || fallback)}" alt="${bcEsc(book.title)}" loading="lazy" decoding="async" width="300" height="400" onerror="this.onerror=null;this.src='${fallback}'">
      </div>
      <div class="fkc-body">
        <a class="fkc-title" href="${href}" title="${bcEsc(book.title)}">${bcEsc(book.title)}</a>
        <div class="fkc-author">By ${bcEsc(book.author || 'Academic Faculty')}</div>
        ${rating}
        <div class="fkc-price">
          <span class="fkc-now">${formatINR(disc)}</span>
          ${orig > disc ? `<span class="fkc-mrp">${formatINR(orig)}</span>` : ''}
          ${pct > 0 ? `<span class="fkc-off">${pct}% off</span>` : ''}
        </div>
        <div class="fkc-meta">
          <span class="fkc-chip">${bcEsc(book.category || 'General')}</span>
          <span class="fkc-stock ${inStock ? 'in' : 'out'}">${inStock ? 'In Stock' : 'Out of Stock'}</span>
        </div>
        <div class="fkc-seller">Seller: ${bcEsc(book.sellerName || 'TVU Seller')}</div>
        <div class="fkc-actions">
          <button class="fkc-btn fkc-cart" onclick="addToCartById('${book.id}', event)" ${!inStock ? 'disabled' : ''}>Add to Cart</button>
          <button class="fkc-btn fkc-buy" onclick="initiateBuyNow('${book.id}')" ${!inStock ? 'disabled' : ''}>Buy Now</button>
        </div>
      </div>
    </div>`;
}
window.renderBookCard = renderBookCard;
