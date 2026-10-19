# Agent map — bitbucket-inline-review-agent

Standalone Cursor kit for **Bitbucket PR inline review**. Install into a product repo (e.g. next to **VueNestJs Agent**) with `.\install.ps1` — see [README.md](README.md#install).

| Intent | Read |
| ------ | ---- |
| Inline PR review / line comments / Request changes | [.cursor/skills/bitbucket-inline-review-agent/SKILL.md](.cursor/skills/bitbucket-inline-review-agent/SKILL.md) |
| Use with VueNestJs Agent / platform-agents | [.cursor/skills/bitbucket-inline-review-agent/compose-with-platform-agents.md](.cursor/skills/bitbucket-inline-review-agent/compose-with-platform-agents.md) |
| Publish API details | [.cursor/skills/bitbucket-inline-review-agent/api.md](.cursor/skills/bitbucket-inline-review-agent/api.md) |
| Comment wording | [.cursor/skills/bitbucket-inline-review-agent/comment-format.md](.cursor/skills/bitbucket-inline-review-agent/comment-format.md) |
| Jira vs other tasks | [.cursor/skills/bitbucket-inline-review-agent/jira-cross-task.md](.cursor/skills/bitbucket-inline-review-agent/jira-cross-task.md) |
| MCP setup (Jira) | [mcp.example.json](mcp.example.json) · `node scripts/merge-mcp.mjs` |

**Publish command** (after user asks; credentials from **host** `env/.env.*`, not the kit):

```bash
KIT="$(node scripts/resolve-kit-path.mjs)"
node "$KIT/scripts/publish-review.mjs" --pr {id} --findings ./findings.json
# preferred when not running from product cwd:
node "$KIT/scripts/publish-review.mjs" --env-file ./env/.env.development --pr {id} --findings ./findings.json
```

Do not modify product application code from this kit’s review workflow.
Do not store Bitbucket tokens in the kit repository.
