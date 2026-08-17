# Architecture

The `main` branch is the content-neutral quiz platform. It owns shared runtime code, reusable templates, local tools, and deployment automation. Production quiz data should stay in quiz-specific branches.

## Runtime flow

1. `templates/quiz.html` provides the reusable quiz page shell.
2. `src/config.example.js` defines configurable quiz metadata.
3. `src/chapter-loader.js` loads the question container and chapter files.
4. `src/data/chapters/manifest.json` controls which chapter files are loaded.
5. Each chapter file appends question objects to the global `questions` array.
6. `src/app.js` renders filters, quiz navigation, scoring, explanations, and result state.

## Branch customization

A quiz branch usually customizes:

- `src/config.js`
- `index.html` or a copy of `templates/quiz.html`
- `src/data/chapters/*.js`
- `src/data/chapters/manifest.json`
- `README.md`

Shared runtime changes should be merged back to `main` first, then pulled into quiz branches.
