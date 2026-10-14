/* ════════════════════════════════════════════════════════════
   Sheet 資料讀取：先顯示、背景更新（全站共用）

   1. 這台裝置之前讀過 → 立刻用存在瀏覽器裡的資料顯示（跟以前一樣快）
   2. 同時在背景向 Google 抓最新資料
   3. 內容有變 → 存起來並通知頁面重新顯示（通常 1～2 秒內）；沒變就什麼都不做

   所以 Sheet 發布後，民眾下次打開網頁就會看到新內容，不用等 6 小時。

   - 網址加 ?nocache=1：不用瀏覽器存的資料，每次都直接抓
   - 預覽模式（?preview=1）：preview.js 會停用瀏覽器存檔，一律抓草稿最新資料
════════════════════════════════════════════════════════════ */
(function () {
  var NO_CACHE = new URLSearchParams(window.location.search).has('nocache');
  var MAX_AGE = 30 * 24 * 60 * 60 * 1000;   // 超過 30 天的舊資料就不先顯示，直接等網路
  var checked = {};                          // 每次開頁，每份資料只在背景檢查一次
  var inflight = {};

  function read(key) {
    if (NO_CACHE) return null;
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      var c = JSON.parse(raw);
      if (!c || typeof c.data !== 'string' || Date.now() - c.timestamp > MAX_AGE) return null;
      return c.data;
    } catch (e) { return null; }
  }

  function write(key, text) {
    try { localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data: text })); } catch (e) {}
  }

  function network(url, key) {
    if (inflight[key]) return inflight[key];
    inflight[key] = fetch(url, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (text) { write(key, text); delete inflight[key]; return text; },
            function (err) { delete inflight[key]; throw err; });
    return inflight[key];
  }

  /* url：CSV 網址；key：瀏覽器存檔名稱；onUpdate(text)：背景抓到新內容時呼叫 */
  window.txgccaFetch = function (url, key, onUpdate) {
    var cached = read(key);
    if (cached === null) {
      checked[key] = true;
      return network(url, key);
    }
    if (!checked[key]) {
      checked[key] = true;
      network(url, key).then(function (fresh) {
        if (fresh !== cached) {
          console.log('[TXGCCA] 「' + key.replace('txgcca_cache_', '') + '」有新內容，重新顯示');
          (onUpdate || window.txgccaDataChanged)(fresh);
        }
      }).catch(function () { /* 網路失敗就繼續用存著的資料 */ });
    }
    return Promise.resolve(cached);
  };

  /* 預設的「有新內容」處理：稍等一下（多份資料可能同時更新），再請頁面整個重新顯示一次 */
  var timer;
  window.txgccaDataChanged = function () {
    clearTimeout(timer);
    timer = setTimeout(function () {
      if (typeof window.txgccaReload === 'function') window.txgccaReload();
    }, 250);
  };
})();
