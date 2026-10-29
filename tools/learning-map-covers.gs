/**
 * 臺中市韌民協會官網｜學習地圖「自動抓封面」（Google Apps Script）
 *
 * 安裝位置：「草稿 Sheet」→ 擴充功能 → Apps Script
 *   與 media-sync.gs 放在同一個專案：左側「檔案」旁按 ＋ → 指令碼 → 命名 learning-map-covers → 貼上 → 存檔
 *   （選單由 media-sync.gs 的 onOpen 一起加上，所以 media-sync.gs 也要是最新版）
 *
 * 選單「學習地圖 → 自動抓封面」：
 *   - 掃描「學習地圖_影片推薦／書籍推薦／podcast推薦」三張工作表
 *   - 只處理「有 link、coverUrl 是空白」的列；已經填了 coverUrl 的（例如自己做的圖）一律不動
 *   - YouTube 類型的影片不需要封面（網頁直接嵌入播放器），略過
 *   - 抓法：讀 link 頁面的官方分享圖（og:image）；Spotify 用官方 oEmbed；YouTube 連結用影片縮圖
 *           書籍抓不到時，再用書名＋作者查 Google Books
 *   - 跑完列出成功與失敗的項目；失敗的維持空白，網頁會顯示 emoji，可以自己做圖填進 coverUrl
 */

const COVER_SHEETS = ['學習地圖_影片推薦', '學習地圖_書籍推薦', '學習地圖_podcast推薦'];
// 讀取網頁時使用的「身分」，依序嘗試，抓到分享圖就停
const CRAWLER_UAS = [
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',   // Facebook 連結預覽
  'Twitterbot/1.0',                                                               // X（Twitter）連結預覽
  'Mozilla/5.0 (compatible; Linespider/1.1; +https://lin.ee/4dwXkTH)',            // LINE 連結預覽
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'  // 一般瀏覽器
];

function addCoverMenu_() {
  SpreadsheetApp.getUi()
    .createMenu('學習地圖')
    .addItem('自動抓封面（只填空白的 coverUrl）', 'fetchCovers')
    .addToUi();
}

function fetchCovers() {
  const ui = SpreadsheetApp.getUi();
  const book = SpreadsheetApp.getActive();
  const ok = [], fail = [];

  COVER_SHEETS.forEach(function (name) {
    const sheet = book.getSheetByName(name);
    if (!sheet) return;
    const values = sheet.getDataRange().getDisplayValues();
    let h = -1;
    for (let i = 0; i < Math.min(values.length, 10); i++) if (String(values[i][0]).trim() === 'id') { h = i; break; }
    if (h === -1) { fail.push(name + '：找不到英文欄名列'); return; }
    const head = values[h].map(function (v) { return String(v).trim(); });
    const c = { id: head.indexOf('id'), title: head.indexOf('title'), link: head.indexOf('link'),
                cover: head.indexOf('coverUrl'), type: head.indexOf('type'), author: head.indexOf('author') };
    if (c.cover === -1 || c.link === -1) { fail.push(name + '：缺少 coverUrl 或 link 欄'); return; }

    for (let i = h + 1; i < values.length; i++) {
      const r = values[i];
      const id = String(r[c.id] || '').trim();
      const link = String(r[c.link] || '').trim();
      if (!id || String(r[c.cover] || '').trim()) continue;              // 沒資料或已有封面：略過
      if (c.type !== -1 && String(r[c.type]).trim().toLowerCase() === 'youtube') continue;
      const label = id + ' ' + (c.title !== -1 ? r[c.title] : '');
      let url = '';
      try {
        if (/^https?:\/\//i.test(link)) url = coverFromLink_(link);
        if (!url && name.indexOf('書籍') !== -1 && c.title !== -1) url = coverFromGoogleBooks_(r[c.title], c.author !== -1 ? r[c.author] : '');
      } catch (e) { /* 單筆失敗不影響其他筆 */ }
      if (url) {
        sheet.getRange(i + 1, c.cover + 1).setValue(url);
        ok.push(label);
      } else {
        fail.push(label + (link ? '' : '（沒有 link）'));
      }
    }
  });

  ui.alert('自動抓封面完成',
    '成功 ' + ok.length + ' 筆' + (ok.length ? '：\n・' + ok.join('\n・') : '') +
    '\n\n抓不到 ' + fail.length + ' 筆' + (fail.length ? '：\n・' + fail.join('\n・') + '\n（網頁會顯示 emoji；可自己做圖，把雲端共用連結貼到 coverUrl）' : '') +
    '\n\n請用預覽網址（?preview=1）確認封面是否正確。', ui.ButtonSet.OK);
}

/** 依連結找封面網址；找不到回傳空字串 */
function coverFromLink_(link) {
  // YouTube：直接用影片縮圖
  const yt = link.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{11})/);
  if (yt) return 'https://i.ytimg.com/vi/' + yt[1] + '/hqdefault.jpg';

  // Spotify：官方 oEmbed
  if (/open\.spotify\.com\//.test(link)) {
    const res = UrlFetchApp.fetch('https://open.spotify.com/oembed?url=' + encodeURIComponent(link), { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) {
      const t = JSON.parse(res.getContentText()).thumbnail_url;
      if (t) return t;
    }
  }

  // 一般網頁：讀官方分享圖（og:image / twitter:image）；換不同網址寫法 × 不同身分重試
  const urls = [link];
  const nf = link.match(/netflix\.com\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?title\/(\d+)/i);
  if (nf) urls.push('https://www.netflix.com/tw/title/' + nf[1], 'https://www.netflix.com/title/' + nf[1]);
  for (let u = 0; u < urls.length; u++) {
    for (let a = 0; a < CRAWLER_UAS.length; a++) {
      const img = ogImage_(urls[u], CRAWLER_UAS[a]);
      if (img) return img;
    }
  }
  return '';
}

/** 用指定身分讀一次網頁，回傳分享圖網址（沒有就回傳空字串） */
function ogImage_(url, ua) {
  let res;
  try {
    res = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true, followRedirects: true,
      headers: { 'User-Agent': ua, 'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8' }
    });
  } catch (e) { return ''; }
  if (res.getResponseCode() >= 400) return '';
  const html = res.getContentText().slice(0, 300000);
  const img = metaContent_(html, 'og:image:secure_url') || metaContent_(html, 'og:image') || metaContent_(html, 'twitter:image');
  return img ? absoluteUrl_(img.replace(/&amp;/g, '&'), url) : '';
}

/** 從 HTML 找 <meta property|name="key" content="..."> （屬性順序不限） */
function metaContent_(html, key) {
  const k = key.replace(/[.:]/g, '\\$&');
  const re1 = new RegExp('<meta[^>]+(?:property|name)=["\']' + k + '["\'][^>]*content=["\']([^"\']+)["\']', 'i');
  const re2 = new RegExp('<meta[^>]+content=["\']([^"\']+)["\'][^>]*(?:property|name)=["\']' + k + '["\']', 'i');
  const m = html.match(re1) || html.match(re2);
  return m ? m[1].trim() : '';
}

function absoluteUrl_(u, base) {
  if (/^https?:\/\//i.test(u)) return u.replace(/^http:/i, 'https:');
  if (/^\/\//.test(u)) return 'https:' + u;
  const origin = base.match(/^https?:\/\/[^\/]+/i);
  return origin ? origin[0] + (u.charAt(0) === '/' ? '' : '/') + u : '';
}

/** 書籍備案：用書名＋作者查 Google Books */
function coverFromGoogleBooks_(title, author) {
  title = String(title || '').trim();
  if (!title) return '';
  const q = 'intitle:' + title + (author ? '+inauthor:' + String(author).split(/[、,，×x]/)[0].trim() : '');
  const res = UrlFetchApp.fetch('https://www.googleapis.com/books/v1/volumes?maxResults=1&q=' + encodeURIComponent(q), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) return '';
  const items = JSON.parse(res.getContentText()).items || [];
  const links = items[0] && items[0].volumeInfo && items[0].volumeInfo.imageLinks;
  const t = links && (links.thumbnail || links.smallThumbnail);
  return t ? t.replace(/^http:/, 'https:').replace(/&edge=curl/, '') : '';
}
