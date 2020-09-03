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
import { delimiter } from "path";
import { Logger } from "../logger/logger";
import { OutputChannel } from "../logger/outputChannel";
import { DownloadManager } from "../downloadManager";
import { InstallManager } from "../installManager";
import { IdfToolsManager } from "../idfToolsManager";
import { PackageProgress } from "../PackageProgress";
import {
  sendPkgDownloadPercentage,
  sendPkgChecksumResult,
  sendPkgDownloadDetail,
  sendPkgDownloadFailed,
} from "./webviewMsgMethods";
import { CancellationToken, Progress } from "vscode";

export async function downloadEspIdfTools(
  installDir: string,
  idfToolsManager: IdfToolsManager,
  progress: Progress<{ message: string; increment?: number }>,
  cancelToken?: CancellationToken
) {
  const manyPathsInInstallDir = installDir.split(delimiter);
  if (manyPathsInInstallDir.length > 1) {
    Logger.infoNotify("Introduce a single path");
    return;
  }
  const downloadManager = new DownloadManager(installDir);
  const installManager = new InstallManager(installDir);

  const packages = await idfToolsManager.getPackageList();
  const pkgProgress = packages.map((p) => {
    return new PackageProgress(
      p.name,
      sendPkgDownloadPercentage,
      sendPkgChecksumResult,
      sendPkgDownloadDetail,
      sendPkgDownloadFailed
    );
  });
  OutputChannel.appendLine("");
  Logger.info("");
  await downloadManager.downloadPackages(
    idfToolsManager,
    progress,
    pkgProgress,
    cancelToken
  );
  OutputChannel.appendLine("");
  Logger.info("");
  await installManager.installPackages(idfToolsManager, progress, cancelToken);
  OutputChannel.appendLine("");
  Logger.info("");
}
