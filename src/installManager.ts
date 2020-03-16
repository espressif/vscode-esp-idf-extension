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

  public installPackages(
    idfToolsManager: IdfToolsManager,
    progress: vscode.Progress<{ message?: string; increment?: number }>
  ): Promise<void> {
    return idfToolsManager.getPackageList().then(packages => {
      let count: number = 1;
      return utils.buildPromiseChain(packages, async pkg => {
        const versionName = idfToolsManager.getVersionToUse(pkg);
        const absolutePath: string = this.getToolPackagesPath([
          "tools",
          pkg.name,
          versionName
        ]);
        await del(absolutePath, { force: true });

        progress.report({
          message: `Installing ${count}/${packages.length}: ${pkg.description}...`
        });
        this.appendChannel(`Installing package ${pkg.description}`);
        const urlToUse = idfToolsManager.obtainUrlInfoForPlatform(pkg);
        const parsedUrl = urlToUse.url.split(/\#|\?/)[0].split("."); // Get url file extension
        let p: Promise<void>;
        if (parsedUrl[parsedUrl.length - 1] === "zip") {
          p = this.installZipPackage(idfToolsManager, pkg).then(async () => {
            if (pkg.strip_container_dirs) {
              await this.promisedStripContainerDirs(
                absolutePath,
                pkg.strip_container_dirs
              );
            }
          });
        } else if (
          parsedUrl[parsedUrl.length - 2] === "tar" &&
          parsedUrl[parsedUrl.length - 1] === "gz"
        ) {
          p = this.installTarPackage(idfToolsManager, pkg).then(async () => {
            if (pkg.strip_container_dirs) {
              await this.promisedStripContainerDirs(
                absolutePath,
                pkg.strip_container_dirs
              );
            }
          });
        } else {
          p = new Promise<void>(resolve => {
            resolve();
          });
        }
        count += 1;
        return p;
      });
    });
  }

  public installZipFile(zipFilePath: string, destPath: string) {
    return new Promise(async (resolve, reject) => {
      await pathExists(zipFilePath).then(doesZipFileExists => {
        if (!doesZipFileExists) {
          return reject(`File ${zipFilePath} doesn't exist.`);
        }
        yauzl.open(zipFilePath, { lazyEntries: true }, (error, zipfile) => {
          if (error) {
            return reject(
              new PackageError("Zip file error", "InstallZipFile", error)
            );
          }

          zipfile.on("end", () => {
            return resolve();
          });
          zipfile.on("error", err => {
            return reject(
              new PackageError("Zip File error", "InstallZipFile", err)
            );
          });

          zipfile.readEntry();

          zipfile.on("entry", async (entry: yauzl.Entry) => {
            const absolutePath: string = path.resolve(destPath, entry.fileName);
            await utils.dirExistPromise(absolutePath).then(async dirExists => {
              if (dirExists) {
                await del(absolutePath, { force: true }).catch(err => {
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
                });
              }
            });
            if (entry.fileName.endsWith("/")) {
              await ensureDir(absolutePath, { mode: 0o775 })
                .then(() => {
                  zipfile.readEntry();
                })
                .catch(err => {
                  if (err) {
                    return reject(
                      new PackageError(
                        "Error creating directory",
                        "InstallZipFile",
                        err
                      )
                    );
                  }
                });
            } else {
              await pathExists(absolutePath).then((exists: boolean) => {
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
                      readStream.on("error", openErr => {
                        return reject(
                          new PackageError(
                            "Error in readstream",
                            "InstallZipFile",
                            openErr
                          )
                        );
                      });
                      await ensureDir(path.dirname(absolutePath), {
                        mode: 0o775
                      })
                        .then(async () => {
                          const absoluteEntryTmpPath: string =
                            absolutePath + ".tmp";

                          await pathExists(absoluteEntryTmpPath).then(
                            async doesTmpPathExists => {
                              if (doesTmpPathExists) {
                                await remove(absoluteEntryTmpPath).catch(
                                  rmError => {
                                    return reject(
                                      new PackageError(
                                        `Error unlinking tmp file ${absoluteEntryTmpPath}`,
                                        "InstallZipFile",
                                        rmError
                                      )
                                    );
                                  }
                                );
                              }
                            }
                          );

                          const writeStream: fs.WriteStream = fs.createWriteStream(
                            absoluteEntryTmpPath,
                            { mode: 0o755 }
                          );
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
                          writeStream.on("error", writeStreamErr => {
                            return reject(
                              new PackageError(
                                "Error in writeStream",
                                "InstallZipFile",
                                writeStreamErr
                              )
                            );
                          });

                          readStream.pipe(writeStream);
                        })
                        .catch(mkdirErr => {
                          if (mkdirErr) {
                            reject(
                              new PackageError(
                                "Error creating directory",
                                "InstallZipFile",
                                mkdirErr
                              )
                            );
                          }
                        });
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
              });
            }
          });
        });
      });
    });
  }

  public installZipPackage(idfToolsManager: IdfToolsManager, pkg: IPackage) {
    this.appendChannel(`Installing zip package ${pkg.description}`);

    return new Promise<void>(async (resolve, reject) => {
      const urlInfo = idfToolsManager.obtainUrlInfoForPlatform(pkg);
      const fileName = utils.fileNameFromUrl(urlInfo.url);
      const packageFile: string = this.getToolPackagesPath(["dist", fileName]);
      await pathExists(packageFile).then(async packageDownloaded => {
        if (packageDownloaded) {
          await utils
            .validateFileSizeAndChecksum(
              packageFile,
              urlInfo.sha256,
              urlInfo.size
            )
            .then(async isValidFile => {
              if (isValidFile) {
                const versionName = idfToolsManager.getVersionToUse(pkg);
                const absolutePath: string = this.getToolPackagesPath([
                  "tools",
                  pkg.name,
                  versionName
                ]);
                return await this.installZipFile(packageFile, absolutePath)
                  .then(() => {
                    return resolve();
                  })
                  .catch(reason => {
                    return reject(reason);
                  });
              } else {
                this.appendChannel(
                  `Package ${pkg.description} downloaded file is invalid.`
                );
                return reject(
                  new PackageError(
                    "Downloaded file invalid",
                    "InstallZipPackage"
                  )
                );
              }
            });
        } else {
          this.appendChannel(
            `${pkg.description} downloaded file is not available.`
          );
          return reject(
            new PackageError(
              "Error finding downloaded file",
              "InstallZipPackage"
            )
          );
        }
      });
    });
  }

  public installTarPackage(
    idfToolsManager: IdfToolsManager,
    pkg: IPackage
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const urlInfo = idfToolsManager.obtainUrlInfoForPlatform(pkg);
      const fileName = utils.fileNameFromUrl(urlInfo.url);
      const packageFile: string = this.getToolPackagesPath(["dist", fileName]);

      await pathExists(packageFile).then(async packageDownloaded => {
        if (packageDownloaded) {
          await utils
            .validateFileSizeAndChecksum(
              packageFile,
              urlInfo.sha256,
              urlInfo.size
            )
            .then(async isValidFile => {
              if (isValidFile) {
                const versionName = idfToolsManager.getVersionToUse(pkg);
                const absolutePath: string = this.getToolPackagesPath([
                  "tools",
                  pkg.name,
                  versionName
                ]);
                await utils
                  .dirExistPromise(absolutePath)
                  .then(async dirExists => {
                    if (dirExists) {
                      await del(absolutePath, { force: true }).catch(err => {
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
                      });
                    }
                  });
                const binPath = pkg.binaries
                  ? path.join(absolutePath, ...pkg.binaries, pkg.version_cmd[0])
                  : path.join(absolutePath, pkg.version_cmd[0]);

                await pathExists(binPath).then(exists => {
                  if (!exists) {
                    this.appendChannel(
                      `Installing tar.gz package ${pkg.description}`
                    );
                    const extractor = tarfs.extract(absolutePath, {
                      readable: true, // all dirs and files should be readable
                      writable: true // all dirs and files should be writable
                    });
                    extractor.on("error", err => {
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
                      resolve();
                    });
                    fs.createReadStream(packageFile)
                      .pipe(zlib.createGunzip())
                      .pipe(extractor);
                  } else {
                    this.appendChannel(
                      `Existing ${pkg.description} found in ${this.installPath}`
                    );
                    resolve();
                  }
                });
              } else {
                this.appendChannel(
                  `Package ${pkg.description} downloaded file is invalid.`
                );
                return reject(
                  new PackageError(
                    "Downloaded file invalid",
                    "InstallTarPackage"
                  )
                );
              }
            });
        } else {
          this.appendChannel(
            `Package ${pkg.description} downloaded file not available.`
          );
          return reject(
            new PackageError("Downloaded file unavailable", "InstallTarPackage")
          );
        }
      });
    });
  }
  private appendChannel(text: string): void {
    OutputChannel.appendLine(text);
    Logger.info(text);
  }
  private promisedStripContainerDirs(pkgDirPath: string, levels: number) {
    return new Promise<void>(async (resolve, reject) => {
      const tmpPath = pkgDirPath + ".tmp";
      await utils.dirExistPromise(tmpPath).then(async exists => {
        if (exists) {
          await del(tmpPath, { force: true });
        }
      });

      await move(pkgDirPath, tmpPath);
      await ensureDir(pkgDirPath);
      let basePath = tmpPath;
      // Walk given number of levels down
      for (let i = 0; i < levels; i++) {
        await utils.readDirPromise(basePath).then(async files => {
          if (files.length > 1) {
            reject(`At level ${i} expected 1 entry, got ${files.length}`);
          }
          basePath = path.join(basePath, files[0]);
          utils.dirExistPromise(basePath).then(isDirectory => {
            if (!isDirectory) {
              reject(`At level ${levels[i]}, ${files[0]} is not a directory.`);
            }
          });
        });
      }
      // Get list of directories/files to move
      await utils
        .readDirPromise(basePath)
        .then(async files => {
          for (const file of files) {
            const moveFrom = path.join(basePath, file);
            const moveTo = path.join(pkgDirPath, file);
            await move(moveFrom, moveTo);
          }
        })
        .then(async () => {
          await del(tmpPath, { force: true });
          resolve();
        });
    });
  }
}
