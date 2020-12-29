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
import { spawn, ChildProcess } from "child_process";
import { join, basename } from "path";
import treeKill from "tree-kill";
import { Logger } from "../logger/logger";
import { checkGitExists, dirExistPromise } from "../utils";
import { OutputChannel } from "../logger/outputChannel";
import { CancellationToken, Progress, ProgressLocation, window } from "vscode";
import * as idfConf from "../idfConfiguration";

export class AbstractCloning {
  private cloneProcess: ChildProcess;
  private readonly GITHUB_REPO: string;

  constructor(
    githubRepository: string,
    private name: string,
    private branchToUse: string
  ) {
    this.GITHUB_REPO = githubRepository;
  }

  public cancel() {
    if (this.cloneProcess && !this.cloneProcess.killed) {
      treeKill(this.cloneProcess.pid, "SIGKILL");
      this.cloneProcess = undefined;
      OutputChannel.appendLine(`\n❌ [${this.name} Cloning] : Stopped!\n`);
    }
  }

  public downloadByCloning(
    progress: Progress<{ message?: string; increment?: number }>,
    installDir: string
  ) {
    return new Promise<void>((resolve, reject) => {
      this.cloneProcess = spawn(
        "git",
        [
          "clone",
          "--recursive",
          "--progress",
          "-b",
          this.branchToUse,
          this.GITHUB_REPO,
        ],
        { cwd: installDir }
      );

      this.cloneProcess.stderr.on("data", (data) => {
        OutputChannel.appendLine(data.toString());
        const errRegex = /\b(Error)\b/g;
        if (errRegex.test(data.toString())) {
          reject(data.toString());
        }
        const progressRegex = /(\d+)(\.\d+)?%/g;
        const matches = data.toString().match(progressRegex);
        if (progress && matches) {
          progress.report({
            message: `Downloading ${matches[matches.length - 1]}`,
          });
        } else if (data.toString().indexOf("Cloning into") !== -1) {
          progress.report({
            message: `${data.toString()}`,
          });
        }
      });

      this.cloneProcess.stdout.on("data", (data) => {
        OutputChannel.appendLine(data.toString());
        const progressRegex = /(\d+)(\.\d+)?%/g;
        const matches = data.toString().match(progressRegex);
        if (progress && matches) {
          progress.report({
            message: `Downloading ${matches[matches.length - 1]}`,
          });
        } else if (data.toString().indexOf("Cloning into") !== -1) {
          progress.report({
            message: ` ${data.toString()}`,
          });
        }
      });

      this.cloneProcess.on("exit", (code, signal) => {
        if (!signal && code !== 0) {
          const msg = `${this.name} clone has exit with ${code}`;
          OutputChannel.appendLine(msg);
          return reject(new Error(msg));
        }
        return resolve();
      });
    });
  }

  public async getRepository(configurationId: string) {
    const toolsDir = await idfConf.readParameter("idf.toolsPath");
    const installDir = await window.showQuickPick(
      [
        {
          label: `Use current ESP-IDF Tools directory (${toolsDir})`,
          target: "current",
        },
        { label: "Choose a container directory...", target: "another" },
      ],
      { placeHolder: `Select a directory to save ${this.name}` }
    );
    if (!installDir) {
      return;
    }
    let installDirPath: string;
    if (installDir.target === "another") {
      const chosenFolder = await window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
      });
      if (!chosenFolder || chosenFolder.length < 1) {
        return;
      }
      installDirPath = chosenFolder[0].fsPath;
    } else {
      const doesToolsDirExists = await dirExistPromise(toolsDir);
      if (!doesToolsDirExists) {
        Logger.infoNotify(`${toolsDir} doesn't exist.`);
        return;
      }
      installDirPath = toolsDir;
    }
    const resultFolder = basename(this.GITHUB_REPO).replace(".git", "");
    const resultingPath = join(installDirPath, resultFolder);
    const doesResultingPathExists = await dirExistPromise(resultingPath);
    if (doesResultingPathExists) {
      Logger.infoNotify(`${resultingPath} already exist.`);
      return;
    }
    await window.withProgress(
      {
        cancellable: true,
        location: ProgressLocation.Notification,
        title: this.name,
      },
      async (
        progress: Progress<{ message: string; increment: number }>,
        cancelToken: CancellationToken
      ) => {
        try {
          const gitVersion = await checkGitExists(installDirPath);
          if (!gitVersion || gitVersion === "Not found") {
            throw new Error("Git is not found in PATH");
          }
          cancelToken.onCancellationRequested((e) => {
            this.cancel();
          });
          await this.downloadByCloning(progress, installDirPath);
          const target = idfConf.readParameter("idf.saveScope");
          await idfConf.writeParameter(configurationId, resultingPath, target);
          Logger.infoNotify(`${this.name} has been installed`);
        } catch (error) {
          OutputChannel.appendLine(error.message);
          Logger.errorNotify(error.message, error);
        }
      }
    );
  }
}
