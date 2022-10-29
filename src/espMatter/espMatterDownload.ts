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
import {
  ShellExecution,
  ShellExecutionOptions,
  TaskPanelKind,
  TaskPresentationOptions,
  TaskRevealKind,
  TaskScope,
  Uri,
} from "vscode";
import { AbstractCloning } from "../common/abstractCloning";
import { readParameter } from "../idfConfiguration";
import { Logger } from "../logger/logger";
import { TaskManager } from "../taskManager";

const fileTag: string = "ESP Matter";

export class EspMatterCloning extends AbstractCloning {
  public static isBuildingGn: boolean;
  constructor(gitBinPath: string = "git", public currWorkspace: Uri) {
    super(
      "https://github.com/espressif/esp-matter.git",
      "ESP-MATTER",
      "main",
      gitBinPath
    );
  }

  public getShellExecution(
    bootstrapFilePath: string,
    shellOptions: ShellExecutionOptions
  ) {
    return new ShellExecution(`source ${bootstrapFilePath}`, shellOptions);
  }

  public async startBootstrap() {
    if (EspMatterCloning.isBuildingGn) {
      throw new Error("ALREADY_BUILDING");
    }
    const matterPathDir = readParameter("idf.espMatterPath", this.currWorkspace);
    const espMatterPathExists = await pathExists(matterPathDir);
    if (!espMatterPathExists) {
      return;
    }
    const workingDir = join(
      matterPathDir,
      "connectedhomeip",
      "connectedhomeip"
    );
    const bootstrapFilePath = join(workingDir, "scripts", "bootstrap.sh");
    const bootstrapFilePathExists = await pathExists(bootstrapFilePath);
    if (!bootstrapFilePathExists) {
      return;
    }
    EspMatterCloning.isBuildingGn = true;
    const shellOptions: ShellExecutionOptions = {
      cwd: workingDir,
    };
    const buildGnExec = this.getShellExecution(bootstrapFilePath, shellOptions);
    const isSilentMode = readParameter("idf.notificationSilentMode", this.currWorkspace);
    const showTaskOutput = isSilentMode
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
      TaskScope.Workspace,
      "ESP-Matter Bootstrap",
      buildGnExec,
      ["espIdf"],
      matterBootstrapPresentationOptions
    );
  }
}

export async function getEspMatter(workspace?: Uri) {
  const gitPath = (await readParameter("idf.gitPath", workspace)) || "/usr/bin/git";
  const espMatterInstaller = new EspMatterCloning(gitPath, workspace);
  try {
    await espMatterInstaller.getRepository("idf.espMatterPath", workspace);
    await espMatterInstaller.startBootstrap();
    await TaskManager.runTasks();
    EspMatterCloning.isBuildingGn = false;
  } catch (error) {
    const msg =
      error && error.message ? error.message : "Error bootstrapping esp-matter";
    if (msg === "ALREADY_BUILDING") {
      return Logger.errorNotify(
        "ESP-Matter bootstrap is already running!",
        error,
        [fileTag]
      );
    }
    Logger.errorNotify(msg, error, [fileTag]);
    EspMatterCloning.isBuildingGn = false;
  }
}
