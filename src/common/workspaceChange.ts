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
import { loadIdfSetup } from "../eim/loadIdfSetup";
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
) {
  ESP.GlobalConfiguration.store.setSelectedWorkspaceFolder(workspaceFolder.uri);
  const idfSetup = await loadIdfSetup(context.extensionPath, workspaceFolder);
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
  statusBarItems["workspace"].text = `$(file-submodule)`;
  statusBarItems["workspace"].tooltip =
    l10n.t("ESP-IDF: Current Project") + workspaceFolder.uri.fsPath;
  statusBarItems["workspace"].command = "espIdf.pickAWorkspaceFolder";
  if (statusBarItems["projectConf"]) {
    statusBarItems["projectConf"].dispose();
    delete statusBarItems["projectConf"];
    const selectedConfig = ESP.ProjectConfiguration.store.get<string>(
      ESP.ProjectConfiguration.SELECTED_CONFIG
    );
    ESP.ProjectConfiguration.store.clear(selectedConfig);
    ESP.ProjectConfiguration.store.clear(
      ESP.ProjectConfiguration.SELECTED_CONFIG
    );
  }
  if (statusBarItems["currentIdfVersion"]) {
    statusBarItems["currentIdfVersion"].text = idfSetup?.version
      ? `$(${
          commandDictionary[CommandKeys.SelectCurrentIdfVersion].iconId
        }) ESP-IDF v${idfSetup.version}`
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
}

export async function useFirstWorkspaceFolder(context: ExtensionContext) {
  const wsFolder =
    workspace.workspaceFolders && workspace.workspaceFolders.length
      ? workspace.workspaceFolders[0]
      : undefined;
  if (wsFolder) {
    if (Object.keys(statusBarItems).length === 0) {
      await createCmdsStatusBarItems(context, wsFolder.uri);
    }
    await configureForWorkspace(context, wsFolder);
  }
}
