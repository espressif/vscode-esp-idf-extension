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
import { checkGitExists } from "../utils";
import { checkPythonExists } from "../pythonManager";

export async function installIdfGit(
  idfToolsDir: string,
  progress?: Progress<{ message: string; increment?: number }>,
  cancelToken?: CancellationToken
) {
  const idfGitUrl = `https://dl.espressif.com/dl/idf-git/idf-git-2.30.1-win64.zip`;
  const downloadManager = new DownloadManager(idfToolsDir);
  const installManager = new InstallManager(idfToolsDir);
  const idfGitZipPath = join(idfToolsDir, "dist", basename(idfGitUrl));
  const pkgProgress = new PackageProgress(
    basename(idfGitUrl),
    sendIdfGitDownloadProgress,
    null,
    sendIdfGitDownloadDetail,
    null
  );
  const gitZipPathExists = await pathExists(idfGitZipPath);
  if (!gitZipPathExists) {
    progress.report({ message: `Downloading ${idfGitZipPath}...` });
    OutputChannel.appendLine(`Downloading ${idfGitZipPath}...`);
    await downloadManager.downloadWithRetries(
      idfGitUrl,
      join(idfToolsDir, "dist"),
      pkgProgress,
      cancelToken
    );
  } else {
    OutputChannel.appendLine(`Using existing ${idfGitZipPath}`);
  }
  const idfGitDestPath = join(idfToolsDir, "tools", "idf-git");
  const gitPathExists = await pathExists(idfGitDestPath);
  if (gitPathExists) {
    const gitDirectory = join(idfGitDestPath, "cmd"); // to do: update with correct git --version
    const binVersion = await checkGitExists(gitDirectory);
    if (binVersion) {
      OutputChannel.appendLine(`Using existing ${idfGitDestPath}`);
      return;
    }
  }
  progress.report({ message: `Installing ${idfGitDestPath} ...` });
  OutputChannel.appendLine(`Installing ${idfGitDestPath} ...`);
  await installManager.installZipFile(
    idfGitZipPath,
    idfGitDestPath,
    cancelToken
  );
  progress.report({ message: `Extracted ${idfGitDestPath} ...` });
  OutputChannel.appendLine(`Extracted ${idfGitDestPath} ...`);
}

export async function installIdfPython(
  idfToolsDir: string,
  progress?: Progress<{ message: string; increment?: number }>,
  cancelToken?: CancellationToken
) {
  const idfPythonUrl = `https://dl.espressif.com/dl/idf-python/idf-python-3.8.7-embed-win64.zip`;
  const downloadManager = new DownloadManager(idfToolsDir);
  const installManager = new InstallManager(idfToolsDir);
  const idfPyZipPath = join(idfToolsDir, "dist", basename(idfPythonUrl));
  const pkgProgress = new PackageProgress(
    basename(idfPythonUrl),
    sendIdfPythonDownloadProgress,
    null,
    sendIdfPythonDownloadDetail,
    null
  );
  const pyZipPathExists = await pathExists(idfPyZipPath);
  if (!pyZipPathExists) {
    progress.report({ message: `Downloading ${idfPyZipPath}...` });
    await downloadManager.downloadWithRetries(
      idfPythonUrl,
      join(idfToolsDir, "dist"),
      pkgProgress,
      cancelToken
    );
  } else {
    OutputChannel.appendLine(`Using existing ${idfPyZipPath}`);
  }
  const idfPyDestPath = join(idfToolsDir, "tools", "idf-python");
  progress.report({ message: `Installing ${idfPyDestPath}...` });
  const pyPathExists = await pathExists(idfPyDestPath);
  if (pyPathExists) {
    const binVersion = await checkPythonExists(
      join(idfPyDestPath, "python.exe"),
      idfPyDestPath
    );
    if (binVersion) {
      OutputChannel.appendLine(`Using existing ${idfPyDestPath}`);
      return;
    }
  }
  await installManager.installZipFile(idfPyZipPath, idfPyDestPath, cancelToken);
  progress.report({ message: `Extracted ${idfPyDestPath} ...` });
  OutputChannel.appendLine(`Extracted ${idfPyDestPath} ...`);
}
