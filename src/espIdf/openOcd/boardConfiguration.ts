/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 8th January 2021 5:34:24 pm
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
import { join } from "path";
import { readParameter, writeParameter } from "../../idfConfiguration";
import { readJSON } from "fs-extra";
import { Logger } from "../../logger/logger";
import { commands, ConfigurationTarget, l10n, Uri, window } from "vscode";
import { defaultBoards } from "./defaultBoards";
import { IdfToolsManager } from "../../idfToolsManager";
import { getIdfTargetFromSdkconfig } from "../../workspaceConfig";
import { updateCurrentProfileOpenOcdConfigs } from "../../project-conf";

export interface IdfBoard {
  name: string;
  description: string;
  target: string;
  configFiles: string[];
}

export async function getOpenOcdScripts(workspace: Uri): Promise<string> {
  const idfPathDir = readParameter("idf.espIdfPath", workspace) as string;
  const toolsPath = readParameter("idf.toolsPath", workspace) as string;
  const userExtraVars = readParameter("idf.customExtraVars", workspace) as {
    [key: string]: string;
  };
  const idfToolsManager = await IdfToolsManager.createIdfToolsManager(
    idfPathDir
  );
  const idfExtraVars = await idfToolsManager.exportVars(
    join(toolsPath, "tools")
  );
  let openOcdScriptsPath: string;
  try {
    openOcdScriptsPath = idfExtraVars.hasOwnProperty("OPENOCD_SCRIPTS")
      ? idfExtraVars.OPENOCD_SCRIPTS
      : userExtraVars.hasOwnProperty("OPENOCD_SCRIPTS")
      ? userExtraVars.OPENOCD_SCRIPTS
      : process.env.OPENOCD_SCRIPTS
      ? process.env.OPENOCD_SCRIPTS
      : undefined;
  } catch (error) {
    Logger.error(error.message, error, "boardConfiguration getOpenOcdScripts");
    openOcdScriptsPath = process.env.OPENOCD_SCRIPTS
      ? process.env.OPENOCD_SCRIPTS
      : undefined;
  }
  return openOcdScriptsPath;
}

export async function getBoards(
  openOcdScriptsPath: string = "",
  idfTarget: string = ""
) {
  if (!openOcdScriptsPath) {
    const filteredDefaultBoards = defaultBoards.filter((b) => {
      return b.target === idfTarget;
    });
    return idfTarget ? filteredDefaultBoards : defaultBoards;
  }
  const openOcdEspConfig = join(openOcdScriptsPath, "esp-config.json");
  try {
    const openOcdEspConfigObj = await readJSON(openOcdEspConfig);
    const espBoards: IdfBoard[] = openOcdEspConfigObj.boards.map((b) => {
      return {
        name: b.name,
        description: b.description,
        target: b.target,
        configFiles: b.config_files,
      } as IdfBoard;
    });
    const tmpS3Board = {
      name: "ESP32-S3 chip (via builtin USB-JTAG)",
      description: "ESP32-S3 debugging via builtin USB-JTAG",
      target: "esp32s3",
      configFiles: ["board/esp32s3-builtin.cfg"],
    } as IdfBoard;
    if (espBoards.findIndex((b) => b.name === tmpS3Board.name) === -1) {
      espBoards.push(tmpS3Board);
    }
    const emptyBoard = {
      name: "Custom board",
      description: "No board selected",
      target: "esp32",
      configFiles: ["interface/ftdi/esp32_devkitj_v1.cfg", "target/esp32.cfg"],
    } as IdfBoard;
    espBoards.push(emptyBoard);
    const filteredEspBoards = espBoards.filter((b) => {
      return b.target === idfTarget;
    });
    return idfTarget ? filteredEspBoards : espBoards;
  } catch (error) {
    Logger.error(error.message, error, "boardConfiguration getBoards");
    const filteredDefaultBoards = defaultBoards.filter((b) => {
      return b.target === idfTarget;
    });
    return idfTarget ? filteredDefaultBoards : defaultBoards;
  }
}

export async function selectOpenOcdConfigFiles(
  workspaceFolder: Uri,
  idfTarget?: string
) {
  try {
    const openOcdScriptsPath = await getOpenOcdScripts(workspaceFolder);
    if (!idfTarget) {
      idfTarget = await getIdfTargetFromSdkconfig(workspaceFolder);
      if (!idfTarget) {
        commands.executeCommand("espIdf.setTarget");
        return;
      }
    }
    if (idfTarget === "linux") {
      return;
    }
    const currentOpenOcdConfigs = readParameter(
      "idf.openOcdConfigs",
      workspaceFolder
    ) as string[];
    const boards = await getBoards(openOcdScriptsPath, idfTarget);
    const message = l10n.t(
      "No OpenOCD boards found for target {target}. Please check your OPENOCD_SCRIPTS environment variable.",
      { target: idfTarget }
    );
    if (!boards || boards.length === 0) {
      Logger.errorNotify(
        message,
        new Error(message),
        "boardConfiguration selectOpenOcdConfigFiles"
      );
      return;
    }
    const choices = boards.map((b) => {
      return {
        description: `${b.description} (${b.configFiles})`,
        label: b.name,
        target: b,
        picked: currentOpenOcdConfigs
          .join(",")
          .includes(b.configFiles.join(",")),
      };
    });
    const selectOpenOCdConfigsMsg = l10n.t(
      "Enter OpenOCD Configuration File Paths list"
    );
    const boardQuickPick = window.createQuickPick<{
      description: string;
      label: string;
      target: IdfBoard;
      picked: boolean;
    }>();
    boardQuickPick.items = choices;
    boardQuickPick.placeholder = selectOpenOCdConfigsMsg;
    boardQuickPick.onDidHide(() => {
      boardQuickPick.dispose();
    });
    boardQuickPick.activeItems = boardQuickPick.items.filter(
      (item) => item.picked
    );

    return new Promise<void>((resolve) => {
      boardQuickPick.onDidHide(() => {
        boardQuickPick.dispose();
        resolve();
      });
      boardQuickPick.onDidAccept(async () => {
        const selectedBoard = boardQuickPick.selectedItems[0];
        if (!selectedBoard) {
          Logger.infoNotify(
            `ESP-IDF board not selected. Remember to set the configuration files for OpenOCD with idf.openOcdConfigs`
          );
        } else if (selectedBoard && selectedBoard.target) {
          if (selectedBoard.label.indexOf("Custom board") !== -1) {
            const inputBoard = await window.showInputBox({
              placeHolder: l10n.t("Enter comma-separated configuration files"),
              value: selectedBoard.target.configFiles.join(","),
            });
            if (inputBoard) {
              selectedBoard.target.configFiles = inputBoard.split(",");
            }
          }
          await writeParameter(
            "idf.openOcdConfigs",
            selectedBoard.target.configFiles,
            ConfigurationTarget.WorkspaceFolder,
            workspaceFolder
          );
          
          // Update project configuration with OpenOCD configs if a configuration is selected
          await updateCurrentProfileOpenOcdConfigs(selectedBoard.target.configFiles, workspaceFolder);
          
          Logger.infoNotify(
            l10n.t(`OpenOCD Board configuration files set to {boards}.`, {
              boards: selectedBoard.target.configFiles.join(","),
            })
          );
          boardQuickPick.dispose();
          resolve();
        }
        boardQuickPick.hide();
      });
      boardQuickPick.show();
    });
  } catch (error) {
    const errMsg =
      error.message || "Failed to select openOCD configuration files";
    Logger.errorNotify(
      errMsg,
      error,
      "boardConfiguration selectOpenOcdConfigFiles"
    );
    return;
  }
}
