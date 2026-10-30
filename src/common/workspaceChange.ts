/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 22nd June 2026 5:05:49 pm
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
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

import { ExtensionContext, l10n, workspace, WorkspaceFolder } from "vscode";
import { PreCheck } from "./PreCheck";
import { commandDictionary, CommandKeys } from "../cmdTreeView/cmdStore";
import { createCmdsStatusBarItems, statusBarItems } from "../statusBar";
import { readParameter } from "../configuration/idf";
import {
  getIdfTargetFromSdkconfig,
  updateIdfComponentsTree,
} from "../configuration/workspace";
import { ESP } from "../config";
import { espIdfCoverageRenderer } from "../coverage/renderer";
import { handleCompileCommandsUpdate } from "../clang/checkClangExtension";
import { ConfserverProcess } from "../espIdf/menuconfig/confserver/confServerProcess";
import { ProjectConfigurationManager } from "../project-conf/ProjectConfigurationManager";
import {
  IOpenOCDConfig,
  OpenOCDManager,
} from "../espIdf/openOcd/openOcdManager";
import { OpenOCDErrorMonitor } from "../espIdf/hints/openocdhint";
import { leaveActivation } from "../activation/session";
import { Logger } from "./logger";
import { getStoredIdfSetupEnv } from "./prepareEnv";
import { getCurrentIdfConfiguration } from "../configuration/env";
import { loadIdfSetup } from "../eim/loadIdfSetup";
import { missingIdfEnvDetail } from "../eim/setupFailureDetail";
import { IdfSetup } from "../eim/types";
import { hasRequiredIdfEnv } from "../eim/verifySetup";
import { getEspIdfFromCMake } from "../utils";
import { ExtensionConfigStore } from "./store";

export function registerOnDidWorkspaceFolderChanges(context: ExtensionContext) {
  context.subscriptions.push(
    workspace.onDidChangeWorkspaceFolders(async (e) => {
      if (PreCheck.isWorkspaceFolderOpen()) {
        const prevWorkspaceFolder = ESP.GlobalConfiguration.store.get<string>(
          ExtensionConfigStore.SELECTED_WORKSPACE_FOLDER,
          ""
        );
        for (const ws of e.removed) {
          if (
            prevWorkspaceFolder &&
            ws.uri.toString() === prevWorkspaceFolder
          ) {
            ConfserverProcess.dispose();
            await useFirstWorkspaceFolder(context);
            break;
          }
        }
        if (prevWorkspaceFolder === "" && e.added.length > 0) {
          await useFirstWorkspaceFolder(context);
        }
      }
    })
  );
}

export async function configureForWorkspace(
  context: ExtensionContext,
  workspaceFolder: WorkspaceFolder
): Promise<boolean> {
  const prevWorkspaceFolderStr = ESP.GlobalConfiguration.store.get<string>(
    ExtensionConfigStore.SELECTED_WORKSPACE_FOLDER,
    ""
  );
  ESP.GlobalConfiguration.store.setSelectedWorkspaceFolder(workspaceFolder.uri);
  if (
    prevWorkspaceFolderStr &&
    prevWorkspaceFolderStr !== workspaceFolder.uri.toString()
  ) {
    if (statusBarItems["projectConf"]) {
      statusBarItems["projectConf"].dispose();
      delete statusBarItems["projectConf"];
    }
    const selectedConfig = ESP.ProjectConfiguration.store.get<string>(
      ESP.ProjectConfiguration.SELECTED_CONFIG
    );
    if (selectedConfig) {
      ESP.ProjectConfiguration.store.clear(selectedConfig);
      ESP.ProjectConfiguration.store.clear(
        ESP.ProjectConfiguration.SELECTED_CONFIG
      );
    }
  }
  const folderUnchanged =
    !!prevWorkspaceFolderStr &&
    prevWorkspaceFolderStr === workspaceFolder.uri.toString();
  let idfSetup: IdfSetup | undefined;
  // A second load clears the stored env and spawns the activation script again.
  if (!(folderUnchanged && hasRequiredIdfEnv(getStoredIdfSetupEnv()))) {
    let loadDetail: string | undefined;
    try {
      const loaded = await loadIdfSetup(context.extensionPath, workspaceFolder);
      if (loaded.ok === true) {
        idfSetup = loaded.setup;
      } else {
        loadDetail = loaded.detail;
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load ESP-IDF setup.";
      loadDetail = message;
      Logger.error(
        message,
        error instanceof Error ? error : new Error(message),
        "configureForWorkspace",
        undefined,
        false
      );
    }
    if (!hasRequiredIdfEnv(getStoredIdfSetupEnv())) {
      leaveActivation(
        "invalidCurrentSetup",
        loadDetail || missingIdfEnvDetail()
      );
      return false;
    }
  }
  const storedEnv = getStoredIdfSetupEnv();
  let version = idfSetup?.version || storedEnv?.["ESP_IDF_VERSION"] || "";
  if (!version && storedEnv?.["IDF_PATH"]) {
    version = await getEspIdfFromCMake(storedEnv["IDF_PATH"]);
  }
  await getIdfTargetFromSdkconfig(
    workspaceFolder.uri,
    statusBarItems["target"]
  );
  if (statusBarItems && statusBarItems["port"]) {
    statusBarItems["port"].text =
      `$(${commandDictionary[CommandKeys.SelectSerialPort].iconId}) ` +
      readParameter("idf.port", workspaceFolder.uri);
  }
  const monitorPort = readParameter(
    "idf.monitorPort",
    workspaceFolder.uri
  ) as string;
  if (statusBarItems && statusBarItems["monitorPort"]) {
    if (monitorPort === "") {
      statusBarItems["monitorPort"].hide();
      statusBarItems["monitorPort"].text = "";
    } else {
      statusBarItems["monitorPort"].show();
      statusBarItems["monitorPort"].text = `$(${
        commandDictionary[CommandKeys.SelectMonitorSerialPort].iconId
      }) ${monitorPort}`;
    }
  }

  updateIdfComponentsTree(workspaceFolder.uri);
  if (statusBarItems["workspace"]) {
    statusBarItems["workspace"].text = `$(file-submodule)`;
    statusBarItems["workspace"].tooltip =
      l10n.t("ESP-IDF: Current Project") + workspaceFolder.uri.fsPath;
    statusBarItems["workspace"].command = "espIdf.pickAWorkspaceFolder";
  }
  if (statusBarItems["currentIdfVersion"]) {
    statusBarItems["currentIdfVersion"].text = version
      ? `$(${
          commandDictionary[CommandKeys.SelectCurrentIdfVersion].iconId
        }) ESP-IDF v${version}`
      : `$(${
          commandDictionary[CommandKeys.SelectCurrentIdfVersion].iconId
        }) ESP-IDF InvalidSetup`;
  }
  const openOCDConfig: IOpenOCDConfig = {
    workspace: workspaceFolder.uri,
  } as IOpenOCDConfig;
  OpenOCDManager.init().configureServer(openOCDConfig);

  OpenOCDErrorMonitor.updateWorkspaceFolder(workspaceFolder.uri);
  ConfserverProcess.dispose();
  espIdfCoverageRenderer.setForWorkspace(workspaceFolder.uri);
  handleCompileCommandsUpdate(workspaceFolder.uri, context);

  if (ProjectConfigurationManager.instance) {
    ProjectConfigurationManager.instance.dispose();
  }
  new ProjectConfigurationManager(workspaceFolder.uri, context, statusBarItems);
  return true;
}

export async function useFirstWorkspaceFolder(context: ExtensionContext) {
  const wsFolder =
    workspace.workspaceFolders && workspace.workspaceFolders.length
      ? workspace.workspaceFolders[0]
      : undefined;
  if (wsFolder) {
    const createStatusBar = Object.keys(statusBarItems).length === 0;
    const ready = await configureForWorkspace(context, wsFolder);
    if (!ready) {
      return;
    }
    if (createStatusBar) {
      await createCmdsStatusBarItems(
        context,
        wsFolder.uri,
        getCurrentIdfConfiguration()["IDF_PATH"] || ""
      );
      await configureForWorkspace(context, wsFolder);
    }
  }
}
