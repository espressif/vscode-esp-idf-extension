/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 27th September 2019 9:59:57 pm
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
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

import { ensureDir, pathExists } from "fs-extra";
import { join } from "path";
import { Logger } from "../logger/logger";
import * as vscode from "vscode";
import * as idfConf from "../idfConfiguration";
import { appendIdfAndToolsToPath, isBinInPath } from "../utils";
import { TaskManager } from "../taskManager";
import { selectedDFUAdapterId } from "../flash/dfu";

export class BuildTask {
  public static isBuilding: boolean;
  private buildDirPath: string;
  private currentWorkspace: vscode.Uri;
  private idfPathDir: string;
  private adapterTargetName: string;
  private processOptions: vscode.ProcessExecutionOptions;
  private modifiedEnv: { [key: string]: string };
  private pythonBinPath: string;

  constructor(workspaceUri: vscode.Uri) {
    this.currentWorkspace = workspaceUri;
    this.idfPathDir = idfConf.readParameter(
      "idf.espIdfPath",
      workspaceUri
    ) as string;
    this.adapterTargetName = idfConf.readParameter(
      "idf.adapterTargetName",
      workspaceUri
    ) as string;
    this.buildDirPath = idfConf.readParameter(
      "idf.buildPath",
      workspaceUri
    ) as string;
    this.modifiedEnv = appendIdfAndToolsToPath(workspaceUri);
    this.processOptions = {
      cwd: this.buildDirPath,
      env: this.modifiedEnv,
    };
    this.pythonBinPath = idfConf.readParameter(
      "idf.pythonBinPath",
      workspaceUri
    ) as string;
  }

  public building(flag: boolean) {
    BuildTask.isBuilding = flag;
  }

  private async saveBeforeBuild() {
    const shallSaveBeforeBuild = idfConf.readParameter(
      "idf.saveBeforeBuild",
      this.currentWorkspace
    );
    if (shallSaveBeforeBuild) {
      await vscode.workspace.saveAll();
    }
  }

  public async build() {
    try {
      await this.saveBeforeBuild();
    } catch (error) {
      const errorMessage =
        "Failed to save unsaved files, ignoring and continuing with the build";
      Logger.error(errorMessage, error);
      Logger.warnNotify(errorMessage);
    }
    if (BuildTask.isBuilding) {
      throw new Error("ALREADY_BUILDING");
    }
    this.building(true);
    await ensureDir(this.buildDirPath);
    const canAccessCMake = await isBinInPath(
      "cmake",
      this.currentWorkspace.fsPath,
      this.modifiedEnv
    );
    const canAccessNinja = await isBinInPath(
      "ninja",
      this.currentWorkspace.fsPath,
      this.modifiedEnv
    );

    const cmakeCachePath = join(this.buildDirPath, "CMakeCache.txt");
    const cmakeCacheExists = await pathExists(cmakeCachePath);

    if (canAccessCMake === "" || canAccessNinja === "") {
      throw new Error("CMake or Ninja executables not found");
    }

    const currentWorkspaceFolder = vscode.workspace.workspaceFolders.find(
      (w) => w.uri === this.currentWorkspace
    );

    const notificationMode = idfConf.readParameter(
      "idf.notificationMode",
      this.currentWorkspace
    ) as string;
    const showTaskOutput =
      notificationMode === idfConf.NotificationMode.All ||
      notificationMode === idfConf.NotificationMode.Output
        ? vscode.TaskRevealKind.Always
        : vscode.TaskRevealKind.Silent;

    if (!cmakeCacheExists) {
      let compilerArgs = (idfConf.readParameter(
        "idf.cmakeCompilerArgs",
        this.currentWorkspace
      ) as Array<string>) || [
        "-G",
        "Ninja",
        "-DPYTHON_DEPS_CHECKED=1",
        "-DESP_PLATFORM=1",
      ];
      let buildPathArgsIndex = compilerArgs.indexOf("-B");
      if (buildPathArgsIndex !== -1) {
        compilerArgs.splice(buildPathArgsIndex, 2);
      }
      compilerArgs.push("-B", this.buildDirPath);

      if (compilerArgs.indexOf("-S") === -1) {
        compilerArgs.push("-S", this.currentWorkspace.fsPath);
      }

      const sdkconfigDefaults =
        (idfConf.readParameter("idf.sdkconfigDefaults") as string[]) || [];

      if (
        compilerArgs.indexOf("SDKCONFIG_DEFAULTS") === -1 &&
        sdkconfigDefaults &&
        sdkconfigDefaults.length
      ) {
        compilerArgs.push(
          `-DSDKCONFIG_DEFAULTS='${sdkconfigDefaults.join(";")}'`
        );
      }

      const enableCCache = idfConf.readParameter(
        "idf.enableCCache",
        this.currentWorkspace
      ) as boolean;
      if (enableCCache && compilerArgs && compilerArgs.length) {
        const indexOfCCache = compilerArgs.indexOf("-DCCACHE_ENABLE=1");
        if (indexOfCCache === -1) {
          compilerArgs.push("-DCCACHE_ENABLE=1");
        }
      }
      const compileExecution = new vscode.ProcessExecution(canAccessCMake, compilerArgs, this.processOptions);
      const compilePresentationOptions = {
        reveal: showTaskOutput,
        showReuseMessage: false,
        clear: true,
        panel: vscode.TaskPanelKind.Shared,
      } as vscode.TaskPresentationOptions;
      TaskManager.addTask(
        {
          type: "esp-idf",
          command: "ESP-IDF Compile",
          taskId: "idf-compile-task",
        },
        currentWorkspaceFolder || vscode.TaskScope.Workspace,
        "ESP-IDF Compile",
        compileExecution,
        ["espIdf"],
        compilePresentationOptions
      );
      compilerArgs = [];
    }

    const buildArgs =
      (idfConf.readParameter("idf.ninjaArgs", this.currentWorkspace) as Array<
        string
      >) || [];
    const ninjaCommand = "ninja";
    const buildExecution = new vscode.ProcessExecution(ninjaCommand, buildArgs, this.processOptions);
    const buildPresentationOptions = {
      reveal: showTaskOutput,
      showReuseMessage: false,
      clear: false,
      panel: vscode.TaskPanelKind.Shared,
    } as vscode.TaskPresentationOptions;
    TaskManager.addTask(
      { type: "esp-idf", command: "ESP-IDF Build", taskId: "idf-build-task" },
      currentWorkspaceFolder || vscode.TaskScope.Workspace,
      "ESP-IDF Build",
      buildExecution,
      ["espIdf"],
      buildPresentationOptions
    );
  }

  public async buildDfu() {
    this.building(true);
    const modifiedEnv = appendIdfAndToolsToPath(this.currentWorkspace);
    await ensureDir(this.buildDirPath);

    const currentWorkspaceFolder = vscode.workspace.workspaceFolders.find(
      (w) => w.uri === this.currentWorkspace
    );

    const notificationMode = idfConf.readParameter(
      "idf.notificationMode",
      this.currentWorkspace
    ) as string;
    const showTaskOutput =
      notificationMode === idfConf.NotificationMode.All ||
      notificationMode === idfConf.NotificationMode.Output
        ? vscode.TaskRevealKind.Always
        : vscode.TaskRevealKind.Silent;

    const args = [
      join(this.idfPathDir, "tools", "mkdfu.py"),
      "write",
      "-o",
      join(this.buildDirPath, "dfu.bin"),
      "--json",
      join(this.buildDirPath, "flasher_args.json"),
      "--pid",
      selectedDFUAdapterId(this.adapterTargetName)
    ];
    const writeExecution = new vscode.ProcessExecution(this.pythonBinPath, args, this.processOptions);
    const buildPresentationOptions = {
      reveal: showTaskOutput,
      showReuseMessage: false,
      clear: false,
      panel: vscode.TaskPanelKind.Shared,
    } as vscode.TaskPresentationOptions;
    TaskManager.addTask(
      {
        type: "esp-idf",
        command: "ESP-IDF Write DFU.bin",
        taskId: "idf-write-dfu-task",
      },
      currentWorkspaceFolder || vscode.TaskScope.Workspace,
      "ESP-IDF Write DFU.bin",
      writeExecution,
      ["espIdf"],
      buildPresentationOptions
    );
  }
}
