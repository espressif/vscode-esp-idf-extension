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

import * as path from "path";
import * as vscode from "vscode";
import { IFileInfo, IPackage } from "./IPackage";
import { PackageError } from "./packageError";
import { PlatformInformation } from "./PlatformInformation";
import * as utils from "./utils";
import { Logger } from "./logger/logger";
import { OutputChannel } from "./logger/outputChannel";
import { readJSON } from "fs-extra";

export interface IToolInfo {
  actual: string;
  doesToolExist: boolean;
  expected: string;
  id: string;
}

export class IdfToolsManager {
  public static async createIdfToolsManager(idfPath: string) {
    const platformInfo = await PlatformInformation.GetPlatformInformation();
    const toolsJsonPath = await utils.getToolsJsonPath(idfPath);
    const toolsObj = await readJSON(toolsJsonPath);
    const idfToolsManager = new IdfToolsManager(
      toolsObj,
      platformInfo,
      OutputChannel.init()
    );
    return idfToolsManager;
  }

  private allPackages: IPackage[];

  constructor(
    private toolsJson: any,
    private platformInfo: PlatformInformation,
    private toolsManagerChannel: vscode.OutputChannel
  ) {}

  public getPackageList(onReqPkgs?: string[]): Promise<IPackage[]> {
    return new Promise<IPackage[]>((resolve, reject) => {
      if (!this.allPackages) {
        if (this.toolsJson.tools) {
          this.allPackages = this.toolsJson.tools as IPackage[];
          // Change relative path to desired full paths.
          for (const pkg of this.allPackages) {
            if (pkg.export_paths && pkg.export_paths[0][0] !== "") {
              pkg.binaries = pkg.export_paths[0];
            }
            if (pkg.platform_overrides) {
              const overrideIndex = pkg.platform_overrides.filter(
                (platOverride) => {
                  return (
                    platOverride.platforms.indexOf(
                      this.platformInfo.platformToUse
                    ) !== -1
                  );
                }
              );
              if (overrideIndex.length > 0) {
                for (const prop in overrideIndex[0]) {
                  if (pkg.hasOwnProperty(prop)) {
                    pkg[prop] = overrideIndex[0][prop];
                    if (prop === "export_paths") {
                      pkg.binaries = overrideIndex[0].export_paths[0];
                    }
                  }
                }
              }
            }
          }
        } else {
          reject(
            new PackageError(
              "Tools metadata does not exists.",
              "getPackageList"
            )
          );
        }
      }

      const packagesToInstall = this.allPackages.filter((pkg) => {
        return (
          pkg.install === "always" ||
          (onReqPkgs &&
            pkg.install === "on_request" &&
            onReqPkgs.indexOf(pkg.name) > -1)
        );
      });
      resolve(packagesToInstall);
    });
  }

  public async verifyPackages(pathsToVerify: string, onReqPkgs?: string[]) {
    const pkgs = await this.getPackageList(onReqPkgs);
    const promiseArr = {};
    const names = pkgs.map((pkg) => pkg.name);
    const promises = pkgs.map((p) =>
      this.checkBinariesVersion(p, pathsToVerify)
    );
    const versionExistsArr = await Promise.all(promises);
    names.forEach((pkgName, i) => (promiseArr[pkgName] = versionExistsArr[i]));
    return promiseArr;
  }

  public obtainUrlInfoForPlatform(pkg: IPackage): IFileInfo {
    const versions = pkg.versions.filter((value) => {
      return (
        (value.status === "recommended" ||
          value.status === "supported" ||
          value.status === "deprecated") &&
        Object.getOwnPropertyNames(value).indexOf(
          this.platformInfo.platformToUse
        ) > -1
      );
    });
    if (!versions || versions.length === 0) {
      throw new Error(
        `${pkg.name} doesn't have a compatible version for ${this.platformInfo.platformToUse}`
      );
    }
    const linkInfo =
      versions.length > 0
        ? (versions[0][this.platformInfo.platformToUse] as IFileInfo)
        : undefined;
    return linkInfo;
  }

  public getVersionToUse(pkg: IPackage): string {
    const versions = pkg.versions.filter((value) => {
      return (
        (value.status === "recommended" ||
          value.status === "supported" ||
          value.status === "deprecated") &&
        Object.getOwnPropertyNames(value).indexOf(
          this.platformInfo.platformToUse
        ) > -1
      );
    });
    if (!versions || versions.length === 0) {
      throw new Error(
        `${pkg.name} doesn't have a compatible version for ${this.platformInfo.platformToUse}`
      );
    }
    return versions.length > 0 ? versions[0].name : undefined;
  }

  public async checkBinariesVersion(pkg: IPackage, pathsToVerify: string) {
    let modifiedPath = process.env.PATH;
    if (process.env.PATH.indexOf(pathsToVerify) === -1) {
      modifiedPath = `${pathsToVerify}${path.delimiter}${process.env.PATH}`;
    }
    const versionCmd = pkg.version_cmd.join(" ");
    const modifiedEnv = Object.assign({}, process.env);
    modifiedEnv.PATH = modifiedPath;
    try {
      const binVersionResponse = await utils.execChildProcess(
        versionCmd,
        process.cwd(),
        this.toolsManagerChannel,
        {
          env: modifiedEnv,
          maxBuffer: 500 * 1024,
          cwd: process.cwd(),
        }
      );
      const regexResult = binVersionResponse
        .toString()
        .match(pkg.version_regex);
      if (regexResult.length > 0) {
        if (pkg.version_regex_replace) {
          let replaceRegexResult = pkg.version_regex_replace;
          for (let i = 0; i < regexResult.length; i++) {
            replaceRegexResult = replaceRegexResult.replace(
              "\\" + i,
              regexResult[i]
            );
          }
          return replaceRegexResult;
        }
        return regexResult[1];
      }
      return "No match";
    } catch (error) {
      const errMsg = error.message
        ? error.message
        : `Error checking ${pkg.name} version`;
      this.toolsManagerChannel.appendLine(errMsg);
      Logger.error(errMsg, error);
      return errMsg;
    }
  }

  public async exportPaths(basePath: string, onReqPkgs?: string[]) {
    let exportedPaths = "";
    const pkgs = await this.getPackageList(onReqPkgs);
    for (const pkg of pkgs) {
      const versionToUse = this.getVersionToUse(pkg);
      let pkgExportedPath: string;
      if (pkg.binaries) {
        pkgExportedPath = path.join(
          basePath,
          pkg.name,
          versionToUse,
          ...pkg.binaries
        );
      } else {
        pkgExportedPath = path.join(basePath, pkg.name, versionToUse);
      }
      exportedPaths =
        exportedPaths === ""
          ? pkgExportedPath
          : exportedPaths + path.delimiter + pkgExportedPath;
    }
    return exportedPaths;
  }

  public async getListOfReqEnvVars() {
    const exportedVarDict = {};
    const pkgs = await this.getPackageList();
    for (const pkg of pkgs) {
      Object.keys(pkg.export_vars).forEach((key) => {
        if (Object.keys(exportedVarDict).indexOf(key) === -1) {
          exportedVarDict[key] = pkg.export_vars[key];
        }
      });
    }
    return exportedVarDict;
  }

  public async exportVars(basePath: string, onReqPkgs?: string[]) {
    const exportedVars = {};
    const pkgs = await this.getPackageList(onReqPkgs);
    for (const pkg of pkgs) {
      Object.keys(pkg.export_vars).forEach((key, index, arr) => {
        if (Object.keys(exportedVars).indexOf(key) === -1) {
          const versionToUse = this.getVersionToUse(pkg);
          const toolPath = path.join(basePath, pkg.name, versionToUse);
          exportedVars[key] = pkg.export_vars[key].replace(
            "${TOOL_PATH}",
            toolPath
          );
        }
      });
    }
    return JSON.stringify(exportedVars);
  }

  public async getRequiredToolsInfo() {
    return this.getPackageList().then((packages) => {
      return packages.map((pkg) => {
        const pkgVersionsForPlatform = pkg.versions.filter((version) => {
          return (
            Object.getOwnPropertyNames(version).indexOf(
              this.platformInfo.platformToUse
            ) > -1
          );
        });
        const expectedVersions = pkgVersionsForPlatform.map((p) => p.name);
        return {
          expected: expectedVersions.join(","),
          hashResult: false,
          id: pkg.name,
          progress: "0.00%",
          hasFailed: false,
        };
      });
    });
  }

  public async checkToolsVersion(pathToVerify: string): Promise<IToolInfo[]> {
    const versions = await this.verifyPackages(pathToVerify);
    const pkgs = await this.getPackageList().then((packages) => {
      return packages.map((pkg) => {
        const expectedVersions = pkg.versions.map((p) => p.name);
        const isToolVersionCorrect =
          expectedVersions.indexOf(versions[pkg.name]) > -1;
        return {
          actual: versions[pkg.name],
          doesToolExist: isToolVersionCorrect,
          expected: expectedVersions.join(" or \n"),
          id: pkg.name,
        } as IToolInfo;
      });
    });
    return pkgs;
  }
}
