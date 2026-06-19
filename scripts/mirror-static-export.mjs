import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const source = resolve("out");
const fallbackTarget = resolve(".vercel/output/static");

if (!existsSync(source)) {
  throw new Error("Static export output was not found at out/.");
}

rmSync(fallbackTarget, { force: true, recursive: true });
mkdirSync(fallbackTarget, { recursive: true });
cpSync(source, fallbackTarget, { recursive: true });
