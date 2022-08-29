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
  private curWorkspace: vscode.Uri;
  private idfPathDir: string;
  private adapterTargetName: string;

  constructor(workspace: vscode.Uri) {
    this.curWorkspace = workspace;
    this.idfPathDir = idfConf.readParameter(
      "idf.espIdfPath",
      workspace
    ) as string;
    this.adapterTargetName = idfConf.readParameter(
      "idf.adapterTargetName",
      workspace
    ) as string;
    this.buildDirPath = idfConf.readParameter(
      "idf.buildDirectoryName",
      workspace
    ) as string;
  }

  public building(flag: boolean) {
    BuildTask.isBuilding = flag;
  }

  private async saveBeforeBuild() {
    const shallSaveBeforeBuild = idfConf.readParameter(
      "idf.saveBeforeBuild",
      this.curWorkspace
    );
    if (shallSaveBeforeBuild) {
      await vscode.workspace.saveAll();
    }
  }

  public getShellExecution(
    args: string[],
    options?: vscode.ShellExecutionOptions
  ) {
    return new vscode.ShellExecution(`cmake ${args.join(" ")}`, options);
  }

  public getNinjaShellExecution(
    args: string[],
    options?: vscode.ShellExecutionOptions
  ) {
    return new vscode.ShellExecution(`ninja ${args.join(" ")}`, options);
  }

  public dfuShellExecution(options?: vscode.ShellExecutionOptions) {
    const pythonBinPath = idfConf.readParameter(
      "idf.pythonBinPath",
      this.curWorkspace
    ) as string;
    return new vscode.ShellExecution(
      `${pythonBinPath} ${join(
        this.idfPathDir,
        "tools",
        "mkdfu.py"
      )} write -o ${join(
        this.buildDirPath,
        "dfu.bin"
      )} --json ${join(
        this.buildDirPath,
        "flasher_args.json"
      )} --pid ${selectedDFUAdapterId(this.adapterTargetName)}`,
      options
    );
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
    const modifiedEnv = appendIdfAndToolsToPath(this.curWorkspace);
    await ensureDir(this.buildDirPath);
    const canAccessCMake = await isBinInPath(
      "cmake",
      this.curWorkspace.fsPath,
      modifiedEnv
    );
    const canAccessNinja = await isBinInPath(
      "ninja",
      this.curWorkspace.fsPath,
      modifiedEnv
    );

    const cmakeCachePath = join(
      this.buildDirPath,
      "CMakeCache.txt"
    );
    const cmakeCacheExists = await pathExists(cmakeCachePath);

    if (canAccessCMake === "" || canAccessNinja === "") {
      throw new Error("CMake or Ninja executables not found");
    }

    const options: vscode.ShellExecutionOptions = {
      cwd: this.buildDirPath,
      env: modifiedEnv,
    };
    const isSilentMode = idfConf.readParameter(
      "idf.notificationSilentMode",
      this.curWorkspace
    ) as boolean;
    const showTaskOutput = isSilentMode
      ? vscode.TaskRevealKind.Always
      : vscode.TaskRevealKind.Silent;

    if (!cmakeCacheExists) {
      const compilerArgs = (idfConf.readParameter(
        "idf.cmakeCompilerArgs",
        this.curWorkspace
      ) as Array<string>) || [
        "-G",
        "Ninja",
        "-DPYTHON_DEPS_CHECKED=1",
        "-DESP_PLATFORM=1",
        "..",
      ];
      const enableCCache = idfConf.readParameter(
        "idf.enableCCache",
        this.curWorkspace
      ) as boolean;
      if (enableCCache && compilerArgs && compilerArgs.length) {
        const indexOfCCache = compilerArgs.indexOf("-DCCACHE_ENABLE=1");
        if (indexOfCCache === -1) {
          compilerArgs.splice(compilerArgs.length - 1, 0, "-DCCACHE_ENABLE=1");
        }
      }
      const compileExecution = this.getShellExecution(compilerArgs, options);
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
        vscode.TaskScope.Workspace,
        "ESP-IDF Compile",
        compileExecution,
        ["espIdf"],
        compilePresentationOptions
      );
    }

    const buildArgs =
      (idfConf.readParameter("idf.ninjaArgs", this.curWorkspace) as Array<
        string
      >) || [];
    const buildExecution = this.getNinjaShellExecution(buildArgs, options);
    const buildPresentationOptions = {
      reveal: showTaskOutput,
      showReuseMessage: false,
      clear: cmakeCacheExists,
      panel: vscode.TaskPanelKind.Shared,
    } as vscode.TaskPresentationOptions;
    TaskManager.addTask(
      { type: "esp-idf", command: "ESP-IDF Build", taskId: "idf-build-task" },
      vscode.TaskScope.Workspace,
      "ESP-IDF Build",
      buildExecution,
      ["espIdf"],
      buildPresentationOptions
    );
  }

  public async buildDfu() {
    this.building(true);
    const modifiedEnv = appendIdfAndToolsToPath(this.curWorkspace);
    await ensureDir(this.buildDirPath);

    const options: vscode.ShellExecutionOptions = {
      cwd: this.curWorkspace.fsPath,
      env: modifiedEnv,
    };

    const isSilentMode = idfConf.readParameter(
      "idf.notificationSilentMode",
      this.curWorkspace
    );
    const showTaskOutput = isSilentMode
      ? vscode.TaskRevealKind.Always
      : vscode.TaskRevealKind.Silent;

    const writeExecution = this.dfuShellExecution(options);
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
      vscode.TaskScope.Workspace,
      "ESP-IDF Write DFU.bin",
      writeExecution,
      ["espIdf"],
      buildPresentationOptions
    );
  }
}
