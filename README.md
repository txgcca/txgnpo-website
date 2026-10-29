# txgnpo-website
協會官網HTML架設區｜勿動｜勿刪

## 常駐圖片（放在 repo 裡，不從 Sheet 讀取）

這些圖片很少更換，直接放在 repo 中，網頁打開就會顯示，不用等 Sheet 載入。

| 檔案 | 用在哪裡 | 尺寸 |
|---|---|---|
| `logo.png` | 全站導覽列 Logo（白色透明底） | 400 × 400 |
| `images/hero.jpg` | 首頁主視覺（手機、平板，含標語） | 1600 × 800 |
| `images/hero-desktop.jpg` | 首頁主視覺（桌機，**不含文字**；標語由網頁文字疊上） | 1600 × 800 |
| `images/org-chart.jpg` | 關於臺中韌民｜組織架構圖 | 1200 × 900 |
| `images/member-types.jpg` | 關於臺中韌民｜會員分類圖 | 1200 × 900 |
| `images/value-1.jpg` | 關於臺中韌民｜核心價值：自救能力 | 1200 × 400 |
| `images/value-2.jpg` | 關於臺中韌民｜核心價值：社會韌性 | 1200 × 400 |
| `images/value-3.jpg` | 關於臺中韌民｜核心價值：共同行動 | 1200 × 400 |
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

## 大事記顯示規則

Sheet「大事記」的 `show_on_home` / `show_on_about` / `show_on_past` 填「是」就會顯示：

| 頁面 | 欄位 | 最多 |
|---|---|---|
| 首頁 | show_on_home | 6 筆 |
| 關於臺中韌民 | show_on_about | 6 筆 |
| 過往活動｜關鍵記事 | show_on_past | 6 筆 |

- 依日期**由舊到新**自動排序（發展沿革），不受 Sheet 列的順序影響
- 勾超過上限時只顯示最早的幾筆；在預覽網址（`?preview=1`）頂端會提醒哪些不會出現

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
- 清單型工作表的英文欄名可以不在第 1 列（上方可放說明列、中文欄名列）：網站會自動找 A 欄是 `id`／`date`／`year`／`category` 的那一列當欄名
- 兩份 Sheet 每張工作表的「英文欄名列」位置、欄名、欄的順序必須一樣；發布前會自動檢查，不一致就整個停止、不改任何內容
- 發布中途若出錯，已覆蓋的工作表會自動從備份還原
- 預覽模式不會讀寫瀏覽器快取，看完預覽回到正式網站不會出現草稿內容

## 資料更新速度（先顯示、背景更新）

`sheet-data.js`：網頁先用瀏覽器存著的 Sheet 資料立刻顯示，同時在背景抓最新資料；內容有變就自動重新顯示（約 1～2 秒）。
Sheet 發布後，民眾下次打開網頁就會看到新內容。網址加 `?nocache=1` 可略過瀏覽器存檔直接抓。

## 中文斷行

`text-wrap.js` 會把標題與說明文字切成「詞」，只在詞與詞之間換行，避免「應變聯／合演習」這類把詞切斷的情況；「活動名稱｜單位」會優先在｜前面換行。
合作單位（partner 欄）整個名稱當成一塊不拆開，放不下時連同「｜」整塊換到下一行；多個單位用「、」分隔。
Sheet 載入的文字會自動處理，不需要手動加空白或換行。活動標題中的人名、少見專有名詞偶爾仍可能被拆開，可在標題想斷行處打一個空白。

## 媒體報導｜YouTube 播放器

精選報導（featured = TRUE、type = video）若填了 `youtubeId`，卡片會嵌入 YouTube 播放器。
- `youtubeId`：只填 11 碼影片 ID（例：`https://youtu.be/dK-uAtNK_Pg` → `dK-uAtNK_Pg`），不要貼整個網址
- `youtube_start`（選填）：從哪裡開始播，寫 `2:07`、`1:02:05` 或秒數 `127`
- `youtube_end`（選填）：播到哪裡自動停止，格式同上
- 外部連結（link 欄）要從某段開始：在 YouTube 網址後加 `?t=127`（或用 YouTube「分享 → 開始時間」複製）

## 媒體採訪清冊 → 媒體報導 同步（tools/media-sync.gs）

成員在「媒體採訪清冊」（另一個帳號的雲端）登記報導；草稿 Sheet 每月 1 日自動同步到「媒體報導」分頁，也可按選單「媒體同步 → 立即同步媒體清冊」。
- 只帶 date、outlet、country、title、link；其他欄位（featured、region、type、說明、YouTube 等）在媒體報導分頁自己補
- 用報導連結比對（忽略 fbclid、utm 等追蹤碼）；新報導自動編號 media-xx 加在最下面
- 空白格直接補上；兩邊不同的值列到「同步待審核」分頁，勾選後按「套用勾選的變更」才寫入
- 清冊的空白不會覆蓋；清冊刪掉的報導不會被刪除，只會提醒
- 安裝在草稿 Sheet 的 Apps Script；清冊需共用給安裝者帳號（檢視者）

## 學習地圖｜推薦封面

coverUrl 有填什麼就用什麼，空白則顯示 emoji。可填三種：
1. 圖片網址（例如「自動抓封面」抓到的官方圖）
2. Google 雲端「共用連結」直接貼上即可，網頁會自動轉成圖片（檔案需設「知道連結的任何人都能檢視」）
3. 只填檔名 → 讀 `images/learning-map/`（尺寸見該資料夾 README）

草稿 Sheet 選單「學習地圖 → 自動抓封面」（tools/learning-map-covers.gs）：只填 coverUrl 空白的列，不覆蓋自製圖；YouTube 影片不需封面。
sortOrder 決定顯示順序（數字小的在前，沒填排最後）。
