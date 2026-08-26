#!/usr/bin/env node
/**
 * Publish Bitbucket PR inline review findings.
 *
 * Usage:
 *   node scripts/publish-review.mjs --pr 88 --findings ./findings.json
 *   node scripts/publish-review.mjs --pr 88 --findings ./findings.json --dry-run
 *   node scripts/publish-review.mjs --pr 88 --findings ./findings.json --approve
 *
 * Env (.env next to package root or process env):
 *   BITBUCKET_USERNAME + BITBUCKET_APP_PASSWORD  (Basic)
 *   or BITBUCKET_TOKEN (Bearer)
 *   BITBUCKET_WORKSPACE, BITBUCKET_REPO_SLUG (optional overrides)
 */

import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotEnv(join(ROOT, ".env"));

function parseArgs(argv) {
  const out = {
    pr: null,
    findings: null,
    workspace: process.env.BITBUCKET_WORKSPACE || null,
    repo: process.env.BITBUCKET_REPO_SLUG || null,
    dryRun: false,
    approve: false,
    skipStatus: false,
    summaryOnly: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "--pr":
        out.pr = next();
        break;
      case "--findings":
        out.findings = next();
        break;
      case "--workspace":
        out.workspace = next();
        break;
      case "--repo":
        out.repo = next();
        break;
      case "--dry-run":
        out.dryRun = true;
        break;
      case "--approve":
        out.approve = true;
        break;
      case "--skip-status":
        out.skipStatus = true;
        break;
      case "--summary-only":
        out.summaryOnly = true;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
      default:
        fail(`Unknown arg: ${a}`);
    }
  }
  return out;
}

function printHelp() {
  console.log(`publish-review.mjs

Required:
  --pr <id>              Bitbucket pull request id
  --findings <path>      JSON findings file (see examples/findings.example.json)

Optional:
  --workspace <slug>     default from .env / config
  --repo <slug>          default from .env / config
  --dry-run              print actions only
  --approve              set Approve (only if verdict allows)
  --skip-status          do not call request-changes / approve
  --summary-only         post only the summary comment (no inline)
`);
}

function fail(msg) {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

function loadDefaults() {
  const p = join(ROOT, "config", "defaults.json");
  if (!existsSync(p)) return {};
  return JSON.parse(readFileSync(p, "utf8"));
}

function authHeader() {
  const token = process.env.BITBUCKET_TOKEN;
  if (token) return `Bearer ${token}`;
  const user = process.env.BITBUCKET_USERNAME;
  const pass = process.env.BITBUCKET_APP_PASSWORD;
  if (!user || !pass) {
    fail(
      "Set BITBUCKET_TOKEN or BITBUCKET_USERNAME + BITBUCKET_APP_PASSWORD (see .env.example)",
    );
  }
  return `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
}

function formatInlineBody(finding) {
  const sev = finding.severity || "Warning";
  const icon =
    sev === "Critical" || sev === "🔴" ? "🔴 Critical" : sev === "Suggestion" || sev === "🟢" ? "🟢 Suggestion" : "🟡 Warning";
  const title = finding.title || finding.summary || "Finding";
  const problem = finding.problem || finding.issue || "";
  const solution = finding.solution || finding.fix || finding.suggestion || "";
  const parts = [`**${icon}** — ${title}`, "", `**Problem:** ${problem}`];
  if (solution) {
    parts.push("", `**Solution:** ${solution}`);
  }
  return parts.join("\n");
}

function formatSummary(payload) {
  if (payload.summaryMarkdown) return payload.summaryMarkdown;
  const verdict = payload.verdict || "Comment";
  const ticket = payload.ticket || "";
  const lines = [
    `# Code review${ticket ? ` — ${ticket}` : ""}`,
    "",
    `**Verdict:** ${verdict}`,
    "",
  ];
  if (payload.summary) lines.push(payload.summary, "");
  const findings = payload.findings || [];
  if (findings.length) {
    lines.push("## Findings", "");
    for (const f of findings) {
      const loc = f.path ? `\`${f.path}${f.line != null ? `:${f.line}` : ""}\`` : "";
      lines.push(
        `- ${f.severity || "Warning"} ${loc} — ${f.title || f.problem || ""}`.trim(),
      );
    }
    lines.push("");
  }
  lines.push("_Published by bitbucket-inline-review-agent_");
  return lines.join("\n");
}

async function bbFetch(url, { method = "GET", body } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader(),
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(
      `${method} ${url} → ${res.status}: ${typeof data === "object" ? JSON.stringify(data) : text}`,
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function postComment(base, body) {
  return bbFetch(`${base}/comments`, { method: "POST", body });
}

async function requestChanges(base) {
  return bbFetch(`${base}/request-changes`, { method: "POST" });
}

async function approve(base) {
  return bbFetch(`${base}/approve`, { method: "POST" });
}

async function main() {
  const args = parseArgs(process.argv);
  const defaults = loadDefaults();
  const workspace = args.workspace || defaults.workspace;
  const repo = args.repo || defaults.repoSlug;

  if (!args.pr) fail("--pr is required");
  if (!args.findings) fail("--findings is required");
  if (!workspace || !repo) fail("workspace/repo missing (flags, .env, or config/defaults.json)");

  const findingsPath = resolve(process.cwd(), args.findings);
  if (!existsSync(findingsPath)) fail(`findings file not found: ${findingsPath}`);

  const payload = JSON.parse(readFileSync(findingsPath, "utf8"));
  const findings = Array.isArray(payload.findings) ? payload.findings : [];
  const verdict = (payload.verdict || "").toLowerCase();
  const hasCritical = findings.some(
    (f) =>
      f.severity === "Critical" ||
      f.severity === "🔴" ||
      String(f.severity || "").toLowerCase() === "critical",
  );

  const wantRequestChanges =
    verdict.includes("request") || payload.requestChanges === true || hasCritical;
  const wantApprove =
    args.approve || payload.approve === true || verdict === "approve";

  if (wantApprove && wantRequestChanges) {
    fail("Cannot both Approve and Request changes — fix verdict / findings");
  }

  const base = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repo}/pullrequests/${args.pr}`;

  const plan = {
    workspace,
    repo,
    pr: args.pr,
    dryRun: args.dryRun,
    inline: [],
    summary: !args.summaryOnly || true,
    status: args.skipStatus
      ? "skip"
      : wantRequestChanges
        ? "request-changes"
        : wantApprove
          ? "approve"
          : "none",
  };

  if (!args.summaryOnly) {
    for (const f of findings) {
      if (!f.path || f.line == null) {
        console.warn(
          `Skipping finding without path/line: ${f.title || f.problem || JSON.stringify(f)}`,
        );
        continue;
      }
      const inline = { path: f.path };
      // Prefer "to" (new file line). Use "from" only when explicitly set for deletions.
      if (f.side === "old" || f.useFrom === true) {
        inline.from = Number(f.line);
      } else {
        inline.to = Number(f.line);
      }
      plan.inline.push({
        content: { raw: formatInlineBody(f) },
        inline,
      });
    }
  }

  const summaryBody = {
    content: { raw: formatSummary(payload) },
  };

  console.log(JSON.stringify({ planPreview: { ...plan, inlineCount: plan.inline.length } }, null, 2));

  if (args.dryRun) {
    console.log("--- dry-run: would post ---");
    console.log(JSON.stringify({ summaryBody, inline: plan.inline, status: plan.status }, null, 2));
    process.exit(0);
  }

  // Auth check early
  authHeader();

  const results = { comments: [], status: null, errors: [] };

  try {
    const summary = await postComment(base, summaryBody);
    results.comments.push({ type: "summary", id: summary?.id });
    console.log(`Posted summary comment id=${summary?.id}`);
  } catch (e) {
    results.errors.push(String(e.message || e));
    fail(`Failed to post summary: ${e.message || e}`);
  }

  for (const body of plan.inline) {
    try {
      const c = await postComment(base, body);
      results.comments.push({
        type: "inline",
        id: c?.id,
        path: body.inline.path,
        line: body.inline.to ?? body.inline.from,
      });
      console.log(
        `Posted inline ${body.inline.path}:${body.inline.to ?? body.inline.from} id=${c?.id}`,
      );
    } catch (e) {
      const msg = String(e.message || e);
      results.errors.push(msg);
      console.error(`Failed inline ${body.inline.path}: ${msg}`);
    }
  }

  if (plan.status === "request-changes") {
    try {
      await requestChanges(base);
      results.status = "request-changes";
      console.log("Set PR status: Request changes");
    } catch (e) {
      results.errors.push(String(e.message || e));
      console.error(`Failed request-changes: ${e.message || e}`);
    }
  } else if (plan.status === "approve") {
    try {
      await approve(base);
      results.status = "approve";
      console.log("Set PR status: Approved");
    } catch (e) {
      results.errors.push(String(e.message || e));
      console.error(`Failed approve: ${e.message || e}`);
    }
  } else {
    results.status = "none";
  }

  const outPath = join(ROOT, ".publish-result.json");
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`Wrote ${outPath}`);

  if (results.errors.length) process.exit(2);
}

main().catch((e) => fail(e.message || String(e)));
