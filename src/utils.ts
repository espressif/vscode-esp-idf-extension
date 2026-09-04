// Copyright 2019 Espressif Systems (Shanghai) CO LTD
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as childProcess from "child_process";
import { accessSync, constants } from "fs";
import { copy, move, pathExists, readFile, remove, stat } from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import { Logger } from "./common/logger";
import { OutputChannel } from "./common/outputChannel";
import { processInvocationMetadata } from "./common/processTelemetry";
import {
  childProcessFailedFromInvocation,
  fileNotFound,
  invalidCommandInvocation,
} from "./common/error/knownError";
import { ErrorPresentation } from "./common/error/types";
import { ESP } from "./config";
import { getCurrentIdfConfiguration } from "./configuration/env";

export const packageJson = vscode.extensions.getExtension(ESP.extensionID)
  ?.packageJSON;

export interface ISpawnOptions
  extends Omit<childProcess.SpawnOptions, "shell"> {
  /** Cancellation token to cancel the spawn */
  cancelToken?: vscode.CancellationToken;
  /** The maximum time in milliseconds to wait for the command to complete */
  timeout?: number;
  /** Whether to suppress output to the console */
  silent?: boolean;
  /** A string to return the output of the command */
  outputString?: string;
  /** Output append mode: 'appendLine', 'append', or undefined */
  appendMode?: "appendLine" | "append";
  /** Send error to telemetry */
  sendToTelemetry?: boolean;
  maxBuffer?: number;
  /** Call-site presentation for ChildProcessFailed */
  errorPresentation?: ErrorPresentation;
}

const UNSAFE_SPAWN_CHARS = /[\n\r\0]/;
const SAFE_PATH_BASENAME = /^[A-Za-z0-9._+-]+$/;

function hasUnsafeSpawnChars(value: string): boolean {
  return UNSAFE_SPAWN_CHARS.test(value);
}

function isPathLikeCommand(command: string): boolean {
  return (
    path.isAbsolute(command) || command.includes("/") || command.includes("\\")
  );
}

/**
 * Blocks env-tainted command strings from being interpreted as a shell line.
 * Path-like executables must exist; PATH lookups must be a simple basename.
 */
export function assertSafeSpawnInvocation(
  command: string,
  args: string[] = []
): void {
  if (!command || hasUnsafeSpawnChars(command)) {
    throw invalidCommandInvocation(
      command ? "Command contains control characters." : "Command is empty."
    );
  }
  for (const arg of args) {
    if (hasUnsafeSpawnChars(arg)) {
      throw invalidCommandInvocation(
        "Process argument contains control characters."
      );
    }
  }
  if (isPathLikeCommand(command)) {
    if (!canAccessFile(command, constants.X_OK)) {
      throw fileNotFound(command);
    }
    return;
  }
  if (!SAFE_PATH_BASENAME.test(command)) {
    throw invalidCommandInvocation("Command is not a safe executable name.");
  }
}

export function spawn(
  command: string,
  args: string[] = [],
  options: ISpawnOptions = {
    outputString: "",
    silent: false,
    appendMode: "appendLine",
    sendToTelemetry: true,
  }
): Promise<Buffer> {
  const {
    cancelToken,
    timeout,
    silent = false,
    appendMode = "appendLine",
    sendToTelemetry = true,
    errorPresentation,
    ...spawnOptions
  } = options;
  assertSafeSpawnInvocation(command, args);
  let buff: Buffer = Buffer.alloc(0);
  let stdoutBuff: Buffer = Buffer.alloc(0);
  let stderrBuff: Buffer = Buffer.alloc(0);
  const sendToOutputChannel = (data: Buffer, stream: "stdout" | "stderr") => {
    buff = Buffer.concat([buff, data]);
    if (stream === "stdout") {
      stdoutBuff = Buffer.concat([stdoutBuff, data]);
    } else {
      stderrBuff = Buffer.concat([stderrBuff, data]);
    }
    options.outputString += buff.toString();
    if (!silent) {
      if (appendMode === "append") {
        OutputChannel.append(data.toString());
      } else {
        OutputChannel.appendLine(data.toString());
      }
    }
  };
  const failedFromSpawn = (
    spawnError?: NodeJS.ErrnoException | (Error & { code?: string | number }),
    exitCode?: number | null
  ) =>
    childProcessFailedFromInvocation(
      command,
      args,
      {
        stdout: stdoutBuff.toString(),
        stderr: stderrBuff.toString(),
        exitCode,
        spawnError,
      },
      errorPresentation
    );
  return new Promise((resolve, reject) => {
    spawnOptions.cwd =
      spawnOptions.cwd || path.resolve(path.join(__dirname, ".."));
    const child = childProcess.spawn(command, args, {
      ...spawnOptions,
      shell: false,
    });
    let timeoutHandler = undefined;
    let settled = false;
    const settle = (action: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      action();
    };
    if (typeof timeout === "number" && timeout > 0) {
      timeoutHandler = setTimeout(() => {
        child.kill();
      }, timeout);
    }

    if (cancelToken) {
      cancelToken.onCancellationRequested(() => {
        child.kill();
      });
    }

    child.stdout?.on("data", (data: Buffer) =>
      sendToOutputChannel(data, "stdout")
    );
    child.stderr?.on("data", (data: Buffer) =>
      sendToOutputChannel(data, "stderr")
    );

    child.on("error", (error) => {
      if (timeoutHandler) {
        clearTimeout(timeoutHandler);
      }
      settle(() => reject(failedFromSpawn(error)));
    });

    child.on("exit", (code) => {
      if (timeoutHandler) {
        clearTimeout(timeoutHandler);
      }
      if (code === 0) {
        settle(() => resolve(buff));
        return;
      }
      settle(() => {
        const err = failedFromSpawn(undefined, code);
        Logger.error(
          err.message,
          err,
          "src utils spawn",
          processInvocationMetadata(command, args),
          sendToTelemetry
        );
        reject(err);
      });
    });
  });
}

export function canAccessFile(
  filePath: string,
  mode?: number,
  expectedValue?: string
): boolean {
  if (!filePath) {
    return false;
  }
  try {
    // tslint:disable-next-line: no-bitwise
    mode = mode || constants.R_OK | constants.W_OK | constants.X_OK;
    accessSync(filePath, mode);
    return true;
  } catch (error) {
    Logger.error(
      `Cannot access filePath: ${filePath} with mode: ${mode} and expectedValue: ${expectedValue}`,
      error as Error,
      "src utils canAccessFile",
      undefined,
      false
    );
    return false;
  }
}

export async function getToolchainPath(tool: string = "gcc") {
  const modifiedEnv = getCurrentIdfConfiguration();
  const idfTarget = modifiedEnv.IDF_TARGET || "esp32";
  const gccTool = getToolchainToolName(idfTarget, tool);
  try {
    return await isBinInPath(gccTool, modifiedEnv);
  } catch (error) {
    Logger.errorNotify(
      `${tool} is not found in current IDF setup`,
      error as Error,
      "utils getToolchainPath"
    );
    return;
  }
}

export function getToolchainToolName(idfTarget: string, tool: string = "gcc") {
  switch (idfTarget) {
    case "esp32":
    case "esp32s2":
    case "esp32s3":
      return `xtensa-${idfTarget}-elf-${tool}`;
    case "esp32c2":
    case "esp32c3":
    case "esp32c6":
    case "esp32h2":
    default:
      return `riscv32-esp-elf-${tool}`;
  }
}

export function execChildProcess(
  command: string,
  args: string[] = [],
  workingDirectory: string,
  channel?: vscode.OutputChannel,
  opts?: Omit<childProcess.ExecFileOptions, "shell">,
  cancelToken?: vscode.CancellationToken
): Promise<string> {
  assertSafeSpawnInvocation(command, args);
  const execOpts: childProcess.ExecFileOptionsWithStringEncoding = {
    cwd: workingDirectory,
    maxBuffer: 500 * 1024,
    ...(opts ?? {}),
    encoding:
      opts?.encoding && opts.encoding !== "buffer"
        ? (opts.encoding as BufferEncoding)
        : "utf8",
    shell: false,
  };
  return new Promise<string>((resolve, reject) => {
    childProcess.execFile(
      command,
      args,
      execOpts,
      (
        error: childProcess.ExecFileException | null,
        stdout: string,
        stderr: string
      ) => {
        if (cancelToken && cancelToken.isCancellationRequested) {
          return reject(new Error("Process cancelled by user"));
        }
        if (channel) {
          let message: string = "";
          let err: boolean = false;
          if (stdout && stdout.length > 0) {
            message += stdout;
          }
          if (stderr && stderr.length > 0) {
            message += stderr;
            if (
              !stderr.toLowerCase().startsWith("warning") &&
              stderr.includes("Error")
            ) {
              err = true;
            }
          }
          if (error) {
            message += error.message;
            err = true;
          }
          if (err) {
            channel.append(message);
            channel.show();
          }
        }

        if (error) {
          const failed = childProcessFailedFromInvocation(command, args, {
            stdout,
            stderr,
            exitCode: typeof error.code === "number" ? error.code : undefined,
            spawnError: error,
          });
          if (error.message) {
            Logger.error(
              failed.message,
              failed,
              "utils execChildProcess",
              processInvocationMetadata(command, args)
            );
          }
          return reject(failed);
        }
        if (stderr && stderr.length > 2) {
          if (
            !stderr.startsWith("Open On-Chip Debugger v") &&
            !stderr.toLowerCase().startsWith("warning")
          ) {
            Logger.error(
              stderr,
              new Error(stderr),
              "utils execChildProcess stderr",
              processInvocationMetadata(command, args)
            );
          }
          if (
            !stderr.toLowerCase().startsWith("warning") &&
            stderr.includes("Error")
          ) {
            return reject(
              childProcessFailedFromInvocation(command, args, {
                stdout,
                stderr,
              })
            );
          }
        }
        return resolve(stdout.concat(stderr));
      }
    );
  });
}

export function dirExistPromise(dirPath: string): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    if (!dirPath) {
      return resolve(false);
    }
    stat(dirPath, (err, stats) => {
      if (err) {
        return resolve(false);
      } else {
        if (stats.isDirectory()) {
          return resolve(true);
        }
        return resolve(false);
      }
    });
  });
}

export async function getEspIdfFromCMake(espIdfPath: string) {
  const doesIdfPathExists = await pathExists(espIdfPath);
  if (!doesIdfPathExists) {
    Logger.info(`${espIdfPath} does not exist to get ESP-IDF version.`);
    return "x.x";
  }
  const versionFilePath = path.join(
    espIdfPath,
    "tools",
    "cmake",
    "version.cmake"
  );
  const doesVersionFileExists = await pathExists(versionFilePath);
  if (!doesVersionFileExists) {
    Logger.info(`${versionFilePath} does not exist to get ESP-IDF version.`);
    return "x.x";
  }
  const versionFileContent = await readFile(versionFilePath, "utf8");
  let versionMatches: RegExpExecArray | null;
  let espVersion: { [key: string]: string } = {};
  const cmakeVersionRegex = new RegExp(
    /\s*set\s*\(\s*IDF_VERSION_([A-Z]{5})\s+(\d+)/gm
  );
  while ((versionMatches = cmakeVersionRegex.exec(versionFileContent))) {
    espVersion[versionMatches[1]] = versionMatches[2];
  }
  if (Object.keys(espVersion).length) {
    return `${espVersion["MAJOR"]}.${espVersion["MINOR"]}.${espVersion["PATCH"]}`;
  } else {
    return "x.x";
  }
}

export async function checkGitExists(workingDir: string, gitPath: string) {
  try {
    const gitBinariesExists = await pathExists(gitPath);
    if (!gitBinariesExists) {
      const gitInPath = await isBinInPath("git", process.env);
      if (!gitInPath) {
        return "Not found";
      }
      gitPath = gitInPath;
    }
    const gitRawVersion = await execChildProcess(
      gitPath,
      ["--version"],
      workingDir
    );
    const match = gitRawVersion.match(
      /(?:git\sversion\s)(\d+)(.\d+)?(.\d+)?(?:.windows.\d+)?/g
    );
    if (match && match.length) {
      return match[0].replace("git version ", "");
    } else {
      return "Not found";
    }
  } catch (error) {
    Logger.errorNotify(
      "Git is not found in current environment",
      error as Error,
      "utils checkGitExists"
    );
    return "Not found";
  }
}

export async function getAllBinPathInEnvPath(
  binaryName: string,
  env: NodeJS.ProcessEnv
) {
  let pathNameInEnv: string =
    Object.keys(process.env).find((k) => k.toUpperCase() == "PATH") || "PATH";
  const pathDirs = env[pathNameInEnv]?.split(path.delimiter) || [];
  const foundBinaries: string[] = [];
  for (const pathDir of pathDirs) {
    let binaryPath = path.join(pathDir, binaryName);
    if (process.platform === "win32" && !binaryName.endsWith(".exe")) {
      binaryPath = `${binaryPath}.exe`;
    }
    const doesPathExists = await pathExists(binaryPath);
    if (doesPathExists) {
      const pathStats = await stat(binaryPath);
      if (pathStats.isFile() && canAccessFile(binaryPath, constants.X_OK)) {
        foundBinaries.push(binaryPath);
      }
    }
  }
  return foundBinaries;
}

/**
 * Find the binary in the PATH environment variable and return its absolute path. If containerDir is provided, it will check if the binary path contains the containerDir path and return it only if it's true.
 * @param {string} binaryName - The name of the binary to find in the PATH environment variable.
 * @param {NodeJS.ProcessEnv} env - The environment variables to use for the search.
 * @param {string[]} [containerDir] - Optional array of directory paths to check if the binary path contains any of them.
 * @returns {Promise<string>} The absolute path of the binary if found, otherwise an empty string.
 */
export async function isBinInPath(
  binaryName: string,
  env: NodeJS.ProcessEnv,
  containerDir?: string[]
): Promise<string> {
  let pathNameInEnv: string =
    Object.keys(process.env).find((k) => k.toUpperCase() == "PATH") || "PATH";
  const pathDirs = env[pathNameInEnv]?.split(path.delimiter) || [];
  for (const pathDir of pathDirs) {
    let binaryPath = path.join(pathDir, binaryName);
    if (process.platform === "win32" && !binaryName.endsWith(".exe")) {
      binaryPath = `${binaryPath}.exe`;
    }
    const doesPathExists = await pathExists(binaryPath);
    if (doesPathExists) {
      if (containerDir && containerDir.length) {
        const resultContainerPath = containerDir.join(path.sep);
        if (binaryPath.indexOf(resultContainerPath) === -1) {
          continue;
        }
      }
      const pathStats = await stat(binaryPath);
      if (pathStats.isFile() && canAccessFile(binaryPath, constants.X_OK)) {
        return binaryPath;
      }
    }
  }
  return "";
}

export function getWebViewFavicon(extensionPath: string): vscode.Uri {
  return vscode.Uri.file(
    path.join(extensionPath, "media", "espressif_icon.png")
  );
}

/**
 * Compare two version strings based on semantic versioning.
 * @param {string} v1 - String containing dot-separated numbers.
 * @param {string} v2 - String containing dot-separated numbers.
 * @return {number} v1 > v2 => 1 | v1 < v2 => -1 | v1 = v2 => 0
 */
export function compareVersion(v1: string, v2: string) {
  const v1Parts = v1.split(".");
  const v2Parts = v2.split(".");
  const minParts = Math.min(v1Parts.length, v2Parts.length);
  for (let i = 0; i < minParts; i++) {
    let v1Ver = parseInt(v1Parts[i], 10);
    let v2Ver = parseInt(v2Parts[i], 10);
    if (v1Ver > v2Ver) return 1;
    if (v1Ver < v2Ver) return -1;
  }
  return v1Parts.length === v2Parts.length
    ? 0
    : v1Parts.length < v2Parts.length
    ? -1
    : 1;
}

/**
 * Robust move function that handles Windows EPERM errors
 * Falls back to copy + remove if rename fails
 */
export async function robustMove(
  source: string,
  destination: string
): Promise<void> {
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await move(source, destination);
      return; // Success, exit the function
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      // On Windows, EPERM errors are common when moving directories
      if (err.code === "EPERM" || err.code === "EACCES") {
        if (attempt === maxRetries) {
          // Last attempt, use fallback method
          const fallbackMsg = `Move operation failed with ${err.code} after ${maxRetries} attempts, falling back to copy + remove...`;
          OutputChannel.init().appendLine(fallbackMsg);
          Logger.info(fallbackMsg);

          // Ensure destination directory doesn't exist
          if (await pathExists(destination)) {
            await remove(destination);
          }

          // Copy the directory
          await copy(source, destination);

          // Remove the source directory
          await remove(source);

          const successMsg = `Successfully moved directory using fallback method`;
          OutputChannel.init().appendLine(successMsg);
          Logger.info(successMsg);
          return;
        } else {
          // Retry with delay
          const retryMsg = `Move operation failed with ${err.code}, retrying in ${retryDelay}ms (attempt ${attempt}/${maxRetries})...`;
          OutputChannel.init().appendLine(retryMsg);
          Logger.error(retryMsg, new Error(retryMsg), "robustMove");
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      } else {
        // Re-throw other errors immediately
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        Logger.error(errorMessage, error as Error, "robustMove");
      }
    }
  }
}
