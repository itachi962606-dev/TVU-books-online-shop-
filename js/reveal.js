/**
 * TVU Books Shop - scroll reveal
 * Elements slide in from top / bottom / left / right while scrolling.
 * - Add data-reveal="up|down|left|right" to any element, or
 * - book cards & section headings are picked up automatically (also the ones rendered later by JS).
 */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  function prep(el, dir, delay) {
    if (el.__rv) return; el.__rv = true;
    if (!el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', dir);
    if (delay) el.style.transitionDelay = delay + 'ms';
    io.observe(el);
  }
  function scan(root) {
    (root || document).querySelectorAll('[data-reveal]').forEach(el => prep(el, 'up'));
    (root || document).querySelectorAll('.home-block-head').forEach(el => prep(el, 'left'));
    // cards: alternate directions per column so they come from top / bottom / sides
    (root || document).querySelectorAll('.book-card').forEach((el, i) => {
      const dirs = ['left', 'up', 'down', 'right'];
      prep(el, dirs[i % 4], (i % 4) * 70);
    });
  }
  scan();
  let t; new MutationObserver(() => { clearTimeout(t); t = setTimeout(scan, 50); })
    .observe(document.body, { childList: true, subtree: true });
})();
