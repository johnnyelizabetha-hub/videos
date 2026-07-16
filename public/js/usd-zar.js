/**
 * Compact USD → ZAR display for the storefront.
 * Fetches rate once (cached 1h in memory / sessionStorage).
 */
(function (global) {
  var CACHE_KEY = 'usd_zar_rate_v1';
  var CACHE_MS = 60 * 60 * 1000;
  var rate = null;
  var loading = null;

  function readCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || !o.rate || !o.at || Date.now() - o.at > CACHE_MS) return null;
      return Number(o.rate);
    } catch (e) {
      return null;
    }
  }

  function writeCache(r) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ rate: r, at: Date.now() }));
    } catch (e) {}
  }

  function fetchRate() {
    if (rate != null && isFinite(rate)) return Promise.resolve(rate);
    var cached = readCache();
    if (cached != null) {
      rate = cached;
      return Promise.resolve(rate);
    }
    if (loading) return loading;
    loading = fetch('https://api.frankfurter.app/latest?from=USD&to=ZAR')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var zar = d && d.rates && d.rates.ZAR;
        if (zar == null || !isFinite(Number(zar))) throw new Error('no rate');
        rate = Number(zar);
        writeCache(rate);
        return rate;
      })
      .catch(function () {
        return fetch('https://open.er-api.com/v6/latest/USD')
          .then(function (r) { return r.json(); })
          .then(function (d) {
            var zar = d && d.rates && d.rates.ZAR;
            if (zar == null || !isFinite(Number(zar))) throw new Error('no rate');
            rate = Number(zar);
            writeCache(rate);
            return rate;
          });
      })
      .finally(function () { loading = null; });
    return loading;
  }

  function zarAmount(usd) {
    var n = Number(usd);
    if (!isFinite(n) || n <= 0 || rate == null) return null;
    return Math.round(n * rate);
  }

  function zarLabel(usd) {
    var z = zarAmount(usd);
    if (z == null) return '';
    return '≈ R' + z.toLocaleString('en-US');
  }

  function zarSpan(usd, extraClass) {
    var n = Number(usd);
    if (!isFinite(n) || n <= 0) return '';
    var label = zarLabel(n);
    var cls = 'zar-eq' + (extraClass ? ' ' + extraClass : '');
    return '<span class="' + cls + '" data-usd="' + n + '">' + (label || '') + '</span>';
  }

  function refresh(root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll('[data-usd]');
    if (!nodes.length) return;
    fetchRate().then(function () {
      nodes.forEach(function (el) {
        var usd = Number(el.getAttribute('data-usd'));
        var label = zarLabel(usd);
        if (label) el.textContent = label;
      });
    }).catch(function () {});
  }

  function ensure(usd) {
    return fetchRate().then(function () {
      return zarLabel(usd);
    }).catch(function () { return ''; });
  }

  global.UsdZar = {
    fetchRate: fetchRate,
    zarAmount: zarAmount,
    zarLabel: zarLabel,
    zarSpan: zarSpan,
    refresh: refresh,
    ensure: ensure,
  };
})(typeof window !== 'undefined' ? window : globalThis);
