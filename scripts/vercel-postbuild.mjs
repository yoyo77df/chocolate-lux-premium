#!/usr/bin/env node
// Transforms Nitro/Vite `dist/` output into Vercel Build Output API v3
// layout under `.vercel/output/`. Runs after `vite build`.
import { existsSync, mkdirSync, rmSync, cpSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const dist = join(root, "dist");
const out = join(root, ".vercel", "output");

if (!existsSync(dist)) {
  console.error("[vercel-postbuild] dist/ not found — did `vite build` run?");
  process.exit(1);
}

// Clean previous output
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// 1) Copy client assets → static/
const clientSrc = join(dist, "client");
const clientDst = join(out, "static");
if (existsSync(clientSrc)) {
  cpSync(clientSrc, clientDst, { recursive: true });
} else {
  // Some Nitro presets emit `public/` instead of `client/`
  const publicSrc = join(dist, "public");
  if (existsSync(publicSrc)) cpSync(publicSrc, clientDst, { recursive: true });
  else mkdirSync(clientDst, { recursive: true });
}

// 2) Copy server output → functions/__server.func/
const serverSrc = existsSync(join(dist, "server")) ? join(dist, "server") : dist;
const fnDir = join(out, "functions", "__server.func");
mkdirSync(fnDir, { recursive: true });
cpSync(serverSrc, fnDir, { recursive: true });

// .vc-config.json for the function
writeFileSync(
  join(fnDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      supportsResponseStreaming: true,
    },
    null,
    2,
  ),
);

// 3) Top-level config.json — route everything to the server function,
//    Vercel serves `static/` first.
writeFileSync(
  join(out, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/__server" },
      ],
    },
    null,
    2,
  ),
);

console.log("[vercel-postbuild] Wrote .vercel/output/ (config.json, static/, functions/__server.func/)");