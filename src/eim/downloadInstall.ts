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
import { basename, dirname, extname, join, resolve as pathResolve } from "path";
import {
  appendFile,
  createWriteStream,
  ensureDir,
  move,
  pathExists,
  ReadStream,
  readFile,
  remove,
  WriteStream,
} from "fs-extra";
import { CancellationToken, env, Progress, UIKind, window } from "vscode";
import { OutputChannel } from "../logger/outputChannel";
import del from "del";
import { dirExistPromise, isBinInPath } from "../utils";
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
  return (
    typeof env.remoteName !== "undefined" ||
    env.uiKind === UIKind.Web
  );
}

export async function resolveEimPath(): Promise<string> {
  let eimPath = "";

  // On macOS, prefer the GUI-capable .app bundle before checking PATH,
  // because PATH may contain a Homebrew CLI-only binary with no "gui" subcommand.
  if (process.platform === "darwin") {
    const appPath = "/Applications/eim.app";
    if (await pathExists(appPath)) {
      return appPath;
    }
  }

  // 1. Check eim is in PATH and use it
  const eimInPATH = await isBinInPath("eim", process.env);
  if (eimInPATH) {
    eimPath = eimInPATH;
  }
  // 2. Check eim_idf.json for existing EIM path
  if (!eimPath) {
    const eimJSON = await getEimIdfJson();
    if (eimJSON && eimJSON.eimPath) {
      const doesEimPathExists = await pathExists(eimJSON.eimPath);
      if (doesEimPathExists) {
        eimPath = eimJSON.eimPath;
      }
    }
  }
  // 3. Check EIM_PATH env variable if not found in eim_idf.json
  if (!eimPath) {
    eimPath = process.env.EIM_PATH || "";
  }
  // 4. Use default path based on platform if still not found
  if (!eimPath) {
    if (process.platform === "win32") {
      eimPath = join(
        process.env.USERPROFILE || "",
        ".espressif",
        "eim_gui",
        "eim-gui-windows-x64.exe"
      );
    } else if (process.platform === "linux") {
      eimPath = join(process.env.HOME || "", ".espressif", "eim_gui", "eim");
    }
  }

  const doesEimPathExists = await pathExists(eimPath);
  if (!doesEimPathExists) {
    return "";
  }

  return eimPath;
}

export async function launchEimInTerminal(eimPath: string) {
  const idfEimExecutableArgs = readParameter(
    "idf.eimExecutableArgs"
  ) as string[];
  const argsString = idfEimExecutableArgs.join(" ");

  if (argsString.includes("wizard")) {
    await ensureEimPathInUserShell(eimPath);
  }

  let binaryPath = "";
  if (process.platform === "win32") {
    binaryPath = `& '${eimPath.replace(/'/g, "''")}'${
      argsString ? " " + argsString : ""
    }`;
  } else if (process.platform === "linux") {
    binaryPath = `./${basename(eimPath)}${argsString ? " " + argsString : ""}`;
  } else if (process.platform === "darwin") {
    if (eimPath.endsWith(".app")) {
      binaryPath = `open ${eimPath}${argsString ? " --args " + argsString : ""}`;
    } else {
      // Plain CLI binary (e.g. Homebrew): run directly.
      // Homebrew eim has no "gui" subcommand — use "wizard" instead.
      const cliArgs = argsString.replace(/\bgui\b/, "wizard");
      binaryPath = `${eimPath}${cliArgs ? " " + cliArgs : ""}`;
    }
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
  if (argsString.includes("wizard")) {
    espIdfTerminal.show();
  } else {
    espIdfTerminal.sendText("exit");
  }
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
  const header = "# Added by ESP-IDF extension so the EIM CLI can be launched directly.";

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

export async function downloadAndInstallEIM(
  progress: Progress<{ message: string; increment: number }>,
  cancelToken: CancellationToken,
  useMirror: boolean = false
): Promise<string> {
  const jsonUrl = "https://dl.espressif.com/dl/eim/eim_unified_release.json";
  let eimInstallPath = "";
  if (shouldForceCliMode()) {
    eimInstallPath = join(process.env.HOME || "", ".espressif", "eim");
  } else if (process.platform === "win32") {
    eimInstallPath = join(
      process.env.USERPROFILE || "",
      ".espressif",
      "eim_gui"
    );
  } else if (process.platform === "darwin") {
    eimInstallPath = "/Applications";
  } else if (process.platform === "linux") {
    eimInstallPath = join(process.env.HOME || "", ".espressif", "eim_gui");
  }

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
    let osKey: string;

    if (shouldForceCliMode()) {
      osKey =
        arch === "arm64"
          ? "eim-cli-linux-aarch64.zip"
          : "eim-cli-linux-x64.zip";
    } else if (process.platform === "darwin") {
      osKey =
        arch === "arm64"
          ? "eim-gui-macos-aarch64.zip"
          : "eim-gui-macos-x64.zip";
    } else if (process.platform === "win32") {
      osKey = "eim-gui-windows-x64.exe";
    } else if (process.platform === "linux") {
      osKey =
        arch === "arm64"
          ? "eim-gui-linux-aarch64.zip"
          : "eim-gui-linux-x64.zip";
    } else {
      throw new Error(`Unsupported platform: ${process.platform}`);
    }
    const fileInfo = data.assets.find((asset: any) => asset.name === osKey);
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

      const writeStream: WriteStream = createWriteStream(downloadPath, {
        mode: 0o755,
      });
      const fileResponseStream = await axios({
        method: "get",
        url: downloadUrl,
        responseType: "stream",
      });
      const totalSize = parseInt(fileResponseStream.headers["content-length"], 10);

      let downloadedSize = 0;
      fileResponseStream.data.on("data", (chunk: Buffer) => {
        if (cancelToken.isCancellationRequested) {
          fileResponseStream.data.destroy();
          throw new Error("Download canceled by user.");
        }
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
      fileResponseStream.data.pipe(writeStream);

      await new Promise((resolve, reject) => {
        writeStream.on("finish", () => resolve(undefined));
        writeStream.on("error", reject);
        fileResponseStream.data.on("error", reject);
      });
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

    if (process.platform !== "win32") {
      await installZipFile(downloadPath, eimInstallPath, cancelToken);
      Logger.infoNotify(`File ${osKey} extracted to: ${eimInstallPath}`);
    }

    return getEimBinaryPath(eimInstallPath);
  } catch (error) {
    Logger.errorNotify(
      `Error during download and extraction: ${error.message}`,
      error,
      "downloadAndExtractEIM"
    );
    return "";
  }
}

function getEimBinaryPath(eimInstallPath: string): string {
  if (process.platform === "win32") {
    return join(eimInstallPath, "eim-gui-windows-x64.exe");
  } else if (process.platform === "darwin") {
    return join(eimInstallPath, "eim.app");
  }
  return join(eimInstallPath, "eim");
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

      zipfile.on("end", () => {
        return resolve();
      });
      zipfile.on("error", (err) => {
        return reject(
          new ZipFileError("Zip File error", "InstallZipFile", err)
        );
      });

      zipfile.readEntry();
      zipfile.on("entry", async (entry: yauzl.Entry) => {
        const absolutePath: string = pathResolve(destPath, entry.fileName);
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
        } else {
          const exists = await pathExists(absolutePath);
          if (!exists) {
            zipfile.openReadStream(
              entry,
              async (err, readStream: ReadStream) => {
                if (err) {
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
                const doesTmpPathExists = await pathExists(
                  absoluteEntryTmpPath
                );
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
                  { mode: 0o755 }
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
              }
            );
          } else {
            if (extname(absolutePath) !== ".txt") {
              OutputChannel.appendLine(
                `Warning File ${absolutePath}
                                      already exists and was not updated.`
              );
            }
            zipfile.readEntry();
          }
        }
      });
    });
  });
}
