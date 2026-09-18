# 測驗網站分支說明

這個儲存庫已整理成三個分支：

- `main`：只保留基礎說明與入口頁，不放題庫內容。
- `english_toeic`：放入英文多益題庫版本。
- `korean_topik`：放入韓文能力測驗的簡易測試版本。

若要部署到網頁空間，可依需求選擇對應分支，或再使用自動化流程把不同分支輸出到不同子路徑。


## 閱讀題格式

一篇文章可包含任意數量的題目。將共同的文章與章節資料放在外層，
再把每一題放進 `questions` 陣列。載入後，同一文章的題目會保持連續，
但每一題的選項仍會個別隨機排列。

```js
questions.push(...[
  {
    chapter: "reading-01",
    chapterName: "Reading practice",
    passageTitle: "Office notice",
    passage: "The library will close at 6 p.m. on Friday.\n\nBooks can be returned through the night box.",
    tag: "Reading",
    questions: [
      {
        question: "When will the library close on Friday?",
        options: ["5 p.m.", "6 p.m.", "7 p.m.", "8 p.m."],
        answer: 1,
        explanation: "The notice says the library will close at 6 p.m."
      },
      {
        question: "What should visitors do after the library closes?",
        options: [
          "Call the office",
          "Use the night box",
          "Return on Monday",
          "Leave books at the door"
        ],
        answer: 1,
        explanation: "Books can be returned through the night box."
      }
    ]
  }
]);
```

外層欄位會自動套用到 `questions` 中的每一題，個別題目也可以覆寫外層欄位。
例如，同一篇文章中的某一題可以設定不同的 `tag`。

相容格式：

- 群組題目：外層使用 `questions` 陣列。
- 文章：`passage`，也接受 `article` 或 `reading`。
- 文章標題：`passageTitle`，也接受 `articleTitle`。
- 題幹：`question` 或既有的 `sentence`。
- 解析：`explanation` 或既有的 `exp`。
- 原本的一題一物件格式仍可繼續使用。

文章以純文字輸出，不會把題庫內容當成 HTML 執行。空行會分成不同段落。
選擇固定題數時，最後一個文章群組可能會依題數上限截斷；選擇「全部題目」則會保留文章下的所有題目。
