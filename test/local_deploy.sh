#!/usr/bin/env bash
#
# test/local-deploy.sh
#
# 本機模擬 .github/workflows/deploy-pages.yml 的建置流程。
# 會把「當前 checkout 分支的未提交變更」也納入建置，方便 push 前預覽。
#
# 用法 (在 repo 任何位置皆可執行):
#   ./test/local-deploy.sh [輸出目錄]
#
# 預設輸出目錄: <repo>/test/publish
# 相對路徑以 test/ 為基準；也可傳絕對路徑。
#
set -euo pipefail

# --- 從腳本自身位置推回 repo root 與 test/ ---------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "${SCRIPT_DIR}" rev-parse --show-toplevel)"

# --- 輸出目錄：預設 test/publish --------------------------------
RAW_OUTPUT="${1:-publish}"
case "${RAW_OUTPUT}" in
  /*) PUBLISH_DIR="${RAW_OUTPUT}" ;;
  *)  PUBLISH_DIR="${SCRIPT_DIR}/${RAW_OUTPUT}" ;;
esac

# --- 三個分支匯出後的絕對路徑 ----------------------------------
WORK_DIR="$(mktemp -d)"
cleanup() { rm -rf "${WORK_DIR}"; }
trap cleanup EXIT

MAIN_DIR="${WORK_DIR}/site-main"
EN_DIR="${WORK_DIR}/site-english"
KR_DIR="${WORK_DIR}/site-korean"

# --- 偵測目前 checkout 的分支 ----------------------------------
CURRENT_BRANCH="$(git -C "${REPO_ROOT}" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")"

# 判斷某個目標 branch 是否為「當前工作區分支」
is_current_branch() {
  [ -n "${CURRENT_BRANCH}" ] && [ "${CURRENT_BRANCH}" = "$1" ]
}

# ---------------------------------------------------------------------------
# 前置檢查：確認三個分支都在
# ---------------------------------------------------------------------------
for branch in main english_toeic korean_topik; do
  if ! git -C "${REPO_ROOT}" rev-parse --verify --quiet "${branch}" >/dev/null; then
    echo "找不到分支/ref: ${branch}" >&2
    exit 1
  fi
done

echo "============================================================"
echo "Repo root     : ${REPO_ROOT}"
echo "Script dir    : ${SCRIPT_DIR}"
echo "Work dir      : ${WORK_DIR}"
echo "Publish to    : ${PUBLISH_DIR}"
echo "Current branch: ${CURRENT_BRANCH:-<detached>}"
echo "============================================================"

# ---------------------------------------------------------------------------
# 1. 匯出三個分支的內容
#    - 當前 checkout 的分支：從工作區鏡像（含未提交 / 未追蹤變更）
#    - 其他分支：git archive（只含已 commit 的樹）
# ---------------------------------------------------------------------------
mirror_worktree() {
  # $1 = target dir
  local target="$1"
  mkdir -p "${target}"
  rsync -a \
    --exclude='.git' \
    --exclude='.github' \
    --exclude='.DS_Store' \
    --exclude='test' \
    --exclude='publish' \
    --exclude='node_modules' \
    --exclude='.venv' \
    --exclude='venv' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    "${REPO_ROOT}/" "${target}/"
}

archive_branch() {
  # $1 = branch, $2 = target dir
  local branch="$1" target="$2"
  mkdir -p "${target}"
  git -C "${REPO_ROOT}" archive "${branch}" | tar -x -C "${target}"
}

for pair in "main:${MAIN_DIR}" "english_toeic:${EN_DIR}" "korean_topik:${KR_DIR}"; do
  branch="${pair%%:*}"
  target="${pair##*:}"

  if is_current_branch "${branch}"; then
    echo "==> [${branch}] working tree mirror (含未提交變更) -> ${target}"
    mirror_worktree "${target}"
  else
    echo "==> [${branch}] git archive (已 commit 的版本)     -> ${target}"
    archive_branch "${branch}" "${target}"
  fi
done

# ---------------------------------------------------------------------------
# 2. 顯示來源資訊
# ---------------------------------------------------------------------------
echo
echo "==> Source information"
for item in "${MAIN_DIR}:main" "${EN_DIR}:english_toeic" "${KR_DIR}:korean_topik"; do
  directory="${item%:*}"
  expected_branch="${item##*:}"

  echo "============================================================"
  echo "Directory: ${directory}"
  echo "Branch: ${expected_branch}"
  echo "HEAD commit: $(git -C "${REPO_ROOT}" rev-parse "${expected_branch}")"
  echo "HEAD subject: $(git -C "${REPO_ROOT}" log -1 --pretty=%s "${expected_branch}")"

  if is_current_branch "${expected_branch}"; then
    echo "Source: working tree (含未提交變更)"
    echo "--- git status --porcelain ---"
    git -C "${REPO_ROOT}" status --porcelain || true
  else
    echo "Source: committed tree"
  fi

  echo "Files:"
  find "${directory}" \
    -maxdepth 3 \
    -type f \
    -not -path '*/.git/*' \
    | sort \
    | sed -n '1,160p'
done

# ---------------------------------------------------------------------------
# 3. 產生 chapter manifests
#    (generator 內部可能用相對路徑，以子 shell 切換 CWD；
#     子 shell 結束後 CWD 不變，主流程不使用 cd)
# ---------------------------------------------------------------------------
echo
echo "==> Generate chapter manifests"
for site_abs in "${EN_DIR}" "${KR_DIR}"; do
  echo "============================================================"
  echo "Generating manifest for ${site_abs}"

  generator="${site_abs}/tools/generate_manifest.py"
  chapter_dir="${site_abs}/src/data/chapters"
  manifest="${chapter_dir}/manifest.json"

  test -f "${generator}"
  test -d "${chapter_dir}"

  ( cd "${site_abs}" && python3 tools/generate_manifest.py )

  test -f "${manifest}"

  echo "Generated manifest:"
  cat "${manifest}"
  echo
done

# ---------------------------------------------------------------------------
# 4. 驗證產生的 manifests
# ---------------------------------------------------------------------------
echo "==> Validate generated manifests"
python3 - "${EN_DIR}" "${KR_DIR}" <<'PY'
import json
import sys
from pathlib import Path

sites = {
    "English TOEIC": Path(sys.argv[1]),
    "Korean TOPIK": Path(sys.argv[2]),
}

for site_name, site_root in sites.items():
    chapter_dir = site_root / "src" / "data" / "chapters"
    manifest_path = chapter_dir / "manifest.json"

    expected_files = sorted(
        p.name for p in chapter_dir.glob("*.js") if p.is_file()
    )

    with manifest_path.open("r", encoding="utf-8") as file:
        manifest_files = json.load(file)

    if not isinstance(manifest_files, list):
        raise SystemExit(f"{manifest_path} must contain a JSON array.")

    if manifest_files != expected_files:
        raise SystemExit(
            f"{site_name} manifest does not match chapter files.\n"
            f"Expected: {expected_files}\n"
            f"Actual:   {manifest_files}"
        )

    print(
        f"{site_name}: validated {manifest_path} "
        f"with {len(manifest_files)} chapter file(s)."
    )
PY

# ---------------------------------------------------------------------------
# 5. 準備 publish 目錄
# ---------------------------------------------------------------------------
echo
echo "==> Prepare publish folder"
rm -rf "${PUBLISH_DIR}"
mkdir -p "${PUBLISH_DIR}/english_toeic"
mkdir -p "${PUBLISH_DIR}/korean_topik"

rsync -a --delete \
  --exclude='.git' \
  --exclude='.github' \
  "${MAIN_DIR}/" "${PUBLISH_DIR}/"

rsync -a --delete \
  --exclude='.git' \
  --exclude='.github' \
  --exclude='src/styles.css' \
  "${EN_DIR}/" "${PUBLISH_DIR}/english_toeic/"

rsync -a --delete \
  --exclude='.git' \
  --exclude='.github' \
  --exclude='src/styles.css' \
  "${KR_DIR}/" "${PUBLISH_DIR}/korean_topik/"

for quiz_dir in english_toeic korean_topik; do
  quiz_page="${PUBLISH_DIR}/${quiz_dir}/quiz.html"
  index_page="${PUBLISH_DIR}/${quiz_dir}/index.html"

  test -f "${MAIN_DIR}/quiz.html"
  cp "${MAIN_DIR}/quiz.html" "${quiz_page}"
  test -f "${quiz_page}"
  rm -f "${index_page}"
  mv "${quiz_page}" "${index_page}"
done

touch "${PUBLISH_DIR}/.nojekyll"

echo "Published file tree:"
find "${PUBLISH_DIR}" -maxdepth 5 -type f | sort | sed -n '1,260p'

# ---------------------------------------------------------------------------
# 6. 強制使用 main 的共用 stylesheet / theme
# ---------------------------------------------------------------------------
echo
echo "==> Force shared stylesheet from main"
style_source="${MAIN_DIR}/src/styles.css"
test -f "${style_source}"

for quiz_dir in english_toeic korean_topik; do
  style_target="${PUBLISH_DIR}/${quiz_dir}/src/styles.css"
  mkdir -p "$(dirname "${style_target}")"
  rm -f "${style_target}"
  cp "${style_source}" "${style_target}"
  cmp --silent "${style_source}" "${style_target}"

  theme_source="${MAIN_DIR}/src/theme.js"
  theme_target="${PUBLISH_DIR}/${quiz_dir}/src/theme.js"
  test -f "${theme_source}"
  cp "${theme_source}" "${theme_target}"
  cmp --silent "${theme_source}" "${theme_target}"

  echo "main/src/styles.css -> ${style_target}"
  echo "main/src/theme.js   -> ${theme_target}"
done

# ---------------------------------------------------------------------------
# 7. 幫 quiz 的 stylesheet 加上 cache version
# ---------------------------------------------------------------------------
echo
echo "==> Add quiz stylesheet cache version"
export STYLE_VERSION="$(git -C "${REPO_ROOT}" rev-parse HEAD)"
python3 - "${PUBLISH_DIR}" <<'PY'
import os, re, sys
from pathlib import Path

base = Path(sys.argv[1])
version = os.environ["STYLE_VERSION"]

pages = [
    base / "english_toeic" / "index.html",
    base / "korean_topik" / "index.html",
]

for page in pages:
    source = page.read_text(encoding="utf-8")
    updated, count = re.subn(
        r'href=["\'](?:\./)?src/styles\.css(?:\?v=[^"\']*)?["\']',
        f'href="src/styles.css?v={version}"',
        source,
        count=1,
    )
    if count != 1:
        raise SystemExit(f"Stylesheet reference not found in {page}")

    theme_script = f'<script src="src/theme.js?v={version}"></script>'
    updated, script_count = re.subn(
        r'<script\s+[^>]*src=["\'](?:\./)?src/theme\.js(?:\?v=[^"\']*)?["\'][^>]*></script>',
        theme_script, updated, count=1, flags=re.IGNORECASE,
    )
    if script_count == 0:
        updated, body_count = re.subn(
            r'</body>', f'  {theme_script}\n</body>',
            updated, count=1, flags=re.IGNORECASE,
        )
        if body_count != 1:
            raise SystemExit(f"Closing </body> not found in {page}")

    page.write_text(updated, encoding="utf-8")
    print(f"Versioned quiz theme assets in {page}")
PY

# ---------------------------------------------------------------------------
# 8. 統一 quiz runtime（loader / app.js / storageKey）
# ---------------------------------------------------------------------------
echo
echo "==> Normalize quiz runtime"
for quiz_dir in english_toeic korean_topik; do
  loader_source="${MAIN_DIR}/src/chapter-loader.js"
  loader_target="${PUBLISH_DIR}/${quiz_dir}/src/chapter-loader.js"
  app_source="${MAIN_DIR}/src/app.js"
  app_file="${PUBLISH_DIR}/${quiz_dir}/src/app.js"

  test -f "${loader_source}"
  test -f "${app_source}"

  cp "${loader_source}" "${loader_target}"
  cp "${app_source}" "${app_file}"

  python3 - "${app_file}" <<'PY'
import pathlib, sys

path = pathlib.Path(sys.argv[1])
source = path.read_text(encoding="utf-8")
old = "const storageKey = 'genericQuizState';"
new = "const storageKey = `genericQuizState:${location.pathname.replace(/\\/$/, '') || '/'}`;"

if old not in source:
    raise SystemExit(f"Expected storage key declaration not found in {path}")

path.write_text(source.replace(old, new, 1), encoding="utf-8")
PY
done

# ---------------------------------------------------------------------------
# 9. 驗證 publish 後的 manifests
# ---------------------------------------------------------------------------
echo
echo "==> Validate published manifests"
python3 - "${PUBLISH_DIR}" <<'PY'
import json, sys
from pathlib import Path

base = Path(sys.argv[1])

for quiz_dir in ("english_toeic", "korean_topik"):
    chapter_dir = base / quiz_dir / "src" / "data" / "chapters"
    manifest_path = chapter_dir / "manifest.json"

    if not manifest_path.is_file():
        raise SystemExit(f"Published manifest was not found: {manifest_path}")

    actual_files = sorted(
        p.name for p in chapter_dir.glob("*.js") if p.is_file()
    )

    with manifest_path.open("r", encoding="utf-8") as file:
        manifest_files = json.load(file)

    if manifest_files != actual_files:
        raise SystemExit(
            f"Published manifest is inconsistent: {manifest_path}\n"
            f"Expected: {actual_files}\n"
            f"Actual:   {manifest_files}"
        )

    print(
        f"Validated {manifest_path} "
        f"with {len(manifest_files)} chapter file(s)."
    )
PY

# ---------------------------------------------------------------------------
# 10. 驗證共用 stylesheet / theme
# ---------------------------------------------------------------------------
echo
echo "==> Validate shared stylesheet"
for target in \
  "${PUBLISH_DIR}/src/styles.css" \
  "${PUBLISH_DIR}/english_toeic/src/styles.css" \
  "${PUBLISH_DIR}/korean_topik/src/styles.css"
do
  cmp --silent "${MAIN_DIR}/src/styles.css" "${target}"
  echo "Verified main stylesheet: ${target}"
done

for target in \
  "${PUBLISH_DIR}/english_toeic/src/theme.js" \
  "${PUBLISH_DIR}/korean_topik/src/theme.js"
do
  cmp --silent "${MAIN_DIR}/src/theme.js" "${target}"
  echo "Verified main theme controller: ${target}"
done

# ---------------------------------------------------------------------------
# 11. 驗證 JavaScript 語法
# ---------------------------------------------------------------------------
echo
echo "==> Validate published JavaScript"
if command -v node >/dev/null 2>&1; then
  for quiz_dir in english_toeic korean_topik; do
    node --check "${PUBLISH_DIR}/${quiz_dir}/src/chapter-loader.js"
    node --check "${PUBLISH_DIR}/${quiz_dir}/src/app.js"
  done
  echo "node --check passed."
else
  echo "略過 (找不到 node)"
fi

# ---------------------------------------------------------------------------
# 完成
# ---------------------------------------------------------------------------
echo
echo "============================================================"
echo "本機建置完成 ✔"
echo
echo "來源分支 (當前 checkout): ${CURRENT_BRANCH:-<detached>}"
if is_current_branch "main"; then
  echo "  - site-main     : 工作區鏡像（含未提交變更）"
elif is_current_branch "english_toeic"; then
  echo "  - site-english  : 工作區鏡像（含未提交變更）"
elif is_current_branch "korean_topik"; then
  echo "  - site-korean   : 工作區鏡像（含未提交變更）"
else
  echo "  （目前為 detached HEAD，三個分支皆使用已 commit 版本）"
fi
echo
echo "輸出目錄: ${PUBLISH_DIR}"
echo
echo "本機預覽 (不用 cd，綁 127.0.0.1):"
echo "  python3 -m http.server 8080 --bind 127.0.0.1 --directory \"${PUBLISH_DIR}\""
echo
echo "  首頁       : http://127.0.0.1:8080/"
echo "  英文 TOEIC : http://127.0.0.1:8080/english_toeic/"
echo "  韓文 TOPIK : http://127.0.0.1:8080/korean_topik/"
echo "============================================================"
