import { execFile } from "child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { promisify } from "util";
import { getWorkDir } from "./env";
import type { ToolCall } from "./types";

const execFileAsync = promisify(execFile);

function resolveInWorkspace(inputPath: string) {
  const root = path.resolve(getWorkDir());
  const resolved = path.resolve(root, inputPath);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path is outside the lab workspace: ${inputPath}`);
  }
  return resolved;
}

export function toolReadFile(filePath: string): { ok: boolean; result: string } {
  try {
    const target = resolveInWorkspace(filePath);
    if (!existsSync(target)) {
      return { ok: false, result: `File ${filePath} not found` };
    }
    return { ok: true, result: readFileSync(target, "utf-8") };
  } catch (error) {
    return { ok: false, result: error instanceof Error ? error.message : String(error) };
  }
}

export function toolListFiles(dirPath = "."): string {
  const target = resolveInWorkspace(dirPath);
  const entries = readdirSync(target, { withFileTypes: true }).map((entry) =>
    entry.name + (entry.isDirectory() ? "/" : "")
  );
  return entries.sort().join("\n") || "(empty directory)";
}

export function toolWriteFile(filePath: string, content: string): string {
  const target = resolveInWorkspace(filePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content, "utf-8");
  if (!existsSync(target)) {
    throw new Error(`Write reported success but ${target} is missing.`);
  }
  return `Saved ${target} (${content.length} characters)`;
}

export async function toolRunCommand(command: string): Promise<string> {
  const workDir = getWorkDir();
  try {
    const { stdout, stderr } = await execFileAsync("cmd.exe", ["/c", command], {
      cwd: workDir,
      timeout: 120_000,
      windowsHide: true,
      maxBuffer: 2_000_000,
    });
    const output = `${stdout}${stderr}`.trim();
    return output || "(no output, exit code 0)";
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string; code?: number };
    const output = `${err.stdout ?? ""}${err.stderr ?? ""}`.trim();
    return output || err.message || `Error running command (exit ${err.code ?? "?"})`;
  }
}

export function parseToolArgs(toolCall: ToolCall): Record<string, unknown> {
  try {
    return JSON.parse(toolCall.function.arguments || "{}");
  } catch {
    return {};
  }
}

export async function executeKnownTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ ok: boolean; result: string }> {
  if (name === "list_files") {
    return { ok: true, result: toolListFiles(String(args.path ?? ".")) };
  }
  if (name === "read_file") {
    return toolReadFile(String(args.path ?? ""));
  }
  if (name === "write_file") {
    return {
      ok: true,
      result: toolWriteFile(String(args.path ?? ""), String(args.content ?? "")),
    };
  }
  return { ok: false, result: `Error: unknown tool '${name}'.` };
}
