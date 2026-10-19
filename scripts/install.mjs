#!/usr/bin/env node
/**
 * Install bitbucket-inline-review-agent into a product workspace (VueNestJs / monorepo)
 * or as a global Cursor skill. Does not overwrite unrelated .cursor content.
 */
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const KIT_ROOT = resolve(__dirname, "..");

function parseArgs(argv) {
  const opts = {
    target: "",
    global: false,
    copy: false,
    updateAgents: false,
    skipMcp: false,
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") opts.help = true;
    else if (a === "--global" || a === "-g") opts.global = true;
    else if (a === "--copy") opts.copy = true;
    else if (a === "--update-agents") opts.updateAgents = true;
    else if (a === "--skip-mcp") opts.skipMcp = true;
    else if (a === "--target" || a === "-t") opts.target = argv[++i] || "";
    else if (!a.startsWith("-") && !opts.target) opts.target = a;
  }
  return opts;
}

function loadTargetFromConfig() {
  const configPath = join(KIT_ROOT, "install.config.json");
  if (!existsSync(configPath)) {
    throw new Error(
      "Missing install.config.json. Copy install.config.example.json and set codeWorkspace, or pass --target.",
    );
  }
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  if (!config.codeWorkspace) {
    throw new Error("install.config.json must contain codeWorkspace.");
  }
  return resolve(config.codeWorkspace);
}

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

function removePath(p) {
  if (!existsSync(p)) return;
  rmSync(p, { recursive: true, force: true });
}

function linkOrCopy(src, dest, copy) {
  removePath(dest);
  ensureDir(dirname(dest));
  if (copy) {
    cpSync(src, dest, { recursive: true, force: true });
    return "copied";
  }
  try {
    const type = process.platform === "win32" ? "junction" : "dir";
    symlinkSync(src, dest, type);
    return "linked";
  } catch {
    cpSync(src, dest, { recursive: true, force: true });
    return "copied (symlink failed)";
  }
}

function installGlobal(copy) {
  const home = process.env.USERPROFILE || process.env.HOME;
  if (!home) throw new Error("Cannot resolve home directory for --global install.");

  const skillSrc = join(KIT_ROOT, ".cursor", "skills", "bitbucket-inline-review-agent");
  const skillDest = join(home, ".cursor", "skills", "bitbucket-inline-review-agent");
  const mode = linkOrCopy(skillSrc, skillDest, copy);

  const manifestPath = join(home, ".cursor", "bitbucket-inline-review-kit.json");
  writeFileSync(
    manifestPath,
    JSON.stringify({ kitRoot: KIT_ROOT, installedAt: new Date().toISOString() }, null, 2) + "\n",
    "utf8",
  );

  console.log(`Global skill ${mode}: ${skillDest}`);
  console.log(`Kit manifest: ${manifestPath}`);
  console.log("Open any product repo; credentials still come from host env/.env.*");
}

function mergeKitMcp(mcpJsonPath) {
  const r = spawnSync(process.execPath, [join(KIT_ROOT, "scripts", "merge-mcp.mjs"), mcpJsonPath], {
    stdio: "inherit",
  });
  if (r.status !== 0) {
    throw new Error("merge-mcp.mjs failed");
  }
}

function installProject(target, copy, updateAgents, skipMcp) {
  if (!existsSync(target)) {
    throw new Error(`Target path not found: ${target}`);
  }

  const cursorDir = join(target, ".cursor");
  ensureDir(cursorDir);

  const skillSrc = join(KIT_ROOT, ".cursor", "skills", "bitbucket-inline-review-agent");
  const skillDest = join(cursorDir, "skills", "bitbucket-inline-review-agent");
  const ruleSrc = join(KIT_ROOT, ".cursor", "rules", "bitbucket-inline-review.mdc");
  const ruleDest = join(cursorDir, "rules", "bitbucket-inline-review.mdc");

  const skillMode = linkOrCopy(skillSrc, skillDest, copy);
  console.log(`Skill ${skillMode}: ${skillDest}`);

  if (existsSync(ruleSrc)) {
    ensureDir(dirname(ruleDest));
    cpSync(ruleSrc, ruleDest, { force: true });
    console.log(`Rule copied: ${ruleDest}`);
  }

  const manifestPath = join(cursorDir, "bitbucket-inline-review-kit.json");
  writeFileSync(
    manifestPath,
    JSON.stringify({ kitRoot: KIT_ROOT, installedAt: new Date().toISOString() }, null, 2) + "\n",
    "utf8",
  );
  console.log(`Kit manifest: ${manifestPath}`);

  const exampleSrc = join(KIT_ROOT, "examples", "findings.example.json");
  const exampleDest = join(skillDest, "findings.example.json");
  if (existsSync(exampleSrc)) {
    cpSync(exampleSrc, exampleDest, { force: true });
  }

  if (!skipMcp) {
    mergeKitMcp(join(cursorDir, "mcp.json"));
  }

  if (updateAgents) {
    const r = spawnSync(process.execPath, [join(KIT_ROOT, "scripts", "patch-agents-md.mjs")], {
      cwd: target,
      stdio: "inherit",
    });
    if (r.status !== 0) {
      throw new Error("patch-agents-md.mjs failed");
    }
  }

  console.log("");
  console.log("Done. Resolve kit path from product cwd:");
  console.log(`  node "${join(KIT_ROOT, "scripts", "resolve-kit-path.mjs")}"`);
}

function printHelp() {
  console.log(`Usage: node scripts/install.mjs [options] [targetPath]

Options:
  --target, -t <path>   Product workspace root (folder containing or receiving .cursor/)
  --global, -g          Install skill under ~/.cursor/skills (any project)
  --copy                Copy files instead of symlink/junction
  --update-agents       Patch target AGENTS.md with index rows
  --skip-mcp            Do not merge Atlassian Jira into .cursor/mcp.json
  --help, -h            Show help

If --target is omitted, reads codeWorkspace from install.config.json in the kit root.
`);
}

const opts = parseArgs(process.argv);
if (opts.help) {
  printHelp();
  process.exit(0);
}

try {
  if (opts.global) {
    installGlobal(opts.copy);
    if (!opts.skipMcp) {
      const home = process.env.USERPROFILE || process.env.HOME;
      if (home) mergeKitMcp(join(home, ".cursor", "mcp.json"));
    }
    process.exit(0);
  }

  const target = opts.target ? resolve(opts.target) : loadTargetFromConfig();
  console.log(`Installing bitbucket-inline-review-agent into: ${target}`);
  installProject(target, opts.copy, opts.updateAgents, opts.skipMcp);
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
