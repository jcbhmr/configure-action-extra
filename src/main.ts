import * as core from "@actions/core";
import * as github from "@actions/github";
import { join, resolve } from "node:path";
import { fileIsLarge, gzip, readAction, writeAction } from "./utils.ts";
import { mkdir, writeFile } from "node:fs/promises";

type Matrix = Record<string, { gz: boolean; bin: string; args: string[] }>;
const createRuntimeJS = (matrix: Matrix) => `\
import assert from "node:assert/strict";
import { pipeline } from "node:stream/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { chmod, rm, stat } from "node:fs/promises";
import { createGunzip } from "node:zlib";
import { spawnSync } from "node:child_process";

async function gunzip(path) {
  await pipeline(
    createReadStream(\`\${path}.gz\`),
    createGunzip(),
    createWriteStream(path),
  );
  await chmod(path, (await stat(\`\${path}.gz\`)).mode);
  await rm(\`\${path}.gz\`);
}

function replacexec(cmd, args) {
  const { status, signal, error } = spawnSync(cmd, args, { stdio: "inherit" });
  if (error) throw error;
  if (status != null) process.exit(status);
  if (signal) process.kill(process.pid, signal);
  throw new DOMException("unreachable", "IllegalStateError");
}

const os = process.env.RUNNER_OS.toLowerCase();
const arch = process.env.RUNNER_ARCH.toLowerCase();
const { gz, bin, args } = ${JSON.stringify(matrix)}[\`\${os}-\${arch}\`] ?? assert.fail();
if (gz) await gunzip(bin);
replacexec(bin, args);`;

const root = resolve(core.getInput("path"));
const action = await readAction(root);
if (action.runs.using === "executable") {
    const newRuns = { using: "node20" }

  const mainMatrix = {};
  for (const [key, bin] of Object.entries(action.runs.main)) {
    mainMatrix[key] = { gz: false, bin, args: action.runs.args ?? [] };
    if (await fileIsLarge(bin)) {
      await gzip(bin);
      mainMatrix[key].gz = true;
    }
  }
  await writeFile(join(root, "_main.mjs"), createRuntimeJS(mainMatrix));
  newRuns.main = "_main.mjs"

  if (action.runs.pre) {
    const preMatrix = {};
    for (const [key, bin] of Object.entries(action.runs.pre)) {
      preMatrix[key] = { gz: false, bin, args: [] };
      if (await fileIsLarge(bin)) {
        await gzip(bin);
        preMatrix[key].gz = true;
      }
    }
    await writeFile(join(root, "_pre.mjs"), createRuntimeJS(preMatrix));
    newRuns.pre = "_pre.mjs"
    if (action.runs["pre-if"]) newRuns["pre-if"] = action.runs["pre-if"]
  }

  if (action.runs.post) {
    const postMatrix = {};
    for (const [key, bin] of Object.entries(action.runs.post)) {
      postMatrix[key] = { gz: false, bin, args: [] };
      if (await fileIsLarge(bin)) {
        await gzip(bin);
        postMatrix[key].gz = true;
      }
    }
    await writeFile(join(root, "_post.mjs"), createRuntimeJS(postMatrix));
    newRuns.post = "_post.mjs"
    if (action.runs["post-if"]) newRuns["post-if"] = action.runs["post-if"]
  }

    action.runs = newRuns;
  await writeAction(root, action);
}
