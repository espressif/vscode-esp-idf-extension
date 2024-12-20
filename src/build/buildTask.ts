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
import {
  appendIdfAndToolsToPath,
  getEspIdfFromCMake,
  getSDKConfigFilePath,
  isBinInPath,
} from "../utils";
import { TaskManager } from "../taskManager";
import { selectedDFUAdapterId } from "../flash/dfu";
import { getVirtualEnvPythonPath } from "../pythonManager";
import { getIdfTargetFromSdkconfig } from "../workspaceConfig";

export class BuildTask {
  public static isBuilding: boolean;
  private buildDirPath: string;
  private currentWorkspace: vscode.Uri;
  private idfPathDir: string;

  constructor(workspaceUri: vscode.Uri) {
    this.currentWorkspace = workspaceUri;
    const customExtraVars = idfConf.readParameter(
      "idf.customExtraVars",
      workspaceUri
    ) as { [key: string]: string };
    this.idfPathDir = customExtraVars["IDF_PATH"];
    this.buildDirPath = idfConf.readParameter(
      "idf.buildPath",
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
      Logger.error(errorMessage, error, "build saveBeforeBuild");
      Logger.warnNotify(errorMessage);
    }
    if (BuildTask.isBuilding) {
      throw new Error("ALREADY_BUILDING");
    }
    this.building(true);
    await ensureDir(this.buildDirPath);
    const modifiedEnv = await appendIdfAndToolsToPath(this.currentWorkspace);
    const processOptions = {
      cwd: this.buildDirPath,
      env: modifiedEnv,
    };
    const canAccessCMake = await isBinInPath(
      "cmake",
      this.currentWorkspace.fsPath,
      modifiedEnv
    );
    const canAccessNinja = await isBinInPath(
      "ninja",
      this.currentWorkspace.fsPath,
      modifiedEnv
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
      const espIdfVersion = await getEspIdfFromCMake(this.idfPathDir);
      let defaultCompilerArgs;
      if (espIdfVersion === "x.x") {
        Logger.warn(
          "Could not determine ESP-IDF version. Using default compiler arguments for the latest known version."
        );
        defaultCompilerArgs = [
          "-G",
          "Ninja",
          "-DPYTHON_DEPS_CHECKED=1",
          "-DESP_PLATFORM=1",
        ];
      }
      let compilerArgs = idfConf.readParameter(
        "idf.cmakeCompilerArgs",
        this.currentWorkspace
      ) as Array<string>;

      if (!compilerArgs || compilerArgs.length === 0) {
        compilerArgs = defaultCompilerArgs;
      }
      let buildPathArgsIndex = compilerArgs.indexOf("-B");
      if (buildPathArgsIndex !== -1) {
        compilerArgs.splice(buildPathArgsIndex, 2);
      }
      compilerArgs.push("-B", this.buildDirPath);
      if (compilerArgs.indexOf("-S") === -1) {
        compilerArgs.push("-S", this.currentWorkspace.fsPath);
      }

      const sdkconfigFile = await getSDKConfigFilePath(this.currentWorkspace);
      if (compilerArgs.indexOf("SDKCONFIG") === -1) {
        compilerArgs.push(`-DSDKCONFIG=${sdkconfigFile}`);
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
      const compileExecution = new vscode.ProcessExecution(
        canAccessCMake,
        compilerArgs,
        processOptions
      );
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
        ["espIdf", "espIdfLd"],
        compilePresentationOptions
      );
      compilerArgs = [];
    }

    const buildArgs =
      (idfConf.readParameter("idf.ninjaArgs", this.currentWorkspace) as Array<
        string
      >) || [];
    const ninjaCommand = "ninja";
    const buildExecution = new vscode.ProcessExecution(
      ninjaCommand,
      buildArgs,
      processOptions
    );
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
      ["espIdf", "espIdfLd"],
      buildPresentationOptions
    );
  }

  public async buildDfu() {
    this.building(true);
    await ensureDir(this.buildDirPath);

    const currentWorkspaceFolder = vscode.workspace.workspaceFolders.find(
      (w) => w.uri === this.currentWorkspace
    );

    const notificationMode = idfConf.readParameter(
      "idf.notificationMode",
      this.currentWorkspace
    ) as string;

    const adapterTargetName = await getIdfTargetFromSdkconfig(
      this.currentWorkspace
    );
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
      selectedDFUAdapterId(adapterTargetName).toString(),
    ];
    const pythonBinPath = await getVirtualEnvPythonPath(this.currentWorkspace);
    const modifiedEnv = await appendIdfAndToolsToPath(this.currentWorkspace);
    const processOptions = {
      cwd: this.buildDirPath,
      env: modifiedEnv,
    };
    const writeExecution = new vscode.ProcessExecution(
      pythonBinPath,
      args,
      processOptions
    );
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
