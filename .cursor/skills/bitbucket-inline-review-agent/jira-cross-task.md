# Jira cross-task comparison

Compare the PR under review with **other Jira issues** — not only the primary ticket. Goal: catch scope bleed, conflicts with parallel work, missing links, and contradictions between tickets.

**Requires** Atlassian MCP (see [mcp.md](mcp.md)). If unavailable, scan PR title, description, commits, and branch for `DP-123`-style keys and state that full cross-task checks were skipped.

## 1. Primary issue

Resolve **primary** key (first match wins):

| Source | Example |
| ------ | ------- |
| User message | `inline review DP-1421` |
| PR title / description | `[DP-1421] …` |
| Branch | `feature/DP-1421-…` |
| Commit messages | `DP-1421 fix …` |
| Remote link on PR | Teamwork Graph / Jira link on PR |

Load with `getJiraIssue` (`cloudId` from kit defaults or host env). Extract: summary, status, description, acceptance criteria (custom field if present), components, labels, fix version, issue links, parent/epic.

## 2. Related issues to load

Build a **related set** (dedupe by key). Cap at **8** issues — prefer open / in-progress and same component over closed history.

| Source | Action |
| ------ | ------ |
| Issue links on primary | `blocks`, `is blocked by`, `relates to`, `duplicates`, `clones`, `causes` |
| Subtasks / parent | Parent epic, children of epic if primary is epic |
| Teamwork Graph | `getTeamworkGraphContext` with primary key — other issues, PRs |
| PR text + commits | Regex `\b(DP-\d+)\b` (use host `jiraProject` from defaults) excluding primary |
| JQL (if search tool available) | `issue in linkedIssues("DP-123") OR parent = DP-123` — project-specific epic field names vary |

Skip: Done/Cancelled issues unless the diff clearly references them or duplicates their scope.

For each related issue: `getJiraIssue` (summary, status, description/AC). Optional: `getJiraIssueRemoteIssueLinks` / graph for **other Bitbucket PRs** on that issue.

## 3. Compare to this PR diff

Map the diff to **domains** (paths, features), not every line:

- Vue views/components under a feature folder
- Nest module / ui-api controller
- Shared util or enum touched by multiple features

For **primary** and each **related** issue, infer **intent** from summary + description/AC (1–3 bullets each).

| Check | Severity | When |
| ----- | -------- | ---- |
| Scope bleed | Critical or Warning | Diff clearly implements AC described on **related** ticket B, but PR is for primary A and B is not mentioned in PR/commits |
| Parallel conflict | Warning | Related ticket B is open/in progress and describes changes to the **same files or modules** as this diff |
| Missing Jira link | Warning | Commits or PR body mention `DP-B` but PR remote links / title only reference primary A |
| Duplicate / already done | Suggestion | Related ticket Done with same functional change; this PR repeats or reopens risk |
| Contradictory AC | Critical or Warning | Primary vs related AC disagree on behaviour in an area this PR modifies |
| Out of scope vs primary | Warning | Large part of diff does not map to primary AC and does not match any loaded related issue — flag as possible unlinked work |

Do **not** fail the review solely because a related ticket exists; tie findings to **evidence** in diff paths and ticket text.

## 4. Other PRs on related tickets

When a related issue has a linked Bitbucket PR:

- Note PR id and state (open/merged).
- If **open** and touches overlapping paths → **Parallel conflict** (above).
- If **merged** recently → skim whether this PR reverts or duplicates; mention in report (usually Suggestion).

Use GitKraken `pull_request_get_detail` only when you have PR id; do not spam requests — max 2 extra PRs unless user asks.

## 5. Chat report section

Always include when primary key was resolved:

```markdown
## Cross-task (Jira)

**Primary:** DP-123 — {summary} ({status})

| Key | Status | Relation to primary | Overlap with this PR |
| --- | ------ | ------------------- | -------------------- |
| DP-456 | In Progress | relates to | Same module `ui/src/views/Foo/` — parallel work |
| DP-789 | Done | epic child | None |

**Verdict:** No scope bleed | Scope bleed risk | Link gap — …

**Notes:** …
```

User language for narrative; ticket keys stay as in Jira.

## 6. Findings JSON

Cross-task items may be **chat-only** (no line) or **inline** when tied to a specific changed line (e.g. new code clearly for ticket B).

Optional fields on a finding:

| Field | Example |
| ----- | ------- |
| `category` | `cross-task` |
| `relatedJiraKey` | `DP-456` |

Use severity from §3 table. Inline comments: [comment-format.md](comment-format.md) — cite both primary and related key in **Problem**.

## 7. Triggers

- User: *porównaj z innymi taskami*, *cross-task*, *czy to nie jest DP-456*, *scope vs Jira*
- Always run §2–4 when Atlassian MCP works and primary key is known (lightweight pass even if user did not ask).
