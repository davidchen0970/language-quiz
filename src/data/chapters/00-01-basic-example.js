// 一般單題範例。複製此檔案並依章節重新命名。
questions.push(...[
  {
    chapter: "00-01",
    chapterName: "一般題範例",
    sentence: "請選出正確答案。",
    options: [
      "正確答案",
      "選項 B",
      "選項 C",
      "選項 D"
    ],
    answer: 0,
    tag: "單題",
    exp: "answer 從 0 開始，因此 0 代表第一個選項。"
  },
  {
    chapter: "00-01",
    chapterName: "一般題範例",
    sentence: "題目可以依照 tag 分類。這一題的正確答案是哪一個？",
    options: [
      "選項 A",
      "正確答案",
      "選項 C",
      "選項 D"
    ],
    answer: 1,
    tag: "分類範例",
    exp: "這一題的 answer 是 1，代表第二個選項。"
  }
]);
