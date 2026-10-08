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

