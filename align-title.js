/* ════════════════════════════════════════════════════════════
   大標視覺對齊

   中文字的字身左邊有一段留白（字距空間），字越大留白越寬，
   所以 52px 的大標看起來會比 14px 的副標「偏右」幾個像素。
   這裡依照實際顯示的字型量出兩者的留白差距，把大標往左微調，
   讓大標第一個字的筆畫和副標第一個字的筆畫切齊。

   - 自動適用所有頁面的 .page-h1 / .page-sub
   - 標題文字從 Sheet 載入、字型載入、視窗寬度改變時都會重新計算
   - 不需要手動維護
════════════════════════════════════════════════════════════ */
(function () {
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx || !('actualBoundingBoxLeft' in (ctx.measureText('a') || {}))) return;

  /* 第一個字的筆畫距離文字起點多遠（px） */
  function inkOffset(el) {
    var text = (el.textContent || '').trim();
    if (!text) return null;
    var cs = getComputedStyle(el);
    ctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    return -ctx.measureText(text.charAt(0)).actualBoundingBoxLeft;
  }

  function align() {
    var h1 = document.querySelector('.page-h1');
    if (!h1) return;
    var sub = h1.parentElement && h1.parentElement.querySelector('.page-sub');
    h1.style.marginLeft = '';
    var a = inkOffset(h1);
    if (a === null) return;
    var b = sub ? inkOffset(sub) : 0;
    if (b === null) b = 0;
    var shift = a - b;
    var max = parseFloat(getComputedStyle(h1).fontSize) * 0.15;   // 安全上限，避免異常字型造成大幅位移
    if (shift > 0.5 && shift < max) h1.style.marginLeft = (-shift).toFixed(1) + 'px';
  }

  var timer;
  function schedule() { clearTimeout(timer); timer = setTimeout(align, 30); }

  document.addEventListener('DOMContentLoaded', function () {
    align();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(align);
    var h1 = document.querySelector('.page-h1');
    var sub = h1 && h1.parentElement && h1.parentElement.querySelector('.page-sub');
    if (window.MutationObserver) {
      var mo = new MutationObserver(schedule);
      [h1, sub].forEach(function (el) { if (el) mo.observe(el, { childList: true, characterData: true, subtree: true }); });
    }
    window.addEventListener('resize', schedule);
  });
})();
