/**
 * Social-proof purchase toasts — random interval ~50s.
 */
(function (global) {
  var ENABLED = true;
  var FIRST_MIN_MS = 8 * 1000;
  var FIRST_MAX_MS = 18 * 1000;
  /** Target ~50s between toasts, with jitter so it feels random. */
  var INTERVAL_MIN_MS = 38 * 1000;
  var INTERVAL_MAX_MS = 62 * 1000;
  var VISIBLE_MS = 7000;
  var scheduleTimer = null;
  var hideTimer = null;
  var videoPool = [];

  var METHODS = [
    'Paid with card',
    'Paid with Apple Pay',
    'Paid with Cash App'
  ];

  var WHO = [
    'Someone in SA',
    'A visitor',
    'Someone nearby',
    'A buyer',
    'Someone just now'
  ];

  var PROMO = { title: 'All Content', price: 150 };

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function randInt(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
  }

  function pick(arr) {
    if (!arr.length) return '';
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function paidProducts() {
    return videoPool.filter(function (v) {
      return v && !v.is_free && Number(v.price) > 0 && String(v.title || '').trim();
    });
  }

  function nextNotice() {
    var method = pick(METHODS);
    if (Math.random() < 0.22) {
      return {
        who: pick(WHO),
        method: method,
        title: PROMO.title,
        price: PROMO.price
      };
    }
    var pool = paidProducts();
    if (!pool.length) {
      return {
        who: pick(WHO),
        method: method,
        title: 'Premium access',
        price: 19.99
      };
    }
    var v = pick(pool);
    return {
      who: pick(WHO),
      method: method,
      title: String(v.title || 'Premium access').trim(),
      price: Number(v.price) || 0
    };
  }

  function injectStyles() {
    if (document.getElementById('purchase-toast-styles')) return;
    var style = document.createElement('style');
    style.id = 'purchase-toast-styles';
    style.textContent =
      '.purchase-toast{' +
      'position:fixed;left:1rem;bottom:1rem;z-index:2147483000;' +
      'max-width:min(360px,calc(100vw - 2rem));display:flex;align-items:flex-start;gap:0.65rem;' +
      'padding:0.85rem 1rem;border-radius:12px;background:#151518;border:1px solid rgba(255,255,255,0.12);' +
      'box-shadow:0 16px 40px rgba(0,0,0,0.55);transform:translateY(120%);opacity:0;' +
      'transition:transform .45s cubic-bezier(.22,1,.36,1),opacity .45s cubic-bezier(.22,1,.36,1);' +
      'pointer-events:none;visibility:hidden}' +
      '.purchase-toast.show{transform:translateY(0);opacity:1;visibility:visible}' +
      '.purchase-toast.hide{transform:translateY(12px);opacity:0;visibility:visible}' +
      '.purchase-toast-dot{flex-shrink:0;width:10px;height:10px;margin-top:.35rem;border-radius:50%;' +
      'background:#3dd68c;box-shadow:0 0 10px rgba(61,214,140,.5);animation:purchase-toast-pulse 1.4s ease-in-out infinite}' +
      '@keyframes purchase-toast-pulse{0%,100%{opacity:1}50%{opacity:.45}}' +
      '.purchase-toast-body{flex:1;min-width:0;font-size:.78rem;line-height:1.45;color:#a1a1aa}' +
      '.purchase-toast-who{display:block;font-weight:700;color:#f5f5f7;margin-bottom:.12rem}' +
      '.purchase-toast-msg em{font-style:normal;color:#ff2d55;font-weight:700}' +
      '.purchase-toast-time{flex-shrink:0;font-size:.62rem;font-weight:700;color:#71717a;text-transform:uppercase;letter-spacing:.05em}' +
      '@media (max-width:480px){.purchase-toast{left:.65rem;right:.65rem;max-width:none}}';
    document.head.appendChild(style);
  }

  function ensureDom() {
    injectStyles();
    var el = document.getElementById('purchase-toast');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'purchase-toast';
    el.className = 'purchase-toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML =
      '<span class="purchase-toast-dot" aria-hidden="true"></span>' +
      '<div class="purchase-toast-body">' +
      '<strong class="purchase-toast-who"></strong>' +
      '<span class="purchase-toast-msg"></span>' +
      '</div>' +
      '<span class="purchase-toast-time">just now</span>';
    document.body.appendChild(el);
    return el;
  }

  function showToast() {
    if (!ENABLED) return;
    var notice = nextNotice();
    if (!notice) return;
    var el = ensureDom();
    el.querySelector('.purchase-toast-who').textContent = notice.who;
    el.querySelector('.purchase-toast-msg').innerHTML =
      escapeHtml(notice.method) + ' · <span>' + escapeHtml(notice.title) +
      '</span> · <em>$' + Number(notice.price).toFixed(2) + '</em>';
    el.querySelector('.purchase-toast-time').textContent = 'just now';
    el.classList.remove('hide', 'show');
    /* Force reflow so the enter animation always plays */
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      el.classList.add('hide');
      el.classList.remove('show');
      setTimeout(function () {
        el.classList.remove('hide');
      }, 450);
    }, VISIBLE_MS);
  }

  function scheduleNext(isFirst) {
    if (!ENABLED) return;
    clearTimeout(scheduleTimer);
    var delay = isFirst
      ? randInt(FIRST_MIN_MS, FIRST_MAX_MS)
      : randInt(INTERVAL_MIN_MS, INTERVAL_MAX_MS);
    scheduleTimer = setTimeout(function () {
      showToast();
      scheduleNext(false);
    }, delay);
  }

  function stop() {
    clearTimeout(scheduleTimer);
    clearTimeout(hideTimer);
    scheduleTimer = null;
    hideTimer = null;
  }

  function setVideos(videos) {
    videoPool = Array.isArray(videos) ? videos : [];
  }

  function start(opts) {
    stop();
    if (opts && Array.isArray(opts.videos)) setVideos(opts.videos);
    ensureDom();
    scheduleNext(true);
  }

  global.PurchaseToasts = {
    start: start,
    stop: stop,
    setVideos: setVideos
  };
})(typeof window !== 'undefined' ? window : this);
