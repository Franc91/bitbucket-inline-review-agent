# Bitbucket Cloud REST — publish API

Base:

```
https://api.bitbucket.org/2.0/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}
```

## Auth (host project env)

App passwords are deprecated. Use an **Atlassian API token**:

| Env | Value |
| --- | --- |
| `BITBUCKET_USERNAME` or `BITBUCKET_EMAIL` | Atlassian account email |
| `BITBUCKET_API_TOKEN` | API token (`BITBUCKET_APP_PASSWORD` still accepted as alias) |

HTTP Basic: `email:api_token`.

Optional: `BITBUCKET_TOKEN` as Bearer (OAuth access token).

Scopes: `read:pullrequest:bitbucket`, `write:pullrequest:bitbucket`.

**Do not** put these in the kit `.env`. Put them in the product project (see `examples/host-project.env.example`).

## Create comment (summary or inline)

```
POST .../comments
```

Inline — prefer `to` only (new file line):

```json
{
  "content": { "raw": "**🔴 Critical** — …\n\n**Problem:** …\n\n**Solution:** …" },
  "inline": { "path": "ui/src/views/Example.vue", "to": 42 }
}
```

## Request changes / Approve

```
POST .../request-changes
POST .../approve
```

## Script

```bash
# from product repo
node /path/to/kit/scripts/publish-review.mjs --pr 88 --findings ./findings.json
node ... --env-file ./env/.env.development --pr 88 --findings ./findings.json --dry-run
```
