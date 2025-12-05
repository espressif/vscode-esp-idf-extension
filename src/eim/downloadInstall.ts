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
import { tmpdir } from "os";
import { basename, dirname, extname, join, resolve as pathResolve } from "path";
import {
  createWriteStream,
  ensureDir,
  move,
  pathExists,
  ReadStream,
  remove,
  WriteStream,
} from "fs-extra";
import { CancellationToken, env, Progress, window } from "vscode";
import { OutputChannel } from "../logger/outputChannel";
import del from "del";
import { dirExistPromise, isBinInPath } from "../utils";
import * as yauzl from "yauzl";
import { Logger } from "../logger/logger";
import { getEimIdfJson } from "./getExistingSetups";
import { readParameter } from "../idfConfiguration";

export async function runExistingEIM(
  progress: Progress<{ message: string; increment: number }>,
  cancelToken: CancellationToken
): Promise<boolean> {
  let eimPath = "";
  if (cancelToken.isCancellationRequested) {
    return false;
  }
  progress.report({
    message: `Checking EIM already exists...`,
    increment: 0,
  });
  try {
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
    // 2. Check EIM_PATH env variable if not found in eim_idf.json
    if (!eimPath) {
      eimPath = process.env.EIM_PATH || "";
    }
    // 3. Use default path based on platform if still not found
    if (!eimPath) {
      if (process.platform === "win32") {
        eimPath = join(
          process.env.USERPROFILE || "",
          ".espressif",
          "eim_gui",
          "eim-gui-windows-x64.exe"
        );
      } else if (process.platform === "darwin") {
        eimPath = "/Applications/eim.app";
      } else if (process.platform === "linux") {
        eimPath = join(process.env.HOME || "", ".espressif", "eim_gui", "eim");
      }
    }
    const doesEimPathExists = await pathExists(eimPath);
    if (!doesEimPathExists) {
      throw new Error(`EIM not found at ${eimPath}`);
    }
  } catch (error) {
    Logger.error(
      `Error while running existing EIM: ${error.message}`,
      error,
      "runExistingEIM"
    );
    return false;
  }

  progress.report({
    message: `EIM found at ${eimPath}. Launching...`,
    increment: 0,
  });

  // Read idf.eimExecutableArgs with utils.readParameter and use it to run EIM
  const idfEimExecutableArgs = readParameter(
    "idf.eimExecutableArgs"
  ) as string[];
  const argsString = idfEimExecutableArgs.join(" ");

  let binaryPath = "";
  if (process.platform === "win32") {
    binaryPath = `& '${eimPath.replace(/'/g, "''")}'${
      argsString ? " " + argsString : ""
    }`;
  } else if (process.platform === "linux") {
    binaryPath = `./${basename(eimPath)}${argsString ? " " + argsString : ""}`;
  } else if (process.platform === "darwin") {
    binaryPath = `open ${eimPath}${argsString ? " --args " + argsString : ""}`;
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
  espIdfTerminal.sendText("exit");
  return true;
}

export async function downloadExtractAndRunEIM(
  progress: Progress<{ message: string; increment: number }>,
  cancelToken: CancellationToken,
  useMirror: boolean = false
): Promise<void> {
  const jsonUrl = "https://dl.espressif.com/dl/eim/eim_unified_release.json";
  // Determine EIM install path
  let eimInstallPath = "";
  if (process.platform === "win32") {
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

    if (process.platform === "darwin") {
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
      const { headers } = await axios.head(downloadUrl);
      const totalSize = parseInt(headers["content-length"], 10);

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
        fileResponseStream.data.on("end", resolve);
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

    const idfEimExecutableArgs = readParameter(
      "idf.eimExecutableArgs"
    ) as string[];
    const argsString = idfEimExecutableArgs.join(" ");

    let binaryPath = "";
    if (process.platform === "win32") {
      binaryPath = `& '${join(
        eimInstallPath,
        "eim-gui-windows-x64.exe"
      ).replace(/'/g, "''")}'${argsString ? " " + argsString : ""}`;
    } else if (process.platform === "linux") {
      binaryPath = `./eim${argsString ? " " + argsString : ""}`;
    } else if (process.platform === "darwin") {
      binaryPath = `open ${join(eimInstallPath, "eim.app")}${
        argsString ? " --args " + argsString : ""
      }`;
    }
    const shellPath =
      process.platform === "win32"
        ? "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
        : env.shell;
    const espIdfTerminal = window.createTerminal({
      name: "ESP-IDF EIM",
      shellPath: shellPath,
      cwd: eimInstallPath,
    });
    espIdfTerminal.sendText(binaryPath, true);
    espIdfTerminal.sendText("exit");
  } catch (error) {
    Logger.errorNotify(
      `Error during download and extraction: ${error.message}`,
      error,
      "downloadAndExtractEIM"
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
