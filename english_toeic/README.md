# English TOEIC Quiz

This branch contains the TOEIC-style English learning quiz app and the supplied JavaScript question data.

## Run locally

```bash
python3 serve.py
```

Then open:

```text
http://localhost:8000
```

## Data location

Question files are stored in:

```text
src/data/chapters/
```

After adding, deleting, or renaming a chapter file, regenerate the manifest:

```bash
python3 tools/generate_manifest.py
```
