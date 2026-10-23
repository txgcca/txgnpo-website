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

/* ════════════════════════════════════════════════════════════
   資安防護：Sheet 內容一律當「純文字」與「安全連結」處理（全站共用）

   Sheet 是任何有編輯權限的人都能改的地方。為了避免有人（不小心或故意）
   在 Sheet 貼進一段網頁程式碼，讓它在訪客的瀏覽器裡執行：

   - escHTML(文字)：把 < > & " ' 轉成無害的符號，畫面看起來一樣，但不會被當成程式
   - safeUrl(網址)：只接受 https:// http:// webcal:// mailto: tel: 和站內路徑，
                    其他（例如 javascript:）一律換成 #
   - cssUrl(網址)：給背景圖用，先過 safeUrl，再把會打斷 CSS 的符號編碼
   - ytId(ID)：YouTube 影片 ID 只留英數字、- 和 _

   ★ 之後新增任何「把 Sheet 資料放進頁面」的程式，都要經過這幾個工具
════════════════════════════════════════════════════════════ */
function escHTML(t) {
  return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function safeUrl(u) {
  var v = String(u == null ? '' : u).trim();
  if (!v) return '';
  /* 瀏覽器判斷網址開頭時會忽略空白與控制字元（例如 java&#9;script:），檢查前先拿掉 */
  var probe = v.replace(/[\u0000- \u007f]/g, '');
  var scheme = probe.match(/^([a-z][a-z0-9+.\-]*):/i);
  if (!scheme) return v;   // 站內路徑、#錨點
  return /^(https?|webcal|mailto|tel)$/i.test(scheme[1]) ? v : '#';
}

function cssUrl(u) {
  return safeUrl(u).replace(/["'()\\\s]/g, function (c) { return encodeURIComponent(c); });
}

function ytId(id) {
  return String(id == null ? '' : id).replace(/[^\w-]/g, '');
}
