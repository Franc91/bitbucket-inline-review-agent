# MCP helpers

This kit **publishes** via `scripts/publish-review.mjs` + Bitbucket REST, not via GitKraken.

## Atlassian Jira (required for cross-task)

Kit ships `mcp.example.json` (server name **`jira`**). On `install.ps1`, it is **merged** into the host `.cursor/mcp.json` (existing servers kept).

Manual merge:

```bash
node {KIT}/scripts/merge-mcp.mjs /path/to/product/.cursor/mcp.json
# or user-level:
node {KIT}/scripts/merge-mcp.mjs --global
```

**Auth:** Cursor → MCP → `jira` → sign in with Atlassian (OAuth). If tools show `needsAuth`, run MCP auth once in Cursor.

Same config as VueNestJs Agent — if `jira` is already present, install skips duplicate.

GitKraken MCP remains optional for **Bitbucket** PR/diff discovery.

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

## Vuetify MCP (UI review)

Namespaces: `user-vuetify-mcp` or `project-0-code-vuetify-mcp`.

| Tool | When |
| ---- | ---- |
| `get_component_api_by_version` | Verify props/events/slots of a `v-*` component in the diff |
| `get_feature_guide` | Feature docs when usage looks wrong |
| `get_upgrade_guide` | v3→v4 / migration patterns |

Project visual/form norms still come from host `.cursor/rules/vue.mdc`, not from MCP alone.

## Atlassian (Jira)

Discover namespace: `GetDynamicTools` `pattern=atlassian|jira`. If `needsAuth` → `CallDynamicTool` `mcp_auth`.

| Tool | Use |
| ---- | --- |
| `getJiraIssue` | Primary + **related** issues (summary, status, description, links) |
| `getJiraIssueRemoteIssueLinks` | PR URLs on an issue |
| `getTeamworkGraphContext` | Linked PRs/issues around a key |
| `searchJiraIssuesUsingJql` | Linked/epic/subtask discovery when links are incomplete |
| `addCommentToJiraIssue` | Only if user asks |

`cloudId`: kit `config/defaults.json` → `jiraCloudId` (default `projectjakartaltd.atlassian.net`). Issue key prefix: `jiraProject` (default `DP`).

Cross-task workflow: [jira-cross-task.md](jira-cross-task.md).
