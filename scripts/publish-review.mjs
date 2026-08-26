#!/usr/bin/env node
/**
 * Publish Bitbucket PR inline review findings.
 *
 * Credentials come from the **host project** env (never from this kit repo):
 *   BITBUCKET_USERNAME (Atlassian email) + BITBUCKET_API_TOKEN  (Basic)
 *   aliases: BITBUCKET_EMAIL, BITBUCKET_APP_PASSWORD
 *   or BITBUCKET_TOKEN (Bearer OAuth access token)
 *   BITBUCKET_WORKSPACE, BITBUCKET_REPO_SLUG (optional)
 *
 * Env file discovery (does not overwrite existing process.env):
 *   1. --env-file <path>
 *   2. walk up from cwd: .env, .env.local, env/.env.development, env/.env.default
 *
 * Usage (run from product repo, or pass --env-file):
 *   node /path/to/kit/scripts/publish-review.mjs --pr 88 --findings ./findings.json
 *   node ... --env-file ./env/.env.development --pr 88 --findings ./findings.json
 */

import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function loadDotEnv(path) {
  if (!path || !existsSync(path)) return false;
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
  return true;
}

/** Walk cwd → parents; load first matching env files (shallow names first per dir). */
function loadHostProjectEnv(startDir) {
  const names = [
    ".env",
    ".env.local",
    join("env", ".env.development"),
    join("env", ".env.default"),
  ];
  const loaded = [];
  let dir = resolve(startDir);
  for (let i = 0; i < 12; i++) {
    for (const name of names) {
      const p = join(dir, name);
      if (loadDotEnv(p)) loaded.push(p);
    }
    if (process.env.BITBUCKET_API_TOKEN || process.env.BITBUCKET_APP_PASSWORD || process.env.BITBUCKET_TOKEN) {
      break;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return loaded;
}

function peekEnvFileArg(argv) {
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--env-file") return argv[i + 1] || null;
  }
  return null;
}

function parseArgs(argv) {
  const out = {
    pr: null,
    findings: null,
    workspace: null,
    repo: null,
    envFile: null,
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
      case "--env-file":
        out.envFile = next();
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
  --env-file <path>      host project env file (API token lives here, not in the kit)
  --workspace <slug>     default from host env / config
  --repo <slug>          default from host env / config
  --dry-run              print actions only
  --approve              set Approve (only if verdict allows)
  --skip-status          do not call request-changes / approve
  --summary-only         post only the summary comment (no inline)

Credentials (host project env only):
  BITBUCKET_USERNAME or BITBUCKET_EMAIL  +  BITBUCKET_API_TOKEN
  (BITBUCKET_APP_PASSWORD still accepted as alias for the API token)
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

function bitbucketUser() {
  return process.env.BITBUCKET_USERNAME || process.env.BITBUCKET_EMAIL || "";
}

function bitbucketSecret() {
  return (
    process.env.BITBUCKET_API_TOKEN ||
    process.env.BITBUCKET_APP_PASSWORD ||
    ""
  );
}

function authHeader() {
  const bearer = process.env.BITBUCKET_TOKEN;
  if (bearer) return `Bearer ${bearer}`;
  const user = bitbucketUser();
  const pass = bitbucketSecret();
  if (!user || !pass) {
    fail(
      "Missing Bitbucket credentials in host project env. Set BITBUCKET_USERNAME (Atlassian email) + BITBUCKET_API_TOKEN, or pass --env-file pointing at the product .env (see examples/host-project.env.example).",
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
  // Load host-project env before reading BITBUCKET_* (never load kit-root .env).
  const earlyEnvFile = peekEnvFileArg(process.argv);
  if (earlyEnvFile) {
    const abs = resolve(process.cwd(), earlyEnvFile);
    if (!loadDotEnv(abs)) fail(`--env-file not found: ${abs}`);
    console.log(`Loaded env file: ${abs}`);
  } else {
    const loaded = loadHostProjectEnv(process.cwd());
    if (loaded.length) console.log(`Loaded host env: ${loaded.join(", ")}`);
  }

  const args = parseArgs(process.argv);
  const defaults = loadDefaults();
  const workspace =
    args.workspace || process.env.BITBUCKET_WORKSPACE || defaults.workspace;
  const repo =
    args.repo || process.env.BITBUCKET_REPO_SLUG || defaults.repoSlug;

  if (!args.pr) fail("--pr is required");
  if (!args.findings) fail("--findings is required");
  if (!workspace || !repo) {
    fail(
      "workspace/repo missing (flags, host project env BITBUCKET_WORKSPACE / BITBUCKET_REPO_SLUG, or config/defaults.json)",
    );
  }

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
