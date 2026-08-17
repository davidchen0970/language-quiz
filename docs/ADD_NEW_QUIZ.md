# Add a New Quiz Branch

Example: create a Japanese JLPT quiz branch.

```bash
git checkout main
git pull
git checkout -b japanese_jlpt
```

## Steps

1. Copy `templates/quiz.html` to `index.html` if the branch should serve the quiz directly.
2. Copy `src/config.example.js` to `src/config.js`.
3. Update quiz metadata in `src/config.js`.
4. Replace sample data with real chapter files in `src/data/chapters/`.
5. Run the manifest generator.

```bash
python3 tools/generate_manifest.py
```

6. Test locally.

```bash
python3 serve.py
```

7. Commit and push the branch.

```bash
git add .
git commit -m "Add Japanese JLPT quiz branch"
git push -u origin japanese_jlpt
```

8. Update the deploy workflow and landing page on `main`.
