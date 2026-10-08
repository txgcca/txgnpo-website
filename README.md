# txgnpo-website
協會官網HTML架設區｜勿動｜勿刪

## 常駐圖片（放在 repo 裡，不從 Sheet 讀取）

這些圖片很少更換，直接放在 repo 中，網頁打開就會顯示，不用等 Sheet 載入。

| 檔案 | 用在哪裡 | 尺寸 |
|---|---|---|
| `logo.png` | 全站導覽列 Logo（白色透明底） | 400 × 400 |
| `images/hero.jpg` | 首頁主視覺（手機、平板，含標語） | 1600 × 800 |
| `images/hero-desktop.jpg` | 首頁主視覺（桌機，**不含文字**；標語由網頁文字疊上） | 1600 × 800 |
| `images/org-chart.jpg` | 關於我們｜組織架構圖 | 1200 × 900 |
| `images/member-types.jpg` | 關於我們｜會員分類圖 | 1200 × 900 |
| `images/value-1.jpg` | 關於我們｜核心價值：自救能力 | 1200 × 400 |
| `images/value-2.jpg` | 關於我們｜核心價值：社會韌性 | 1200 × 400 |
| `images/value-3.jpg` | 關於我們｜核心價值：共同行動 | 1200 × 400 |
| `images/learning-map-1.jpg` | 學習地圖｜示意圖 1 | 1600 × 900 |
| `images/learning-map-2.jpg` | 學習地圖｜示意圖 2 | 1600 × 900 |
| `images/training-main.jpg` | 自訓與課程活動｜自訓主圖 | 1200 × 675 |

### 怎麼換圖

1. 把新圖存成**跟上表一模一樣的檔名**（包括 `.jpg` 副檔名）和尺寸
2. 在 GitHub 進到 `images` 資料夾 →「Add file」→「Upload files」→ 拖入新圖
3. 按「Commit changes」，1–2 分鐘後網站更新

提醒：
- 檔案盡量控制在 300KB 以下，太大會拖慢手機開頁
- 檔名不同的話網頁找不到圖，會變成空白
- 手機瀏覽器可能還留著舊圖，用無痕視窗確認最準

## 過往活動｜關鍵記事配圖

過往活動頁上方 6 張關鍵記事卡片的圖片放在 `images/key-events/`（1200 × 675）。
「哪一筆配哪張圖」由 Sheet「大事記」的 `image_url` 欄決定，**只填檔名**，例如 `2024-registration.jpg`。
空白或還沒上傳時會顯示 TXGCCA 佔位圖。詳見 `images/key-events/README.md`。

## 仍由 Sheet 管理的圖片

會持續新增的清單類圖片仍在 Sheet 更新：媒體報導縮圖、學習地圖的影片／書籍／Podcast 封面、應援平台截圖。

## 首頁主視覺標語字型

桌機版主視覺的「韌民 永不認命 / TOGETHER, WE SHIELD」是網頁文字，不是圖片，所以任何螢幕寬度都不會被裁切。

| 檔案 | 字型 | 說明 |
|---|---|---|
| `fonts/glow-sans-tc-slogan.woff2` | 未來熒黑 Glow Sans TC ExtraBold | **只含「韌民永不認命」6 個字** |
| `fonts/wix-madefor-display-slogan.woff2` | Wix Madefor Display ExtraBold | 只含標語用到的英文字母 |

兩套字型都是 SIL Open Font License 1.1，授權檔在 `fonts/OFL-*.txt`。

提醒：
- 字型已經裁到只剩標語用到的字（各約 2KB），**修改標語文字時，字型也要重新裁切**，不然新字會顯示成預設黑體
- 英文字距由程式自動計算，頭尾會對齊「永不認命」，不需要手動調整


## 內容更新流程（草稿 → 預覽 → 發布）

網站內容分成兩份 Google Sheet：

| | 誰能編輯 | 網站怎麼讀 |
|---|---|---|
| **草稿 Sheet** | 協助更新內容的志工 | 預覽網址（任何頁面網址後加 `?preview=1`） |
| **正式 Sheet** | 幹部 | 正式網站 |

1. 志工在**草稿 Sheet** 修改內容
2. 等約 5 分鐘，打開預覽網址確認，例如 `https://txgcca.org.tw/media.html?preview=1`
   （頁面頂端會出現橘色「預覽模式・尚未發布」提示；在預覽模式中點站內連結會維持預覽）
3. 幹部確認後，在**正式 Sheet** 上方選單按「網站 → 發布草稿到正式網站」
   - 發布前會自動把目前正式版備份到雲端硬碟「網站正式版備份」資料夾（保留最近 30 份）
   - 誰在什麼時候改了什麼，可在 Sheet 的「檔案 → 版本記錄」查看

相關檔案：
- `preview.js`：預覽模式。`DRAFT_ID` 填草稿 Sheet「發布到網路」網址中 `/d/e/` 與 `/pub` 之間的 ID
- `tools/sheet-publish.gs`：發布按鈕的 Apps Script，貼在正式 Sheet 的 Apps Script 中

注意：
- 草稿 Sheet 必須用正式 Sheet「建立副本」產生，兩邊工作表的 gid 才會相同，預覽才讀得到
- 不要在任一份 Sheet 刪除或重建工作表；需要新增工作表時請聯絡網站維護者
- 預覽模式不會讀寫瀏覽器快取，看完預覽回到正式網站不會出現草稿內容
