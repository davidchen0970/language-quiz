# Question Schema

Each chapter file appends an array of question objects to the global `questions` array.

```js
questions.push(...[
  {
    id: 'sample-001',
    chapter: '00-01',
    chapterName: 'Sample Chapter',
    sentence: 'Which option is correct?',
    options: ['A', 'B', 'C', 'D'],
    answer: 0,
    tag: 'sample',
    exp: 'A is correct.'
  }
]);
```

## Required fields

- `chapter`: Short chapter code or label.
- `chapterName`: Human-readable chapter name.
- `sentence`: Question prompt. `question` is also supported.
- `options`: Array of choices. Four choices are recommended.
- `answer`: Zero-based index of the correct option.
- `tag`: Category used by the category filter. `category` is also supported.
- `exp`: Explanation shown after answering. `explanation` is also supported.

## Recommended fields

- `id`: Stable unique identifier for each question.

## Rules

- Keep the same schema across quiz branches.
- Do not store production quiz data in `main`.
- Run `python3 tools/generate_manifest.py` after adding, deleting, or renaming chapter files.
- Use sortable chapter filenames, for example `01-01-basic.js`.
