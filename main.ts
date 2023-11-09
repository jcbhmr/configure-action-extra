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
const file = join(dirname(process.argv[1]), ${JSON.stringify(relative)});
const subprocess = spawn(file, { stdio: "inherit" });
process.exitCode = (await once(subprocess, "exit"))[0];
`;

const targetSpecificWrapper = ({
  "windows-x64": windows_x64,
  "linux-x64": linux_x64,
  "macos-x64": macos_x64,
}) => `\
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { once } from "node:events";
const relative = {
  "win32,x64": ${JSON.stringify(windows_x64)},
  "linux,x64": ${JSON.stringify(linux_x64)},
  "darwin,x64": ${JSON.stringify(macos_x64)},
}[[process.platform, process.arch].toString()];
const file = join(dirname(process.argv[1]), relative);
const subprocess = spawn(file, { stdio: "inherit" });
process.exitCode = (await once(subprocess, "exit"))[0];
`;

const targetSpecificGzipWrapper = ({
  "windows-x64": windows_x64,
  "linux-x64": linux_x64,
  "macos-x64": macos_x64,
}) => `\
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { once } from "node:events";
import { createReadStream, createWriteStream } from "node:fs";
import { chmod, stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
const relative = {
  "win32,x64": ${JSON.stringify(windows_x64)},
  "linux,x64": ${JSON.stringify(linux_x64)},
  "darwin,x64": ${JSON.stringify(macos_x64)},
}[[process.platform, process.arch].toString()];
const file = join(dirname(process.argv[1]), relative);
await pipeline(
  createReadStream(\`\${file}.gz\`),
  createGunzip(),
  createWriteStream(file)
);
await chmod(file, (await stat(\`\${file}.gz\`)).mode);
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
  let text: string;
  if (typeof entry === "object") {
    const relatives = Object.values(entry);
    const absolutes = relatives.map((x) => join(root, x));
    const sizes = await Promise.all(absolutes.map((x) => sizeMB(x)));
    if (sizes.some((x) => x > 99)) {
      await $`gzip ${absolutes.filter((x) => existsSync(x))}`;
      text = targetSpecificGzipWrapper(entry);
    } else {
      text = targetSpecificWrapper(entry);
    }
  } else if (typeof entry === "string") {
    text = basicWrapper(entry);
  } else {
    continue;
  }
  await writeFile(join(root, `_${stage}.mjs`), text);
  action.runs[stage] = `_${stage}.mjs`;
}
await writeFile(actionPath, YAML.stringify(action));
