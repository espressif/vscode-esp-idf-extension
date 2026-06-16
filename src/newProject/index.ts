/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 15th June 2026 4:10:31 pm
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
  commands,
  ExtensionContext,
  l10n,
  Uri,
  window,
} from "vscode";
import { openFolderCheck, PreCheck } from "../common/PreCheck";
import { registerIDFCommand } from "../common/registerCommand";
import { withProgressWrapper } from "../common/withProgressWrapper";
import { Logger } from "../common/logger";
import { NewProjectPanel } from "./newProjectPanel";
import { getNewProjectArgs } from "./newProjectInit";
import { getIdfSetups } from "../eim/getExistingSetups";
import { getCurrentIdfSetup } from "../eim/loadIdfSetup";
import { pathExists } from "fs-extra";
import {
  checkIsProjectCmakeLists,
  copyFromSrcProject,
  createDevContainer,
  createNewComponent,
  createNewProject,
  createVscodeFolder,
  updateProjectNameInCMakeLists,
} from "./utils";
import { ESP } from "../config";

export function registerNewProjectWizardCmd(context: ExtensionContext) {
  registerIDFCommand(context, "espIdf.newProject.start", async () => {
    await withProgressWrapper(
      [openFolderCheck],
      "ESP-IDF: New Project",
      async (_progress, cancelToken, wsFolder) => {
        try {
          _progress.report({ message: "Loading IDF setups...", increment: 10 });
          let idfSetups = await getIdfSetups(wsFolder.uri);
          if (idfSetups.length === 0) {
            return;
          }
          const currentIdfSetup = await getCurrentIdfSetup(wsFolder.uri);
          if (currentIdfSetup) {
            const isCurrentSetupInList = idfSetups.findIndex((idfSetup) => {
              return (
                idfSetup.idfPath === currentIdfSetup.idfPath &&
                idfSetup.toolsPath === currentIdfSetup.toolsPath
              );
            });
            if (isCurrentSetupInList === -1) {
              idfSetups.push(currentIdfSetup);
            }
          }

          let existingIdfSetups = await Promise.all(
            idfSetups.map(async (setup) => {
              return (await pathExists(setup.idfPath)) ? setup : null;
            })
          ).then((results) => results.filter((setup) => setup !== null));

          if (!existingIdfSetups || existingIdfSetups.length === 0) {
            window.showInformationMessage(l10n.t("No ESP-IDF Setups found"));
            return;
          }

          _progress.report({
            message: "Loading ESP-IDF examples...",
            increment: 10,
          });
          const newProjectArgs = await getNewProjectArgs(
            _progress,
            wsFolder.uri,
            existingIdfSetups
          );
          if (newProjectArgs) {
            NewProjectPanel.createOrShow(context.extensionPath, newProjectArgs);
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          Logger.errorNotify(errMsg, error as Error, "newProject");
        }
      }
    );
  });

  registerIDFCommand(context, "espIdf.createVsCodeFolder", () => {
    PreCheck.perform([openFolderCheck], async () => {
      try {
        const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
        if (!wsFolder) {
          return;
        }
        await createVscodeFolder(context.extensionPath, wsFolder.uri);
        Logger.infoNotify(
          l10n.t("ESP-IDF vscode files have been added to the project.")
        );
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        Logger.errorNotify(errMsg, error as Error, "createVsCodeFolder");
        return;
      }
    });
  });

  registerIDFCommand(context, "espIdf.createDevContainer", () => {
    PreCheck.perform([openFolderCheck], async () => {
      try {
        const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
        if (!wsFolder) {
          return;
        }
        await createDevContainer(context.extensionPath, wsFolder.uri.fsPath);
        Logger.infoNotify(
          l10n.t("ESP-IDF container files have been added to the project.")
        );
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        Logger.errorNotify(errMsg, error as Error, "createDevContainer");
        return;
      }
    });
  });

  registerIDFCommand(context, "espIdf.createNewProject", async () => {
    await withProgressWrapper(
      [openFolderCheck],
      l10n.t("New Project"),
      async (_progress, cancelToken, wsFolder) => {
        try {
          _progress.report({
            message: "Waiting for project name",
            increment: 10,
          });
          let projectName = await window.showInputBox({
            placeHolder: l10n.t("Enter ESP-IDF project name"),
            value: "",
          });
          if (!projectName) {
            return;
          }
          _progress.report({
            message: "Waiting for folder selection",
            increment: 20,
          });
          let selectedFolder = await window.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            canSelectMany: false,
          });
          if (!selectedFolder) {
            return;
          }
          _progress.report({
            message: "Creating ESP-IDF project...",
            increment: 30,
          });
          await createNewProject(
            context.extensionPath,
            projectName,
            selectedFolder[0]
          );
          if (projectName && selectedFolder && selectedFolder[0]) {
            const openItem = l10n.t(`Open {0}`, projectName);
            const opt = await window.showInformationMessage(
              l10n.t("ESP-IDF project {name} has been created", {
                name: projectName,
              }),
              openItem
            );
            if (opt === openItem) {
              commands.executeCommand(
                "vscode.openFolder",
                Uri.joinPath(selectedFolder[0], projectName),
                true
              );
            }
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          return Logger.errorNotify(
            errMsg,
            error as Error,
            "extension createNewProject"
          );
        }
      }
    );
  });

  registerIDFCommand(context, "espIdf.createNewComponent", async () => {
    PreCheck.perform([openFolderCheck], async () => {
      try {
        const componentName = await window.showInputBox({
          placeHolder: l10n.t("Enter ESP-IDF component name"),
          value: "",
        });
        if (!componentName) {
          return;
        }
        const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
        if (!wsFolder) {
          return;
        }
        await createNewComponent(
          context.extensionPath,
          componentName,
          wsFolder.uri.fsPath
        );
        Logger.infoNotify(
          l10n.t(`The ESP-IDF component {componentName} has been created`, {
            componentName,
          })
        );
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        return Logger.errorNotify(
          errMsg,
          error as Error,
          "extension createNewComponent"
        );
      }
    });
  });

  registerIDFCommand(context, "espIdf.importProject", async () => {
    const srcFolder = await window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
    });
    if (!srcFolder || !srcFolder.length) {
      return;
    }
    const isIdfProject = checkIsProjectCmakeLists(srcFolder[0].fsPath);
    if (!isIdfProject) {
      Logger.infoNotify(
        l10n.t(`{srcFolder} is not an ESP-IDF project.`, {
          srcFolder: srcFolder[0].fsPath,
        })
      );
      return;
    }
    const items = [
      {
        label: l10n.t("Choose a container directory..."),
        target: "another",
      },
    ];
    const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
    if (wsFolder) {
      items.push({
        label: l10n.t(`Use current folder: {workspace}`, {
          workspace: wsFolder.uri.fsPath,
        }),
        target: "current",
      });
    }
    const projectDirOption = await window.showQuickPick(items, {
      placeHolder: l10n.t("Select a directory to use"),
    });
    if (!projectDirOption) {
      return;
    }
    let destFolder: Uri | undefined;
    if (projectDirOption.target === "another") {
      const newFolder = await window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
      });
      if (!newFolder || !newFolder.length) {
        return;
      }
      destFolder = newFolder[0];
    } else if (wsFolder) {
      destFolder = wsFolder.uri;
    }
    if (!destFolder) {
      return;
    }
    const projectName = await window.showInputBox({
      placeHolder: l10n.t("Enter project name"),
      value: "",
    });
    if (!projectName) {
      return;
    }
    destFolder = Uri.joinPath(destFolder, projectName);
    const doesProjectExists = await pathExists(destFolder.fsPath);
    if (doesProjectExists) {
      Logger.infoNotify(l10n.t(`{destFolder} already exists.`, { destFolder }));
      return;
    }
    await copyFromSrcProject(
      context.extensionPath,
      srcFolder[0].fsPath,
      destFolder
    );
    await updateProjectNameInCMakeLists(destFolder.fsPath, projectName);
    const opt = await window.showInformationMessage(
      l10n.t("ESP-IDF project has been imported"),
      "Open"
    );
    if (opt === "Open") {
      commands.executeCommand("vscode.openFolder", destFolder, true);
    }
  });
}
