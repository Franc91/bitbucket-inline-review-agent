# Compose with VueNestJs Agent (and similar bundles)

This skill is **additive**: it does not replace `platform-agents`, domain skills, or `platform-review-agent`.

## When to use which

| User goal | Skill |
| --------- | ----- |
| Implement feature / fix bug in `ui/` or `src/` | VueNestJs `platform-agents` → domain skills |
| Architecture audit after local changes (chat only) | `platform-review-agent` |
| Bitbucket PR review with **inline line comments** + **Request changes** | `bitbucket-inline-review-agent` |

Typical flow: finish feature work → open PR → **inline review** this skill (uses the same `.cursor/rules/` as the bundle) → publish on request.

## Install into the product workspace

From this kit repo (once per machine / after kit updates):

```powershell
Copy-Item install.config.example.json install.config.json
# edit codeWorkspace → your product root (folder with .cursor/rules from VueNestJs install)

.\install.ps1 -UpdateAgents
```

Or one-shot:

```powershell
.\install.ps1 -TargetPath "C:\path\to\product\code" -UpdateAgents
```

Global skill only (any repo, kit path in `~/.cursor/bitbucket-inline-review-kit.json`):

```powershell
.\install.ps1 -Global
```

Re-run `.\update.ps1` after `git pull` in this kit to refresh links/copies.

**Jira MCP:** install merges `jira` into `.cursor/mcp.json`. VueNestJs bundle often already has the same server — merge is a no-op. Cross-task review needs MCP authenticated in Cursor.

## Kit path for publish

From the product repo:

```bash
KIT="$(node /path/to/bitbucket-inline-review-agent/scripts/resolve-kit-path.mjs)"
node "$KIT/scripts/publish-review.mjs" --pr 88 --findings ./findings.json --dry-run
```

Credentials stay in the **host** `env/.env.*`, never in this kit repo.

## Optional: Skills CLI

When this repository is on GitHub:

```bash
npx skills add <owner>/bitbucket-inline-review-agent -s bitbucket-inline-review-agent -a cursor -y
```

You still need a **kit manifest** (`install.ps1`) or `BITBUCKET_INLINE_REVIEW_KIT` so `publish-review.mjs` can be found — the Skills CLI installs instructions only, not the publisher script.
