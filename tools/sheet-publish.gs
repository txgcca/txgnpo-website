/**
 * 臺中市韌民協會官網｜草稿 → 正式 發布工具（Google Apps Script）
 *
 * 安裝位置：「正式 Sheet」→ 擴充功能 → Apps Script，整段貼上後儲存。
 * 安裝後重新整理正式 Sheet，上方選單會多出「網站」→「發布草稿到正式網站」。
 *
 * 運作方式：
 *   1. 結構檢查：每張工作表的「英文欄名列」位置與欄名，草稿和正式版必須完全一樣
 *      → 有任何一張不一樣就整個停止、一筆都不改，並列出要修的工作表
 *   2. 跳出確認視窗
 *   3. 把「目前的正式 Sheet」整份複製到雲端硬碟「網站正式版備份」資料夾（只保留最近 30 份）
 *   4. 把草稿每張工作表的內容覆蓋到正式 Sheet 同名的工作表
 *   5. 若中途出錯：已覆蓋的工作表自動從剛才的備份還原，不會停在一半
 *   ※ DRAFT_ONLY_SHEETS 清單裡的工作表（例如「同步待審核」）只留在草稿，發布時完全略過
 *
 * 注意：
 *   - 只覆蓋「內容」，不會刪除或重建正式 Sheet 的工作表，所以網站讀取用的 gid 不會變
 *   - 只有能編輯正式 Sheet 的人（幹部）才能執行
 *   - 誰在什麼時候發布、改了什麼，可在正式 Sheet 的「檔案 → 版本記錄」查看
 */

// ★ 草稿 Sheet 的檔案 ID：草稿網址中 /d/ 和 /edit 之間那一串
const DRAFT_SHEET_ID = '1ctDmgblaCWrGacgPP1nFl4uBbCgD0hKrQ8WYFQ3MR0U';

// ★ 只留在草稿的工作表（內部作業用，網站不讀）：發布時完全略過，不檢查、不複製，正式版也不需要有
//   以後草稿若再新增內部用的工作表，把名稱加進這份清單即可
const DRAFT_ONLY_SHEETS = ['同步待審核'];

const BACKUP_FOLDER_NAME = '網站正式版備份';

// 英文欄名列的辨識方式：A 欄是這些字的那一列（找前 10 列）
const HEADER_KEYS = ['欄位名稱', 'id', 'date', 'year', 'category'];
const KEEP_BACKUPS = 30;
const TIMEZONE = 'Asia/Taipei';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('網站')
    .addItem('發布草稿到正式網站', 'publishDraft')
    .addToUi();
}

function publishDraft() {
  const ui = SpreadsheetApp.getUi();
  if (!DRAFT_SHEET_ID) {
    ui.alert('尚未設定草稿 Sheet', '請先在 Apps Script 的 DRAFT_SHEET_ID 填入草稿 Sheet 的檔案 ID。', ui.ButtonSet.OK);
    return;
  }

  const live = SpreadsheetApp.getActive();
  const draft = SpreadsheetApp.openById(DRAFT_SHEET_ID);

  // 1. 結構檢查：草稿的每張工作表，正式版都必須有同名工作表
  const missing = publishableSheets_(draft)
    .map(function (s) { return s.getName(); })
    .filter(function (name) { return !live.getSheetByName(name); });
  if (missing.length) {
    ui.alert('無法發布：工作表不一致',
      '草稿有正式版沒有的工作表：\n' + missing.join('、') +
      '\n\n新增工作表需要同步調整網站程式，請聯絡網站維護者。', ui.ButtonSet.OK);
    return;
  }

  // 1-2. 結構檢查：英文欄名列的位置與內容必須一致（避免像「表格標題列必須含有值」那種做到一半停住）
  const problems = checkStructure_(draft, live);
  if (problems.length) {
    ui.alert('無法發布：草稿和正式版的結構不一致',
      '以下工作表的「英文欄名列」位置或欄名不一樣，這次沒有改動任何內容：\n\n' +
      problems.join('\n\n') +
      '\n\n請把兩份 Sheet 的這幾張工作表調整成一樣（列的位置、欄名、欄的順序），再發布一次。', ui.ButtonSet.OK);
    return;
  }

  // 2. 確認
  const ok = ui.alert('確定要發布？',
    '草稿 Sheet 的內容將覆蓋正式網站。\n發布前會自動備份目前的正式版。', ui.ButtonSet.OK_CANCEL);
  if (ok !== ui.Button.OK) return;

  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);   // 避免兩位幹部同時按發布
  try {
    // 3. 備份目前的正式版
    const backup = backupLive_(live);

    // 4. 逐張覆蓋內容；中途出錯就把已覆蓋的工作表從備份還原
    const done = [];
    let current = '';
    try {
      publishableSheets_(draft).forEach(function (ds) {
        current = ds.getName();
        writeSheet_(live.getSheetByName(current), ds.getDataRange().getValues());
        SpreadsheetApp.flush();                             // 每張寫完就確認，錯誤會停在這一張
        done.push(current);
      });
    } catch (err) {
      const restored = restoreFromBackup_(live, backup, done.concat(current));
      ui.alert('發布失敗，已還原',
        '在「' + current + '」這張工作表發生錯誤：\n' + err.message +
        '\n\n已把 ' + restored.join('、') + ' 從備份還原，正式網站維持發布前的內容。' +
        '\n備份檔：' + backup.getName(), ui.ButtonSet.OK);
      return;
    }
    const count = done.length;

    ui.alert('發布完成',
      '已更新 ' + count + ' 張工作表。\n\n' +
      '・網站約 5 分鐘內更新\n' +
      '・訪客打開網頁就會看到新內容，若網頁開著就重新整理即可\n' +
      '・備份檔：' + backup.getName(), ui.ButtonSet.OK);
  } finally {
    lock.releaseLock();
  }
}

/** 草稿中要發布的工作表（排除 DRAFT_ONLY_SHEETS） */
function publishableSheets_(draft) {
  return draft.getSheets().filter(function (s) { return DRAFT_ONLY_SHEETS.indexOf(s.getName()) === -1; });
}

/** 找英文欄名列（從 0 開始）；找不到回傳 -1 */
function headerRow_(values) {
  for (let i = 0; i < Math.min(values.length, 10); i++) {
    if (HEADER_KEYS.indexOf(String(values[i][0]).trim()) !== -1) return i;
  }
  return -1;
}

/** 去掉列尾空白格，方便比較 */
function trimRow_(row) {
  const r = row.map(function (v) { return String(v).trim(); });
  while (r.length && r[r.length - 1] === '') r.pop();
  return r;
}

/** 比對每張工作表的英文欄名列；回傳問題清單（空陣列 = 全部一致） */
function checkStructure_(draft, live) {
  const problems = [];
  publishableSheets_(draft).forEach(function (ds) {
    const name = ds.getName();
    const ls = live.getSheetByName(name);
    const dv = ds.getDataRange().getValues();
    const lv = ls.getDataRange().getValues();
    const dh = headerRow_(dv), lh = headerRow_(lv);
    if (dh !== lh) {
      problems.push('・' + name + '：英文欄名列 草稿在第 ' + (dh + 1) + ' 列，正式版在第 ' + (lh + 1) + ' 列');
      return;
    }
    if (dh === -1) return;                                  // 沒有欄名列的工作表（不影響網站）不檢查
    const a = trimRow_(dv[dh]), b = trimRow_(lv[lh]);
    if (a.join('|') !== b.join('|')) {
      const diff = [];
      for (let c = 0; c < Math.max(a.length, b.length); c++) {
        if (a[c] !== b[c]) diff.push(columnLetter_(c) + ' 欄（草稿「' + (a[c] || '空白') + '」／正式「' + (b[c] || '空白') + '」）');
      }
      problems.push('・' + name + '：第 ' + (dh + 1) + ' 列欄名不同 → ' + diff.join('、'));
    }
  });
  return problems;
}

function columnLetter_(c) {
  let s = '';
  for (c = c + 1; c > 0; c = Math.floor((c - 1) / 26)) s = String.fromCharCode(65 + (c - 1) % 26) + s;
  return s;
}

/** 用草稿內容覆蓋一張正式版工作表（只清內容，保留格式與下拉選單） */
function writeSheet_(ls, values) {
  const rows = values.length, cols = values[0].length;
  ls.clearContents();
  if (ls.getMaxRows() < rows) ls.insertRowsAfter(ls.getMaxRows(), rows - ls.getMaxRows());
  if (ls.getMaxColumns() < cols) ls.insertColumnsAfter(ls.getMaxColumns(), cols - ls.getMaxColumns());
  ls.getRange(1, 1, rows, cols).setValues(values);
}

/** 發布中途出錯時，把指定工作表從備份檔還原 */
function restoreFromBackup_(live, backupFile, names) {
  const bk = SpreadsheetApp.openById(backupFile.getId());
  const restored = [];
  names.forEach(function (name) {
    const bs = bk.getSheetByName(name), ls = live.getSheetByName(name);
    if (!bs || !ls) return;
    try { writeSheet_(ls, bs.getDataRange().getValues()); SpreadsheetApp.flush(); restored.push(name); }
    catch (e) { restored.push(name + '（還原失敗，請手動從備份複製）'); }
  });
  return restored;
}

/** 把目前的正式 Sheet 複製到備份資料夾，並只保留最近 KEEP_BACKUPS 份 */
function backupLive_(live) {
  const folder = getOrCreateFolder_(BACKUP_FOLDER_NAME);
  const name = '正式版備份 ' + Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm');
  const copy = DriveApp.getFileById(live.getId()).makeCopy(name, folder);

  const files = [];
  const it = folder.getFiles();
  while (it.hasNext()) files.push(it.next());
  files
    .sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); })
    .slice(KEEP_BACKUPS)
    .forEach(function (f) { f.setTrashed(true); });   // 移到垃圾桶（30 天內仍可救回）

  return copy;
}

function getOrCreateFolder_(name) {
  const it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}
