# Branch Strategy

## `main`

Generic platform branch. It should contain shared runtime code, templates, tools, and deployment workflow.

## Documentation branch

This branch keeps explanatory docs and example data separate from `main` when `main` needs to stay minimal.

Suggested branch name:

```text
docs/generic-quiz-guide
```

## Quiz branches

Examples:

- `english_toeic`
- `korean_topik`
- `japanese_jlpt`

Each quiz branch should inherit from `main`, then add quiz-specific configuration and content.

## `gh-pages`

Generated deployment output. Do not edit manually.
