/**
 * 臺中市韌民協會官網｜媒體採訪清冊 → 草稿 Sheet「媒體報導」同步工具（Google Apps Script）
 *
 * 安裝位置：「草稿 Sheet」→ 擴充功能 → Apps Script，整段貼上後儲存。
 * 安裝後重新整理草稿 Sheet，上方選單會多出「媒體同步」：
 *   - 立即同步媒體清冊
 *   - 套用勾選的變更
 *   - 開啟每月自動同步（只需要按一次）
 *
 * 同步規則：
 *   - 只帶 5 欄：date、outlet、country、title、link（其他欄位由媒體分頁自己管理，同步不碰）
 *   - 用「報導連結」辨認同一篇報導；比對時忽略網址的追蹤碼（fbclid、utm_…、si 等）
 *   - 新報導：加到媒體報導最下面，自動編號 media-xx，featured 預設 FALSE，其他欄位留空待補
 *   - 媒體報導那格是空的、清冊有值：直接填入
 *   - 兩邊都有值但不一樣：不覆蓋，列到「同步待審核」分頁，勾選後按「套用勾選的變更」才寫入
 *   - 清冊那格是空白：不動
 *   - 清冊刪掉某篇報導：不刪除媒體報導的資料，只在待審核分頁提醒
 *   - 只改草稿 Sheet；正式網站要等「發布」才會更新
 *
 * 注意：
 *   - 自動同步用「開啟每月自動同步」那個人的帳號執行，清冊必須共用給這個帳號（檢視者即可）
 *   - 兩份表單的英文欄名（id、date、outlet…）都要在前 10 列內，且 A 欄是 id
 */

// ★ 媒體採訪清冊的檔案 ID：清冊網址中 /d/ 和 /edit 之間那一串
const SOURCE_SHEET_ID = '14ETqupvkxToPPgoNnv-2nJMKUlC5Ga1I8ezxRqnF4_w';
const SOURCE_TAB = '工作表1';               // 清冊的工作表名稱；找不到時用第一張
const TARGET_TAB = '媒體報導';
const REVIEW_TAB = '同步待審核';
const SYNC_COLS = ['date', 'outlet', 'country', 'title', 'link'];   // 由清冊帶過來的欄位
const NEW_ROW_DEFAULTS = { featured: 'FALSE' };                     // 新報導的預設值
const TIMEZONE = 'Asia/Taipei';

const REVIEW_HEADER = ['套用', '報導', '標題', '欄位', '媒體報導目前的值', '清冊的新值', '說明', '_key'];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('媒體同步')
    .addItem('立即同步媒體清冊', 'syncNow')
    .addItem('套用勾選的變更', 'applyChecked')
    .addSeparator()
    .addItem('開啟每月自動同步（每月 1 日早上）', 'installMonthlyTrigger')
    .addToUi();
}

/* ══ 選單：立即同步 ══════════════════════════════════════════ */
function syncNow() {
  const r = runSync_();
  SpreadsheetApp.getUi().alert('媒體清冊同步完成', summaryText_(r), SpreadsheetApp.getUi().ButtonSet.OK);
}

/* ══ 每月自動執行（由觸發器呼叫）：跑完寄 email ═════════════════ */
function monthlySync() {
  const r = runSync_();
  const me = Session.getEffectiveUser().getEmail();
  if (me) {
    MailApp.sendEmail(me,
      '［官網］媒體清冊每月同步：新增 ' + r.added.length + ' 筆、待審核 ' +
        r.review.filter(function (x) { return x[0] === false; }).length + ' 項',
      summaryText_(r) + '\n\n草稿 Sheet：' + SpreadsheetApp.getActive().getUrl());
  }
}

/* ══ 選單：開啟每月自動同步 ════════════════════════════════════ */
function installMonthlyTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === 'monthlySync'; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });          // 避免重複安裝
  ScriptApp.newTrigger('monthlySync').timeBased()
    .onMonthDay(1).atHour(9).inTimezone(TIMEZONE).create();
  SpreadsheetApp.getUi().alert('已開啟每月自動同步',
    '每月 1 日早上 9 點左右會自動同步一次，完成後寄 email 到：\n' + Session.getEffectiveUser().getEmail(),
    SpreadsheetApp.getUi().ButtonSet.OK);
}

/* ══ 同步主流程 ════════════════════════════════════════════════ */
function runSync_() {
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    const book = SpreadsheetApp.getActive();
    const target = book.getSheetByName(TARGET_TAB);
    if (!target) throw new Error('找不到「' + TARGET_TAB + '」工作表');
    const srcBook = SpreadsheetApp.openById(SOURCE_SHEET_ID);
    const source = srcBook.getSheetByName(SOURCE_TAB) || srcBook.getSheets()[0];

    const src = readTable_(source.getDataRange().getDisplayValues(), '清冊');
    const tgt = readTable_(target.getDataRange().getDisplayValues(), TARGET_TAB);
    const plan = planSync_(src, tgt);

    // 1. 直接補空白格
    plan.fills.forEach(function (f) {
      target.getRange(tgt.headerRow + 2 + f.row, tgt.cols[f.col] + 1).setValue(f.value);
    });
    // 2. 新報導加到最後一筆資料下面
    if (plan.newRows.length) {
      const start = tgt.headerRow + 2 + tgt.lastDataIndex + 1;
      target.getRange(start, 1, plan.newRows.length, tgt.width).setValues(plan.newRows);
    }
    // 3. 待審核分頁整張重寫（處理完的項目下次同步就會自然消失）
    writeReview_(book, plan.review);
    SpreadsheetApp.flush();
    return plan;
  } finally {
    lock.releaseLock();
  }
}

/* ══ 選單：套用勾選的變更 ═════════════════════════════════════ */
function applyChecked() {
  const ui = SpreadsheetApp.getUi();
  const book = SpreadsheetApp.getActive();
  const sheet = book.getSheetByName(REVIEW_TAB);
  if (!sheet || sheet.getLastRow() < 2) { ui.alert('目前沒有待審核的變更。'); return; }
  const target = book.getSheetByName(TARGET_TAB);
  const tgt = readTable_(target.getDataRange().getDisplayValues(), TARGET_TAB);

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, REVIEW_HEADER.length).getValues();
  const keep = [], applied = [];
  rows.forEach(function (r) {
    const checked = r[0] === true, col = r[3], newVal = r[5], key = r[7];
    const idx = tgt.byKey[key];
    if (checked && idx !== undefined && tgt.cols[col] !== undefined) {
      target.getRange(tgt.headerRow + 2 + idx, tgt.cols[col] + 1).setValue(newVal);
      applied.push(r[1] + ' ' + col);
    } else {
      keep.push(r);
    }
  });
  writeReviewRows_(sheet, keep);
  ui.alert('已套用 ' + applied.length + ' 項變更', applied.join('\n') || '（沒有勾選任何項目）', ui.ButtonSet.OK);
}

/* ══ 工具 ══════════════════════════════════════════════════════ */

/** 讀表：找 A 欄是 id 的英文欄名列，回傳欄位位置與資料列 */
function readTable_(values, label) {
  let h = -1;
  for (let i = 0; i < Math.min(values.length, 10); i++) {
    if (String(values[i][0]).trim() === 'id') { h = i; break; }
  }
  if (h === -1) throw new Error('「' + label + '」找不到英文欄名列（A 欄要是 id）');
  const header = values[h].map(function (v) { return String(v).trim(); });
  const cols = {};
  header.forEach(function (name, i) { if (name && cols[name] === undefined) cols[name] = i; });
  ['id', 'link'].concat(SYNC_COLS).forEach(function (c) {
    if (cols[c] === undefined) throw new Error('「' + label + '」缺少欄位：' + c);
  });
  const rows = values.slice(h + 1);
  let last = -1;
  const byKey = {};
  rows.forEach(function (r, i) {
    if (r.some(function (v) { return String(v).trim() !== ''; })) last = i;
    const k = linkKey_(r[cols.link]);
    if (k && byKey[k] === undefined) byKey[k] = i;
  });
  return { headerRow: h, header: header, cols: cols, width: header.length, rows: rows, lastDataIndex: last, byKey: byKey };
}

/** 連結比對用的 key：拿掉追蹤碼、#錨點、結尾斜線，網域轉小寫 */
function linkKey_(url) {
  let u = String(url || '').trim();
  if (!u) return '';
  u = u.replace(/#.*$/, '');
  const q = u.indexOf('?');
  let base = q === -1 ? u : u.slice(0, q);
  let query = q === -1 ? '' : u.slice(q + 1);
  query = query.split('&').filter(function (p) {
    const k = p.split('=')[0].toLowerCase();
    return p && !/^(utm_.*|fbclid|gclid|igshid|si|mibextid|ref|ref_src|s)$/.test(k);
  }).join('&');
  base = base.replace(/^(https?:\/\/)([^\/]+)/i, function (m, p, host) { return 'https://' + host.toLowerCase().replace(/^www\./, ''); })
             .replace(/\/+$/, '');
  return base + (query ? '?' + query : '');
}

/** 比對清冊與媒體報導，算出要補的格、新報導、待審核項目（不寫入，方便測試） */
function planSync_(src, tgt) {
  const fills = [], newRows = [], review = [], added = [];
  let nextNum = 0;
  tgt.rows.forEach(function (r) {
    const m = String(r[tgt.cols.id] || '').match(/^media-(\d+)$/);
    if (m) nextNum = Math.max(nextNum, parseInt(m[1], 10));
  });
  const seen = {};

  src.rows.forEach(function (sr) {
    const link = String(sr[src.cols.link] || '').trim();
    const key = linkKey_(link);
    if (!key) return;                                       // 沒有連結的列略過
    if (seen[key]) {
      review.push(reviewRow_(false, '（清冊重複）', sr[src.cols.title], 'link', '', link, '清冊裡有兩筆同一個連結，只採用第一筆', key));
      return;
    }
    seen[key] = true;
    const ti = tgt.byKey[key];

    if (ti === undefined) {                                 // 新報導
      nextNum++;
      const id = 'media-' + (nextNum < 10 ? '0' : '') + nextNum;
      const row = new Array(tgt.width).fill('');
      row[tgt.cols.id] = id;
      Object.keys(NEW_ROW_DEFAULTS).forEach(function (c) { if (tgt.cols[c] !== undefined) row[tgt.cols[c]] = NEW_ROW_DEFAULTS[c]; });
      SYNC_COLS.forEach(function (c) { row[tgt.cols[c]] = String(sr[src.cols[c]] || '').trim(); });
      newRows.push(row);
      added.push(id + ' ' + row[tgt.cols.title]);
      return;
    }

    const tr = tgt.rows[ti];
    SYNC_COLS.forEach(function (c) {
      const s = String(sr[src.cols[c]] || '').trim();
      const t = String(tr[tgt.cols[c]] || '').trim();
      if (!s || s === t) return;                            // 清冊空白或相同：不動
      if (c === 'link' && linkKey_(s) === linkKey_(t)) return;   // 只差追蹤碼：不動
      if (!t) { fills.push({ row: ti, col: c, value: s }); return; }
      review.push(reviewRow_(true, tr[tgt.cols.id], tr[tgt.cols.title], c, t, s, '兩邊不同，勾選後套用', key));
    });
  });

  // 媒體報導有、清冊已經沒有的報導：只提醒，不刪除
  tgt.rows.forEach(function (tr) {
    const key = linkKey_(tr[tgt.cols.link]);
    if (key && !seen[key] && /^media-\d+$/.test(String(tr[tgt.cols.id]).trim())) {
      review.push(reviewRow_(false, tr[tgt.cols.id], tr[tgt.cols.title], '—', '', '', '清冊裡找不到這篇（未刪除，請確認是否要手動移除）', key));
    }
  });

  return { fills: fills, newRows: newRows, added: added, review: review };
}

function reviewRow_(canApply, id, title, col, cur, next, note, key) {
  return [canApply ? false : '', id, title, col, cur, next, note, key];
}

function writeReview_(book, items) {
  let sheet = book.getSheetByName(REVIEW_TAB);
  if (!sheet) sheet = book.insertSheet(REVIEW_TAB);
  writeReviewRows_(sheet, items);
}

function writeReviewRows_(sheet, items) {
  sheet.clear();
  sheet.getRange(1, 1, 1, REVIEW_HEADER.length).setValues([REVIEW_HEADER]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.hideColumns(REVIEW_HEADER.length);                  // _key 欄給程式用，隱藏
  if (!items.length) return;
  sheet.getRange(2, 1, items.length, REVIEW_HEADER.length).setValues(items);
  items.forEach(function (r, i) {
    if (r[0] === false || r[0] === true) sheet.getRange(i + 2, 1).insertCheckboxes();
  });
}

function summaryText_(r) {
  const lines = [];
  lines.push('新增 ' + r.added.length + ' 筆' + (r.added.length ? '（請到「媒體報導」補 region、type、說明等欄位）' : ''));
  r.added.forEach(function (a) { lines.push('  ・' + a); });
  lines.push('自動補上空白格 ' + r.fills.length + ' 格');
  const reviewable = r.review.filter(function (x) { return x[0] === false; }).length;
  lines.push('待審核 ' + reviewable + ' 項、提醒 ' + (r.review.length - reviewable) + ' 項' +
    (r.review.length ? '（請看「' + REVIEW_TAB + '」分頁）' : ''));
  lines.push('\n同步只更新草稿；確認後請到正式 Sheet 按「發布」。');
  return lines.join('\n');
}
