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
import { checkGitExists, dirExistPromise, execChildProcess } from "../utils";
import { OutputChannel } from "../logger/outputChannel";
import {
  CancellationToken,
  Progress,
  ProgressLocation,
  Uri,
  window,
} from "vscode";
import * as idfConf from "../idfConfiguration";
import { PackageProgress } from "../PackageProgress";
import { ESP } from "../config";

export class AbstractCloning {
  private cloneProcess: ChildProcess;
  private readonly GITHUB_REPO: string;
  private readonly GITEE_REPO: string;

  constructor(
    githubRepository: string,
    private name: string,
    private branchToUse: string,
    private gitBinPath: string = "git",
    giteeRepository?: string
  ) {
    this.GITHUB_REPO = githubRepository;
    this.GITEE_REPO = giteeRepository;
  }

  public cancel() {
    if (this.cloneProcess && !this.cloneProcess.killed) {
      treeKill(this.cloneProcess.pid, "SIGKILL");
      this.cloneProcess = undefined;
      OutputChannel.appendLine(`\n❌ [${this.name} Cloning] : Stopped!\n`);
      Logger.info(`\n❌ [${this.name} Cloning] : Stopped!\n`);
    }
  }

  public downloadByCloning(
    installDir: string,
    pkgProgress?: PackageProgress,
    progress?: Progress<{ message?: string; increment?: number }>,
    recursiveDownload: boolean = true,
    mirror: ESP.IdfMirror = ESP.IdfMirror.Github
  ) {
    const args = ["clone"];
    if (recursiveDownload) {
      args.push("--recursive");
    }
    args.push(
      "--progress",
      "-b",
      this.branchToUse,
      mirror === ESP.IdfMirror.Espressif ? this.GITEE_REPO : this.GITHUB_REPO
    );
    OutputChannel.appendLine(
      `Cloning mirror ${
        mirror == ESP.IdfMirror.Espressif ? "Espressif" : "Github"
      } with URL ${
        mirror === ESP.IdfMirror.Espressif ? this.GITEE_REPO : this.GITHUB_REPO
      }`
    );
    return this.spawnWithProgress(
      this.gitBinPath,
      args,
      installDir,
      pkgProgress,
      progress
    );
  }

  public async getRepository(
    configurationId: string,
    workspace?: Uri,
    recursiveDownload?: boolean
  ) {
    const customExtraVars = idfConf.readParameter(
      "idf.customExtraVars",
      workspace
    ) as { [key: string]: string };
    const toolsDir = customExtraVars["IDF_TOOLS_PATH"];
    const installDir = await window.showQuickPick(
      [
        {
          label: `Use current ESP-IDF Tools directory (${toolsDir})`,
          target: "current",
        },
        { label: "Choose a container directory...", target: "another" },
        {
          label: "Use existing repository",
          target: "existing",
        },
      ],
      { placeHolder: `Select a directory to save ${this.name}` }
    );
    if (!installDir) {
      return;
    }

    let mirrorOption = await window.showQuickPick(
      [
        {
          label: `Use Github`,
          target: ESP.IdfMirror.Github,
        },
        {
          label: "Use Gitee",
          target: ESP.IdfMirror.Espressif,
        },
      ],
      { placeHolder: `Select a source mirror to use` }
    );

    if (!mirrorOption) {
      return;
    }

    let installDirPath: string;
    if (installDir.target === "another" || installDir.target === "existing") {
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

    if (installDir.target === "existing") {
      const target = idfConf.readParameter("idf.saveScope");
      await idfConf.writeParameter(configurationId, installDirPath, target);
      Logger.infoNotify(`${this.name} has been installed`);
      return;
    }
    const resultFolder = basename(this.GITHUB_REPO).replace(".git", "");
    const resultingPath = join(installDirPath, resultFolder);
    const doesResultingPathExists = await dirExistPromise(resultingPath);
    if (doesResultingPathExists) {
      Logger.infoNotify(`${resultingPath} already exist.`);
      return;
    }
    const notificationMode = idfConf.readParameter(
      "idf.notificationMode"
    ) as string;
    const progressLocation =
      notificationMode === idfConf.NotificationMode.All ||
      notificationMode === idfConf.NotificationMode.Notifications
        ? ProgressLocation.Notification
        : ProgressLocation.Window;
    await window.withProgress(
      {
        cancellable: true,
        location: progressLocation,
        title: this.name,
      },
      async (
        progress: Progress<{ message: string; increment: number }>,
        cancelToken: CancellationToken
      ) => {
        try {
          const gitVersion = await checkGitExists(
            installDirPath,
            this.gitBinPath
          );
          if (!gitVersion || gitVersion === "Not found") {
            throw new Error("Git is not found in idf.gitPath or PATH");
          }
          cancelToken.onCancellationRequested((e) => {
            this.cancel();
          });
          if (typeof recursiveDownload === "undefined") {
            recursiveDownload = mirrorOption.target !== ESP.IdfMirror.Espressif;
          }
          await this.downloadByCloning(
            installDirPath,
            undefined,
            progress,
            recursiveDownload,
            mirrorOption.target
          );
          if (mirrorOption.target === ESP.IdfMirror.Espressif) {
            await this.updateSubmodules(resultingPath, undefined, progress);
          }
          const target = idfConf.readParameter("idf.saveScope");
          await idfConf.writeParameter(configurationId, resultingPath, target);
          Logger.infoNotify(`${this.name} has been installed`);
        } catch (error) {
          OutputChannel.appendLine(error.message);
          Logger.errorNotify(
            error.message,
            error,
            "AbstractCloning getRepository"
          );
        }
      }
    );
  }

  public downloadSubmodules(
    repoRootDir: string,
    pkgProgress?: PackageProgress,
    progress?: Progress<{ message?: string; increment?: number }>
  ) {
    return this.spawnWithProgress(
      this.gitBinPath,
      ["submodule", "update", "--init", "--depth", "1", "--progress"],
      repoRootDir,
      pkgProgress,
      progress
    );
  }

  public async updateSubmodules(
    repoPath: string,
    pkgProgress?: PackageProgress,
    progress?: Progress<{ message?: string; increment?: number }>
  ) {
    const REPOS_ARRAY = [
      "esp-idf",
      "espressifsystems",
      "esp-rainmaker",
      "espressifsystems",
      "esp-insights",
      "espressifsystems",
      "esp-qcloud",
      "espressifsystems",
      "esp-sr",
      "esp-components",
      "esp-adf-libs",
      "esp-components",
      "esp32-camera",
      "esp-components",
      "esp-rainmaker-common",
      "esp-components",
      "esp-dl",
      "esp-components",
    ];
    await execChildProcess(
      this.gitBinPath,
      ["submodule", "init"],
      repoPath,
      OutputChannel.init()
    );
    const gitModules = await execChildProcess(
      this.gitBinPath,
      ["config", "-f", ".gitmodules", "--list"],
      repoPath,
      OutputChannel.init()
    );
    const lines = gitModules.split("\n");

    function getSubmoduleUrl(line: string) {
      const subpathMatch = line.match(/^submodule\.([^.]*?)\.url.*$/);
      const subPath = subpathMatch ? subpathMatch[1] : "";

      const locationMatch = line.match(/.*\/(.*)\.git/);
      let url = locationMatch ? locationMatch[1] : "";
      if (subPath && url) {
        return { subPath, url };
      }
      return null;
    }

    for (const l of lines) {
      const submoduleUrl = getSubmoduleUrl(l);
      if (submoduleUrl) {
        let { subPath, url } = submoduleUrl;
        let subUrl = "";

        for (let i = 0; i < REPOS_ARRAY.length; i += 2) {
          const repo = REPOS_ARRAY[i];
          const group = REPOS_ARRAY[i + 1];

          if (url.includes(repo)) {
            subUrl = `https://gitee.com/${group}/${repo}`;
            break;
          } else {
            // gitee url is case sensitive
            if (url.includes("unity")) {
              subUrl = "https://gitee.com/esp-submodules/Unity";
              break;
            }
            if (url.includes("cexception")) {
              subUrl = "https://gitee.com/esp-submodules/CException";
              break;
            }
            url = url.replace(/.*\//, "").replace(/.*\./, "");
            subUrl = `https://gitee.com/esp-submodules/${url}`;
          }
        }

        await execChildProcess(
          this.gitBinPath,
          ["config", `submodule.${subPath}.url`, subUrl],
          repoPath,
          OutputChannel.init()
        );
      }
    }
    await this.spawnWithProgress(
      this.gitBinPath,
      ["submodule", "update", "--progress"],
      repoPath,
      pkgProgress,
      progress
    );
    await this.spawnWithProgress(
      this.gitBinPath,
      ["submodule", "foreach", "git", "submodule", "update"],
      repoPath,
      pkgProgress,
      progress
    );
  }

  public spawnWithProgress(
    cmd: string,
    args: string[],
    currentWorkDirectory: string,
    pkgProgress?: PackageProgress,
    progress?: Progress<{ message?: string; increment?: number }>
  ) {
    return new Promise<void>((resolve, reject) => {
      this.cloneProcess = spawn(cmd, args, { cwd: currentWorkDirectory });

      const handleSpawnOutput: (chunk: any) => void = (data) => {
        OutputChannel.appendLine(data.toString());
        Logger.info(data.toString());
        const errRegex = /\b(Error)\b/g;
        if (errRegex.test(data.toString())) {
          reject(data.toString());
        }
        const output = data.toString().trim();
        const progressPattern = /(?:Counting|Compressing|Receiving|Resolving) objects:\s+(\d+%) \(\d+\/\d+\)/g;
        let match: RegExpExecArray;

        while ((match = progressPattern.exec(output)) !== null) {
          if (progress) {
            progress.report({
              message: match[0],
            });
          }
          if (pkgProgress) {
            pkgProgress.Progress = `${match[1]}`;
            pkgProgress.ProgressDetail = match[0];
          }
        }

        if (pkgProgress && data.toString().indexOf("Cloning into") !== -1) {
          pkgProgress.Progress = `0%`;
          pkgProgress.ProgressDetail = data.toString();
        }
      };

      this.cloneProcess.stdout.on("data", handleSpawnOutput);
      this.cloneProcess.stderr.on("data", handleSpawnOutput);

      this.cloneProcess.on("exit", (code, signal) => {
        if (!signal && code !== 0) {
          const msg = `Submodules clone has exit with ${code}`;
          OutputChannel.appendLine(msg);
          Logger.errorNotify(
            "Submodules cloning error",
            new Error(msg),
            "AbstractCloning spawnWithProgress"
          );
          return reject(new Error(msg));
        }
        return resolve();
      });
    });
  }

  public async getSubmodules(repoRootDir: string) {
    const repoName = /[^/]*$/.exec(repoRootDir)[0];
    OutputChannel.appendLine(`Downloading ${repoName} submodules`);
    const notificationMode = idfConf.readParameter(
      "idf.notificationMode"
    ) as string;
    const progressLocation =
      notificationMode === idfConf.NotificationMode.All ||
      notificationMode === idfConf.NotificationMode.Notifications
        ? ProgressLocation.Notification
        : ProgressLocation.Window;
    await window.withProgress(
      {
        cancellable: true,
        location: progressLocation,
        title: `Checking out ${repoName} submodules`,
      },
      async (
        progress: Progress<{ message: string; increment: number }>,
        cancelToken: CancellationToken
      ) => {
        try {
          cancelToken.onCancellationRequested((e) => {
            this.cancel();
          });
          await this.downloadSubmodules(repoRootDir, undefined, progress);
          Logger.infoNotify(`${repoName} submodules checked out successfully`);
        } catch (error) {
          OutputChannel.appendLine(error.message);
          Logger.errorNotify(
            error.message,
            error,
            "AbstractCloning getSubmodules"
          );
        }
      }
    );
  }
}
