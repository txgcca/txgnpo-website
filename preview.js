/* ════════════════════════════════════════════════════════════
   預覽模式（草稿 Sheet）

   用法：任何頁面網址後面加上 ?preview=1
         例如 https://txgcca.org.tw/media.html?preview=1

   - 預覽模式改讀「草稿 Sheet」，正式網站仍讀「正式 Sheet」
   - 預覽模式不讀、也不寫瀏覽器快取，避免草稿內容跑進正式網站
   - 預覽模式下點站內連結，會自動維持預覽模式
   - 頁面頂端顯示「預覽模式・尚未發布」提示

   ★ 設定：建立草稿 Sheet 並「發布到網路」後，
     把發布網址中 /d/e/ 和 /pub 之間那一串 ID 貼到 DRAFT_ID
════════════════════════════════════════════════════════════ */
(function () {
  var LIVE_ID  = '2PACX-1vSmLYivM4AX0l0D6Qv8i39uy_IQe4UkAgAm2wO5ACdo5dNxyH_TURO9LCipQRid3GfEKcI9OmAcZC0g';
  var DRAFT_ID = '';   // ← 草稿 Sheet 的發布 ID（尚未設定時，預覽模式仍讀正式資料）

  var params = new URLSearchParams(window.location.search);
  if (!params.has('preview')) return;
  window.TXGCCA_PREVIEW = true;

  /* 1. 資料來源：正式 Sheet → 草稿 Sheet */
  if (DRAFT_ID) {
    var nativeFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      if (typeof input === 'string' && input.indexOf(LIVE_ID) !== -1) {
        input = input.replace(LIVE_ID, DRAFT_ID);
      }
      return nativeFetch(input, Object.assign({ cache: 'no-store' }, init || {}));
    };
  }

  /* 2. 快取隔離：預覽時不讀、不寫網站快取（txgcca_cache_*、數字動畫紀錄） */
  try {
    var proto = Storage.prototype;
    var getItem = proto.getItem, setItem = proto.setItem;
    var isSiteKey = function (k) { return typeof k === 'string' && (k.indexOf('txgcca_cache_') === 0 || k === 'txgcca_stats_animated'); };
    proto.getItem = function (k) { return isSiteKey(k) ? null : getItem.apply(this, arguments); };
    proto.setItem = function (k) { if (isSiteKey(k)) return; return setItem.apply(this, arguments); };
  } catch (e) { /* 瀏覽器不支援時忽略 */ }

  /* 3. 頂端提示列＋站內連結維持預覽模式 */
  document.addEventListener('DOMContentLoaded', function () {
    var bar = document.createElement('div');
    bar.setAttribute('role', 'status');
    bar.style.cssText = 'position:relative;z-index:1000;background:#FF6921;color:#fff;' +
      'font:700 13px/1.4 "Noto Sans TC",sans-serif;text-align:center;padding:8px 16px;';
    bar.innerHTML = DRAFT_ID
      ? '預覽模式・尚未發布｜這裡顯示的是草稿 Sheet 的內容，修改後約 5 分鐘才會反映　' +
        '<a href="' + window.location.pathname + '" style="color:#fff;text-decoration:underline;margin-left:8px;">回到正式網站</a>'
      : '預覽模式｜尚未設定草稿 Sheet，目前顯示的仍是正式內容';
    document.body.insertBefore(bar, document.body.firstChild);

    document.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || /^(https?:|mailto:|tel:|#|javascript:)/i.test(href)) return;
      if (!/\.html(\?|#|$)/.test(href)) return;
      var hashAt = href.indexOf('#');
      var path = hashAt === -1 ? href : href.slice(0, hashAt);
      var hash = hashAt === -1 ? '' : href.slice(hashAt);
      if (/[?&]preview=/.test(path)) return;
      a.setAttribute('href', path + (path.indexOf('?') === -1 ? '?' : '&') + 'preview=1' + hash);
    });
  });
})();
