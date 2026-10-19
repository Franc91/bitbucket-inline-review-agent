#!/usr/bin/env node
/**
 * Insert or update AGENTS.md index block for bitbucket-inline-review-agent.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const BEGIN = "<!-- bitbucket-inline-review-agent:begin -->";
const END = "<!-- bitbucket-inline-review-agent:end -->";

const BLOCK = `${BEGIN}
| Bitbucket inline PR review (line comments, Request changes) | [.cursor/skills/bitbucket-inline-review-agent/SKILL.md](.cursor/skills/bitbucket-inline-review-agent/SKILL.md) |
| Compose with VueNestJs Agent | [.cursor/skills/bitbucket-inline-review-agent/compose-with-platform-agents.md](.cursor/skills/bitbucket-inline-review-agent/compose-with-platform-agents.md) |
${END}`;

const agentsPath = join(process.cwd(), "AGENTS.md");

if (!existsSync(agentsPath)) {
  const created = `# Agent map

${BLOCK}
`;
  writeFileSync(agentsPath, created, "utf8");
  console.log("Created AGENTS.md with bitbucket-inline-review-agent index.");
  process.exit(0);
}

let text = readFileSync(agentsPath, "utf8");
const re = new RegExp(
  `${BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
);

if (re.test(text)) {
  text = text.replace(re, BLOCK.trimEnd());
  writeFileSync(agentsPath, text, "utf8");
  console.log("Updated AGENTS.md bitbucket-inline-review-agent block.");
  process.exit(0);
}

const tableAnchor = "| Intent | Read |";
if (text.includes(tableAnchor)) {
  text = text.replace(tableAnchor, `${BLOCK}\n\n${tableAnchor}`);
} else if (text.includes("## Index")) {
  text = text.replace(/(## Index[^\n]*\n)/, `$1\n${BLOCK}\n\n`);
} else {
  text = `${text.trimEnd()}\n\n## Bitbucket inline review\n\n${BLOCK}\n`;
}

writeFileSync(agentsPath, text, "utf8");
console.log("Appended bitbucket-inline-review-agent block to AGENTS.md.");
