/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 22nd June 2026 5:06:00 pm
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

import {
  CancellationTokenSource,
  ExtensionContext,
  TreeItemCheckboxState,
  workspace,
} from "vscode";
import {
  createCmdsStatusBarItems,
  statusBarItems,
  updateOpenOcdAdapterStatusBarItem,
} from "../statusBar";
import { readParameter } from "../configuration/idf";
import {
  getIdfTargetFromSdkconfig,
  updateIdfComponentsTree,
} from "../configuration/workspace";
import { configureClangSettings } from "../clang";
import { commandDictionary, CommandKeys } from "../cmdTreeView/cmdStore";
import { handleCompileCommandsUpdate } from "../clang/checkClangExtension";
import { Logger } from "./logger";
import {
  coverageRendererSettingsAffected,
  espIdfCoverageRenderer,
} from "../coverage/renderer";
import { ESP } from "../config";
import { OutputChannel } from "./outputChannel";
import { UnitTest } from "../espIdf/unitTest/adapter";
import { updateCurrentIdfEnvVar } from "../configuration/env";

export function registerOnDidChangeConfiguration(context: ExtensionContext) {
  context.subscriptions.push(
    workspace.onDidChangeConfiguration(async (e) => {
      const winFlag = process.platform === "win32" ? "Win" : "";
      const workspaceRoot = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      // Refresh OpenOCD adapter status bar item when adapter location is manually edited
      if (
        workspaceRoot &&
        e.affectsConfiguration("idf.customExtraVars", workspaceRoot) &&
        statusBarItems &&
        statusBarItems["openOcdAdapter"] &&
        ESP.GlobalConfiguration.store.get<TreeItemCheckboxState>(
          CommandKeys.OpenOcdAdapterStatusBar,
          TreeItemCheckboxState.Unchecked
        ) === TreeItemCheckboxState.Checked
      ) {
        updateOpenOcdAdapterStatusBarItem(workspaceRoot.uri);
      }
      if (e.affectsConfiguration("idf.enableStatusBar")) {
        const enableStatusBar = readParameter(
          "idf.enableStatusBar",
          workspaceRoot
        ) as boolean;
        if (enableStatusBar) {
          await createCmdsStatusBarItems(context, workspaceRoot.uri);
        } else if (!enableStatusBar) {
          for (let statusItem in statusBarItems) {
            statusBarItems[statusItem].dispose();
            delete statusBarItems[statusItem];
          }
        }
      } else if (e.affectsConfiguration("idf.customExtraVars")) {
        const customExtraVars = readParameter(
          "idf.customExtraVars",
          workspaceRoot
        ) as { [key: string]: string };
        for (const envVar in customExtraVars) {
          if (envVar.toUpperCase() !== "PATH") {
            context.environmentVariableCollection.replace(
              envVar,
              customExtraVars[envVar],
              { applyAtProcessCreation: true }
            );
            updateCurrentIdfEnvVar(envVar, customExtraVars[envVar]);
          }
        }
        await getIdfTargetFromSdkconfig(
          workspaceRoot.uri,
          statusBarItems["target"]
        );
        await configureClangSettings(workspaceRoot.uri);
        ESP.URL.Docs.IDF_INDEX = undefined;
      } else if (e.affectsConfiguration("idf.port" + winFlag)) {
        if (statusBarItems && statusBarItems["port"]) {
          statusBarItems["port"].text =
            `$(${commandDictionary[CommandKeys.SelectSerialPort].iconId}) ` +
            readParameter("idf.port", workspaceRoot);
        }
      } else if (e.affectsConfiguration("idf.monitorPort")) {
        const monitorPort = readParameter("idf.monitorPort", workspaceRoot);
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
      } else if (e.affectsConfiguration("idf.flashType")) {
        let flashType = readParameter("idf.flashType", workspaceRoot) as string;
        if (statusBarItems && statusBarItems["flashType"]) {
          statusBarItems["flashType"].text = `$(${
            commandDictionary[CommandKeys.SelectFlashType].iconId
          }) ${flashType}`;
        }
      } else if (e.affectsConfiguration("idf.buildPath" + winFlag)) {
        updateIdfComponentsTree(workspaceRoot.uri);
        await configureClangSettings(workspaceRoot.uri);
        handleCompileCommandsUpdate(workspaceRoot.uri, context);
      } else if (e.affectsConfiguration("idf.unitTestFilePattern")) {
        const cancelTokenSource = new CancellationTokenSource();
        try {
          if (
            UnitTest.unitTestController &&
            UnitTest.unitTestController.refreshHandler
          ) {
            await UnitTest.unitTestController.refreshHandler(
              cancelTokenSource.token
            );
          }
        } catch (error) {
          Logger.error(
            "Failed to refresh unit test controller",
            error as Error,
            "refreshUnitTestController"
          );
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          OutputChannel.appendLine(errorMsg);
        } finally {
          cancelTokenSource.dispose();
        }
      } else if (coverageRendererSettingsAffected(e, workspaceRoot.uri)) {
        espIdfCoverageRenderer.refreshOptionsFromWorkspace();
      } else if (e.affectsConfiguration("idf.sdkconfigFilePath")) {
        const sdkconfigFilePath = readParameter(
          "idf.sdkconfigFilePath",
          workspaceRoot
        ) as string;
        if (sdkconfigFilePath) {
          updateCurrentIdfEnvVar("SDKCONFIG", sdkconfigFilePath);
        }
      } else if (e.affectsConfiguration("idf.enableIdfComponentManager")) {
        const enableIdfComponentManager = readParameter(
          "idf.enableIdfComponentManager",
          workspaceRoot
        ) as boolean;
        const enabled = enableIdfComponentManager ? "1" : "0";
        updateCurrentIdfEnvVar("IDF_COMPONENT_MANAGER", enabled);
      }
    })
  );
}
