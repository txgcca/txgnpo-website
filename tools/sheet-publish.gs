/**
 * 臺中市韌民協會官網｜草稿 → 正式 發布工具（Google Apps Script）
 *
 * 安裝位置：「正式 Sheet」→ 擴充功能 → Apps Script，整段貼上後儲存。
 * 安裝後重新整理正式 Sheet，上方選單會多出「網站」→「發布草稿到正式網站」。
 *
 * 運作方式：
 *   1. 檢查草稿和正式的工作表是否一致
 *   2. 跳出確認視窗
 *   3. 把「目前的正式 Sheet」整份複製到雲端硬碟「網站正式版備份」資料夾（只保留最近 30 份）
 *   4. 把草稿每張工作表的內容覆蓋到正式 Sheet 同名的工作表
 *
 * 注意：
 *   - 只覆蓋「內容」，不會刪除或重建正式 Sheet 的工作表，所以網站讀取用的 gid 不會變
 *   - 只有能編輯正式 Sheet 的人（幹部）才能執行
 *   - 誰在什麼時候發布、改了什麼，可在正式 Sheet 的「檔案 → 版本記錄」查看
 */

// ★ 草稿 Sheet 的檔案 ID：草稿網址中 /d/ 和 /edit 之間那一串
const DRAFT_SHEET_ID = '1ctDmgblaCWrGacgPP1nFl4uBbCgD0hKrQ8WYFQ3MR0U';

const BACKUP_FOLDER_NAME = '網站正式版備份';
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
  const missing = draft.getSheets()
    .map(function (s) { return s.getName(); })
    .filter(function (name) { return !live.getSheetByName(name); });
  if (missing.length) {
    ui.alert('無法發布：工作表不一致',
      '草稿有正式版沒有的工作表：\n' + missing.join('、') +
      '\n\n新增工作表需要同步調整網站程式，請聯絡網站維護者。', ui.ButtonSet.OK);
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

    // 4. 逐張覆蓋內容
    let count = 0;
    draft.getSheets().forEach(function (ds) {
      const ls = live.getSheetByName(ds.getName());
      const values = ds.getDataRange().getValues();
      const rows = values.length, cols = values[0].length;
      ls.clearContents();                                   // 只清內容，保留格式與下拉選單
      if (ls.getMaxRows() < rows) ls.insertRowsAfter(ls.getMaxRows(), rows - ls.getMaxRows());
      if (ls.getMaxColumns() < cols) ls.insertColumnsAfter(ls.getMaxColumns(), cols - ls.getMaxColumns());
      ls.getRange(1, 1, rows, cols).setValues(values);
      count++;
    });
    SpreadsheetApp.flush();

    ui.alert('發布完成',
      '已更新 ' + count + ' 張工作表。\n\n' +
      '・網站約 5 分鐘內更新\n' +
      '・訪客的瀏覽器若有快取，最慢 6 小時內會看到新內容\n' +
      '・備份檔：' + backup.getName(), ui.ButtonSet.OK);
  } finally {
    lock.releaseLock();
  }
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
