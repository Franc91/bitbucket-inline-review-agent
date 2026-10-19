#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if [[ -d .git ]]; then
  echo "Updating bitbucket-inline-review-agent..."
  git pull --ff-only
else
  echo "Not a git repo — skipping pull."
fi

for arg in "$@"; do
  if [[ "$arg" == "--pull-only" ]]; then
    echo "Pull only (--pull-only). Skipping install into product workspace."
    exit 0
  fi
done

if [[ "$#" -gt 0 ]] || [[ -f "$ROOT/install.config.json" ]]; then
  exec "$ROOT/install.sh" "$@"
fi

echo ""
echo "Kit updated on disk. No install.config.json — skipped reinstall into product repo."
echo "To refresh a project:"
echo "  ./install.sh -t /path/to/product/code"
echo "  or copy install.config.example.json -> install.config.json and rerun ./update.sh"
exit 0
