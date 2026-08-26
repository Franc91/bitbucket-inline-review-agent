# bitbucket-inline-review-agent

Standalone **Cursor agent kit** for Bitbucket Cloud pull requests:

1. Code review (chat report)
2. **Inline comments** on specific lines — *problem* + *solution*
3. **Request changes** when there are Critical findings (or **Approve** when you ask and the PR is clean)

GitKraken MCP can read PRs/diffs, but it cannot post line comments or Request changes. This kit publishes through the **Bitbucket REST API** (`scripts/publish-review.mjs`).

## Quick start

```bash
cd bitbucket-inline-review-agent
cp .env.example .env
# Edit .env: BITBUCKET_USERNAME + BITBUCKET_APP_PASSWORD (Pull requests Read/Write)
```

Dry-run with the sample findings:

```bash
node scripts/publish-review.mjs --pr 88 --findings ./examples/findings.example.json --dry-run
```

Publish for real:

```bash
node scripts/publish-review.mjs --pr 88 --findings ./findings.json
```

## Use in Cursor

### Option A — open this folder as the workspace

Open this repo in Cursor and ask e.g.:

- `inline review PR 88`
- `zrób review z komentarzami do linii DP-1421`
- then `wrzuć inline na PR`

The rule/skill under `.cursor/` will guide the agent.

### Option B — personal skill (any product repo)

Copy or junction the skill into your user skills:

```powershell
# Windows (junction)
New-Item -ItemType Junction `
  -Path "$env:USERPROFILE\.cursor\skills\bitbucket-inline-review-agent" `
  -Target "C:\Users\Szymon\Desktop\bitbucket-inline-review-agent\.cursor\skills\bitbucket-inline-review-agent"
```

Keep the **kit root** (with `scripts/` and `.env`) available; the agent must run `node scripts/publish-review.mjs` from that root (or pass absolute paths).

### Option C — multi-root workspace

Add this folder next to your product repo in a `.code-workspace` so the skill and scripts are both visible.

## Findings JSON

See `examples/findings.example.json`:

```json
{
  "ticket": "DP-123",
  "verdict": "Request changes",
  "requestChanges": true,
  "findings": [
    {
      "severity": "Critical",
      "path": "ui/src/views/example/Example.vue",
      "line": 42,
      "title": "Missing null guard",
      "problem": "…",
      "solution": "…"
    }
  ]
}
```

- `line` = line in the **new** file version (`inline.to` in the API)
- Critical / `requestChanges: true` → script calls `POST .../request-changes`
- `--approve` only when you intentionally approve a clean PR

## Layout

```
.cursor/skills/bitbucket-inline-review-agent/   # agent instructions
.cursor/rules/bitbucket-inline-review.mdc
scripts/publish-review.mjs                      # Bitbucket API publisher
config/defaults.json
examples/findings.example.json
```

## Defaults

`config/defaults.json` targets `project-jakarta` / `dealer-platform`. Override with `--workspace` / `--repo` or env vars.

## Security

Never commit `.env`. App passwords are user-scoped; revoke if leaked.

## Related

Product-repo chat-only Bitbucket review (no inline API): `bitbucket-review-agent` inside dealer-platform.
