import { existsSync, readFileSync } from "fs";
import path from "path";
import { MODEL, OPENROUTER_URL } from "./constants";

let loaded = false;

function parseDotEnv(contents: string) {
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

export function loadLabEnv() {
  if (loaded) return;
  loaded = true;
  const candidates = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "..", ".env"),
  ];
  for (const file of candidates) {
    if (existsSync(file)) {
      parseDotEnv(readFileSync(file, "utf-8"));
    }
  }
}

function firstNonEmpty(...values: (string | undefined | null)[]) {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

export function getApiKey(override?: string | null) {
  loadLabEnv();
  return firstNonEmpty(
    override,
    process.env.OPENROUTER_API_KEY,
    process.env.OPENAI_API_KEY
  );
}

export function getModel(override?: string | null) {
  loadLabEnv();
  return firstNonEmpty(
    override,
    process.env.MODEL,
    process.env.OPENAI_MODEL,
    MODEL
  );
}

export function normalizeChatCompletionsUrl(url: string) {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  return `${trimmed}/chat/completions`;
}

export function getApiUrl(override?: string | null) {
  loadLabEnv();
  return normalizeChatCompletionsUrl(
    firstNonEmpty(
      override,
      process.env.OPENAI_BASE_URL,
      process.env.OPENROUTER_URL,
      OPENROUTER_URL
    )
  );
}

export function hasServerApiKey() {
  return Boolean(getApiKey());
}

function isLabRoot(dir: string) {
  return (
    existsSync(path.join(dir, "notes.md")) &&
    existsSync(path.join(dir, "agent.py")) &&
    existsSync(path.join(dir, "web"))
  );
}

export function getWorkDir() {
  loadLabEnv();
  const fromEnv = process.env.LAB_WORK_DIR?.trim();
  if (fromEnv) return path.resolve(fromEnv);

  let dir = path.resolve(process.cwd());
  for (let i = 0; i < 8; i++) {
    if (isLabRoot(dir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  // Next.js usually runs from web/; lab files live one level up.
  return path.resolve(process.cwd(), "..");
}
