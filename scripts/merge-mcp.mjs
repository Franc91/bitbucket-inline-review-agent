#!/usr/bin/env node
/**
 * Merge kit MCP servers (Atlassian Jira) into a target mcp.json without removing existing servers.
 *
 * Usage:
 *   node scripts/merge-mcp.mjs <targetMcpJsonPath>
 *   node scripts/merge-mcp.mjs --global
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const KIT_ROOT = resolve(__dirname, "..");
const FRAGMENT_PATH = join(KIT_ROOT, "mcp.example.json");

function loadJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

function mergeMcp(targetPath) {
  if (!existsSync(FRAGMENT_PATH)) {
    throw new Error(`Missing ${FRAGMENT_PATH}`);
  }
  const fragment = loadJson(FRAGMENT_PATH, null);
  const servers = fragment?.mcpServers;
  if (!servers || typeof servers !== "object") {
    throw new Error("mcp.example.json must contain mcpServers");
  }

  const target = loadJson(targetPath, { mcpServers: {} });
  if (!target.mcpServers || typeof target.mcpServers !== "object") {
    target.mcpServers = {};
  }

  const added = [];
  const skipped = [];
  for (const [name, config] of Object.entries(servers)) {
    if (target.mcpServers[name]) {
      skipped.push(name);
    } else {
      target.mcpServers[name] = config;
      added.push(name);
    }
  }

  ensureDir(dirname(targetPath));
  writeFileSync(targetPath, JSON.stringify(target, null, 2) + "\n", "utf8");

  return { targetPath, added, skipped };
}

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(`Usage: node scripts/merge-mcp.mjs [--global] [<path-to-mcp.json>]`);
    process.exit(0);
  }
  if (argv.includes("--global")) {
    const home = process.env.USERPROFILE || process.env.HOME;
    if (!home) throw new Error("Cannot resolve home for --global");
    return join(home, ".cursor", "mcp.json");
  }
  const pathArg = argv.find((a, i) => i >= 2 && !a.startsWith("-"));
  if (!pathArg) {
    throw new Error("Pass target mcp.json path or --global");
  }
  return resolve(pathArg);
}

try {
  const targetPath = parseArgs(process.argv);
  const { added, skipped } = mergeMcp(targetPath);
  if (added.length) {
    console.log(`MCP merged into ${targetPath}: added ${added.join(", ")}`);
  } else {
    console.log(`MCP unchanged at ${targetPath} (already had: ${skipped.join(", ") || "—"})`);
  }
  console.log("First use: authenticate Jira in Cursor → MCP (Atlassian OAuth).");
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
