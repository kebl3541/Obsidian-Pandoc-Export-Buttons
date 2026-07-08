/**
 * Typed facade over the Node.js builtins this plugin uses.
 *
 * Obsidian's plugin review harness type-checks the source without Node
 * type definitions, which turns direct fs/path/child_process imports into
 * unresolved `any` values. Routing every call through these explicitly
 * typed bindings keeps the code fully type-checked in both environments.
 * The runtime objects are Obsidian desktop's own Node builtins, unchanged.
 */
import * as nodeChildProcess from "child_process";
import * as nodeFs from "fs";
import * as nodeOs from "os";
import * as nodePath from "path";

export interface PathApi {
  join(...parts: string[]): string;
  resolve(p: string): string;
  isAbsolute(p: string): boolean;
  basename(p: string): string;
  readonly delimiter: string;
}

export interface FsApi {
  existsSync(p: string): boolean;
  mkdirSync(p: string, options?: { recursive?: boolean }): void;
  writeFileSync(p: string, data: Uint8Array): void;
  unlinkSync(p: string): void;
}

export interface OsApi {
  tmpdir(): string;
}

export interface ChildStdin {
  on(event: "error", listener: (err: Error) => void): void;
  write(chunk: string): void;
  end(): void;
}

export interface SpawnedProcess {
  stdin: ChildStdin | null;
}

export interface ExecFileOptions {
  cwd?: string;
  env?: Record<string, string | undefined>;
  maxBuffer?: number;
  timeout?: number;
}

export type ExecFileCallback = (
  error: Error | null,
  stdout: string,
  stderr: string
) => void;

export type ExecFileFn = (
  file: string,
  args: string[],
  options: ExecFileOptions,
  callback: ExecFileCallback
) => SpawnedProcess;

export const path = nodePath as unknown as PathApi;
export const fs = nodeFs as unknown as FsApi;
export const os = nodeOs as unknown as OsApi;

const childProcess = nodeChildProcess as unknown as { execFile: ExecFileFn };
export const execFile = childProcess.execFile;

export const processEnv = (
  window as unknown as { process: { env: Record<string, string | undefined> } }
).process.env;
