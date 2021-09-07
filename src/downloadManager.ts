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

import * as del from "del";
import { https } from "follow-redirects";
import * as fs from "fs";
import { ensureDir, pathExists } from "fs-extra";
import * as http from "http";
import * as path from "path";
import * as url from "url";
import * as vscode from "vscode";
import { IdfToolsManager } from "./idfToolsManager";
import { IFileInfo, IPackage } from "./IPackage";
import { Logger } from "./logger/logger";
import { OutputChannel } from "./logger/outputChannel";
import { PackageError } from "./packageError";
import { PackageProgress } from "./PackageProgress";
import { PackageManagerWebError } from "./packageWebError";
import * as utils from "./utils";
import { IdfMirror } from "./views/setup/types";

export class DownloadManager {
  constructor(
    private installPath: string,
    private refreshUIRate: number = 0.5
  ) {}

  public getToolPackagesPath(toolPackage: string[]) {
    return path.resolve(this.installPath, ...toolPackage);
  }

  public downloadPackages(
    idfToolsManager: IdfToolsManager,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    mirror: IdfMirror,
    pkgsProgress?: PackageProgress[],
    cancelToken?: vscode.CancellationToken
  ): Promise<void> {
    return idfToolsManager.getPackageList().then((packages) => {
      let count: number = 1;
      return utils.buildPromiseChain(
        packages,
        (pkg): Promise<void> => {
          let pkgProgressToUse: PackageProgress;
          if (pkgsProgress) {
            pkgProgressToUse = pkgsProgress.find((pkgProgress) => {
              return pkgProgress.name === pkg.name;
            });
          }
          const p: Promise<void> = this.downloadPackage(
            idfToolsManager,
            mirror,
            pkg,
            `${count}/${packages.length}`,
            progress,
            pkgProgressToUse,
            cancelToken
          );
          count += 1;
          return p;
        }
      );
    });
  }

  public async downloadPackage(
    idfToolsManager: IdfToolsManager,
    mirror: IdfMirror,
    pkg: IPackage,
    progressCount: string,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    pkgProgress?: PackageProgress,
    cancelToken?: vscode.CancellationToken
  ): Promise<void> {
    progress.report({ message: `Downloading ${progressCount}: ${pkg.name}` });
    this.appendChannel(`Downloading ${pkg.description}`);
    const urlInfoToUse = idfToolsManager.obtainUrlInfoForPlatform(pkg);
    if (mirror == IdfMirror.Espressif) {
      urlInfoToUse.url = idfToolsManager.applyGithubAssetsMapping(
        urlInfoToUse.url
      );
    }
    await this.downloadPackageWithRetries(
      pkg,
      urlInfoToUse,
      pkgProgress,
      cancelToken
    );
  }

  public async downloadPackageWithRetries(
    pkg: IPackage,
    urlInfoToUse: IFileInfo,
    pkgProgress?: PackageProgress,
    cancelToken?: vscode.CancellationToken
  ): Promise<void> {
    const fileName = utils.fileNameFromUrl(urlInfoToUse.url);
    const destPath = this.getToolPackagesPath(["dist"]);
    const absolutePath: string = this.getToolPackagesPath(["dist", fileName]);
    const pkgExists = await pathExists(absolutePath);
    if (pkgExists) {
      const checksumEqual = await utils.validateFileSizeAndChecksum(
        absolutePath,
        urlInfoToUse.sha256,
        urlInfoToUse.size
      );
      if (checksumEqual) {
        pkgProgress.FileMatchChecksum = checksumEqual;
        this.appendChannel(
          `Found ${pkg.name} in ${this.installPath + path.sep}dist`
        );
        pkgProgress.Progress = `100.00%`;
        pkgProgress.ProgressDetail = `(${(urlInfoToUse.size / 1024).toFixed(
          2
        )} / ${(urlInfoToUse.size / 1024).toFixed(2)}) KB`;
        return;
      } else {
        await del(absolutePath, { force: true });
        await this.downloadWithRetries(
          urlInfoToUse.url,
          destPath,
          pkgProgress,
          cancelToken
        );
      }
    } else {
      await this.downloadWithRetries(
        urlInfoToUse.url,
        destPath,
        pkgProgress,
        cancelToken
      );
    }
    pkgProgress.FileMatchChecksum = await utils.validateFileSizeAndChecksum(
      absolutePath,
      urlInfoToUse.sha256,
      urlInfoToUse.size
    );
  }

  public async downloadWithRetries(
    urlToUse: string,
    destPath: string,
    pkgProgress: PackageProgress,
    cancelToken?: vscode.CancellationToken
  ) {
    let success: boolean = false;
    let retryCount: number = 2;
    const MAX_RETRIES: number = 5;
    do {
      try {
        await this.downloadFile(
          urlToUse,
          retryCount,
          destPath,
          pkgProgress,
          cancelToken
        ).catch((pkgError: PackageError) => {
          throw pkgError;
        });
        success = true;
      } catch (error) {
        const errMsg = error.message
          ? error.message
          : `Error downloading ${urlToUse}`;
        Logger.error(errMsg, error);
        retryCount += 1;
        if (cancelToken && cancelToken.isCancellationRequested) {
          throw error;
        }
        if (retryCount > MAX_RETRIES) {
          this.appendChannel("Failed to download " + urlToUse);
          throw error;
        } else {
          this.appendChannel("Failed download. Retrying...");
          this.appendChannel(`Error: ${error}`);
          continue;
        }
      }
    } while (!success && retryCount < MAX_RETRIES);

    if (!success && retryCount > MAX_RETRIES) {
      throw new Error(`Downloading ${urlToUse} has not been successful.`);
    }
  }

  public downloadFile(
    urlString: string,
    delay: number,
    destinationPath: string,
    pkgProgress?: PackageProgress,
    cancelToken?: vscode.CancellationToken
  ): Promise<http.IncomingMessage> {
    const parsedUrl: url.Url = url.parse(urlString);
    const proxyStrictSSL: any = vscode.workspace
      .getConfiguration()
      .get("http.proxyStrictSSL", true);

    const options = {
      agent: utils.getHttpsProxyAgent(),
      host: parsedUrl.host,
      path: parsedUrl.pathname,
      rejectUnauthorized: proxyStrictSSL,
    };

    return new Promise<http.IncomingMessage>((resolve, reject) => {
      if (cancelToken && cancelToken.isCancellationRequested) {
        return reject(
          new PackageError("Download cancelled by user", "downloadFile")
        );
      }
      let secondsDelay: number = Math.pow(2, delay);
      if (secondsDelay === 1) {
        secondsDelay = 0;
      }
      if (secondsDelay > 4) {
        this.appendChannel(`Waiting ${secondsDelay} seconds...`);
      }
      setTimeout(() => {
        const handleResponse: (response: http.IncomingMessage) => void = async (
          response: http.IncomingMessage
        ) => {
          if (response.statusCode === 301 || response.statusCode === 302) {
            let redirectUrl: string;
            if (typeof response.headers.location === "string") {
              redirectUrl = response.headers.location;
            } else {
              redirectUrl = response.headers.location[0];
            }
            return resolve(
              await this.downloadFile(
                redirectUrl,
                0,
                destinationPath,
                pkgProgress
              )
            );
          } else if (response.statusCode !== 200) {
            const errorMessage: string = `Failed web connection with error code: ${response.statusCode}\n${urlString}`;
            this.appendChannel(`File download response error: ${errorMessage}`);
            return reject(
              new PackageManagerWebError(
                response.socket,
                "HTTP/HTTPS Response Error",
                "downloadFile",
                errorMessage,
                response.statusCode.toString()
              )
            );
          } else {
            let contentLength: any = response.headers["content-length"];
            if (typeof response.headers["content-length"] === "string") {
              contentLength = response.headers["content-length"];
            } else {
              contentLength = response.headers["content-length"][0];
            }
            const packageSize: number = parseInt(contentLength, 10);
            let downloadPercentage: number = 0;
            let downloadedSize: number = 0;
            let progressDetail: string;

            const fileName = utils.fileNameFromUrl(urlString);
            const absolutePath: string = path.resolve(
              destinationPath,
              fileName
            );
            await ensureDir(destinationPath, { mode: 0o775 }).catch((err) => {
              if (err) {
                return reject(
                  new PackageError(
                    "Error creating dist directory",
                    "DownloadPackage",
                    err
                  )
                );
              }
            });
            const fileStream: fs.WriteStream = fs.createWriteStream(
              absolutePath,
              { mode: 0o775 }
            );

            fileStream.on("error", (e) => {
              this.appendChannel(e);
              return reject(
                new PackageError(
                  "Error creating file",
                  "DownloadPackage",
                  e,
                  e.code
                )
              );
            });
            this.appendChannel(
              `${fileName} has (${Math.ceil(packageSize / 1024)}) KB`
            );

            response.on("data", (data) => {
              downloadedSize += data.length;
              downloadPercentage = (downloadedSize / packageSize) * 100;
              progressDetail = `(${(downloadedSize / 1024).toFixed(2)} / ${(
                packageSize / 1024
              ).toFixed(2)}) KB`;
              this.appendChannel(
                `${fileName} progress: ${downloadPercentage.toFixed(
                  2
                )}% ${progressDetail}`
              );
              if (pkgProgress) {
                const diff =
                  parseFloat(downloadPercentage.toFixed(2)) -
                  parseFloat(pkgProgress.Progress.replace("%", ""));
                if (
                  diff > this.refreshUIRate ||
                  downloadedSize === packageSize
                ) {
                  pkgProgress.Progress = `${downloadPercentage.toFixed(2)}%`;
                  pkgProgress.ProgressDetail = progressDetail;
                }
              }
            });

            response.on("end", () => {
              return resolve(response);
            });

            response.on("error", (error) => {
              error.stack
                ? this.appendChannel(error.stack)
                : this.appendChannel(error.message);
              return reject(
                new PackageManagerWebError(
                  response.socket,
                  "HTTP/HTTPS Response error",
                  "downloadFile",
                  error.stack,
                  error.name
                )
              );
            });

            response.on("aborted", () => {
              return reject(
                new PackageError("HTTP/HTTPS Response error", "downloadFile")
              );
            });
            response.pipe(fileStream, { end: false });
          }
        };
        const req = https.request(options, handleResponse);

        req.on("error", (error) => {
          error.stack
            ? this.appendChannel(error.stack)
            : this.appendChannel(error.message);
          return reject(
            new PackageError(
              "HTTP/HTTPS Request error " + urlString,
              "downloadFile",
              error.stack,
              error.message
            )
          );
        });
        if (cancelToken) {
          cancelToken.onCancellationRequested(() => {
            req.abort();
            return reject(
              new PackageError("Download cancelled by user", "downloadFile")
            );
          });
        }
        req.end();
      }, secondsDelay * 1000);
    });
  }

  private appendChannel(text: string): void {
    OutputChannel.appendLine(text);
    Logger.info(text);
  }
}
