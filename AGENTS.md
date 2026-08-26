# Agent map — bitbucket-inline-review-agent

Standalone Cursor kit for **Bitbucket PR inline review**.

| Intent | Read |
| ------ | ---- |
| Inline PR review / line comments / Request changes | [.cursor/skills/bitbucket-inline-review-agent/SKILL.md](.cursor/skills/bitbucket-inline-review-agent/SKILL.md) |
| Publish API details | [.cursor/skills/bitbucket-inline-review-agent/api.md](.cursor/skills/bitbucket-inline-review-agent/api.md) |
| Comment wording | [.cursor/skills/bitbucket-inline-review-agent/comment-format.md](.cursor/skills/bitbucket-inline-review-agent/comment-format.md) |

**Publish command** (after user asks; credentials from **host** `env/.env.*`, not the kit):

```bash
node {path-to-kit}/scripts/publish-review.mjs --pr {id} --findings ./findings.json
# preferred when not running from product cwd:
node {path-to-kit}/scripts/publish-review.mjs --env-file ./env/.env.development --pr {id} --findings ./findings.json
```

Do not modify product application code from this kit’s review workflow.
Do not store Bitbucket tokens in the kit repository.
