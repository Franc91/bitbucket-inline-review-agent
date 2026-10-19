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
| Must fix | 🔴 |
| Should fix | 🟡 |
| Nit- | 🟢 |

## Rules

- One finding → one inline comment.
- **Cross-task** (`category: cross-task`): name the **related Jira key** in Problem; tie to a concrete line when the bleed is localized.
- Problem and Solution in **English** (unless the user asks otherwise). Chat report may stay in the user's language.
- Solution should be the recommended approach, not three vague alternatives.
- Do not paste huge code blocks; 3–8 lines max if needed.
- Do not shame the author; stay factual.
- Skip nits that match neighbouring legacy style unless they introduce a bug.

## Example (Polish)

```markdown
**🔴 Must fix** — Brak guarda na null

**Problem:** Przy pustej liście `item` jest `null` i komponent rzuca przy `item.id`.

**Solution:** Wróć wcześnie: `if (!item) return null` albo użyj `item?.id` w template.
```
