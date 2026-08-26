# Bitbucket Cloud REST — publish API

Base:

```
https://api.bitbucket.org/2.0/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}
```

Auth:

- **App Password** (recommended): HTTP Basic `BITBUCKET_USERNAME:BITBUCKET_APP_PASSWORD`
  - Scopes: **Pull requests: Read + Write**
- Or **Bearer** `BITBUCKET_TOKEN`

## Create comment (summary or inline)

```
POST .../comments
Content-Type: application/json
```

Summary:

```json
{
  "content": { "raw": "markdown body" }
}
```

Inline (prefer **new** file line with `to` only — do not send both `from` and `to`):

```json
{
  "content": { "raw": "**🔴 Critical** — …\n\n**Problem:** …\n\n**Solution:** …" },
  "inline": {
    "path": "ui/src/views/Example.vue",
    "to": 42
  }
}
```

For comments on the old side (deletions), use `from` instead of `to`.

## Request changes

```
POST .../request-changes
```

No body. Requires `pullrequest:write`.

## Approve

```
POST .../approve
```

## Implementation

Use the kit script (handles auth, summary, inline loop, status):

```bash
node scripts/publish-review.mjs --pr 88 --findings ./findings.json
node scripts/publish-review.mjs --pr 88 --findings ./findings.json --dry-run
```

See [examples/findings.example.json](../../../examples/findings.example.json).
