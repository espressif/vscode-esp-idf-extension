/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 24th May 2021 7:49:15 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { DownloadManager } from "../downloadManager";
import { CancellationToken, Progress } from "vscode";
import { PackageProgress } from "../PackageProgress";
import { InstallManager } from "../installManager";
import { basename, join } from "path";
import {
  sendIdfGitDownloadDetail,
  sendIdfGitDownloadProgress,
  sendIdfPythonDownloadDetail,
  sendIdfPythonDownloadProgress,
} from "./webviewMsgMethods";
import { OutputChannel } from "../logger/outputChannel";
import { pathExists } from "fs-extra";
import { checkGitExists, spawn } from "../utils";
import { checkPythonExists } from "../pythonManager";
import { ESP } from "../config";
import { Logger } from "../logger/logger";

export async function installIdfGit(
  idfToolsDir: string,
  progress?: Progress<{ message: string; increment?: number }>,
  cancelToken?: CancellationToken
) {
  const downloadManager = new DownloadManager(idfToolsDir);
  const installManager = new InstallManager(idfToolsDir);
  const idfGitZipPath = join(
    idfToolsDir,
    "dist",
    basename(ESP.URL.IDF_EMBED_GIT.IDF_EMBED_GIT_URL)
  );
  const idfGitDestPath = join(
    idfToolsDir,
    "tools",
    "idf-git",
    ESP.URL.IDF_EMBED_GIT.VERSION
  );
  const resultGitPath = join(idfGitDestPath, "cmd", "git.exe");
  const pkgProgress = new PackageProgress(
    basename(ESP.URL.IDF_EMBED_GIT.IDF_EMBED_GIT_URL),
    sendIdfGitDownloadProgress,
    null,
    sendIdfGitDownloadDetail,
    null
  );

  const gitPathExists = await pathExists(idfGitDestPath);
  if (gitPathExists) {
    const gitDirectory = join(idfGitDestPath, "cmd");
    const binVersion = await checkGitExists(gitDirectory, resultGitPath);
    if (!binVersion || binVersion === "Not found") {
      const msg = `Using existing ${idfGitDestPath}`;
      OutputChannel.appendLine(msg);
      Logger.info(msg);
      return resultGitPath;
    }
  }

  const gitZipPathExists = await pathExists(idfGitZipPath);
  if (gitZipPathExists) {
    const existingMsg = `Using existing ${idfGitZipPath}`;
    OutputChannel.appendLine(existingMsg);
    Logger.info(existingMsg);
  } else {
    const msgDownload = `Downloading ${idfGitZipPath}...`;
    progress.report({ message: msgDownload });
    OutputChannel.appendLine(msgDownload);
    Logger.info(msgDownload);
    await downloadManager.downloadWithRetries(
      ESP.URL.IDF_EMBED_GIT.IDF_EMBED_GIT_URL,
      join(idfToolsDir, "dist"),
      pkgProgress,
      cancelToken
    );
  }
  const doesZipfileExist = await pathExists(idfGitZipPath);
  if (!doesZipfileExist) {
    throw new Error(`${idfGitZipPath} was not downloaded.`);
  }
  const installingMsg = `Installing ${idfGitDestPath} ...`;
  progress.report({ message: installingMsg });
  OutputChannel.appendLine(installingMsg);
  Logger.info(installingMsg);
  await installManager.installZipFile(
    idfGitZipPath,
    idfGitDestPath,
    cancelToken
  );
  const extractedMsg = `Extracted ${idfGitDestPath} ...`;
  progress.report({ message: extractedMsg });
  OutputChannel.appendLine(extractedMsg);
  Logger.info(extractedMsg);
  return resultGitPath;
}

export async function installIdfPython(
  idfToolsDir: string,
  idfVersion: string,
  progress?: Progress<{ message: string; increment?: number }>,
  cancelToken?: CancellationToken
) {
  const downloadManager = new DownloadManager(idfToolsDir);
  const installManager = new InstallManager(idfToolsDir);
  const pythonURLToUse =
    idfVersion >= "5.0"
      ? ESP.URL.IDF_EMBED_PYTHON.IDF_EMBED_PYTHON_URL
      : ESP.URL.OLD_IDF_EMBED_PYTHON.IDF_EMBED_PYTHON_URL;
  const idfPyZipPath = join(idfToolsDir, "dist", basename(pythonURLToUse));
  const pkgProgress = new PackageProgress(
    basename(pythonURLToUse),
    sendIdfPythonDownloadProgress,
    null,
    sendIdfPythonDownloadDetail,
    null
  );
  const pythonVersionToUse =
    idfVersion >= "5.0"
      ? ESP.URL.IDF_EMBED_PYTHON.VERSION
      : ESP.URL.OLD_IDF_EMBED_PYTHON.VERSION;
  const idfPyDestPath = join(
    idfToolsDir,
    "tools",
    "idf-python",
    pythonVersionToUse
  );
  const pyPathExists = await pathExists(idfPyDestPath);
  if (pyPathExists) {
    const binVersion = await checkPythonExists(
      join(idfPyDestPath, "python.exe"),
      idfPyDestPath
    );
    if (binVersion) {
      const usingExistingDestMsg = `Using existing ${idfPyDestPath}`;
      OutputChannel.appendLine(usingExistingDestMsg);
      Logger.info(usingExistingDestMsg);
      return join(idfPyDestPath, "python.exe");
    }
  }
  const pyZipPathExists = await pathExists(idfPyZipPath);
  if (pyZipPathExists) {
    const usingExistingPathMsg = `Using existing ${idfPyZipPath}`;
    OutputChannel.appendLine(usingExistingPathMsg);
    Logger.info(usingExistingPathMsg);
  } else {
    progress.report({ message: `Downloading ${idfPyZipPath}...` });
    await downloadManager.downloadWithRetries(
      pythonURLToUse,
      join(idfToolsDir, "dist"),
      pkgProgress,
      cancelToken
    );
  }
  const doesZipfileExist = await pathExists(idfPyZipPath);
  if (!doesZipfileExist) {
    throw new Error(`${idfPyZipPath} was not downloaded.`);
  }
  progress.report({ message: `Installing ${idfPyDestPath}...` });
  await installManager.installZipFile(idfPyZipPath, idfPyDestPath, cancelToken);
  const extractePyDestMsg = `Extracted ${idfPyDestPath} ...`;
  progress.report({ message: extractePyDestMsg });
  OutputChannel.appendLine(extractePyDestMsg);
  if (idfVersion >= "5.0") {
    await spawn(
      join(idfPyDestPath, "python.exe"),
      ["-m", "ensurepip", "--upgrade"],
      { cwd: idfPyDestPath }
    );
  } else {
    await spawn(
      join(idfPyDestPath, "python.exe"),
      ["-m", "pip", "install", "virtualenv"],
      { cwd: idfPyDestPath }
    );
  }

  return join(idfPyDestPath, "python.exe");
}
