/* ════════════════════════════════════════════════════════════
   中文斷行優化（只在詞與詞之間換行）

   瀏覽器預設會在任何兩個中文字之間換行，所以窄螢幕常出現
   「應變聯／合演習」「台中／市社會局」這種把詞切斷的情況。

   做法：用瀏覽器內建的斷詞功能（Intl.Segmenter）把句子切成詞，
   只在詞與詞之間留換行點，並搭配 word-break: keep-all，
   讓一個詞不會被拆到兩行；「｜合作單位」前面優先換行。

   - Sheet 載入的文字也會自動處理，不需要手動維護
   - 舊瀏覽器不支援時維持原本的換行方式，不影響閱讀
════════════════════════════════════════════════════════════ */
(function () {
  if (!window.Intl || !Intl.Segmenter) return;

  var TARGETS = [
    // 活動相關
    '.chron-title-cell', '.chron-note',                 // 過往活動｜完整編年
    '.act-title', '.act-desc',                          // 過往活動｜關鍵記事
    '.py-text', '.past-card-name', '.past-card-partner',// 自訓與課程活動｜過往活動紀錄
    '.tl-item-title', '.tl-item-desc',                  // 首頁、關於｜大事記
    // 其他標題與說明文字
    '.page-sub', '.card-title', '.card-desc',
    '.row-title', '.row-excerpt', '.feat-title', '.feat-desc',
    '.nw-title', '.nw-desc', '.podcast-title', '.value-title', '.fcta-title'
  ].join(',');

  var seg = new Intl.Segmenter('zh-Hant', { granularity: 'word' });
  var NO_BREAK_BEFORE = /^[，。、；：！？）」』〉》】,.;:!?)\]…‧·・％%]/;   // 不能放在行首的標點
  var NO_BREAK_AFTER  = /[（「『〈《【(\[｜]$/;                              // 不能放在行尾的標點
  var CJK = /[\u3400-\u9fff\uf900-\ufaff]/;

  var style = document.createElement('style');
  style.textContent = '.tw-done{word-break:keep-all;overflow-wrap:anywhere;line-break:strict}';
  document.head.appendChild(style);

  function processText(node) {
    var text = node.nodeValue;
    if (!text || !CJK.test(text)) return;
    var frag = document.createDocumentFragment();
    var buf = '', prev = '';
    for (var it = seg.segment(text)[Symbol.iterator](), s; !(s = it.next()).done;) {
      var piece = s.value.segment;
      var canBreak = buf && !NO_BREAK_BEFORE.test(piece) && !NO_BREAK_AFTER.test(prev) && !/^\s/.test(piece) && !/\s$/.test(prev);
      if (canBreak) { emit(frag, buf); frag.appendChild(document.createElement('wbr')); buf = ''; }
      buf += piece; prev = piece;
    }
    if (buf) emit(frag, buf);
    node.parentNode.replaceChild(frag, node);
  }

  /* 含標點的詞塊（例如「｜台中市」「「如何」」）整塊不換行，避免標點單獨留在行尾或行首 */
  var PUNCT = /[，。、；：！？（）「」『』〈〉《》【】｜…‧·・]/;
  function emit(frag, text) {
    if (PUNCT.test(text) && text.length <= 12) {
      var span = document.createElement('span');
      span.style.whiteSpace = 'nowrap';
      span.textContent = text;
      frag.appendChild(span);
    } else {
      frag.appendChild(document.createTextNode(text));
    }
  }

  function processEl(el) {
    var key = el.textContent;
    if (el.__twKey === key) return;          // 內容沒變就不重做
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(processText);
    // 「活動名稱｜單位」：在｜前面優先換行
    el.querySelectorAll('.chron-partner, .py-partner').forEach(function (p) {
      if (p.previousSibling && p.previousSibling.nodeName !== 'WBR') p.parentNode.insertBefore(document.createElement('wbr'), p);
    });
    el.classList.add('tw-done');
    el.__twKey = el.textContent;
  }

  var busy = false;
  function run() {
    if (busy) return;
    busy = true;
    document.querySelectorAll(TARGETS).forEach(processEl);
    busy = false;
  }

  var timer;
  document.addEventListener('DOMContentLoaded', function () {
    run();
    new MutationObserver(function () { if (!busy) { clearTimeout(timer); timer = setTimeout(run, 40); } })
      .observe(document.body, { childList: true, subtree: true, characterData: true });
  });
})();
