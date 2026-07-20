(function (global) {
  var ENABLED = true;
  var FIRST_DELAY_MS = 30 * 1000;
  var INTERVAL_MS = 5 * 60 * 1000;
  var VISIBLE_MS = 6500;
  var pageLoadMs = Date.now();
  var scheduleTimer = null;
  var hideTimer = null;
  var videoPool = [];

  var METHODS = [
    'Paid with card',
    'Paid with Apple Pay',
    'Paid with Cash App'
  ];

  var PROMO = { title: 'All Content', price: 150 };

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function hashSlot(slot) {
    var x = slot | 0;
    x = ((x >>> 16) ^ x) * 0x45d9f3b;
    x = ((x >>> 16) ^ x) * 0x45d9f3b;
    x = (x >>> 16) ^ x;
    return x >>> 0;
  }

  function pickFrom(arr, seed) {
    if (!arr.length) return '';
    return arr[((seed % arr.length) + arr.length) % arr.length];
  }

  function paidProducts() {
    return videoPool.filter(function (v) {
      return v && !v.is_free && Number(v.price) > 0 && String(v.title || '').trim();
    });
  }

  function noticeForSlot(slot) {
    var h = hashSlot(slot);
    var method = pickFrom(METHODS, h >>> 2);

    if (slot % 5 === 0) {
      return {
        method: method,
        title: PROMO.title,
        price: PROMO.price
      };
    }

    var pool = paidProducts();
    if (!pool.length) {
      return {
        method: method,
        title: 'Premium access',
        price: 19.99
      };
    }

    var v = pool[h % pool.length];
    return {
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
      'position:fixed;left:1rem;bottom:1rem;z-index:99990;' +
      'max-width:min(360px,calc(100vw - 2rem));display:flex;align-items:flex-start;gap:0.65rem;' +
      'padding:0.85rem 1rem;border-radius:12px;background:#141418;border:1px solid rgba(255,255,255,0.1);' +
      'box-shadow:0 16px 40px rgba(0,0,0,0.45);transform:translateY(120%);opacity:0;' +
      'transition:transform .45s cubic-bezier(.22,1,.36,1),opacity .45s cubic-bezier(.22,1,.36,1);' +
      'pointer-events:none}' +
      '.purchase-toast.show{transform:translateY(0);opacity:1}' +
      '.purchase-toast.hide{transform:translateY(12px);opacity:0}' +
      '.purchase-toast-dot{flex-shrink:0;width:10px;height:10px;margin-top:.35rem;border-radius:50%;' +
      'background:#34d399;box-shadow:0 0 10px rgba(52,211,153,.45);animation:purchase-toast-pulse 1.4s ease-in-out infinite}' +
      '@keyframes purchase-toast-pulse{0%,100%{opacity:1}50%{opacity:.45}}' +
      '.purchase-toast-body{flex:1;min-width:0;font-size:.78rem;line-height:1.45;color:#9ca3af}' +
      '.purchase-toast-who{display:block;font-weight:700;color:#f4f4f5;margin-bottom:.12rem}' +
      '.purchase-toast-msg em{font-style:normal;color:#00aff0;font-weight:700}' +
      '.purchase-toast-time{flex-shrink:0;font-size:.62rem;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em}' +
      '@media (max-width:480px){.purchase-toast{left:.65rem;right:.65rem;max-width:none}}';
    document.head.appendChild(style);
  }

  function ensureDom() {
    injectStyles();
    if (document.getElementById('purchase-toast')) return;
    var el = document.createElement('div');
    el.id = 'purchase-toast';
    el.className = 'purchase-toast';
    el.hidden = true;
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
  }

  function nextGlobalTickAtOrAfter(ts) {
    return Math.ceil(ts / INTERVAL_MS) * INTERVAL_MS;
  }

  function showForSlot(slot) {
    if (!ENABLED) return;
    var notice = noticeForSlot(slot);
    if (!notice) return;
    ensureDom();
    var el = document.getElementById('purchase-toast');
    if (!el) return;
    el.querySelector('.purchase-toast-who').textContent = 'Someone';
    el.querySelector('.purchase-toast-msg').innerHTML =
      escapeHtml(notice.method) + ' · <span>' + escapeHtml(notice.title) +
      '</span> · <em>$' + notice.price.toFixed(2) + '</em> · access sent';
    el.hidden = false;
    el.classList.remove('hide');
    el.classList.add('show');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      el.classList.add('hide');
      setTimeout(function () {
        el.hidden = true;
        el.classList.remove('show', 'hide');
      }, 450);
    }, VISIBLE_MS);
  }

  function scheduleLoop() {
    if (!ENABLED) return;
    clearTimeout(scheduleTimer);
    var now = Date.now();
    var earliest = pageLoadMs + FIRST_DELAY_MS;
    var tick = nextGlobalTickAtOrAfter(Math.max(now, earliest));
    if (tick < earliest) tick = nextGlobalTickAtOrAfter(earliest);
    var delay = Math.max(0, tick - now);
    scheduleTimer = setTimeout(function () {
      showForSlot(Math.floor(tick / INTERVAL_MS));
      scheduleLoop();
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
    pageLoadMs = Date.now();
    if (opts && Array.isArray(opts.videos)) setVideos(opts.videos);
    ensureDom();
    scheduleLoop();
  }

  global.PurchaseToasts = {
    start: start,
    stop: stop,
    setVideos: setVideos
  };
})(typeof window !== 'undefined' ? window : this);
