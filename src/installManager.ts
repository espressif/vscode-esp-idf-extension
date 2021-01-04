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
import { ensureDir, move, pathExists, remove } from "fs-extra";
import * as path from "path";
import * as tarfs from "tar-fs";
import * as vscode from "vscode";
import * as yauzl from "yauzl";
import * as zlib from "zlib";
import { IdfToolsManager } from "./idfToolsManager";
import { IPackage } from "./IPackage";
import { Logger } from "./logger/logger";
import { OutputChannel } from "./logger/outputChannel";
import { PackageError } from "./packageError";
import * as utils from "./utils";

export class InstallManager {
  constructor(private installPath: string) {}
  public getToolPackagesPath(toolPackage: string[]) {
    return path.resolve(this.installPath, ...toolPackage);
  }

  public async installPackages(
    idfToolsManager: IdfToolsManager,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    cancelToken?: vscode.CancellationToken
  ): Promise<void> {
    return idfToolsManager.getPackageList().then((packages) => {
      let count: number = 1;
      return utils.buildPromiseChain(packages, async (pkg) => {
        const versionName = idfToolsManager.getVersionToUse(pkg);
        const absolutePath: string = this.getToolPackagesPath([
          "tools",
          pkg.name,
          versionName,
        ]);
        await del(absolutePath, { force: true });

        progress.report({
          message: `Installing ${count}/${packages.length}: ${pkg.description}...`,
        });
        this.appendChannel(`Installing package ${pkg.description}`);
        const urlToUse = idfToolsManager.obtainUrlInfoForPlatform(pkg);
        const parsedUrl = urlToUse.url.split(/\#|\?/)[0].split("."); //  Get url file extension
        let p: Promise<void>;
        if (parsedUrl[parsedUrl.length - 1] === "zip") {
          p = this.installZipPackage(idfToolsManager, pkg, cancelToken).then(
            async () => {
              if (pkg.strip_container_dirs) {
                await this.promisedStripContainerDirs(
                  absolutePath,
                  pkg.strip_container_dirs
                );
              }
            }
          );
        } else if (
          parsedUrl[parsedUrl.length - 2] === "tar" &&
          parsedUrl[parsedUrl.length - 1] === "gz"
        ) {
          p = this.installTarPackage(idfToolsManager, pkg, cancelToken).then(
            async () => {
              if (pkg.strip_container_dirs) {
                await this.promisedStripContainerDirs(
                  absolutePath,
                  pkg.strip_container_dirs
                );
              }
            }
          );
        } else {
          p = new Promise<void>((resolve) => {
            resolve();
          });
        }
        count += 1;
        return p;
      });
    });
  }

  public async installZipFile(
    zipFilePath: string,
    destPath: string,
    cancelToken?: vscode.CancellationToken
  ) {
    return new Promise<void>(async (resolve, reject) => {
      const doesZipFileExists = await pathExists(zipFilePath);
      if (!doesZipFileExists) {
        return reject(`File ${zipFilePath} doesn't exist.`);
      }
      yauzl.open(zipFilePath, { lazyEntries: true }, (error, zipfile) => {
        if (error) {
          return reject(
            new PackageError("Zip file error", "InstallZipFile", error)
          );
        }
        if (cancelToken && cancelToken.isCancellationRequested) {
          return reject(
            new PackageError("Install cancelled by user", "InstallZipFile")
          );
        }

        zipfile.on("end", () => {
          return resolve();
        });
        zipfile.on("error", (err) => {
          return reject(
            new PackageError("Zip File error", "InstallZipFile", err)
          );
        });

        zipfile.readEntry();
        zipfile.on("entry", async (entry: yauzl.Entry) => {
          const absolutePath: string = path.resolve(destPath, entry.fileName);
          const dirExists = await utils.dirExistPromise(absolutePath);
          if (dirExists) {
            try {
              await del(absolutePath, { force: true });
            } catch (err) {
              this.appendChannel(
                `Error deleting previous ${absolutePath}: ${err.message}`
              );
              return reject(
                new PackageError(
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
                new PackageError(
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
                async (err, readStream: fs.ReadStream) => {
                  if (err) {
                    return reject(
                      new PackageError(
                        "Error reading zip stream",
                        "InstallZipFile",
                        err
                      )
                    );
                  }
                  readStream.on("error", (openErr) => {
                    return reject(
                      new PackageError(
                        "Error in readstream",
                        "InstallZipFile",
                        openErr
                      )
                    );
                  });

                  try {
                    await ensureDir(path.dirname(absolutePath), {
                      mode: 0o775,
                    });
                  } catch (mkdirErr) {
                    return reject(
                      new PackageError(
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
                        new PackageError(
                          `Error unlinking tmp file ${absoluteEntryTmpPath}`,
                          "InstallZipFile",
                          rmError
                        )
                      );
                    }
                  }
                  const writeStream: fs.WriteStream = fs.createWriteStream(
                    absoluteEntryTmpPath,
                    { mode: 0o755 }
                  );
                  writeStream.on("error", (writeStreamErr) => {
                    return reject(
                      new PackageError(
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
                        new PackageError(
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
              if (path.extname(absolutePath) !== ".txt") {
                this.appendChannel(
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

  public async installZipPackage(
    idfToolsManager: IdfToolsManager,
    pkg: IPackage,
    cancelToken?: vscode.CancellationToken
  ) {
    this.appendChannel(`Installing zip package ${pkg.description}`);
    const urlInfo = idfToolsManager.obtainUrlInfoForPlatform(pkg);
    const fileName = utils.fileNameFromUrl(urlInfo.url);
    const packageFile: string = this.getToolPackagesPath(["dist", fileName]);

    const packageDownloaded = await pathExists(packageFile);
    if (!packageDownloaded) {
      this.appendChannel(
        `${pkg.description} downloaded file is not available.`
      );
      throw new PackageError(
        "Error finding downloaded file",
        "InstallZipPackage"
      );
    }
    const isValidFile = await utils.validateFileSizeAndChecksum(
      packageFile,
      urlInfo.sha256,
      urlInfo.size
    );
    if (!isValidFile) {
      this.appendChannel(
        `Package ${pkg.description} downloaded file is invalid.`
      );
      throw new PackageError("Downloaded file invalid", "InstallZipPackage");
    }
    const versionName = idfToolsManager.getVersionToUse(pkg);
    const absolutePath: string = this.getToolPackagesPath([
      "tools",
      pkg.name,
      versionName,
    ]);
    return await this.installZipFile(packageFile, absolutePath, cancelToken);
  }

  public installTarPackage(
    idfToolsManager: IdfToolsManager,
    pkg: IPackage,
    cancelToken?: vscode.CancellationToken
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const urlInfo = idfToolsManager.obtainUrlInfoForPlatform(pkg);
      const fileName = utils.fileNameFromUrl(urlInfo.url);
      const packageFile: string = this.getToolPackagesPath(["dist", fileName]);

      if (cancelToken && cancelToken.isCancellationRequested) {
        return reject(new Error("Process cancelled by user"));
      }

      const packageDownloaded = await pathExists(packageFile);
      if (!packageDownloaded) {
        this.appendChannel(
          `Package ${pkg.description} downloaded file not available.`
        );
        return reject(
          new PackageError("Downloaded file unavailable", "InstallTarPackage")
        );
      }
      const isValidFile = await utils.validateFileSizeAndChecksum(
        packageFile,
        urlInfo.sha256,
        urlInfo.size
      );
      if (!isValidFile) {
        this.appendChannel(
          `Package ${pkg.description} downloaded file is invalid.`
        );
        return reject(
          new PackageError("Downloaded file invalid", "InstallTarPackage")
        );
      }
      const versionName = idfToolsManager.getVersionToUse(pkg);
      const absolutePath: string = this.getToolPackagesPath([
        "tools",
        pkg.name,
        versionName,
      ]);
      const dirExists = await utils.dirExistPromise(absolutePath);
      if (dirExists) {
        try {
          await del(absolutePath, { force: true });
        } catch (err) {
          this.appendChannel(
            `Error deleting ${pkg.name} old install: ${err.message}`
          );
          return reject(
            new PackageError(
              "Install folder cant be deleted",
              "installTarPackage",
              err,
              err.errorCode
            )
          );
        }
      }
      const binPath = pkg.binaries
        ? path.join(absolutePath, ...pkg.binaries, pkg.version_cmd[0])
        : path.join(absolutePath, pkg.version_cmd[0]);

      const binExists = await pathExists(binPath);
      if (binExists) {
        this.appendChannel(
          `Existing ${pkg.description} found in ${this.installPath}`
        );
        return resolve();
      }
      this.appendChannel(`Installing tar.gz package ${pkg.description}`);
      const extractor = tarfs.extract(absolutePath, {
        readable: true, // all dirs and files should be readable
        writable: true, // all dirs and files should be writable
      });
      extractor.on("error", (err) => {
        reject(
          new PackageError(
            "Extracting gunzipped tar error",
            "InstallTarPackage",
            err,
            err.code
          )
        );
      });
      extractor.on("finish", () => {
        return resolve();
      });
      try {
        fs.createReadStream(packageFile)
          .pipe(zlib.createGunzip())
          .pipe(extractor);
      } catch (error) {
        return reject(error);
      }
    });
  }
  private appendChannel(text: string): void {
    OutputChannel.appendLine(text);
    Logger.info(text);
  }
  private async promisedStripContainerDirs(pkgDirPath: string, levels: number) {
    const tmpPath = pkgDirPath + ".tmp";
    const exists = await utils.dirExistPromise(tmpPath);
    if (exists) {
      await del(tmpPath, { force: true });
    }
    await move(pkgDirPath, tmpPath);
    await ensureDir(pkgDirPath);
    let basePath = tmpPath;
    // Walk given number of levels down
    for (let i = 0; i < levels; i++) {
      const files = await utils.readDirPromise(basePath);
      if (files.length > 1) {
        throw new Error(`At level ${i} expected 1 entry, got ${files.length}`);
      }
      basePath = path.join(basePath, files[0]);
      const isDirectory = await utils.dirExistPromise(basePath);
      if (!isDirectory) {
        throw new Error(
          `At level ${levels[i]}, ${files[0]} is not a directory.`
        );
      }
    }
    // Get list of directories/files to move
    const filesToMove = await utils.readDirPromise(basePath);
    for (let file of filesToMove) {
      const moveFrom = path.join(basePath, file);
      const moveTo = path.join(pkgDirPath, file);
      await move(moveFrom, moveTo);
    }
    await del(tmpPath, { force: true });
  }
}
