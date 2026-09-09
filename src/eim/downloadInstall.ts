/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 28th April 2025 4:34:49 pm
 * Copyright 2025 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import axios from "axios";
import os from "os";
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve as pathResolve,
} from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { constants as fsConstants } from "fs";
import { open } from "fs/promises";
import type { FileHandle } from "fs/promises";
import {
  appendFile,
  copy,
  createWriteStream,
  ensureDir,
  move,
  pathExists,
  readFile,
  readdir,
  remove,
  symlink,
  WriteStream,
  writeFile,
} from "fs-extra";
import { CancellationToken, env, Progress, UIKind, window } from "vscode";
import { OutputChannel } from "../logger/outputChannel";
import del from "del";
import { dirExistPromise, isBinInPath, spawn } from "../utils";
import * as yauzl from "yauzl";
import { Logger } from "../logger/logger";
import { getEimIdfJson } from "./getExistingSetups";
import { readParameter } from "../idfConfiguration";

type EimShellProfileTarget = {
  path: string;
  shellType: "fish" | "posix";
};

export function isVSCodeInstalledViaSnap(): boolean {
  return (
    process.platform === "linux" &&
    (!!process.env.SNAP || process.execPath.includes("/snap/"))
  );
}

export function shouldForceCliMode(): boolean {
  return typeof env.remoteName !== "undefined" || env.uiKind === UIKind.Web;
}

function getEimHomeDir(): string {
  const homeDir =
    os.homedir() ||
    (process.platform === "win32"
      ? process.env.USERPROFILE || process.env.HOME
      : process.env.HOME || process.env.USERPROFILE);

  if (!homeDir) {
    throw new Error("Unable to resolve the user home directory.");
  }

  return homeDir;
}

function getEimInstallDir(mode: "cli" | "gui"): string {
  if (process.platform === "darwin" && mode === "gui") {
    return "/Applications";
  }

  if (
    process.platform !== "win32" &&
    process.platform !== "linux" &&
    process.platform !== "darwin"
  ) {
    throw new Error(`Unsupported platform: ${process.platform}`);
  }

  const subdir = mode === "cli" ? "eim" : "eim_gui";
  return join(getEimHomeDir(), ".espressif", subdir);
}

function getCliBinaryPath(): Promise<string> {
  const installDir = getEimInstallDir("cli");
  if (process.platform === "win32") {
    return findWindowsEimBinary(installDir, "cli");
  }

  return findUnixEimBinary(installDir, join(installDir, "eim"));
}

function getGuiAssetArch(arch: string): "aarch64" | "x64" {
  switch (arch) {
    case "arm64":
      return "aarch64";
    case "x64":
      return "x64";
    default:
      throw new Error(`Unsupported architecture: ${arch}`);
  }
}

function getLinuxCliAssetArch(arch: string): "aarch64" | "armv7" | "x64" {
  switch (arch) {
    case "arm64":
      return "aarch64";
    case "arm":
      return "armv7";
    case "x64":
      return "x64";
    default:
      throw new Error(`Unsupported architecture: ${arch}`);
  }
}

/** OS/arch/mode prefix used to filter release assets (no extension, no version). */
function getEimAssetName(mode: "cli" | "gui", arch: string): string {
  if (process.platform === "win32") {
    if (arch !== "x64") {
      throw new Error(`Unsupported architecture: ${arch}`);
    }

    return `eim-${mode}-windows-x64`;
  }

  if (process.platform === "darwin") {
    return `eim-${mode}-macos-${getGuiAssetArch(arch)}`;
  }

  if (process.platform === "linux") {
    const linuxArch =
      mode === "cli" ? getLinuxCliAssetArch(arch) : getGuiAssetArch(arch);
    return `eim-${mode}-linux-${linuxArch}`;
  }

  throw new Error(`Unsupported platform: ${process.platform}`);
}

function getEimAssetExtension(): ".exe" | ".zip" {
  return process.platform === "win32" ? ".exe" : ".zip";
}

/** Matches prefix.ext or prefix-vX.Y.Z.ext from eim_unified_release.json. */
function isEimPortableAsset(
  assetName: string,
  prefix: string,
  extension: string
): boolean {
  if (!assetName.startsWith(prefix) || !assetName.endsWith(extension)) {
    return false;
  }

  const middle = assetName.slice(prefix.length, -extension.length);
  return middle === "" || /^-v\d+\.\d+\.\d+$/.test(middle);
}

function isVersionedEimAsset(
  assetName: string,
  prefix: string,
  extension: string
): boolean {
  if (!assetName.startsWith(prefix) || !assetName.endsWith(extension)) {
    return false;
  }

  const middle = assetName.slice(prefix.length, -extension.length);
  return /^-v\d+\.\d+\.\d+$/.test(middle);
}

function compareVersionTuples(left: number[], right: number[]): number {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index++) {
    const difference = (left[index] || 0) - (right[index] || 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
}

function compareEimAssetVersions(
  left: string,
  right: string,
  prefix: string,
  extension: string
): number {
  const versionOf = (name: string) =>
    name
      .slice(prefix.length + 2, -extension.length)
      .split(".")
      .map(Number);

  return compareVersionTuples(versionOf(left), versionOf(right));
}

function pickPreferredEimAssetName(
  names: string[],
  prefix: string,
  extension: string
): string | undefined {
  const matches = names.filter((name) =>
    isEimPortableAsset(name, prefix, extension)
  );
  if (matches.length === 0) {
    return undefined;
  }

  const versioned = matches
    .filter((name) => isVersionedEimAsset(name, prefix, extension))
    .sort((left, right) =>
      compareEimAssetVersions(left, right, prefix, extension)
    );
  if (versioned.length > 0) {
    return versioned[versioned.length - 1];
  }

  return matches[0];
}

function findEimReleaseAsset(
  assets: Array<{ name: string; browser_download_url: string }>,
  prefix: string,
  extension: string
): { name: string; browser_download_url: string } | undefined {
  const preferredName = pickPreferredEimAssetName(
    assets.map((asset) => asset.name),
    prefix,
    extension
  );
  if (!preferredName) {
    return undefined;
  }

  return assets.find((asset) => asset.name === preferredName);
}

async function findWindowsEimBinary(
  installDir: string,
  mode: "cli" | "gui"
): Promise<string> {
  const prefix = `eim-${mode}-windows-x64`;
  const extension = ".exe";
  const fallback = join(installDir, `${prefix}${extension}`);

  try {
    if (!(await pathExists(installDir))) {
      return fallback;
    }

    const preferredName = pickPreferredEimAssetName(
      await readdir(installDir),
      prefix,
      extension
    );
    if (!preferredName) {
      return fallback;
    }

    return join(installDir, preferredName);
  } catch (error) {
    const err = error as Error;
    Logger.error(
      `Error while discovering Windows EIM binary: ${err.message}`,
      err,
      "findWindowsEimBinary"
    );
    return fallback;
  }
}

async function findUnixEimBinary(
  installDir: string,
  fallback: string
): Promise<string> {
  const stablePath = join(installDir, "eim");
  if (await pathExists(stablePath)) {
    return stablePath;
  }

  try {
    if (!(await pathExists(installDir))) {
      return fallback;
    }

    const versioned = (await readdir(installDir))
      .filter((name) => /^eim_v\d+\.\d+\.\d+$/.test(name))
      .sort((left, right) =>
        compareVersionTuples(
          left.slice("eim_v".length).split(".").map(Number),
          right.slice("eim_v".length).split(".").map(Number)
        )
      );
    if (versioned.length === 0) {
      return fallback;
    }

    return join(installDir, versioned[versioned.length - 1]);
  } catch (error) {
    const err = error as Error;
    Logger.error(
      `Error while discovering Unix EIM binary: ${err.message}`,
      err,
      "findUnixEimBinary"
    );
    return fallback;
  }
}

export async function resolveEimPath(): Promise<string> {
  let eimPath = "";

  // 1. Check eim is in PATH and use it
  Logger.info("[resolveEimPath] Step 1: checking eim in PATH");
  const eimInPATH = await isBinInPath("eim", process.env);
  if (eimInPATH) {
    Logger.info(`[resolveEimPath] Found eim in PATH: ${eimInPATH}`);
    eimPath = eimInPATH;
  }
  // 2. Check eim_idf.json for existing EIM path
  if (!eimPath) {
    Logger.info(
      "[resolveEimPath] Step 2: checking eim_idf.json for existing EIM path"
    );
    const eimJSON = await getEimIdfJson();
    if (eimJSON && eimJSON.eimPath) {
      Logger.info(`[resolveEimPath] eim_idf.json eimPath: ${eimJSON.eimPath}`);
      const doesEimPathExists = await pathExists(eimJSON.eimPath);
      if (doesEimPathExists) {
        eimPath = eimJSON.eimPath;
      }
    }
  }
  // 3. Check EIM_PATH env variable if not found in eim_idf.json
  if (!eimPath) {
    const envEimPath = process.env.EIM_PATH;
    Logger.info(
      `[resolveEimPath] Step 3: checking EIM_PATH env variable${
        envEimPath ? `: ${envEimPath}` : " (not set)"
      }`
    );
    eimPath = envEimPath || "";
  }
  // 4. Check managed install locations — GUI first unless headless/snap/remote/web
  const forceCliMode = shouldForceCliMode() || isVSCodeInstalledViaSnap();
  const guiPath = await getEimBinaryPath(getEimInstallDir("gui"), false);
  const cliPath = await getCliBinaryPath();
  const orderedPaths = forceCliMode ? [cliPath, guiPath] : [guiPath, cliPath];
  Logger.info(
    `[resolveEimPath] Step 4: checking managed install locations (order: ${orderedPaths.join(
      ", "
    )})`
  );

  for (const candidate of orderedPaths) {
    Logger.info(`[resolveEimPath] Checking candidate: ${candidate}`);
    if (!eimPath && (await pathExists(candidate))) {
      eimPath = candidate;
    }
  }

  if (!eimPath || !(await pathExists(eimPath))) {
    Logger.info("[resolveEimPath] No eim binary found");
    return "";
  }

  Logger.info(`[resolveEimPath] Resolved eim path: ${eimPath}`);
  return eimPath;
}

export async function launchEimInTerminal(eimPath: string) {
  const idfEimExecutableArgs = readParameter(
    "idf.eimExecutableArgs"
  ) as string[];
  const argsString = idfEimExecutableArgs.join(" ");
  const escapedEimPath = `"${eimPath.replace(/(["\\$`])/g, "\\$1")}"`;

  if (argsString.includes("wizard")) {
    await ensureEimPathInUserShell(eimPath);
  }

  let binaryPath = "";
  if (process.platform === "win32") {
    binaryPath = `& '${eimPath.replace(/'/g, "''")}'${
      argsString ? " " + argsString : ""
    }`;
  } else if (process.platform === "linux") {
    binaryPath = `${escapedEimPath}${argsString ? " " + argsString : ""}`;
  } else if (process.platform === "darwin") {
    binaryPath = eimPath.endsWith(".app")
      ? `open ${escapedEimPath}${argsString ? " --args " + argsString : ""}`
      : `${escapedEimPath}${argsString ? " " + argsString : ""}`;
  }
  const shellPath =
    process.platform === "win32"
      ? "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
      : env.shell;
  const espIdfTerminal = window.createTerminal({
    name: "ESP-IDF EIM",
    shellPath: shellPath,
    cwd: dirname(eimPath),
  });
  espIdfTerminal.sendText(binaryPath, true);
  espIdfTerminal.show();
}

async function ensureEimPathInUserShell(eimPath: string): Promise<void> {
  if (process.platform !== "linux") {
    return;
  }

  const homeDir = process.env.HOME;
  if (!homeDir) {
    return;
  }

  const eimDir = dirname(eimPath);
  const profileTargets = getShellProfileTargets(env.shell || "", homeDir);

  try {
    for (const profileTarget of profileTargets) {
      await ensureEimPathInProfile(profileTarget, eimDir);
    }
  } catch (error) {
    Logger.error(
      `Error while persisting EIM path: ${error.message}`,
      error,
      "ensureEimPathInUserShell"
    );
  }
}

function getShellProfileTargets(
  shellPath: string,
  homeDir: string
): EimShellProfileTarget[] {
  const shellName = basename(shellPath).toLowerCase();

  if (shellName === "bash") {
    return [
      { path: join(homeDir, ".bashrc"), shellType: "posix" },
      { path: join(homeDir, ".profile"), shellType: "posix" },
    ];
  }

  if (shellName === "zsh") {
    return [
      { path: join(homeDir, ".zshrc"), shellType: "posix" },
      { path: join(homeDir, ".zprofile"), shellType: "posix" },
    ];
  }

  if (shellName === "fish") {
    return [
      {
        path: join(homeDir, ".config", "fish", "config.fish"),
        shellType: "fish",
      },
    ];
  }

  return [{ path: join(homeDir, ".profile"), shellType: "posix" }];
}

async function ensureEimPathInProfile(
  profileTarget: EimShellProfileTarget,
  eimDir: string
): Promise<void> {
  const profileExists = await pathExists(profileTarget.path);
  const currentContent = profileExists
    ? await readFile(profileTarget.path, "utf8")
    : "";

  if (currentContent.includes(eimDir)) {
    return;
  }

  await ensureDir(dirname(profileTarget.path));
  await appendFile(
    profileTarget.path,
    createEimPathProfileSnippet(profileTarget.shellType, eimDir),
    { encoding: "utf8" }
  );
}

function createEimPathProfileSnippet(
  shellType: "fish" | "posix",
  eimDir: string
) {
  const header =
    "# Added by ESP-IDF extension so the EIM CLI can be launched directly.";

  if (shellType === "fish") {
    return [
      "",
      "# >>> ESP-IDF EIM PATH >>>",
      header,
      `if not contains -- "${eimDir}" $PATH`,
      `    set -gx PATH "${eimDir}" $PATH`,
      "end",
      "# <<< ESP-IDF EIM PATH <<<",
      "",
    ].join("\n");
  }

  return [
    "",
    "# >>> ESP-IDF EIM PATH >>>",
    header,
    'case ":$PATH:" in',
    `  *:"${eimDir}":*) ;;`,
    `  *) export PATH="${eimDir}:$PATH" ;;`,
    "esac",
    "# <<< ESP-IDF EIM PATH <<<",
    "",
  ].join("\n");
}

export async function checkEimExists(
  progress: Progress<{ message: string; increment: number }>,
  cancelToken: CancellationToken
): Promise<string> {
  if (cancelToken.isCancellationRequested) {
    return "";
  }
  progress.report({
    message: `Checking EIM already exists...`,
    increment: 0,
  });

  let eimPath: string;
  try {
    eimPath = await resolveEimPath();
    if (!eimPath) {
      return "";
    }
  } catch (error) {
    Logger.error(
      `Error while checking existing EIM: ${error.message}`,
      error,
      "checkEimExists"
    );
    return "";
  }

  progress.report({
    message: `EIM found at ${eimPath}.`,
    increment: 0,
  });
  return eimPath;
}

function getEimCommandPath(eimPath: string): string {
  if (process.platform === "darwin" && eimPath.endsWith(".app")) {
    return join(eimPath, "Contents", "MacOS", "eim");
  }

  return eimPath;
}

export async function isEimGuiCapable(eimPath: string): Promise<boolean> {
  try {
    const commandPath = getEimCommandPath(eimPath);
    await spawn(commandPath, ["gui", "--help"], {
      silent: true,
      sendToTelemetry: false,
      timeout: 5000,
    });
    return true;
  } catch {
    Logger.info(
      "EIM does not support the gui subcommand, falling back to CLI wizard mode.",
      "isEimGuiCapable"
    );
    return false;
  }
}

export async function downloadAndInstallEIM(
  progress: Progress<{ message: string; increment: number }>,
  cancelToken: CancellationToken,
  useMirror: boolean = false,
  installCliMode: boolean = shouldForceCliMode()
): Promise<string> {
  const jsonUrl = "https://dl.espressif.com/dl/eim/eim_unified_release.json";
  const eimInstallPath = getEimInstallDir(installCliMode ? "cli" : "gui");

  try {
    progress.report({
      message: `Downloading EIM versions...`,
      increment: 0,
    });
    const response = await axios.get(jsonUrl, {
      headers: { "Cache-Control": "no-cache" },
    });
    const data = response.data;

    const arch = process.arch;
    const mode = installCliMode ? "cli" : "gui";
    const osKey = getEimAssetName(mode, arch);
    const extension = getEimAssetExtension();
    const fileInfo = findEimReleaseAsset(data.assets, osKey, extension);
    if (!fileInfo) {
      throw new Error(`No file found for OS and architecture: ${osKey}`);
    }

    progress.report({
      message: `Downloading EIM: ${fileInfo.browser_download_url}`,
      increment: 0,
    });
    OutputChannel.appendLine(
      `Downloading EIM: ${fileInfo.browser_download_url}`,
      "EIM Download"
    );

    let downloadUrl = fileInfo.browser_download_url;
    const fileName = basename(downloadUrl);
    const downloadPath = join(eimInstallPath, fileName);

    const doesDownloadPathExists = await pathExists(downloadPath);
    if (!doesDownloadPathExists) {
      if (useMirror) {
        downloadUrl = downloadUrl.replace(
          "https://github.com",
          "https://dl.espressif.com/github_assets"
        );
      }

      const doesTmpDirExists = await pathExists(eimInstallPath);
      if (!doesTmpDirExists) {
        await ensureDir(eimInstallPath);
      }

      const tempDownloadPath = `${downloadPath}.tmp`;
      await remove(tempDownloadPath);
      if (cancelToken.isCancellationRequested) {
        throw new Error("Download canceled by user.");
      }

      const writeStream: WriteStream = createWriteStream(tempDownloadPath, {
        mode: 0o755,
      });
      let isCanceled = false;
      let cancellationListener: { dispose(): void } | undefined;

      try {
        const fileResponseStream = await axios({
          method: "get",
          url: downloadUrl,
          responseType: "stream",
        });
        const totalSize = Number.parseInt(
          String(fileResponseStream.headers["content-length"] || "0"),
          10
        );

        const cancellationError = new Error("Download canceled by user.");
        cancellationListener = cancelToken.onCancellationRequested(() => {
          isCanceled = true;
          fileResponseStream.data.destroy(cancellationError);
          writeStream.destroy(cancellationError);
        });
        // Guard against cancellation that occurred before the listener was registered
        // (race window during the axios await above).
        if (cancelToken.isCancellationRequested) {
          cancellationListener.dispose();
          throw cancellationError;
        }

        let downloadedSize = 0;
        fileResponseStream.data.on("data", (chunk: Buffer) => {
          downloadedSize += chunk.length;
          if (totalSize) {
            const percentCompleted = Math.round(
              (downloadedSize * 100) / totalSize
            );
            const increment = Math.round((chunk.length * 100) / totalSize);
            progress.report({
              message: `Downloading EIM... ${percentCompleted}%`,
              increment,
            });
          }
        });

        await pipeline(fileResponseStream.data, writeStream);
        await move(tempDownloadPath, downloadPath, { overwrite: true });
      } catch (error) {
        await remove(tempDownloadPath);
        if (isCanceled) {
          throw new Error("Download canceled by user.");
        }
        throw error;
      } finally {
        cancellationListener?.dispose();
      }

      OutputChannel.appendLine(
        `File downloaded and extracted to: ${downloadPath}`
      );
    } else {
      OutputChannel.appendLine(`Using existing: ${downloadPath}`);
      progress.report({
        message: `Using existing: ${downloadPath}`,
        increment: 0,
      });
    }

    if (extname(downloadPath) === ".zip") {
      await installZipFile(downloadPath, eimInstallPath, cancelToken);
      await repairMaterializedEimSymlink(eimInstallPath);
      try {
        await remove(downloadPath);
      } catch (error) {
        const err = error as Error;
        Logger.error(
          `Error removing EIM zip ${downloadPath}: ${err.message}`,
          err,
          "downloadAndInstallEIM remove zip"
        );
      }
      Logger.infoNotify(`File ${osKey} extracted to: ${eimInstallPath}`);
    }

    if (process.platform === "win32") {
      return downloadPath;
    }

    return await getEimBinaryPath(eimInstallPath, installCliMode);
  } catch (error) {
    Logger.errorNotify(
      `Error during download and extraction: ${error.message}`,
      error,
      "downloadAndExtractEIM"
    );
    return "";
  }
}

async function getEimBinaryPath(
  eimInstallPath: string,
  installCliMode: boolean
): Promise<string> {
  if (installCliMode) {
    return getCliBinaryPath();
  }

  if (process.platform === "win32") {
    return findWindowsEimBinary(eimInstallPath, "gui");
  } else if (process.platform === "darwin") {
    return join(eimInstallPath, "eim.app");
  }
  return findUnixEimBinary(eimInstallPath, join(eimInstallPath, "eim"));
}

const UNIX_ZIP_HOST = 3;
const UNIX_SYMLINK_IFMT = 0o120000;
const UNIX_IFMT = 0o170000;
const MATERIALIZED_SYMLINK_MAX_BYTES = 256;

type PendingZipSymlink = {
  absolutePath: string;
  target: string;
};

function getEntryUnixMode(entry: yauzl.Entry): number | undefined {
  if (entry.versionMadeBy >> 8 !== UNIX_ZIP_HOST) {
    return undefined;
  }
  return entry.externalFileAttributes >>> 16;
}

function isSymlinkEntry(unixMode: number | undefined): boolean {
  return unixMode !== undefined && (unixMode & UNIX_IFMT) === UNIX_SYMLINK_IFMT;
}

function getExtractedFileMode(unixMode: number | undefined): number {
  if (unixMode === undefined) {
    return 0o755;
  }
  return unixMode & 0o777 || 0o755;
}

function isExtractedPathInsideDest(
  destPath: string,
  absolutePath: string
): boolean {
  const relativePath = relative(
    pathResolve(destPath),
    pathResolve(absolutePath)
  );
  return (
    relativePath !== "" &&
    !relativePath.startsWith("..") &&
    !isAbsolute(relativePath)
  );
}

function isSafeSymlinkTargetName(target: string): boolean {
  if (
    !target ||
    target.includes("\n") ||
    target.includes("\r") ||
    target.includes("/") ||
    target.includes("\\") ||
    target.includes("..") ||
    /[?*"<>|:]/.test(target)
  ) {
    return false;
  }
  return true;
}

function readStreamToString(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: string | Buffer) => {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    });
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

async function createExtractedSymlink(
  absolutePath: string,
  target: string
): Promise<void> {
  if (!isSafeSymlinkTargetName(target)) {
    OutputChannel.appendLine(
      `Skipping unsafe zip symlink target for ${absolutePath}`
    );
    return;
  }

  const targetPath = join(dirname(absolutePath), target);
  await ensureDir(dirname(absolutePath), { mode: 0o775 });
  await remove(absolutePath);
  try {
    await symlink(target, absolutePath);
  } catch {
    try {
      await copy(targetPath, absolutePath);
    } catch {
      await writeFile(absolutePath, target, { encoding: "utf8", mode: 0o755 });
    }
  }
}

const O_NOFOLLOW_IF_SUPPORTED =
  typeof fsConstants.O_NOFOLLOW === "number" ? fsConstants.O_NOFOLLOW : 0;

async function readMaterializedSymlinkPayload(
  filePath: string
): Promise<string | undefined> {
  let handle: FileHandle;
  try {
    // O_NOFOLLOW makes the open fail on a healthy install, where eim is a real symlink.
    handle = await open(
      filePath,
      fsConstants.O_RDONLY | O_NOFOLLOW_IF_SUPPORTED
    );
  } catch {
    return undefined;
  }

  try {
    const stats = await handle.stat();
    if (!stats.isFile() || stats.size > MATERIALIZED_SYMLINK_MAX_BYTES) {
      return undefined;
    }
    const buffer = Buffer.alloc(stats.size);
    const { bytesRead } = await handle.read(buffer, 0, stats.size, 0);
    return buffer.subarray(0, bytesRead).toString("utf8").trim();
  } finally {
    await handle.close();
  }
}

async function repairMaterializedEimSymlink(destPath: string): Promise<void> {
  const eimPath = join(destPath, "eim");
  try {
    const target = await readMaterializedSymlinkPayload(eimPath);
    if (
      !target ||
      !isSafeSymlinkTargetName(target) ||
      !/^eim_v\d+\.\d+\.\d+$/.test(target)
    ) {
      return;
    }

    if (!(await pathExists(join(destPath, target)))) {
      return;
    }

    await createExtractedSymlink(eimPath, target);
  } catch (error) {
    const err = error as Error;
    Logger.error(
      `Error restoring EIM symlink: ${err.message}`,
      err,
      "repairMaterializedEimSymlink"
    );
  }
}

export class ZipFileError extends Error {
  constructor(
    public message: string,
    public methodName: string,
    public innerError: any = null,
    public errorCode: string = " "
  ) {
    super(message);
    this.errorCode = errorCode;
    this.innerError = innerError;
    this.methodName = methodName;
  }
}

export async function installZipFile(
  zipFilePath: string,
  destPath: string,
  cancelToken?: CancellationToken
) {
  return new Promise<void>(async (resolve, reject) => {
    const doesZipFileExists = await pathExists(zipFilePath);
    if (!doesZipFileExists) {
      return reject(`File ${zipFilePath} doesn't exist.`);
    }
    yauzl.open(zipFilePath, { lazyEntries: true }, (error, zipfile) => {
      if (error) {
        return reject(
          new ZipFileError("Zip file error", "InstallZipFile", error)
        );
      }
      if (cancelToken && cancelToken.isCancellationRequested) {
        return reject(
          new ZipFileError("Install cancelled by user", "InstallZipFile")
        );
      }

      const pendingSymlinks: PendingZipSymlink[] = [];
      zipfile.on("end", async () => {
        try {
          for (const pending of pendingSymlinks) {
            await createExtractedSymlink(pending.absolutePath, pending.target);
          }
          return resolve();
        } catch (err) {
          return reject(
            new ZipFileError(
              "Error restoring zip symlinks",
              "InstallZipFile",
              err
            )
          );
        }
      });
      zipfile.on("error", (err) => {
        return reject(
          new ZipFileError("Zip File error", "InstallZipFile", err)
        );
      });

      zipfile.readEntry();
      zipfile.on("entry", async (entry: yauzl.Entry) => {
        const absolutePath: string = pathResolve(destPath, entry.fileName);
        if (!isExtractedPathInsideDest(destPath, absolutePath)) {
          return reject(
            new ZipFileError(
              `Zip entry path is outside the destination: ${entry.fileName}`,
              "InstallZipFile"
            )
          );
        }
        const dirExists = await dirExistPromise(absolutePath);
        if (dirExists) {
          try {
            await del(absolutePath, { force: true });
          } catch (err) {
            OutputChannel.appendLine(
              `Error deleting previous ${absolutePath}: ${err.message}`
            );
            return reject(
              new ZipFileError(
                "Install folder cant be deleted",
                "InstallZipFile",
                err,
                err.errorCode
              )
            );
          }
        }
        if (entry.fileName.endsWith("/")) {
          try {
            await ensureDir(absolutePath, { mode: 0o775 });
            zipfile.readEntry();
          } catch (err) {
            return reject(
              new ZipFileError(
                "Error creating directory",
                "InstallZipFile",
                err
              )
            );
          }
          return;
        }

        const unixMode = getEntryUnixMode(entry);
        if (isSymlinkEntry(unixMode)) {
          zipfile.openReadStream(entry, async (err, readStream) => {
            if (err || !readStream) {
              return reject(
                new ZipFileError(
                  "Error reading zip stream",
                  "InstallZipFile",
                  err
                )
              );
            }
            try {
              const target = (await readStreamToString(readStream))
                .replace(/\0+$/g, "")
                .trim();
              pendingSymlinks.push({ absolutePath, target });
              zipfile.readEntry();
            } catch (streamErr) {
              return reject(
                new ZipFileError(
                  "Error reading symlink payload",
                  "InstallZipFile",
                  streamErr
                )
              );
            }
          });
          return;
        }

        const exists = await pathExists(absolutePath);
        if (!exists) {
          zipfile.openReadStream(entry, async (err, readStream) => {
            if (err || !readStream) {
              return reject(
                new ZipFileError(
                  "Error reading zip stream",
                  "InstallZipFile",
                  err
                )
              );
            }
            readStream.on("error", (openErr) => {
              return reject(
                new ZipFileError(
                  "Error in readstream",
                  "InstallZipFile",
                  openErr
                )
              );
            });

            try {
              await ensureDir(dirname(absolutePath), {
                mode: 0o775,
              });
            } catch (mkdirErr) {
              return reject(
                new ZipFileError(
                  "Error creating directory",
                  "InstallZipFile",
                  mkdirErr
                )
              );
            }
            const absoluteEntryTmpPath: string = absolutePath + ".tmp";
            const doesTmpPathExists = await pathExists(absoluteEntryTmpPath);
            if (doesTmpPathExists) {
              try {
                await remove(absoluteEntryTmpPath);
              } catch (rmError) {
                return reject(
                  new ZipFileError(
                    `Error unlinking tmp file ${absoluteEntryTmpPath}`,
                    "InstallZipFile",
                    rmError
                  )
                );
              }
            }
            const writeStream: WriteStream = createWriteStream(
              absoluteEntryTmpPath,
              { mode: getExtractedFileMode(unixMode) }
            );
            writeStream.on("error", (writeStreamErr) => {
              return reject(
                new ZipFileError(
                  "Error in writeStream",
                  "InstallZipFile",
                  writeStreamErr
                )
              );
            });
            writeStream.on("close", async () => {
              try {
                await move(absoluteEntryTmpPath, absolutePath);
              } catch (closeWriteStreamErr) {
                return reject(
                  new ZipFileError(
                    `Error renaming file ${absoluteEntryTmpPath}`,
                    "InstallZipFile",
                    closeWriteStreamErr
                  )
                );
              }
              zipfile.readEntry();
            });
            readStream.pipe(writeStream);
          });
        } else {
          if (extname(absolutePath) !== ".txt") {
            OutputChannel.appendLine(
              `Warning File ${absolutePath}
                                      already exists and was not updated.`
            );
          }
          zipfile.readEntry();
        }
      });
    });
  });
}
