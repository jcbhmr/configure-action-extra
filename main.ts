import { readFile, writeFile } from "node:fs/promises";
import * as core from "npm:@actions/core";
import * as YAML from "npm:yaml";

const basicWrapper = (relative) => `\
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { once } from "node:events";
const file = join(dirname(process.argv[1]), ${JSON.stringify(relative)});
const subprocess = spawn(file, { stdio: "inherit" });
process.exitCode = (await once(subprocess, "exit"))[0];
`;

const targetSpecificWrapper = ({ windows_x64, linux_x64, macos_x64 }) => `\
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

const action = YAML.parse(await readFile(core.getInput("action-file"), "utf8"));
const main = core.getInput("main") || action.runs.using.main;
let mainText: string;
if (main) {
  mainText = basicWrapper(main);
} else {
  const windows_x64 =
    core.getInput("main-windows-x64") || action.runs.using["main-windows-x64"];
  const linux_x64 =
    core.getInput("main-linux-x64") || action.runs.using["main-linux-x64"];
  const macos_x64 =
    core.getInput("main-macos-x64") || action.runs.using["main-macos-x64"];
  mainText = targetSpecificWrapper({ windows_x64, linux_x64, macos_x64 });
}

const pre = core.getInput("pre") || action.runs.using.pre;
let preText: string | undefined;
if (pre) {
  preText = basicWrapper(pre);
} else {
  const windows_x64 =
    core.getInput("pre-windows-x64") || action.runs.using["pre-windows-x64"];
  const linux_x64 =
    core.getInput("pre-linux-x64") || action.runs.using["pre-linux-x64"];
  const macos_x64 =
    core.getInput("pre-macos-x64") || action.runs.using["pre-macos-x64"];
  preText = targetSpecificWrapper({ windows_x64, linux_x64, macos_x64 });
}

const post = core.getInput("post") || action.runs.using.post;
let postText: string | undefined;
if (post) {
  postText = basicWrapper(post);
} else {
  const windows_x64 =
    core.getInput("post-windows-x64") || action.runs.using["post-windows-x64"];
  const linux_x64 =
    core.getInput("post-linux-x64") || action.runs.using["post-linux-x64"];
  const macos_x64 =
    core.getInput("post-macos-x64") || action.runs.using["post-macos-x64"];
  postText = targetSpecificWrapper({ windows_x64, linux_x64, macos_x64 });
}

await writeFile("_main.mjs", mainText);
await writeFile("_pre.mjs", preText);
await writeFile("_post.mjs", postText);
