# Deployment

GitHub Pages is deployed by `.github/workflows/deploy-pages.yml`.

## Current output shape

```text
/
├── index.html
├── english_toeic/
└── korean_topik/
```

## Adding a quiz branch

1. Add the branch name to the workflow trigger.
2. Add a checkout step or matrix entry for the new branch.
3. Copy the branch output into a matching subdirectory under `publish/`.
4. Add a link from the landing page.

Never commit generated GitHub Pages output to `main` or quiz branches.
