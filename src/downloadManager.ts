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
import * as fs from "fs";
import { ensureDir, pathExists } from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import axios, { AxiosRequestConfig, AxiosResponse, CancelToken } from "axios";
import { IdfToolsManager } from "./idfToolsManager";
import { IFileInfo, IPackage } from "./IPackage";
import { Logger } from "./logger/logger";
import { OutputChannel } from "./logger/outputChannel";
import { PackageError } from "./packageError";
import { PackageProgress } from "./PackageProgress";
import { PackageManagerWebError } from "./packageWebError";
import * as utils from "./utils";
import { ESP } from "./config";

export class DownloadManager {
  private readonly MAX_RETRIES = 5;
  private readonly TIMEOUT = 30000; // 30 seconds

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
    mirror: ESP.IdfMirror,
    pkgsProgress?: PackageProgress[],
    cancelToken?: vscode.CancellationToken,
    onReqPkgs?: string[]
  ): Promise<void> {
    return idfToolsManager.getPackageList(onReqPkgs).then((packages) => {
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
    mirror: ESP.IdfMirror,
    pkg: IPackage,
    progressCount: string,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    pkgProgress?: PackageProgress,
    cancelToken?: vscode.CancellationToken
  ): Promise<void> {
    progress.report({ message: `Downloading ${progressCount}: ${pkg.name}` });
    this.appendChannel(`Downloading ${pkg.description}`);
    const urlInfoToUse = idfToolsManager.obtainUrlInfoForPlatform(pkg);
    if (mirror == ESP.IdfMirror.Espressif) {
      urlInfoToUse.url = idfToolsManager.applyGithubAssetsMapping(
        urlInfoToUse.url
      );
    }
    this.appendChannel(
      `Using mirror ${
        mirror == ESP.IdfMirror.Espressif ? "Espressif" : "Github"
      } with URL ${urlInfoToUse.url}`
    );
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
        this.appendChannel(
          `Checksum mismatch for ${pkg.name}, will resume download`
        );
        // Don't delete the file - we'll resume from where we left off
      }
    }

    // Download with resume capability
    await this.downloadWithResume(
      urlInfoToUse.url,
      destPath,
      pkgProgress,
      cancelToken,
      urlInfoToUse.size
    );

    // Validate the downloaded file
    pkgProgress.FileMatchChecksum = await utils.validateFileSizeAndChecksum(
      absolutePath,
      urlInfoToUse.sha256,
      urlInfoToUse.size
    );
  }

  /**
   * Download file with resume capability using HTTP Range requests
   */
  public async downloadWithResume(
    urlToUse: string,
    destPath: string,
    pkgProgress?: PackageProgress,
    cancelToken?: vscode.CancellationToken,
    expectedSize?: number
  ): Promise<any> {
    const fileName = utils.fileNameFromUrl(urlToUse);
    const absolutePath = path.resolve(destPath, fileName);

    // Ensure destination directory exists
    await ensureDir(destPath, { mode: 0o775 });

    let retryCount = 0;
    let lastError: Error;

    while (retryCount < this.MAX_RETRIES) {
      try {
        // Check if we can resume from existing file
        let startByte = 0;
        if (await pathExists(absolutePath)) {
          const stats = await fs.promises.stat(absolutePath);
          startByte = stats.size;

          if (startByte > 0) {
            this.appendChannel(
              `Resuming download of ${fileName} from byte ${startByte}`
            );
          }
        }

        // Check if server supports range requests
        const supportsRange = await this.checkRangeSupport(urlToUse);

        let response: any;

        if (supportsRange && startByte > 0) {
          // Resume download using range requests
          response = await this.downloadWithRange(
            urlToUse,
            absolutePath,
            startByte,
            pkgProgress,
            cancelToken,
            expectedSize
          );
        } else {
          // Full download (either no range support or starting from beginning)
          if (startByte > 0) {
            this.appendChannel(
              `Server doesn't support range requests, starting fresh download`
            );
            await del(absolutePath, { force: true });
          }
          response = await this.downloadFull(
            urlToUse,
            absolutePath,
            pkgProgress,
            cancelToken,
            expectedSize
          );
        }

        this.appendChannel(`Successfully downloaded ${fileName}`);
        return response;
      } catch (error) {
        lastError = error;
        retryCount++;

        if (cancelToken && cancelToken.isCancellationRequested) {
          throw new PackageError(
            "Download cancelled by user",
            "downloadWithResume"
          );
        }

        if (retryCount >= this.MAX_RETRIES) {
          this.appendChannel(
            `Failed to download ${urlToUse} after ${this.MAX_RETRIES} attempts`
          );
          throw error;
        }

        // Calculate exponential backoff delay
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
        this.appendChannel(
          `Download failed (attempt ${retryCount}/${this.MAX_RETRIES}). Retrying in ${delay}ms...`
        );
        this.appendChannel(`Error: ${error.message || error}`);

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Check if server supports HTTP Range requests
   */
  private async checkRangeSupport(url: string): Promise<boolean> {
    try {
      const config: AxiosRequestConfig = {
        method: "HEAD",
        timeout: this.TIMEOUT,
        headers: {
          "User-Agent": ESP.HTTP_USER_AGENT,
        },
      };

      const response = await axios.head(url, config);
      const acceptRanges = response.headers["accept-ranges"];
      const contentRange = response.headers["content-range"];

      return acceptRanges === "bytes" || !!contentRange;
    } catch (error) {
      this.appendChannel(`Could not check range support: ${error.message}`);
      return false;
    }
  }

  /**
   * Download file using HTTP Range requests for resume capability
   */
  private async downloadWithRange(
    url: string,
    filePath: string,
    startByte: number,
    pkgProgress?: PackageProgress,
    cancelToken?: vscode.CancellationToken,
    expectedSize?: number
  ): Promise<any> {
    const fileName = path.basename(filePath);
    const fileStream = fs.createWriteStream(filePath, {
      flags: "a",
      mode: 0o775,
    }); // Append mode

    const config: AxiosRequestConfig = {
      method: "GET",
      timeout: this.TIMEOUT,
      responseType: "stream",
      headers: {
        "User-Agent": ESP.HTTP_USER_AGENT,
        Range: `bytes=${startByte}-`,
      },
      cancelToken: cancelToken
        ? this.createCancelToken(cancelToken)
        : undefined,
    };

    this.appendChannel(
      `Downloading ${fileName} with range request from byte ${startByte}`
    );

    const response = await axios.get(url, config);

    if (response.status !== 206 && response.status !== 200) {
      throw new PackageManagerWebError(
        null,
        "HTTP Range Request Error",
        "downloadWithRange",
        `Unexpected status code: ${response.status}`,
        response.status.toString()
      );
    }

    const contentLength = parseInt(
      response.headers["content-length"] || "0",
      10
    );
    const contentRange = response.headers["content-range"];
    let totalSize = expectedSize || 0;

    // Parse content-range header to get total size
    if (contentRange) {
      const match = contentRange.match(/bytes \d+-\d+\/(\d+)/);
      if (match) {
        totalSize = parseInt(match[1], 10);
      }
    }

    let downloadedSize = startByte;
    let lastProgressUpdate = 0;

    response.data.on("data", (chunk: Buffer) => {
      downloadedSize += chunk.length;

      if (pkgProgress && totalSize > 0) {
        const progress = (downloadedSize / totalSize) * 100;
        const progressDetail = `(${(downloadedSize / 1024).toFixed(2)} / ${(
          totalSize / 1024
        ).toFixed(2)}) KB`;

        // Update progress only if significant change
        if (
          progress - lastProgressUpdate >= this.refreshUIRate ||
          downloadedSize === totalSize
        ) {
          pkgProgress.Progress = `${progress.toFixed(2)}%`;
          pkgProgress.ProgressDetail = progressDetail;
          lastProgressUpdate = progress;
        }
      }
    });

    response.data.pipe(fileStream);

    return new Promise<any>((resolve, reject) => {
      fileStream.on("finish", () => {
        this.appendChannel(`Range download completed: ${fileName}`);
        resolve(response);
      });

      fileStream.on("error", (error) => {
        reject(
          new PackageError(
            `File write error: ${error.message}`,
            "downloadWithRange",
            error
          )
        );
      });

      response.data.on("error", (error) => {
        reject(
          new PackageError(
            `Download stream error: ${error.message}`,
            "downloadWithRange",
            error
          )
        );
      });
    });
  }

  /**
   * Download full file (no resume capability)
   */
  private async downloadFull(
    url: string,
    filePath: string,
    pkgProgress?: PackageProgress,
    cancelToken?: vscode.CancellationToken,
    expectedSize?: number
  ): Promise<any> {
    const fileName = path.basename(filePath);
    const fileStream = fs.createWriteStream(filePath, { mode: 0o775 });

    const config: AxiosRequestConfig = {
      method: "GET",
      timeout: this.TIMEOUT,
      responseType: "stream",
      headers: {
        "User-Agent": ESP.HTTP_USER_AGENT,
      },
      cancelToken: cancelToken
        ? this.createCancelToken(cancelToken)
        : undefined,
    };

    this.appendChannel(`Downloading ${fileName} (full download)`);

    const response = await axios.get(url, config);

    if (response.status !== 200) {
      throw new PackageManagerWebError(
        null,
        "HTTP Download Error",
        "downloadFull",
        `Unexpected status code: ${response.status}`,
        response.status.toString()
      );
    }

    const contentLength = parseInt(
      response.headers["content-length"] || "0",
      10
    );
    const totalSize = expectedSize || contentLength;
    let downloadedSize = 0;
    let lastProgressUpdate = 0;

    response.data.on("data", (chunk: Buffer) => {
      downloadedSize += chunk.length;

      if (pkgProgress && totalSize > 0) {
        const progress = (downloadedSize / totalSize) * 100;
        const progressDetail = `(${(downloadedSize / 1024).toFixed(2)} / ${(
          totalSize / 1024
        ).toFixed(2)}) KB`;

        // Update progress only if significant change
        if (
          progress - lastProgressUpdate >= this.refreshUIRate ||
          downloadedSize === totalSize
        ) {
          pkgProgress.Progress = `${progress.toFixed(2)}%`;
          pkgProgress.ProgressDetail = progressDetail;
          lastProgressUpdate = progress;
        }
      }
    });

    response.data.pipe(fileStream);

    return new Promise<any>((resolve, reject) => {
      fileStream.on("finish", () => {
        this.appendChannel(
          `Full download completed: ${fileName} into ${filePath}`
        );
        resolve(response);
      });

      fileStream.on("error", (error) => {
        reject(
          new PackageError(
            `File write error: ${error.message}`,
            "downloadFull",
            error
          )
        );
      });

      response.data.on("error", (error) => {
        reject(
          new PackageError(
            `Download stream error: ${error.message}`,
            "downloadFull",
            error
          )
        );
      });
    });
  }

  /**
   * Create axios cancel token from VS Code cancellation token
   */
  private createCancelToken(
    cancelToken: vscode.CancellationToken
  ): CancelToken {
    const source = axios.CancelToken.source();

    cancelToken.onCancellationRequested(() => {
      source.cancel("Download cancelled by user");
    });

    return source.token;
  }

  private appendChannel(text: string): void {
    OutputChannel.appendLine(text);
    Logger.info(text);
  }
}
