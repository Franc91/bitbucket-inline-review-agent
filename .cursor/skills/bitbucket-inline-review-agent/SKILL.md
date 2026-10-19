---
name: bitbucket-inline-review-agent
description: >-
  Reviews Bitbucket PRs with inline line comments (problem + solution) and sets
  Request changes or Approve via Bitbucket REST API. Use when the user asks for
  inline review, line comments on a PR, request changes, bitbucket inline,
  recenzja z komentarzami do linii, wrzuć inline na PR, or compare the PR
  with other related Jira tasks (scope bleed, parallel work, cross-task).
---

# Bitbucket Inline Review Agent

Standalone agent kit: **code review → chat report → (on request) publish inline comments + PR status**.

Unlike `bitbucket-review-agent` (GitKraken summary review only), this agent posts **per-line** comments and can set **Request changes**.

**Do not change application code.** Review the PR diff only.

## Defaults

Non-secret defaults: kit `config/defaults.json`. Override via flags or **host project env**:

| Item | Default / source |
| ---- | ---------------- |
| Workspace | `BITBUCKET_WORKSPACE` or `project-jakarta` |
| Repo | `BITBUCKET_REPO_SLUG` or `dealer-platform` |
| Credentials | **Host project only** — `BITBUCKET_USERNAME` + `BITBUCKET_API_TOKEN` |
| Jira cloudId | `projectjakartaltd.atlassian.net` |
| Jira project | `DP` |

Never store API tokens in this kit. Template: `examples/host-project.env.example`.

## Kit path (host workspace)

After [install](../../../README.md#install) into a product repo, resolve the publisher kit root from **host cwd**:

```bash
node {path-to-this-kit}/scripts/resolve-kit-path.mjs
```

Uses `.cursor/bitbucket-inline-review-kit.json`, or `BITBUCKET_INLINE_REVIEW_KIT`, or this repo when opened as the workspace.

**Compose with VueNestJs Agent:** [compose-with-platform-agents.md](compose-with-platform-agents.md).

## Host project rules (workspace)

When reviewing a PR in a **host product repo** (VueNestJs bundle, monorepo, etc.), apply **host** Cursor rules on changed lines:

1. If `.cursor/skills/platform-review-agent/SKILL.md` exists → use its architecture checklist and layer boundaries; do not duplicate that content in the chat report.
2. Apply `.cursor/rules/*.mdc` by path (typical Vue + NestJS monorepo layout: `code/ui/` or `ui/`, `code/src/` or `src/`):

| Rule | When |
| ---- | ---- |
| `.cursor/rules/general.mdc` | always (scope, layers) |
| `.cursor/rules/vue.mdc` | Vue SFCs, composables, router — **includes Vuetify form/layout norms** |
| `.cursor/rules/pinia-stores.mdc` | stores |
| `.cursor/rules/pinia-colada.mdc` | Colada / queries |
| `.cursor/rules/services.mdc` | UI services |
| `.cursor/rules/nestjs.mdc` | backend |
| `.cursor/rules/data-grid.mdc` | grids |
| `.cursor/rules/i18n.mdc` | locales / `t()` |

If a rule file is missing, skip it. If no `.cursor/rules/` at all, use general correctness and security review only.

### Vuetify (required for UI diffs)

Stack version: host `.cursor/stack-profile.md` when present (e.g. **Vuetify 4**); project norms live in `vue.mdc` § Vuetify (forms `underlined` / brand color, `CustomModal`, `v-form` + `useCheckValidation`, MDI icons).

When the diff touches Vuetify components (`v-*`, forms, dialogs, grids) and the API/usage is unclear:

1. Prefer neighbouring code in the same file / screen.
2. Then **Vuetify MCP** (`user-vuetify-mcp` or `project-0-code-vuetify-mcp`):
   - `get_component_api_by_version` — props/events for the component
   - `get_feature_guide` / `get_upgrade_guide` — if migrating patterns or v3→v4
3. Do **not** invent deprecated props; verify via MCP before flagging as Critical.

Flag Vuetify issues that break project norms (wrong form variant in a form-heavy screen, raw `v-dialog` where `CustomModal` is the local pattern, missing `v-form` validation on new forms, etc.). Skip style nits that match surrounding legacy.

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
- [ ] 2. Load Jira primary + related issues + Bitbucket PR + diff + existing comments
- [ ] 2b. Cross-task compare (Jira) — see [jira-cross-task.md](jira-cross-task.md)
- [ ] 3. Review vs ticket + cross-task + host project rules (if present)
- [ ] 4. Chat report (template below) with path:line + problem + solution
- [ ] 5. Write findings JSON
- [ ] 6. Publish only if asked → scripts/publish-review.mjs
```

### 1–2. Discover PR and diff

Prefer GitKraken MCP when available (`provider: bitbucket`):

- `pull_request_get_detail` (`pull_request_files: true`)
- `pull_request_get_comments`
- `git_fetch` + `git_log_or_diff` (`action: diff`, range `origin/{base}...origin/{source}`)

Jira (Atlassian MCP): primary issue, then related issues and cross-task checks — [jira-cross-task.md](jira-cross-task.md). Minimum: `getJiraIssue`; add links, JQL search, Teamwork Graph per [mcp.md](mcp.md).

Fallback: `git fetch` + `git diff origin/{base}...origin/{source}`.

Details: [api.md](api.md), [mcp.md](mcp.md).

### 2b. Cross-task (Jira)

When a primary issue key is known, **always** compare this PR with other relevant Jira tasks (linked issues, epic/subtasks, keys found in commits/PR text, open parallel work on same paths). Full steps: [jira-cross-task.md](jira-cross-task.md).

### 3. Review

Check ticket fit, **cross-task alignment** (scope bleed, missing links, parallel conflicts), correctness, regressions, security, and **host project rules** (§ Host project rules above).

For UI / Vuetify diffs: apply `vue.mdc` Vuetify section; use Vuetify MCP when component API is uncertain.

Each finding that may be published **must** include:

| Field | Meaning |
| ----- | ------- |
| `severity` | `Critical` \| `Warning` \| `Suggestion` |
| `path` | Repo-relative file path |
| `line` | Line in the **new** file version (use `side: "old"` only for pure deletions) |
| `title` | Short headline |
| `problem` | What is wrong |
| `solution` | Best concrete fix |
| `category` | Optional — e.g. `cross-task` for Jira overlap findings |
| `relatedJiraKey` | Optional — other issue key when `category` is cross-task |

Line numbers must match the PR tip (source branch), not an outdated local buffer.

### 4. Chat report

```markdown
# Inline code review — {DP-XXX} / PR #{id}

**Ticket:** {summary} — {status}
**PR:** {title} (`{source}` → `{target}`)
**Verdict:** Request changes | Comment | Approve

## Ticket fit
…

## Cross-task (Jira)
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

Write a temp file in the host repo (e.g. `./findings.json` or `tmp/findings-PR-{id}.json`) matching [findings.example.json](findings.example.json) (also `{KIT}/examples/findings.example.json`).

Comment body rules: [comment-format.md](comment-format.md).

### 6. Publish (only if asked)

1. Show the exact findings JSON (or table) and planned status to the user.
2. Ensure the **host product** env has `BITBUCKET_USERNAME` + `BITBUCKET_API_TOKEN` (e.g. `env/.env.development`). Do not write secrets into the kit.
3. Resolve `{KIT}` (§ Kit path), then run with **cwd = product repo** (or `--env-file`):

```bash
KIT="$(node /path/to/bitbucket-inline-review-agent/scripts/resolve-kit-path.mjs)"
node "$KIT/scripts/publish-review.mjs" --pr {id} --findings ./findings.json
# or
node "$KIT/scripts/publish-review.mjs" --env-file ./env/.env.development --pr {id} --findings ./findings.json
```

Dry run first if unsure:

```bash
node "$KIT/scripts/publish-review.mjs" --pr {id} --findings ./findings.json --dry-run
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
- `porównaj PR z innymi taskami w Jira`

## Relation to chat-only review

For summary-only review without inline API publish, the product repo may still use `bitbucket-review-agent`. This kit is for **inline + Request changes**.
