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

import * as utils from "../utils";
import { Logger } from "../logger/logger";
import { ESP } from "../config";
import { OutputChannel } from "../logger/outputChannel";
import { DownloadManager } from "../downloadManager";
import { InstallManager } from "../installManager";
import { PackageProgress } from "../PackageProgress";
import { IEspIdfLink } from "../views/setup/types";
import {
  sendEspIdfDownloadDetail,
  sendEspIdfDownloadProgress,
  sendDownloadedZip,
  sendExtractedZip,
} from "./webviewMsgMethods";
import { ensureDir, move } from "fs-extra";
import { AbstractCloning } from "../common/abstractCloning";
import { CancellationToken, Progress } from "vscode";
import { Disposable } from "vscode-languageclient";
import { delimiter, dirname, join } from "path";

export class EspIdfCloning extends AbstractCloning {
  constructor(branchName: string, gitBinPath: string = "git") {
    super(
      "https://github.com/espressif/esp-idf.git",
      "ESP-IDF",
      branchName,
      gitBinPath,
      "https://gitee.com/EspressifSystems/esp-idf.git"
    );
  }
}

export async function downloadInstallIdfVersion(
  idfVersion: IEspIdfLink,
  destPath: string,
  mirror: ESP.IdfMirror,
  gitPath?: string,
  progress?: Progress<{ message: string; increment?: number }>,
  cancelToken?: CancellationToken
) {
  const downloadedZipPath = join(destPath, idfVersion.filename);
  const extractedDirectory = downloadedZipPath.replace(".zip", "");
  const expectedDirectory = join(destPath, "esp-idf");
  await ensureDir(destPath);
  const expectedDirExists = await utils.dirExistPromise(expectedDirectory);
  if (expectedDirExists) {
    const espExistsMsg = `${expectedDirectory} already exists. Delete it or use another location. (ERROR_EXISTING_ESP_IDF)`;
    OutputChannel.appendLine(espExistsMsg);
    Logger.infoNotify(espExistsMsg);
    throw new Error(espExistsMsg);
  }
  const downloadManager = new DownloadManager(destPath);
  const installManager = new InstallManager(destPath);
  const pkgProgress = new PackageProgress(
    idfVersion.name,
    sendEspIdfDownloadProgress,
    null,
    sendEspIdfDownloadDetail,
    null
  );
  pkgProgress.Progress = `0.00%`;

  if (
    idfVersion.filename === "master" ||
    idfVersion.filename.startsWith("release")
  ) {
    const downloadByCloneMsg = `Downloading ESP-IDF ${idfVersion.filename} using git clone...\n`;
    OutputChannel.appendLine(downloadByCloneMsg);
    Logger.info(downloadByCloneMsg);
    if (progress) {
      progress.report({ message: downloadByCloneMsg });
    }
    const espIdfCloning = new EspIdfCloning(idfVersion.filename, gitPath);
    let cancelDisposable: Disposable;
    if (cancelToken) {
      cancelDisposable = cancelToken.onCancellationRequested(() => {
        espIdfCloning.cancel();
      });
    }

    await espIdfCloning.downloadByCloning(
      destPath,
      pkgProgress,
      progress,
      mirror !== ESP.IdfMirror.Espressif,
      mirror
    );
    if (mirror === ESP.IdfMirror.Espressif) {
      const scriptFileExt = process.platform === "win32" ? "bat" : "sh";
      const submoduleUpdateScript = join(
        utils.extensionContext.extensionPath,
        "external",
        "gitee",
        `submodule-update.${scriptFileExt}`
      );
      const shellBin = process.platform === "win32" ? "cmd.exe" : "bash";
      let pathToGitDir = "";
      if (gitPath && gitPath !== "git") {
        pathToGitDir = dirname(gitPath);
      }
      let pathNameInEnv: string;
      if (process.platform === "win32") {
        pathNameInEnv = "Path";
      } else {
        pathNameInEnv = "PATH";
      }
      const modifiedEnv: { [key: string]: string } = <{ [key: string]: string }>(
        Object.assign({}, process.env)
      );
      if (pathToGitDir) {
        modifiedEnv[pathNameInEnv] =
          pathToGitDir + delimiter + modifiedEnv[pathNameInEnv];
      }
      await utils.spawn(shellBin, ["-c", submoduleUpdateScript], {
        cwd: join(destPath, "esp-idf"),
        env: modifiedEnv
      });
    }
    cancelDisposable.dispose();
  } else {
    const downloadByHttpMsg = `Downloading ESP-IDF ${idfVersion.name}...`;
    OutputChannel.appendLine(downloadByHttpMsg);
    Logger.info(downloadByHttpMsg);
    if (progress) {
      progress.report({ message: downloadByHttpMsg });
    }
    const urlToUse =
      mirror === ESP.IdfMirror.Github ? idfVersion.url : idfVersion.mirror;
    await downloadManager.downloadWithRetries(
      urlToUse,
      destPath,
      pkgProgress,
      cancelToken
    );
    const downloadedMsg = `Downloaded ${idfVersion.name}. Extracting...\n`;
    OutputChannel.appendLine(downloadedMsg);
    Logger.info(downloadedMsg);
    sendDownloadedZip(downloadedZipPath);
    await installManager.installZipFile(
      downloadedZipPath,
      destPath,
      cancelToken
    );
    const extractedMsg = `Extracted ${downloadedZipPath} in ${destPath}.\n`;
    OutputChannel.appendLine(extractedMsg);
    Logger.info(extractedMsg);
    await move(extractedDirectory, expectedDirectory);
    sendExtractedZip(expectedDirectory);

    if (gitPath) {
      await utils.fixFileModeGitRepository(expectedDirectory, gitPath);
      await utils.cleanDirtyGitRepository(expectedDirectory, gitPath);
    }
  }
  return expectedDirectory;
}
