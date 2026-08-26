---
name: bitbucket-inline-review-agent
description: >-
  Reviews Bitbucket PRs with inline line comments (problem + solution) and sets
  Request changes or Approve via Bitbucket REST API. Use when the user asks for
  inline review, line comments on a PR, request changes, bitbucket inline,
  recenzja z komentarzami do linii, or wrzuć inline na PR.
---

# Bitbucket Inline Review Agent

Standalone agent kit: **code review → chat report → (on request) publish inline comments + PR status**.

Unlike `bitbucket-review-agent` (GitKraken summary review only), this agent posts **per-line** comments and can set **Request changes**.

**Do not change application code.** Review the PR diff only.

## Defaults

Loaded from this kit’s `config/defaults.json` (override via flags / `.env` / user):

| Item | Default |
| ---- | ------- |
| Workspace | `project-jakarta` |
| Repo | `dealer-platform` |
| Jira cloudId | `projectjakartaltd.atlassian.net` |
| Jira project | `DP` |

When used from another product repo, set workspace/repo explicitly.

## Guardrails

- Do **not** publish until the user asks (*wrzuć na PR*, *opublikuj*, *publish inline*, *dodaj komentarze*).
- Do **not** Approve unless the user explicitly asks **and** there is no Critical finding.
- Do **not** `git checkout` away the user’s branch; prefer fetch + diff / worktree with consent.
- Review **changed lines** only; skip unrelated legacy.
- Write the review in the **user’s language**.
- Prefer Critical/Warning for publishable inline comments; Suggestions may stay chat-only unless the user wants them published.

## Workflow

```
Inline review:
- [ ] 1. Resolve input (ticket / PR / my PRs)
- [ ] 2. Load Jira (optional) + Bitbucket PR + diff + existing comments
- [ ] 3. Review vs ticket + host project rules (if present)
- [ ] 4. Chat report (template below) with path:line + problem + solution
- [ ] 5. Write findings JSON
- [ ] 6. Publish only if asked → scripts/publish-review.mjs
```

### 1–2. Discover PR and diff

Prefer GitKraken MCP when available (`provider: bitbucket`):

- `pull_request_get_detail` (`pull_request_files: true`)
- `pull_request_get_comments`
- `git_fetch` + `git_log_or_diff` (`action: diff`, range `origin/{base}...origin/{source}`)

Jira (Atlassian MCP): `getJiraIssue`, remote links / Teamwork Graph for PR URL.

Fallback: `git fetch` + `git diff origin/{base}...origin/{source}`.

Details: [api.md](api.md), [mcp.md](mcp.md).

### 3. Review

Check ticket fit, correctness, regressions, security, and **host project** Cursor rules if this kit is linked into a product repo.

Each finding that may be published **must** include:

| Field | Meaning |
| ----- | ------- |
| `severity` | `Critical` \| `Warning` \| `Suggestion` |
| `path` | Repo-relative file path |
| `line` | Line in the **new** file version (use `side: "old"` only for pure deletions) |
| `title` | Short headline |
| `problem` | What is wrong |
| `solution` | Best concrete fix |

Line numbers must match the PR tip (source branch), not an outdated local buffer.

### 4. Chat report

```markdown
# Inline code review — {DP-XXX} / PR #{id}

**Ticket:** {summary} — {status}
**PR:** {title} (`{source}` → `{target}`)
**Verdict:** Request changes | Comment | Approve

## Ticket fit
…

## Findings

### 🔴 Critical
- `path:line` — **Problem:** … — **Solution:** …

### 🟡 Warning
- …

### 🟢 Suggestion
- …

## What looks good
- …
```

Verdict rules:

| Verdict | When |
| ------- | ---- |
| **Request changes** | Any Critical |
| **Comment** | Only Warning/Suggestion |
| **Approve** | No Critical/Warning **and** user asked to approve |

### 5. Findings JSON

Write a temp file (e.g. kit root `findings.json` or `tmp/findings-PR-{id}.json`) matching [examples/findings.example.json](../../../examples/findings.example.json).

Comment body rules: [comment-format.md](comment-format.md).

### 6. Publish (only if asked)

1. Show the exact findings JSON (or table) and planned status to the user.
2. Ensure kit `.env` exists (from `.env.example`) with Bitbucket credentials.
3. From the **kit root**:

```bash
node scripts/publish-review.mjs --pr {id} --findings ./findings.json
```

Dry run first if unsure:

```bash
node scripts/publish-review.mjs --pr {id} --findings ./findings.json --dry-run
```

Status behaviour (script):

- Critical / `verdict: Request changes` / `requestChanges: true` → POST `.../request-changes`
- `--approve` or `approve: true` (and no Critical) → POST `.../approve`
- Otherwise → comments only

Also posts one **summary** PR comment, then one **inline** comment per finding with `path` + `line`.

If credentials are missing, paste ready-to-copy comments and the Bitbucket PR URL; do not invent success.

Optional: GitKraken `pull_request_create_review` for a duplicate summary is **not** required when using this script.

## Triggers (examples)

- `inline review PR 88`
- `zrób review z komentarzami do linii DP-1421`
- `wrzuć inline na PR` (after a prior review in this chat)
- `request changes na Bitbucket`

## Relation to chat-only review

For summary-only review without inline API publish, the product repo may still use `bitbucket-review-agent`. This kit is for **inline + Request changes**.
