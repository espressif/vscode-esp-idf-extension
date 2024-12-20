/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 18th October 2021 2:27:27 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { pathExists } from "fs-extra";
import { join } from "path";
import { spawn } from "child_process";
import {
  CancellationToken,
  Progress,
  ProgressLocation,
  ShellExecution,
  ShellExecutionOptions,
  TaskPanelKind,
  TaskPresentationOptions,
  TaskRevealKind,
  TaskScope,
  Uri,
  window,
  workspace,
} from "vscode";
import { AbstractCloning } from "../common/abstractCloning";
import { NotificationMode, readParameter } from "../idfConfiguration";
import { Logger } from "../logger/logger";
import { TaskManager } from "../taskManager";
import { OutputChannel } from "../logger/outputChannel";
import { PackageProgress } from "../PackageProgress";
import {
  getVirtualEnvPythonPath,
  installEspMatterPyReqs,
} from "../pythonManager";
import { platform } from "os";

export class EspMatterCloning extends AbstractCloning {
  public static isBuildingGn: boolean;
  constructor(gitBinPath: string = "git", public currWorkspace: Uri) {
    super(
      "https://github.com/espressif/esp-matter.git",
      "ESP-MATTER",
      "main",
      gitBinPath,
      "https://gitee.com/EspressifSystems/esp-matter.git"
    );
  }

  public getShellExecution(
    bootstrapFilePath: string,
    shellOptions: ShellExecutionOptions
  ) {
    return new ShellExecution(`source ${bootstrapFilePath}`, shellOptions);
  }

  public async startBootstrap(onlyActivate: boolean = false) {
    if (EspMatterCloning.isBuildingGn) {
      throw new Error("ALREADY_BUILDING");
    }
    const matterPathDir = readParameter(
      "idf.espMatterPath",
      this.currWorkspace
    );
    const espMatterPathExists = await pathExists(matterPathDir);
    if (!espMatterPathExists) {
      return;
    }
    const workingDir = join(
      matterPathDir,
      "connectedhomeip",
      "connectedhomeip"
    );
    const bootstrapFilePath = join(
      workingDir,
      "scripts",
      onlyActivate ? "activate.sh" : "bootstrap.sh"
    );
    const bootstrapFilePathExists = await pathExists(bootstrapFilePath);
    if (!bootstrapFilePathExists) {
      return;
    }
    EspMatterCloning.isBuildingGn = true;
    const shellOptions: ShellExecutionOptions = {
      cwd: workingDir,
    };
    const shellExecutablePath = readParameter(
      "idf.customTerminalExecutable",
      this.currWorkspace
    ) as string;
    const shellExecutableArgs = readParameter(
      "idf.customTerminalExecutableArgs",
      this.currWorkspace
    ) as string[];
    if (shellExecutablePath) {
      shellOptions.executable = shellExecutablePath;
    }
    if (shellExecutableArgs && shellExecutableArgs.length) {
      shellOptions.shellArgs = shellExecutableArgs;
    }
    const curWorkspaceFolder =
      workspace.workspaceFolders && workspace.workspaceFolders.length
        ? workspace.workspaceFolders.find((w) => w.uri === this.currWorkspace)
        : undefined;

    const buildGnExec = this.getShellExecution(bootstrapFilePath, shellOptions);
    const notificationMode = readParameter(
      "idf.notificationMode",
      this.currWorkspace
    ) as string;
    const showTaskOutput =
      notificationMode === NotificationMode.All ||
      notificationMode === NotificationMode.Output
        ? TaskRevealKind.Always
        : TaskRevealKind.Silent;

    const matterBootstrapPresentationOptions = {
      reveal: showTaskOutput,
      showReuseMessage: false,
      clear: true,
      panel: TaskPanelKind.Dedicated,
    } as TaskPresentationOptions;

    TaskManager.addTask(
      {
        type: "esp-idf",
        command: "ESP-Matter Bootstrap",
        taskId: "idf-bootstrap-task",
      },
      curWorkspaceFolder || TaskScope.Workspace,
      "ESP-Matter Bootstrap",
      buildGnExec,
      ["espIdf"],
      matterBootstrapPresentationOptions
    );
  }

  public async initEsp32PlatformSubmodules(
    espMatterDir: string,
    workspace: Uri
  ) {
    OutputChannel.appendLine("Downloading Matter ESP32 platform submodules");
    const notificationMode = readParameter(
      "idf.notificationMode",
      workspace
    ) as string;
    const progressLocation =
      notificationMode === NotificationMode.All ||
      notificationMode === NotificationMode.Notifications
        ? ProgressLocation.Notification
        : ProgressLocation.Window;
    await window.withProgress(
      {
        cancellable: true,
        location: progressLocation,
        title: "ESP-IDF: Installing ESP-Matter",
      },
      async (
        progress: Progress<{ message: string; increment?: number }>,
        cancelToken: CancellationToken
      ) => {
        progress.report({
          message: `Checking out ESP32 platform specific submodules`,
        });
        try {
          cancelToken.onCancellationRequested((e) => {
            this.cancel();
          });
          await this.checkoutEsp32PlatformSubmodules(
            espMatterDir,
            undefined,
            progress
          );
          Logger.infoNotify(
            `ESP32 platform specific submodules checked out successfully`
          );
        } catch (error) {
          OutputChannel.appendLine(error.message);
          Logger.errorNotify(
            error.message,
            error,
            "EspMatterCloning initEsp32PlatformSubmodules"
          );
        }
      }
    );
  }

  public async checkoutEsp32PlatformSubmodules(
    espMatterDir: string,
    pkgProgress?: PackageProgress,
    progress?: Progress<{ message?: string; increment?: number }>
  ) {
    return new Promise<void>((resolve, reject) => {
      const matterDir = join(
        espMatterDir,
        "connectedhomeip",
        "connectedhomeip"
      );

      const checkoutProcess = spawn(
        join(matterDir, "scripts", "checkout_submodules.py"),
        ["--platform", "esp32", platform(), "--shallow"],
        { cwd: matterDir }
      );

      checkoutProcess.stderr.on("data", (data) => {
        OutputChannel.appendLine(data.toString());
        Logger.info(data.toString());
        const errRegex = /\b(Error)\b/g;
        if (errRegex.test(data.toString())) {
          reject(data.toString());
        }
        const progressRegex = /(\d+)(\.\d+)?%/g;
        const matches = data.toString().match(progressRegex);
        if (matches) {
          let progressMsg = `Downloading ${matches[matches.length - 1]}`;
          if (progress) {
            progress.report({
              message: progressMsg,
            });
          }
          if (pkgProgress) {
            pkgProgress.Progress = matches[matches.length - 1];
          }
        } else if (data.toString().indexOf("Cloning into") !== -1) {
          let detailMsg = " " + data.toString();
          if (progress) {
            progress.report({
              message: `${data.toString()}`,
            });
          }
          if (pkgProgress) {
            pkgProgress.Progress = detailMsg;
          }
        }
      });

      checkoutProcess.on("exit", (code, signal) => {
        if (!signal && code !== 0) {
          const msg = `ESP32 platform submodules clone has exit with ${code}`;
          OutputChannel.appendLine(msg);
          Logger.errorNotify(
            "ESP32 platform submodules cloning error",
            new Error(msg),
            "EspMatterCloning checkoutEsp32PlatformSubmodules"
          );
          return reject(new Error(msg));
        }
        return resolve();
      });
    });
  }
}

export async function installPythonReqs(
  espMatterPath: string,
  workspace?: Uri
) {
  const notificationMode = readParameter(
    "idf.notificationMode",
    workspace
  ) as string;
  const progressLocation =
    notificationMode === NotificationMode.All ||
    notificationMode === NotificationMode.Notifications
      ? ProgressLocation.Notification
      : ProgressLocation.Window;
  await window.withProgress(
    {
      cancellable: true,
      location: progressLocation,
      title: "ESP-IDF: Installing ESP-Matter",
    },
    async (
      progress: Progress<{ message: string; increment?: number }>,
      cancelToken: CancellationToken
    ) => {
      progress.report({
        message: `Installing Python Requirements...`,
      });
      await installEspMatterPyReqs(
        workspace,
        espMatterPath,
        undefined,
        cancelToken
      );
    }
  );
}

export async function getEspMatter(workspace?: Uri) {
  const gitPath =
    (await readParameter("idf.gitPath", workspace)) || "/usr/bin/git";
  let espMatterPath: string;
  const espMatterInstaller = new EspMatterCloning(gitPath, workspace);
  const installAllSubmodules = await window.showQuickPick(
    [
      {
        label: `No, download ESP32 platform specific submodules only`,
        target: "false",
      },
      {
        label: "Yes, download all Matter submodules",
        target: "true",
      },
    ],
    { placeHolder: `Download all Matter submodules?` }
  );

  try {
    if (installAllSubmodules.target === "true") {
      await espMatterInstaller.getRepository("idf.espMatterPath", workspace);
      espMatterPath = readParameter("idf.espMatterPath", workspace);
      await espMatterInstaller.startBootstrap();
    } else {
      await espMatterInstaller.getRepository(
        "idf.espMatterPath",
        workspace,
        false
      );
      espMatterPath = readParameter("idf.espMatterPath", workspace);
      await espMatterInstaller.getSubmodules(espMatterPath);
      await espMatterInstaller.initEsp32PlatformSubmodules(
        espMatterPath,
        workspace
      );
      await espMatterInstaller.startBootstrap(true);
    }
    await TaskManager.runTasks();
    EspMatterCloning.isBuildingGn = false;
  } catch (error) {
    const msg =
      error && error.message ? error.message : "Error bootstrapping esp-matter";
    if (msg === "ALREADY_BUILDING") {
      return Logger.errorNotify(
        "ESP-Matter bootstrap is already running!",
        error,
        "getEspMatter or bootstraping already running"
      );
    }
    EspMatterCloning.isBuildingGn = false;
    return Logger.errorNotify(msg, error, "getEspMatter");
  }

  try {
    await installPythonReqs(espMatterPath, workspace);
  } catch (error) {
    const msg = error.message
      ? error.message
      : typeof error === "string"
      ? error
      : "Error installing ESP-Matter Python Requirements";
    return Logger.errorNotify(msg, error, "getEspMatter installPythonReqs");
  }
  window.showInformationMessage("ESP-Matter has been successfully installed");
}
