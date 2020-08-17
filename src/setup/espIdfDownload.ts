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

import path from "path";
import * as utils from "../utils";
import { Logger } from "../logger/logger";
import { OutputChannel } from "../logger/outputChannel";
import { DownloadManager } from "../downloadManager";
import { InstallManager } from "../installManager";
import { PackageProgress } from "../PackageProgress";
import {
  sendEspIdfDownloadDetail,
  sendEspIdfDownloadProgress,
  sendDownloadedZip,
  sendExtractedZip,
} from "./webviewMsgMethods";
import { move } from "fs-extra";
import { AbstractCloning } from "../common/abstractCloning";

export interface IEspIdfLink {
  filename: string;
  name: string;
  url: string;
  mirror: string;
}

export class EspIdfCloning extends AbstractCloning {
  constructor(branchName: string) {
    super("https://github.com/espressif/esp-idf.git", "ESP-IDF", branchName);
  }
}

export async function downloadInstallIdfVersion(
  idfVersion: IEspIdfLink,
  destPath: string
) {
  try {
    const downloadedZipPath = path.join(destPath, idfVersion.filename);
    const extractedDirectory = downloadedZipPath.replace(".zip", "");
    const expectedDirectory = path.join(destPath, "esp-idf");

    const containerFolderExists = await utils.dirExistPromise(destPath);
    if (!containerFolderExists) {
      Logger.infoNotify(
        `${destPath} doesn't exists. Select an existing directory.`
      );
      return;
    }
    const expectedDirExists = await utils.dirExistPromise(expectedDirectory);
    if (!expectedDirExists) {
      OutputChannel.appendLine(
        `${expectedDirectory} already exists. Delete it or use another location`
      );
      Logger.infoNotify(
        `${expectedDirectory} already exists. Delete it or use another location`
      );
      return;
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

    if (
      idfVersion.filename === "master" ||
      idfVersion.filename.startsWith("release")
    ) {
      const downloadByCloneMsg = `Downloading ESP-IDF ${idfVersion.filename} using git clone...\n`;
      OutputChannel.appendLine(downloadByCloneMsg);
      Logger.info(downloadByCloneMsg);
      const espIdfCloning = new EspIdfCloning(idfVersion.filename);
      await espIdfCloning.downloadByCloning(destPath, pkgProgress);
    } else {
      await downloadManager.downloadWithRetries(
        idfVersion.url,
        destPath,
        pkgProgress
      );
      const downloadedMsg = `Downloaded ${idfVersion.name}.\n`;
      OutputChannel.appendLine(downloadedMsg);
      Logger.info(downloadedMsg);
      sendDownloadedZip(downloadedZipPath);
      await installManager.installZipFile(downloadedZipPath, destPath);
      const extractedMsg = `Extracted ${downloadedZipPath} in ${destPath}.\n`;
      OutputChannel.appendLine(extractedMsg);
      Logger.info(extractedMsg);
      await move(extractedDirectory, expectedDirectory);
      sendExtractedZip(expectedDirectory);
    }
    return expectedDirectory;
  } catch (error) {
    OutputChannel.appendLine(error);
    Logger.infoNotify(error);
  }
}
