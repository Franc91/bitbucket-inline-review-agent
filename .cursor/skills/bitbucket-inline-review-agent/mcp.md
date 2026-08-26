# MCP helpers (optional)

This kit **publishes** via `scripts/publish-review.mjs` + Bitbucket REST, not via GitKraken.

GitKraken / Atlassian MCP are optional for **discovery** (PR metadata, diff, Jira).

## Discover namespaces

```
GetDynamicTools  pattern=gitkraken|gitlens|pull_request
GetDynamicTools  namespace=plugin-atlassian-atlassian
```

Expected GitKraken namespace: `user-eamodio.gitlens-extension-GitKraken`.

If Atlassian is `needsAuth` → `CallDynamicTool` `mcp_auth` (empty args).

## GitKraken (read / optional approve)

Always pass for this org’s defaults:

- `provider: "bitbucket"`
- `repository_organization: "project-jakarta"`
- `repository_name: "dealer-platform"`

| Tool | Use |
| ---- | --- |
| `pull_request_get_detail` | PR + files |
| `pull_request_get_comments` | Existing comments |
| `pull_request_assigned_to_me` | “my PRs” |
| `git_fetch` / `git_log_or_diff` | Diff |
| `repository_get_file_content` | File at ref |
| `pull_request_create_review` | Optional summary-only; **cannot** do inline or Request changes |

Do **not** rely on `pull_request_create_review` for this agent’s publish step.

## Atlassian (Jira)

| Tool | Use |
| ---- | --- |
| `getJiraIssue` | Ticket body / AC |
| `getJiraIssueRemoteIssueLinks` | Linked PR URLs |
| `getTeamworkGraphContext` | `ExternalPullRequest` links |
| `addCommentToJiraIssue` | Only if user asks |

`cloudId`: `projectjakartaltd.atlassian.net`
