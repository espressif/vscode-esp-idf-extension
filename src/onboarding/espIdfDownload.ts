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

import { spawn } from "child_process";
import * as fs from "fs";
import { move, readFile } from "fs-extra";
import { EOL, tmpdir } from "os";
import * as path from "path";
import { ConfigurationTarget, WorkspaceFolder } from "vscode";
import { v4 as uuidv4 } from "uuid";
import { DownloadManager } from "../downloadManager";
import * as idfConf from "../idfConfiguration";
import { InstallManager } from "../installManager";
import { IMetadataFile, IPath } from "../ITool";
import { Logger } from "../logger/logger";
import { OutputChannel } from "../logger/outputChannel";
import { PackageProgress } from "../PackageProgress";
import * as utils from "../utils";
import { OnBoardingPanel } from "./OnboardingPanel";
import {
  sendDownloadEspIdfDetail,
  sendDownloadEspIdfPercentage,
} from "./updateViewMethods";

export interface IEspIdfLink {
  filename: string;
  name: string;
  url: string;
  mirror: string;
}

export async function downloadInstallIdfVersion(
  idfVersion: IEspIdfLink,
  destPath: string,
  confTarget: ConfigurationTarget,
  selectedWorkspaceFolder: WorkspaceFolder
) {
  const downloadedZipPath = path.join(destPath, idfVersion.filename);
  const extractedDirectory = downloadedZipPath.replace(".zip", "");
  const expectedDirectory = path.join(destPath, "esp-idf");
  try {
    const containerFolderExists = await utils.dirExistPromise(destPath);
    if (!containerFolderExists) {
      Logger.infoNotify(
        `${destPath} doesn't exists. Please select an existing directory.`
      );
      return;
    }
    const espIdfFolderExists = await utils.dirExistPromise(expectedDirectory);
    if (espIdfFolderExists) {
      OutputChannel.appendLine(
        `${expectedDirectory} already exists. Delete it or use another location`
      );
      Logger.infoNotify(
        `${expectedDirectory} already exists. Delete it or use another location`
      );
      return;
    }
    OnBoardingPanel.postMessage({
      command: "set_selected_download_state",
      state: "download",
    });
    const downloadManager = new DownloadManager(destPath);
    const installManager = new InstallManager(destPath);
    const espIdfProgress = new PackageProgress(
      idfVersion.name,
      sendDownloadEspIdfPercentage,
      null,
      sendDownloadEspIdfDetail,
      null
    );
    if (
      idfVersion.filename === "master" ||
      idfVersion.filename.startsWith("release")
    ) {
      OutputChannel.appendLine(
        `Downloading ESP-IDF ${idfVersion.filename} using git clone...\n`
      );
      Logger.info("Downloading ESP-IDF master using git clone...\n");
      await downloadEspIdfByClone(
        destPath,
        idfVersion.filename,
        espIdfProgress
      );
      OutputChannel.appendLine(
        `ESP-IDF ${idfVersion.filename} has been cloned from Github.\n`
      );
      Logger.info(
        `ESP-IDF ${idfVersion.filename} has been cloned from Github.\n`
      );
      espIdfProgress.ProgressDetail = `${idfVersion.name} has been git cloned successfully`;
      OnBoardingPanel.postMessage({
        command: "notify_idf_downloaded",
        downloadedPath: "master",
      });
      OnBoardingPanel.postMessage({ command: "notify_idf_extracted" });
      await idfConf.writeParameter(
        "idf.espIdfPath",
        expectedDirectory,
        confTarget,
        selectedWorkspaceFolder
      );
    } else {
      await downloadManager.downloadWithRetries(
        idfVersion.url,
        destPath,
        espIdfProgress
      );
      OutputChannel.appendLine(`Downloaded ${idfVersion.name}.\n`);
      Logger.info(`Downloaded ${idfVersion.name}.\n`);
      OnBoardingPanel.postMessage({
        command: "notify_idf_downloaded",
        downloadedPath: downloadedZipPath,
      });
      await installManager.installZipFile(downloadedZipPath, destPath);
      OutputChannel.appendLine(
        `Extracted ${downloadedZipPath} in ${destPath}.\n`
      );
      Logger.info(`Extracted ${downloadedZipPath} in ${destPath}.\n`);
      OnBoardingPanel.postMessage({
        command: "notify_idf_extracted",
      });

      // Rename folder esp-idf-{version} to esp-idf
      await move(extractedDirectory, expectedDirectory).then(() => {
        OutputChannel.appendLine(
          `Renamed ${extractedDirectory} in ${expectedDirectory}.\n`
        );
        Logger.info(
          `Extracted ${extractedDirectory} in ${expectedDirectory}.\n`
        );
        OnBoardingPanel.postMessage({
          command: "load_idf_path",
          idf_path: expectedDirectory,
        });
      });
      await idfConf.writeParameter(
        "idf.espIdfPath",
        expectedDirectory,
        confTarget,
        selectedWorkspaceFolder
      );
      await saveIdfPathInMetadataFile(expectedDirectory);
    }
  } catch (error) {
    OutputChannel.appendLine(error);
    Logger.infoNotify(error);
    OnBoardingPanel.postMessage({
      command: "set_selected_download_state",
      state: "empty",
    });
  }
}

export function createEspIdfLinkList(data: String, splitString: string) {
  const versionZip =
    "https://github.com/espressif/esp-idf/releases/download/IDFZIPFileVersion/esp-idf-IDFZIPFileVersion.zip";
  const mirrorZip =
    "https://dl.espressif.com/dl/esp-idf/releases/esp-idf-IDFZIPFileVersion.zip";
  const versionRegex = /\b(IDFZIPFileVersion)\b/g;
  const espIdfMasterZip =
    "https://github.com/espressif/esp-idf/archive/master.zip";
  const preReleaseRegex = /v.+-rc/g;
  const betaRegex = /v.+-beta/g;

  const versionList = data.trim().split(splitString);
  const downloadList: IEspIdfLink[] = versionList.map((version) => {
    if (version.startsWith("release/")) {
      const versionRoot = version.replace("release/", "");
      const versionForRelease = versionList.find((ver) =>
        ver.startsWith(versionRoot)
      );
      if (versionForRelease) {
        return {
          filename: `esp-idf-${versionForRelease}.zip`,
          name: version + " (release branch)",
          url: versionZip.replace(
            versionRegex,
            version.replace("release/", "")
          ),
          mirror: mirrorZip.replace(
            versionRegex,
            version.replace("release/", "")
          ),
        };
      } else {
        return {
          filename: `${version}`,
          name: version + " (release branch)",
          url: "",
          mirror: "",
        };
      }
    } else if (version.startsWith("v")) {
      return {
        filename: `esp-idf-${version}.zip`,
        name: version + " (release version)",
        url: versionZip.replace(versionRegex, version),
        mirror: mirrorZip.replace(versionRegex, version),
      };
    } else if (preReleaseRegex.test(version)) {
      return {
        filename: `esp-idf-${version}.zip`,
        name: version + " (pre-release version)",
        url: versionZip.replace(versionRegex, version),
        mirror: mirrorZip.replace(versionRegex, version),
      };
    } else if (version === "master") {
      return {
        filename: `master`,
        name: version + " (development branch)",
        url: espIdfMasterZip,
        mirror: espIdfMasterZip,
      };
    } else if (betaRegex.test(version)) {
      return {
        filename: `esp-idf-${version}.zip`,
        name: version + " (beta version)",
        url: versionZip.replace(versionRegex, version),
        mirror: mirrorZip.replace(versionRegex, version),
      };
    }
  });
  return downloadList;
}

export function downloadEspIdfVersionList(
  downloadManager: DownloadManager,
  extensionPath: string
) {
  const idfVersionList = path.join(tmpdir(), "idf_versions.txt");
  const versionsUrl = "https://dl.espressif.com/dl/esp-idf/idf_versions.txt";

  return new Promise<IEspIdfLink[]>(async (resolve, reject) => {
    try {
      const downloadMessage = await downloadManager.downloadFile(
        versionsUrl,
        0,
        tmpdir()
      );
      Logger.info(downloadMessage.statusMessage);
      const idfVersionsContent = await readFile(idfVersionList, "utf8");
      const downloadList: IEspIdfLink[] = createEspIdfLinkList(
        idfVersionsContent,
        "\n"
      );
      return resolve(downloadList);
    } catch (error) {
      const idfVersionListFallBack = path.join(
        extensionPath,
        "idf_versions.txt"
      );
      try {
        const idfFallbackContent = await readFile(
          idfVersionListFallBack,
          "utf8"
        );
        const fallbackDownloadList: IEspIdfLink[] = createEspIdfLinkList(
          idfFallbackContent,
          "\n"
        );
        return resolve(fallbackDownloadList);
      } catch (fallbackErr) {
        return reject(fallbackErr);
      }
    }
  });
}

export function downloadEspIdfByClone(
  installDirectoryPath: string,
  branchName: string,
  pkgProgress: PackageProgress
): Promise<void> {
  const espIdfGithubRepo = "https://github.com/espressif/esp-idf.git";
  return new Promise((resolve, reject) => {
    const gitCloneProcess = spawn(
      `git`,
      [
        "clone",
        "--recursive",
        "--progress",
        "-b",
        branchName,
        espIdfGithubRepo,
      ],
      { cwd: installDirectoryPath }
    );
    gitCloneProcess.stderr.on("data", (data) => {
      OutputChannel.appendLine(data.toString());
      const errRegex = /\b(Error)\b/g;
      if (errRegex.test(data.toString())) {
        reject(data.toString());
      }
      const progressRegex = /(\d+)(\.\d+)?%/g;
      const matches = data.toString().match(progressRegex);
      if (pkgProgress && matches) {
        pkgProgress.Progress = matches[matches.length - 1];
      } else if (data.toString().indexOf("Cloning into") !== -1) {
        pkgProgress.ProgressDetail = " " + data.toString();
      }
    });

    gitCloneProcess.stdout.on("data", (data) => {
      OutputChannel.appendLine(data.toString());
      const progressRegex = /(\d+)(\.\d+)?%/g;
      const matches = data.toString().match(progressRegex);
      if (pkgProgress && matches) {
        pkgProgress.Progress = matches[matches.length - 1];
      } else if (data.toString().indexOf("Cloning into") !== -1) {
        pkgProgress.ProgressDetail = " " + data.toString();
      }
    });

    gitCloneProcess.on("exit", (code, signal) => {
      if (!signal && code !== 0) {
        OutputChannel.appendLine(`ESP-IDF master clone has exit with ${code}`);
        reject(`ESP-IDF master clone has exit with ${code}`);
      }
      resolve();
    });
  });
}

export async function getEspIdfVersions(extensionPath: string) {
  const downloadManager = new DownloadManager(extensionPath);
  const versionList = await downloadEspIdfVersionList(
    downloadManager,
    extensionPath
  );
  const manualVersion = {
    name: "Find ESP-IDF in your system",
    filename: "manual",
  } as IEspIdfLink;
  versionList.push(manualVersion);
  return versionList;
}

export async function saveIdfPathInMetadataFile(idfPath: string) {
  const metadataFile = path.join(
    utils.extensionContext.extensionPath,
    "metadata.json"
  );
  const idfMetadata: IPath = {
    id: uuidv4(),
    path: idfPath,
  } as IPath;
  const doesFileExists = await utils.doesPathExists(metadataFile);
  if (doesFileExists) {
    const metadata = await utils.readJson(metadataFile);
    if (metadata.idf) {
      const existingPath = metadata.idf.filter(
        (idfMeta) => idfMeta.path === idfMetadata.path
      );
      if (typeof existingPath === "undefined" || existingPath.length === 0) {
        metadata.idf.push(idfMetadata);
      }
    } else {
      metadata.idf = [idfMetadata];
    }
    await utils.writeJson(metadataFile, metadata);
  } else {
    const metadata: IMetadataFile = { idf: [idfMetadata] } as IMetadataFile;
    await utils.writeJson(metadataFile, metadata);
  }
}
