import { stat, readFile, writeFile } from "node:fs/promises";
import * as core from "@actions/core";
import * as YAML from "yaml";
import assert from "node:assert";
import { existsSync } from "node:fs";
import { $ } from "execa";

const sizeMB = (f) =>
  stat(f)
    .then((r) => r.size / 1_000_000)
    .catch(() => null);

function getStringOrMapInput(name) {
  const text = core.getInput(name);
  const yaml = YAML.parse(text);
  if (typeof yaml === "object") {
    return yaml;
  } else {
    return text;
  }
}

const basicWrapper = (relative) => `\
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { once } from "node:events";
const __FILE = join(dirname(process.argv[1]), ${JSON.stringify(relative)});
const subprocess = spawn(\`exec "$__FILE"\`, {
  stdio: "inherit",
  shell: "bash",
  env: { ...process.env, __FILE },
});
process.exitCode = (await once(subprocess, "exit"))[0];
`;

const targetSpecificWrapper = (map) => `\
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { once } from "node:events";
const key = \`\${process.env.RUNNER_OS.toLowerCase()}-\${process.env.RUNNER_ARCH.toLowerCase()}\`;
const relative = ${JSON.stringify(map)}[key];
const file = join(dirname(process.argv[1]), relative);
const subprocess = spawn(file, { stdio: "inherit" });
process.exitCode = (await once(subprocess, "exit"))[0];
`;

const root = core.getInput("path");
const actionPath = ["action.yml", "action.yaml"]
  .map((x) => join(root, x))
  .find((x) => existsSync(x));
const action = YAML.parse(await readFile(actionPath, "utf8"));

assert(action.runs.using === "executable", `unknown ${action.runs.using}`);
action.runs.using = "node20";
for (const stage of ["main", "pre", "post"]) {
  const entry = getStringOrMapInput(stage) || action.runs[stage];
  if (entry) {
    let text: string;
    if (typeof entry === "object") {
      text = targetSpecificWrapper(entry);
    } else {
      text = basicWrapper(entry);
    }
    action.runs[stage] = `_${stage}.mjs`;
    await writeFile(join(root, action.runs[stage]), text);
  }
}
await writeFile(actionPath, YAML.stringify(action));
