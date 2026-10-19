# bitbucket-inline-review-agent

Standalone **Cursor agent kit** for Bitbucket Cloud pull requests:

1. Code review (chat report)
2. **Inline comments** on specific lines — *problem* + *solution*
3. **Request changes** when there are Critical findings (or **Approve** when you ask and the PR is clean)
4. **Cross-task (Jira)** — compare the PR with linked and related issues (scope bleed, parallel work, missing keys)

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

## Install

Install adds the skill + rule + **Atlassian Jira MCP** (`jira` in `.cursor/mcp.json`) to a **host product repo** (does not replace the whole `.cursor/` tree — safe alongside **VueNestJs Agent**).

```powershell
cd C:\path\to\bitbucket-inline-review-agent
Copy-Item install.config.example.json install.config.json
# Set codeWorkspace to your product root (folder that has .cursor/rules from VueNestJs install)

.\install.ps1 -UpdateAgents
```

One-shot target:

```powershell
.\install.ps1 -TargetPath "C:\path\to\dealer-platform\code" -UpdateAgents
```

Global Cursor skill (all projects; kit path in `%USERPROFILE%\.cursor\bitbucket-inline-review-kit.json`):

```powershell
.\install.ps1 -Global
```

After changes in this kit repo:

```powershell
.\update.ps1
```

`update.ps1` always **git pull**s the kit. It **re-installs** into the product only if `install.config.json` exists, you pass `-TargetPath`, or `-Global`. Without config you get a hint — not an error. Pull only: `.\update.ps1 -PullOnly`.

Resolve kit root from the product repo:

```bash
node C:\path\to\bitbucket-inline-review-agent\scripts\resolve-kit-path.mjs
```

Or set `BITBUCKET_INLINE_REVIEW_KIT` to this repo path.

### Jira MCP (cross-task)

After install, open the product workspace in Cursor → **MCP** → enable **`jira`** → Atlassian login.

Skip MCP merge if VueNestJs already configured it: `.\install.ps1 -SkipMcp` (PowerShell) or `node scripts/install.mjs --skip-mcp`.

**Compose with VueNestJs Agent:** [.cursor/skills/bitbucket-inline-review-agent/compose-with-platform-agents.md](.cursor/skills/bitbucket-inline-review-agent/compose-with-platform-agents.md).

### Skills CLI (instructions only)

When published on GitHub:

```bash
npx skills add <owner>/bitbucket-inline-review-agent -s bitbucket-inline-review-agent -a cursor -y
```

Run `install.ps1` anyway so `publish-review.mjs` and `.cursor/bitbucket-inline-review-kit.json` are wired up.

Credentials still come from the product project env, not the kit.

## Findings JSON

See `examples/findings.example.json`. Critical → Request changes; `--approve` only for clean PRs when asked.

## Layout

```
.cursor/skills/bitbucket-inline-review-agent/   # agent instructions
scripts/publish-review.mjs                      # publisher (reads host env)
scripts/install.mjs                             # install into product / --global
scripts/resolve-kit-path.mjs                    # kit root from host cwd
install.ps1 / install.sh                        # wrappers
examples/host-project.env.example               # copy into product env
config/defaults.json                            # non-secret defaults only
```

## Security

Never commit `BITBUCKET_API_TOKEN`. Prefer gitignored project env files (`env/.env.development`).
