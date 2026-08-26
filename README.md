# bitbucket-inline-review-agent

Standalone **Cursor agent kit** for Bitbucket Cloud pull requests:

1. Code review (chat report)
2. **Inline comments** on specific lines — *problem* + *solution*
3. **Request changes** when there are Critical findings (or **Approve** when you ask and the PR is clean)

GitKraken MCP can read PRs/diffs, but it cannot post line comments or Request changes. This kit publishes through the **Bitbucket REST API** (`scripts/publish-review.mjs`).

## Credentials (host project only)

This kit is reusable — **never** store API tokens in the kit repo.

Add to the **product** env (e.g. `dealer-platform` → `env/.env.development`):

```env
BITBUCKET_USERNAME=you@company.com
BITBUCKET_API_TOKEN=ATATT...
BITBUCKET_WORKSPACE=project-jakarta
BITBUCKET_REPO_SLUG=dealer-platform
```

Template: [`examples/host-project.env.example`](examples/host-project.env.example).

Create the token at [Atlassian API tokens](https://id.atlassian.com/manage-profile/security/api-tokens) with pullrequest read/write scopes. (App passwords are deprecated.)

## Publish

Run from the **product repo** (so env discovery finds `env/.env.*`), pointing at the kit script:

```bash
cd /path/to/dealer-platform/code
node /path/to/bitbucket-inline-review-agent/scripts/publish-review.mjs \
  --pr 88 --findings ./findings.json --dry-run
```

Or pass the env file explicitly:

```bash
node .../publish-review.mjs --env-file ./env/.env.development --pr 88 --findings ./findings.json
```

## Use in Cursor

### Option A — multi-root / product workspace + kit on disk

Work in the product repo; agent runs the kit script with host cwd / `--env-file`.

### Option B — personal skill junction

```powershell
New-Item -ItemType Junction `
  -Path "$env:USERPROFILE\.cursor\skills\bitbucket-inline-review-agent" `
  -Target "C:\Users\Szymon\Desktop\bitbucket-inline-review-agent\.cursor\skills\bitbucket-inline-review-agent"
```

Credentials still come from the product project env, not the kit.

## Findings JSON

See `examples/findings.example.json`. Critical → Request changes; `--approve` only for clean PRs when asked.

## Layout

```
.cursor/skills/bitbucket-inline-review-agent/   # agent instructions
scripts/publish-review.mjs                      # publisher (reads host env)
examples/host-project.env.example               # copy into product env
config/defaults.json                            # non-secret defaults only
```

## Security

Never commit `BITBUCKET_API_TOKEN`. Prefer gitignored project env files (`env/.env.development`).
