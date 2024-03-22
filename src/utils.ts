import * as YAML from "yaml";
import { pipeline } from "node:stream/promises";
import { createReadStream, createWriteStream, existsSync } from "node:fs";
import { chmod, open, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createGunzip } from "node:zlib";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

export async function fileIsLarge(path: string) {
  return (await stat(path)).size > 50_000_000;
}

export async function gzip(path: string) {
  await pipeline(
    createReadStream(path),
    createGunzip(),
    createWriteStream(`${path}.gz`),
  );
  await chmod(`${path}.gz`, (await stat(path)).mode);
  await rm(path);
}

export async function gunzip(path: string) {
  await pipeline(
    createReadStream(`${path}.gz`),
    createGunzip(),
    createWriteStream(path),
  );
  await chmod(path, (await stat(`${path}.gz`)).mode);
  await rm(`${path}.gz`);
}

export function replacexec(cmd: string, args: string[]) {
  const { status, signal, error } = spawnSync(cmd, args, { stdio: "inherit" });
  if (error) throw error;
  if (status != null) process.exit(status);
  if (signal) process.kill(process.pid, signal);
  throw new DOMException("unreachable", "IllegalStateError");
}

export async function readAction(root: string) {
  const text = await readFile(join(root, "action.yml"), "utf8").catch(() =>
    readFile(join(root, "action.yaml"), "utf8"),
  );
  return YAML.parse(text);
}

export async function writeAction(root: string, action: any) {
  const path = existsSync(join(root, "action.yml"))
    ? join(root, "action.yml")
    : join(root, "action.yaml");
  await writeFile(path, YAML.stringify(action));
}
