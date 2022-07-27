/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 26th July 2022 5:40:28 pm
 * Copyright 2022 Espressif Systems (Shanghai) CO LTD
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
import { EOL } from "os";
import { join } from "path";
import { ConfigurationTarget, Progress, ProgressLocation, Uri, window, WorkspaceFolder } from "vscode";
import { readParameter, writeParameter } from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import { OutputChannel } from "../../logger/outputChannel";
import { appendIdfAndToolsToPath, setCCppPropertiesJsonCompilerPath, spawn } from "../../utils";
import { ConfserverProcess } from "../menuconfig/confServerProcess";
import { getBoards, getOpenOcdScripts } from "../openOcd/boardConfiguration";

export interface IdfTarget {
  label: string;
  isPreview: boolean;
  target: string;
}

export async function getSupportedTargets(placeHolderMsg: string) {
  const configurationTarget = ConfigurationTarget.WorkspaceFolder;
  let workspaceFolder = await window.showWorkspaceFolderPick({
    placeHolder: `Pick Workspace Folder to which settings should be applied`,
  });
  if (!workspaceFolder) {
    return;
  }
  const targetsFromIdf = await getTargetsFromEspIdf(workspaceFolder.uri);
  const selectedTarget = await window.showQuickPick(targetsFromIdf);
  if (!selectedTarget) {
    return;
  }
  if (selectedTarget.target === "custom") {
    const currentValue = readParameter(
      "idf.customAdapterTargetName",
      workspaceFolder.uri
    ) as string;
    const customIdfTarget = await window.showInputBox({
      placeHolder: placeHolderMsg,
      value: currentValue,
    });
    if (!customIdfTarget) {
      return;
    }
    await writeParameter(
      "idf.adapterTargetName",
      selectedTarget.target,
      configurationTarget,
      workspaceFolder.uri
    );
    await writeParameter(
      "idf.customAdapterTargetName",
      customIdfTarget,
      configurationTarget,
      workspaceFolder.uri
    );
    return Logger.infoNotify(
      `IDF_TARGET has been set to custom. Remember to set the configuration files for OpenOCD`
    );
  }
  await writeParameter(
    "idf.adapterTargetName",
    selectedTarget.target,
    configurationTarget,
    workspaceFolder.uri
  );
  const openOcdScriptsPath = getOpenOcdScripts(workspaceFolder.uri);
  const boards = await getBoards(openOcdScriptsPath);

  const boardsForTarget = boards.filter((b) => b.target === selectedTarget.target);
  const choices = boards.map((b) => {
    return {
      description: `${b.description} (${b.configFiles})`,
      label: b.name,
      target: b,
    };
  });
  const selectedBoard = await window.showQuickPick(choices, {
    placeHolder: "Enter OpenOCD Configuration File Paths list",
  });
  if (!selectedBoard) {
    return;
  }
  await writeParameter(
    "idf.openOcdConfigs",
    selectedBoard.target.configFiles,
    configurationTarget,
    workspaceFolder.uri
  );

  await window.withProgress(
    {
      cancellable: false,
      location: ProgressLocation.Notification,
      title: "ESP-IDF: Setting device target...",
    },
    async (
      progress: Progress<{ message: string; increment: number }>
    ) => {
      try {
        if (ConfserverProcess.exists()) {
          ConfserverProcess.dispose();
        }
        const idfPathDir = readParameter(
          "idf.espIdfPath",
          workspaceFolder.uri
        );
        const idfPy = join(idfPathDir, "tools", "idf.py");
        const modifiedEnv = appendIdfAndToolsToPath(
          workspaceFolder.uri
        );
        modifiedEnv.IDF_TARGET = undefined;
        const enableCCache = readParameter(
          "idf.enableCCache",
          workspaceFolder.uri
        ) as boolean;
        const setTargetArgs: string[] = [idfPy];
        if (enableCCache) {
          modifiedEnv.IDF_CCACHE_ENABLE = "1";
        } else {
          modifiedEnv.IDF_CCACHE_ENABLE = undefined;
        }
        setTargetArgs.push("set-target", selectedTarget.target);
        if (selectedTarget.isPreview) {
          setTargetArgs.push("--preview");
        }
        const pythonBinPath = readParameter(
          "idf.pythonBinPath",
          workspaceFolder.uri
        ) as string;
        const setTargetResult = await spawn(
          pythonBinPath,
          setTargetArgs,
          {
            cwd: workspaceFolder.uri.fsPath,
            env: modifiedEnv,
          }
        );
        Logger.info(setTargetResult.toString());
        OutputChannel.append(setTargetResult.toString());
        setCCppPropertiesJsonCompilerPath(workspaceFolder.uri);
      } catch (err) {
        if (err.message && err.message.indexOf("are satisfied") > -1) {
          Logger.info(err.message.toString());
          OutputChannel.append(err.message.toString());
        } else {
          Logger.errorNotify(err, err);
          OutputChannel.append(err);
        }
      }
    }
  );
}

export async function getTargetsFromEspIdf(workspaceFolder: Uri) {
  const idfPathDir = readParameter("idf.espIdfPath", workspaceFolder);
  const idfPyPath = join(idfPathDir, "tools", "idf.py");
  const modifiedEnv = appendIdfAndToolsToPath(workspaceFolder);
  const pythonBinPath = readParameter(
    "idf.pythonBinPath",
    workspaceFolder
  ) as string;
  const resultTargetArray: IdfTarget[] = [];

  const listTargetsResult = await spawn(
    pythonBinPath,
    [idfPyPath, "--list-targets"],
    {
      cwd: workspaceFolder.fsPath,
      env: modifiedEnv,
    }
  );
  const listTargetsArray = listTargetsResult.toString().trim().split(EOL);

  for (const supportedTarget of listTargetsArray) {
    resultTargetArray.push({
      label: supportedTarget,
      target: supportedTarget,
      isPreview: false,
    } as IdfTarget);
  }

  const listTargetsWithPreviewResult = await spawn(
    pythonBinPath,
    [idfPyPath, "--preview", "--list-targets"],
    {
      cwd: workspaceFolder.fsPath,
      env: modifiedEnv,
    }
  );
  const listTargetsWithPreviewArray = listTargetsWithPreviewResult
    .toString()
    .trim()
    .split(EOL);

  const previewTargets = listTargetsWithPreviewArray.filter(
    (t) => listTargetsArray.indexOf(t) === -1
  );

  for (const supportedTarget of previewTargets) {
    resultTargetArray.push({
      label: supportedTarget,
      target: supportedTarget,
      isPreview: true,
    } as IdfTarget);
  }
  resultTargetArray.push({
    isPreview: false,
    label: "Custom target",
    target: "custom",
  } as IdfTarget);
  return resultTargetArray;
}


