# Inline comment format

Each published inline comment must be actionable and short.

## Template

```markdown
**{icon} {Severity}** — {title}

**Problem:** {what is wrong and why it matters}

**Solution:** {best concrete fix; short snippet only if it clarifies}
```

| Severity | Icon |
| -------- | ---- |
| Critical | 🔴 |
| Warning | 🟡 |
| Suggestion | 🟢 |

## Rules

- One finding → one inline comment.
- Problem and Solution in the **user’s language**.
- Solution should be the recommended approach, not three vague alternatives.
- Do not paste huge code blocks; 3–8 lines max if needed.
- Do not shame the author; stay factual.
- Skip nits that match neighbouring legacy style unless they introduce a bug.

## Example (Polish)

```markdown
**🔴 Critical** — Brak guarda na null

**Problem:** Przy pustej liście `item` jest `null` i komponent rzuca przy `item.id`.

**Solution:** Wróć wcześnie: `if (!item) return null` albo użyj `item?.id` w template.
```
