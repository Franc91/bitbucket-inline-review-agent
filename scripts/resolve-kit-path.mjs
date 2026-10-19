#!/usr/bin/env node
/**
 * Print absolute path to the bitbucket-inline-review-agent kit root.
 * Used from a host product repo after install (manifest) or from the kit itself.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MANIFEST = join(".cursor", "bitbucket-inline-review-kit.json");

function readManifest(dir) {
  const p = join(dir, MANIFEST);
  if (!existsSync(p)) return null;
  try {
    const data = JSON.parse(readFileSync(p, "utf8"));
    if (data?.kitRoot && existsSync(data.kitRoot)) {
      return resolve(data.kitRoot);
    }
  } catch {
    /* ignore */
  }
  return null;
}

function walkForManifest(startDir) {
  let dir = resolve(startDir);
  for (let i = 0; i < 16; i++) {
    const fromManifest = readManifest(dir);
    if (fromManifest) return fromManifest;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function kitFromThisScript() {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(here, "..");
  if (existsSync(join(root, "scripts", "publish-review.mjs"))) {
    return root;
  }
  return null;
}

const fromEnv = process.env.BITBUCKET_INLINE_REVIEW_KIT;
if (fromEnv && existsSync(fromEnv)) {
  console.log(resolve(fromEnv));
  process.exit(0);
}

const fromManifest = walkForManifest(process.cwd());
if (fromManifest) {
  console.log(fromManifest);
  process.exit(0);
}

const fromScript = kitFromThisScript();
if (fromScript) {
  console.log(fromScript);
  process.exit(0);
}

console.error(
  "bitbucket-inline-review-agent kit not found. Install into the product repo (install.ps1) or set BITBUCKET_INLINE_REVIEW_KIT.",
);
process.exit(1);
