#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
if [[ -d .git ]]; then
  echo "Updating bitbucket-inline-review-agent..."
  git pull --ff-only
fi
exec "$ROOT/install.sh" "$@"
