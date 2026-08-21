# 建立新的語言測驗分支

`doc` 分支是可直接執行的題庫範本，結構與 `english_toeic`、`korean_topik` 相同。它包含中性的 `quiz.html`、一般單題範例、閱讀題範例，以及建立新分支的完整步驟。

## 分支用途

- `main`：共用程式、共用樣式、首頁與部署流程。
- `doc`：建立新題庫分支的教學與範例。
- `english_toeic`：英文 TOEIC 題庫。
- `korean_topik`：韓文 TOPIK 題庫。

新題庫應從最新的 `main` 建立，再從 `doc` 取出範例。不要直接讓新題庫長期繼承 `doc` 的教學歷史。

## 建立新分支

以下以日文 JLPT 分支 `japanese_jlpt` 為例。

### 1. 從 main 建立分支

```bash
git switch main
git pull --ff-only
git switch -c japanese_jlpt
```

### 2. 從 doc 取得題庫範例

```bash
git checkout doc -- src/data/chapters/00-01-basic-example.js
git checkout doc -- src/data/chapters/00-02-reading-example.js
```

`quiz.html` 已經存在於目前的 `main`。如果之後 `doc/quiz.html` 有專門的範本修改，也可以取出：

```bash
git checkout doc -- quiz.html
```

### 3. 修改測驗名稱

編輯 `quiz.html`：

```html
<title>日文 JLPT 測驗</title>
```

```html
<h1>日文 JLPT 測驗</h1>
```

```html
<div id="loader-status">正在載入日文題庫...</div>
```

題庫分支使用 `quiz.html`。請勿把測驗頁改成自己的 `index.html`，以免 rebase 時和 `main/index.html` 發生衝突。

### 4. 重新命名範例章節

```bash
git mv src/data/chapters/00-01-basic-example.js \
  src/data/chapters/01-01-vocabulary.js

git mv src/data/chapters/00-02-reading-example.js \
  src/data/chapters/02-01-reading.js
```

接著編輯檔案並換成真正題目。不需要的範例可以直接刪除。

### 5. 產生章節清單

每次新增、刪除或重新命名章節檔案後，都要執行：

```bash
python3 tools/generate_manifest.py
```

這會更新：

```text
src/data/chapters/manifest.json
```

### 6. 本機測試

```bash
python3 serve.py
```

在瀏覽器開啟：

```text
http://localhost:8000/quiz.html
```

請測試章節、分類、題數、答題、解析、上一題、下一題、結果頁與閱讀題。

### 7. 提交並推送

```bash
git add quiz.html src/data/chapters
git commit -m "feat: add Japanese JLPT quiz branch"
git push -u origin japanese_jlpt
```

## 一般題格式

```js
questions.push(...[
  {
    chapter: "01-01",
    chapterName: "Vocabulary",
    sentence: "題目內容",
    options: ["A", "B", "C", "D"],
    answer: 0,
    tag: "Vocabulary",
    exp: "答案解析"
  }
]);
```

欄位說明：

- `chapter`：章節代號。
- `chapterName`：章節名稱。
- `sentence`：題目內容，也可使用 `question`。
- `options`：選項陣列。
- `answer`：正確選項索引，從 0 開始。
- `tag`：分類名稱。
- `exp`：答案解析，也可使用 `explanation`。

## 一篇文章包含多題

```js
questions.push(...[
  {
    chapter: "02-01",
    chapterName: "Reading",
    passageTitle: "文章標題",
    passage: "第一段。\n\n第二段。",
    tag: "Reading",
    questions: [
      {
        question: "第一題",
        options: ["A", "B", "C", "D"],
        answer: 1,
        explanation: "第一題解析"
      },
      {
        question: "第二題",
        options: ["A", "B", "C", "D"],
        answer: 2,
        explanation: "第二題解析"
      }
    ]
  }
]);
```

外層文章資料會套用到 `questions` 裡的每一題。同一篇文章的題目在測驗中會保持連續，但每題選項仍會個別洗牌。

相容欄位：

- 文章可使用 `passage`、`article` 或 `reading`。
- 文章標題可使用 `passageTitle` 或 `articleTitle`。
- 題目可使用 `question` 或 `sentence`。
- 解析可使用 `explanation` 或 `exp`。

文章以純文字顯示，空行會分成不同段落。

## 日後同步 main

共用功能更新後，在題庫分支執行：

```bash
git fetch origin
git switch japanese_jlpt
git rebase origin/main
python3 tools/generate_manifest.py
```

題庫分支應盡量只修改：

```text
quiz.html
src/data/chapters/*.js
src/data/chapters/manifest.json
```

`src/app.js`、`src/chapter-loader.js`、`src/styles.css`、`src/theme.js` 等共用檔案應優先在 `main` 修改，再由題庫分支 rebase 取得。

## 加入 GitHub Pages 部署

建立分支後，網站不會自動部署。還需要在 `main/.github/workflows/deploy-pages.yml`：

1. 把新分支加入 workflow 觸發條件。
2. Checkout 新分支。
3. 對新分支產生並驗證 manifest。
4. 複製到 `publish/<branch-name>/`。
5. 在發布目錄把 `quiz.html` 轉成 `index.html`。
6. 套用 `main` 的共用樣式、theme 與 runtime。
7. 在 `main/index.html` 加入新測驗入口。

可參考 workflow 中 `english_toeic` 和 `korean_topik` 的區段，使用相同方式加入新分支。

## 完成前檢查

```bash
node --check src/app.js
node --check src/chapter-loader.js
python3 tools/generate_manifest.py
git diff --check
```

確認：

- `manifest.json` 已更新。
- `quiz.html` 可以開啟。
- 題目選項與 `answer` 索引一致。
- 閱讀文章下的所有題目都可作答。
- 題庫分支沒有自行改寫 `main/index.html`。
