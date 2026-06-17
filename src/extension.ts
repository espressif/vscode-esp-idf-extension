// Copyright 2019 Espressif Systems (Shanghai) CO LTD
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

"use strict";
import * as path from "path";
import * as vscode from "vscode";
import { ConfserverProcess } from "./espIdf/menuconfig/confserver/confServerProcess";
import {
  NotificationMode,
  readParameter,
  writeParameter,
} from "./configuration/idf";
import { resetIdfConfigurationSource } from "./configuration/idfConfigurationSource";
import {
  getCurrentIdfConfiguration,
  getVirtualEnvPythonPath,
} from "./configuration/env";
import { Logger } from "./common/logger";
import { OutputChannel } from "./common/outputChannel";
import { showInfoNotificationWithAction } from "./common/customNotifications";
import * as utils from "./utils";
import {
  getIdfTargetFromSdkconfig,
  getProjectName,
  initSelectedWorkspace,
  updateIdfComponentsTree,
} from "./configuration/workspace";
import { Telemetry } from "./common/telemetry";
import { registerRainMakerCommands } from "./rainmaker";
import { CommandsProvider } from "./cmdTreeView/cmdTreeDataProvider";
import { ESP } from "./config";
import { RainmakerStore } from "./rainmaker/store";
import {
  coverageRendererSettingsAffected,
  espIdfCoverageRenderer,
} from "./coverage/renderer";
import { registerMonitorCommands } from "./espIdf/monitor";
import { pathExists, readFile } from "fs-extra";
import { registerEspAdfCmd } from "./espAdf/espAdfDownload";
import { ChangelogViewer } from "./changelog-viewer";
import { CmakeListsEditorPanel } from "./cmake/cmakeEditorPanel";
import { NVSPartitionTable } from "./espIdf/nvs/partitionTable/panel";
import {
  getOpenOcdScripts,
  selectOpenOcdConfigFiles,
} from "./espIdf/openOcd/boardConfiguration";
import { generateConfigurationReport } from "./support/main";
import { initializeReportObject } from "./support/initReportObj";
import { writeTextReport } from "./support/writeReport";
import { KconfigLangClient } from "./kconfig";
import { configureProjectWithGcov } from "./coverage/configureProject";
import { ComponentManagerUIPanel } from "./component-manager/panel";
import { ExtensionConfigStore } from "./common/store";
import { ProjectConfigStore } from "./project-conf/utils";
import { UnitTest } from "./espIdf/unitTest/adapter";
import { createSBOM, installEspSBOM } from "./espBom";
import { registerReconfigureCmd } from "./espIdf/reconfigure/task";
import { ErrorHintProvider, HintHoverProvider } from "./espIdf/hints/index";
import { TroubleshootingPanel } from "./support/troubleshootPanel";
import {
  createCmdsStatusBarItems,
  statusBarItems,
  updateOpenOcdAdapterStatusBarItem,
} from "./statusBar";
import {
  CommandKeys,
  commandDictionary,
  initCommandDictionary,
} from "./cmdTreeView/cmdStore";
import { asyncRemoveEspIdfSettings } from "./uninstall";
import {
  clearSelectedProjectConfiguration,
  ProjectConfigurationManager,
} from "./project-conf/ProjectConfigurationManager";
import { configureClangSettings } from "./clang";
import { OpenOCDErrorMonitor } from "./espIdf/hints/openocdhint";
import { updateHintsStatusBarItem } from "./statusBar";
import { activateLanguageTool, deactivateLanguageTool } from "./langTools";
import { openFolderCheck, PreCheck } from "./common/PreCheck";
import { buildFlashAndMonitor } from "./buildFlashMonitor";
import { loadIdfSetup } from "./eim/loadIdfSetup";
import {
  checkAndPromptForClangdExtension,
  handleCompileCommandsUpdate,
} from "./clang/checkClangExtension";
import { registerBuildCommands } from "./build";
import { registerFlashCommands } from "./flash";
import { registerEraseFlashCommand } from "./eraseFlash";
import { IDFMonitor } from "./espIdf/monitor/terminal";
import { registerMenuconfigCommands } from "./espIdf/menuconfig";
import { registerIdfSizeUICmd } from "./espIdf/size";
import { registerDebugCommands } from "./debugAdapter";
import { registerIdfTerminalCommand } from "./terminal";
import { registerAddArduinoAsComponentCmd } from "./espIdf/arduino";
import { registerFullCleanCmd } from "./clean";
import { registerSerialPortCmds } from "./espIdf/serial";
import { registerCoverageCommands } from "./coverage";
import { addCmakeFileSystemWatcher } from "./cmake";
import { registerCustomTaskCommand } from "./taskManager";
import { registerNewProjectWizardCmd } from "./newProject";
import { addUnitTestCommands } from "./espIdf/unitTest";
import { registerSearchDocsCommand } from "./espIdf/documentation";
import { installManagerCommand } from "./eim";
import { checkIsProjectCmakeLists } from "./newProject/utils";
import { registerQEMUCommands } from "./qemu";
import { registerOpenOCDCommands } from "./espIdf/openOcd";
import {
  IOpenOCDConfig,
  OpenOCDManager,
} from "./espIdf/openOcd/openOcdManager";
import { registerSetTargetCommand } from "./espIdf/setTarget";
import { registerAppTraceCommands } from "./espIdf/tracing";
import { registerWelcomePanel } from "./welcome";
import { registerProjectConfigCommands } from "./project-conf";
import { registerDoctorCommand } from "./support";

// Global variables shared by commands
let workspaceRoot: vscode.Uri;

// Commands Provider
let commandTreeDataProvider: CommandsProvider;

export async function activate(context: vscode.ExtensionContext) {
  // Always load Logger first
  Logger.init(context);
  resetIdfConfigurationSource();
  ESP.GlobalConfiguration.store = ExtensionConfigStore.init(context);
  initCommandDictionary();
  ESP.ProjectConfiguration.store = ProjectConfigStore.init(context);
  clearSelectedProjectConfiguration();
  Telemetry.init((readParameter("idf.telemetry") as boolean) || false);
  utils.setExtensionContext(context);
  ChangelogViewer.showChangeLogAndUpdateVersion(context);

  // Check if running in a VS Code fork and prompt for clangd extension installation
  if (PreCheck.isRunningInVSCodeFork()) {
    checkAndPromptForClangdExtension();
  }

  // Validate workspace activation eligibility
  // See docs_espressif/en/extension-activation.rst for details
  if (PreCheck.isWorkspaceFolderOpen() && vscode.workspace.workspaceFolders) {
    const activationModeConfigKey = "idf.extensionActivationMode";
    try {
      const normalizeActivationMode = (
        value: unknown
      ): "detect" | "always" | "never" => {
        if (value === "always") {
          return "always";
        }
        if (value === "never") {
          return "never";
        }
        return "detect";
      };

      // 1) Workspace/global setting: always activates; never suppresses (no prompt).
      const workspaceValue = normalizeActivationMode(
        readParameter(activationModeConfigKey)
      );
      if (workspaceValue === "always") {
        // Activate immediately; skip folder checks and CMake detection.
        Logger.info(
          "Extension activation forced by workspace/global idf.extensionActivationMode=always setting."
        );
      } else if (workspaceValue === "never") {
        Logger.info(
          "Extension activation suppressed by workspace/global idf.extensionActivationMode=never setting."
        );
        return;
      } else {
        // 2) Folder settings: any always activates; only ALL folders never suppresses (no prompt).
        let hasAnyFolderAlways = false;
        let allFoldersNever = vscode.workspace.workspaceFolders.length > 0;
        for (const folder of vscode.workspace.workspaceFolders) {
          const folderValue = normalizeActivationMode(
            readParameter(activationModeConfigKey, folder.uri)
          );
          if (folderValue === "always") {
            hasAnyFolderAlways = true;
            allFoldersNever = false;
            Logger.info(
              "Extension activation forced by folder-level idf.extensionActivationMode=always setting."
            );
            break;
          }
          if (folderValue !== "never") {
            allFoldersNever = false;
          }
        }

        if (!hasAnyFolderAlways) {
          if (allFoldersNever) {
            Logger.info(
              "Extension activation suppressed because all workspace folders set idf.extensionActivationMode=never."
            );
            return;
          }

          // 3) Fallback: CMakeLists.txt detection across folders.
          let hasCMakeIdfProject = false;
          for (const workspaceFolder of vscode.workspace.workspaceFolders) {
            const rootCMakeListsPath = path.join(
              workspaceFolder.uri.fsPath,
              "CMakeLists.txt"
            );
            const rootCMakeListsExists = await pathExists(rootCMakeListsPath);
            if (!rootCMakeListsExists) {
              continue;
            }
            try {
              const cmakeContent = await readFile(rootCMakeListsPath, "utf-8");
              if (
                cmakeContent.includes(
                  "include($ENV{IDF_PATH}/tools/cmake/project.cmake)"
                )
              ) {
                hasCMakeIdfProject = true;
                Logger.info(
                  "Extension activated via CMakeLists.txt ESP-IDF project detection."
                );
                break;
              }
            } catch (error) {
              Logger.error(
                `Error reading root CMakeLists.txt for activation check in ${workspaceFolder.name}.`,
                error,
                "extension activate checkCMakeContent"
              );
            }
          }

          if (!hasCMakeIdfProject) {
            // 4) Prompt only when no standard project was detected.
            const activateAnyway = await vscode.window.showInformationMessage(
              vscode.l10n.t(
                "No standard ESP-IDF project was found in this workspace. Do you want to activate the ESP-IDF extension anyway?"
              ),
              { modal: false },
              { title: vscode.l10n.t("Activate Anyway") }
            );
            if (
              !activateAnyway ||
              activateAnyway.title !== vscode.l10n.t("Activate Anyway")
            ) {
              Logger.info("User chose not to activate the ESP-IDF extension.");
              return; // Exit activation early
            }
            Logger.info(
              "User chose to activate the ESP-IDF extension despite no standard ESP-IDF project was found."
            );
          }
        }
      }
    } catch (error) {
      Logger.error(
        "Error checking idf.extensionActivationMode setting for activation.",
        error,
        "extension activate checkExtensionActivationModeSetting"
      );
    }
  }
  OutputChannel.init();
  const registerIDFCommand = (
    name: string,
    callback: (...args: any[]) => any
  ): number => {
    const telemetryCallback = (...args: any[]): any => {
      const startTime = Date.now();
      Logger.info(`Command::${name}::Executed`);
      const cbResult = callback.apply(this, args);
      const timeSpent = Date.now() - startTime;
      Telemetry.sendEvent("command", { commandName: name }, { timeSpent });
      return cbResult;
    };
    return context.subscriptions.push(
      vscode.commands.registerCommand(name, telemetryCallback)
    );
  };

  // init rainmaker cache store
  ESP.Rainmaker.store = RainmakerStore.init(context);

  // Create Kconfig Language Server Client
  KconfigLangClient.startKconfigLangServer(context);

  // Initialize ESP-IDF Language Tool for chat commands
  activateLanguageTool(context);

  registerDebugCommands(context);

  // Register Tree Provider for IDF Explorer
  registerTreeProvidersForIDFExplorer(context);

  if (PreCheck.isWorkspaceFolderOpen()) {
    await loadIdfSetup(vscode.workspace.workspaceFolders[0]);
    await createCmdsStatusBarItems(
      context,
      vscode.workspace.workspaceFolders[0].uri
    );
    workspaceRoot = initSelectedWorkspace(statusBarItems["workspace"])?.uri;
    ESP.GlobalConfiguration.store.setSelectedWorkspaceFolder(workspaceRoot);
    await getIdfTargetFromSdkconfig(workspaceRoot, statusBarItems["target"]);
    if (statusBarItems && statusBarItems["port"]) {
      statusBarItems["port"].text =
        `$(${commandDictionary[CommandKeys.SelectSerialPort].iconId}) ` +
        readParameter("idf.port", workspaceRoot);
    }
    espIdfCoverageRenderer.setForWorkspace(workspaceRoot);
    handleCompileCommandsUpdate(workspaceRoot, context);
  }
  let unitTestController = new UnitTest(context);

  addCmakeFileSystemWatcher(context);

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(async (e) => {
      if (PreCheck.isWorkspaceFolderOpen()) {
        for (const ws of e.removed) {
          if (workspaceRoot && ws.uri === workspaceRoot) {
            const wsFolder = initSelectedWorkspace(statusBarItems["workspace"]);
            if (wsFolder) {
              await loadIdfSetup(wsFolder);
              ESP.GlobalConfiguration.store.setSelectedWorkspaceFolder(
                wsFolder.uri
              );
              workspaceRoot = wsFolder.uri;
            }
            await getIdfTargetFromSdkconfig(
              workspaceRoot,
              statusBarItems["target"]
            );
            if (statusBarItems && statusBarItems["port"]) {
              statusBarItems["port"].text =
                `$(${
                  commandDictionary[CommandKeys.SelectSerialPort].iconId
                }) ` + readParameter("idf.port", workspaceRoot);
            }
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
            if (statusBarItems["projectConf"]) {
              statusBarItems["projectConf"].dispose();
              statusBarItems["projectConf"] = undefined;
              const selectedConfig = ESP.ProjectConfiguration.store.get<string>(
                ESP.ProjectConfiguration.SELECTED_CONFIG
              );
              ESP.ProjectConfiguration.store.clear(selectedConfig);
              ESP.ProjectConfiguration.store.clear(
                ESP.ProjectConfiguration.SELECTED_CONFIG
              );
            }
            const currentEnvVars = getCurrentIdfConfiguration();
            const idfVersion = await utils.getEspIdfFromCMake(
              currentEnvVars["IDF_PATH"]
            );
            if (statusBarItems["currentIdfVersion"]) {
              statusBarItems["currentIdfVersion"].text = idfVersion
                ? `$(${
                    commandDictionary[CommandKeys.SelectCurrentIdfVersion]
                      .iconId
                  }) ESP-IDF v${idfVersion}`
                : `$(${
                    commandDictionary[CommandKeys.SelectCurrentIdfVersion]
                      .iconId
                  }) ESP-IDF InvalidSetup`;
            }
            espIdfCoverageRenderer.setForWorkspace(workspaceRoot);
            handleCompileCommandsUpdate(workspaceRoot, context);
            break;
          }
        }
        if (typeof workspaceRoot === "undefined") {
          const workspaceFolder = initSelectedWorkspace(
            statusBarItems["workspace"]
          );
          if (workspaceFolder) {
            workspaceRoot = workspaceFolder?.uri;
            await loadIdfSetup(workspaceFolder);
            ESP.GlobalConfiguration.store.setSelectedWorkspaceFolder(
              workspaceFolder.uri
            );
          }
          await getIdfTargetFromSdkconfig(
            workspaceRoot,
            statusBarItems["target"]
          );
          espIdfCoverageRenderer.setForWorkspace(workspaceRoot);
          handleCompileCommandsUpdate(workspaceRoot, context);
        }
        const openOCDConfig: IOpenOCDConfig = {
          workspace: workspaceRoot,
        } as IOpenOCDConfig;
        OpenOCDManager.init().configureServer(openOCDConfig);
        if (ProjectConfigurationManager.instance) {
          ProjectConfigurationManager.instance.dispose();
        }
        new ProjectConfigurationManager(workspaceRoot, context, statusBarItems);
      }
      ConfserverProcess.dispose();
    })
  );

  registerFullCleanCmd(context);

  registerAddArduinoAsComponentCmd(context);

  registerEspAdfCmd(context);

  registerSerialPortCmds(context);

  registerReconfigureCmd(context);

  registerCustomTaskCommand(context);

  registerProjectConfigCommands(context);

  vscode.workspace.onDidChangeConfiguration(async (e) => {
    const winFlag = process.platform === "win32" ? "Win" : "";

    // Refresh OpenOCD adapter status bar item when adapter location is manually edited
    if (
      workspaceRoot &&
      e.affectsConfiguration("idf.customExtraVars", workspaceRoot) &&
      statusBarItems &&
      statusBarItems["openOcdAdapter"] &&
      ESP.GlobalConfiguration.store.get<vscode.TreeItemCheckboxState>(
        CommandKeys.OpenOcdAdapterStatusBar,
        vscode.TreeItemCheckboxState.Unchecked
      ) === vscode.TreeItemCheckboxState.Checked
    ) {
      updateOpenOcdAdapterStatusBarItem(workspaceRoot);
    }
    if (e.affectsConfiguration("idf.enableStatusBar")) {
      const enableStatusBar = readParameter(
        "idf.enableStatusBar",
        workspaceRoot
      ) as boolean;
      if (enableStatusBar) {
        await createCmdsStatusBarItems(context, workspaceRoot);
      } else if (!enableStatusBar) {
        for (let statusItem in statusBarItems) {
          statusBarItems[statusItem].dispose();
          statusBarItems[statusItem] = undefined;
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
        }
      }
      await getIdfTargetFromSdkconfig(workspaceRoot, statusBarItems["target"]);
      await configureClangSettings(workspaceRoot);
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
      updateIdfComponentsTree(workspaceRoot);
      await configureClangSettings(workspaceRoot);
      handleCompileCommandsUpdate(workspaceRoot, context);
    } else if (e.affectsConfiguration("idf.unitTestFilePattern")) {
      const cancelTokenSource = new vscode.CancellationTokenSource();
      try {
        await unitTestController.unitTestController.refreshHandler(
          cancelTokenSource.token
        );
      } catch (error) {
        Logger.error(
          "Failed to refresh unit test controller",
          error,
          "extension refreshUnitTestController"
        );
        const errorMsg =
          error && error.message
            ? error.message
            : "Error refreshing unit test controller";
        OutputChannel.appendLine(errorMsg);
      } finally {
        cancelTokenSource.dispose();
      }
    } else if (coverageRendererSettingsAffected(e, workspaceRoot)) {
      espIdfCoverageRenderer.refreshOptionsFromWorkspace();
    }
  });

  registerCoverageCommands(context);

  registerIDFCommand("espIdf.getProjectName", () => {
    return PreCheck.perform([openFolderCheck], async () => {
      try {
        return await getProjectName(workspaceRoot);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        Logger.errorNotify(errMsg, error as Error, "extension getProjectName");
      }
    });
  });

  registerSearchDocsCommand(context);

  addUnitTestCommands(context);

  registerIDFCommand("espIdf.getToolchainGdb", () => {
    return PreCheck.perform([openFolderCheck], async () => {
      return await utils.getToolchainPath(workspaceRoot, "gdb");
    });
  });

  registerIDFCommand("espIdf.getToolchainGcc", () => {
    return PreCheck.perform([openFolderCheck], async () => {
      return await utils.getToolchainPath(workspaceRoot, "gcc");
    });
  });

  registerBuildCommands(context);
  registerFlashCommands(context);
  registerEraseFlashCommand(context);
  registerMonitorCommands(context);
  registerIdfTerminalCommand(context);
  registerIDFCommand("espIdf.buildFlashMonitor", () =>
    buildFlashAndMonitor(workspaceRoot)
  );

  registerMenuconfigCommands(context);

  registerSetTargetCommand(context);

  installManagerCommand(context);

  registerIDFCommand(
    "espIdf.cmakeListsEditor.start",
    async (fileUri: vscode.Uri) => {
      if (!fileUri) {
        Logger.errorNotify(
          vscode.l10n.t(
            "Cannot call this command directly, right click on any CMakeLists.txt file!"
          ),
          new Error("INVALID_INVOCATION"),
          "extension cmakeListsEditor no file"
        );
        return;
      }
      PreCheck.perform([openFolderCheck], async () => {
        await CmakeListsEditorPanel.createOrShow(context.extensionUri, fileUri);
      });
    }
  );

  registerWelcomePanel(context);

  registerNewProjectWizardCmd(context);

  registerIDFCommand("espIdf.openIdfDocument", (docUri: vscode.Uri) => {
    vscode.workspace.openTextDocument(docUri.fsPath).then((doc) => {
      vscode.window.showTextDocument(doc, vscode.ViewColumn.One, true);
    });
  });

  registerIDFCommand("espIdf.getExtensionPath", () => {
    return context.extensionPath;
  });

  registerIDFCommand("espIdf.getIDFTarget", async () => {
    return await getIdfTargetFromSdkconfig(workspaceRoot);
  });

  registerIdfSizeUICmd(context);

  registerIDFCommand("espIdf.setClangSettings", async () => {
    PreCheck.perform([openFolderCheck], async () => {
      await configureClangSettings(workspaceRoot, true);
      vscode.window.showInformationMessage(
        vscode.l10n.t(
          "ESP-IDF: Clang settings have been configured for the project."
        )
      );
    });
  });

  registerAppTraceCommands(context);

  registerOpenOCDCommands(context);

  registerQEMUCommands(context);

  registerDoctorCommand(context);

  registerRainMakerCommands(context);

  registerIDFCommand("espIdf.ninja.summary", async () => {
    const notificationMode = readParameter(
      "idf.notificationMode",
      workspaceRoot
    ) as string;
    const ProgressLocation =
      notificationMode === NotificationMode.All ||
      notificationMode === NotificationMode.Notifications
        ? vscode.ProgressLocation.Notification
        : vscode.ProgressLocation.Window;
    vscode.window.withProgress(
      {
        title: "ESP-IDF: Getting ninja build summary",
        location: ProgressLocation,
      },
      async () => {
        try {
          const pythonBinPath = await getVirtualEnvPythonPath();
          const ninjaSummaryScript = path.join(
            context.extensionPath,
            "external",
            "chromium",
            "ninja-build-summary.py"
          );
          const buildDir = readParameter(
            "idf.buildPath",
            workspaceRoot
          ) as string;
          const args = [ninjaSummaryScript, "-C", buildDir];
          const summaryResult = await utils.execChildProcess(
            pythonBinPath,
            args,
            workspaceRoot.fsPath,
            OutputChannel.init()
          );
          const ninjaBuildMsg = `Ninja build summary - ${Date().toLocaleString()}`;
          OutputChannel.appendLine(ninjaBuildMsg);
          Logger.info(ninjaBuildMsg);
          OutputChannel.appendLine(summaryResult);
          Logger.info(summaryResult);
          OutputChannel.show();
        } catch (error) {
          Logger.errorNotify(
            vscode.l10n.t("Ninja build summary found an error"),
            error,
            "extension ninja summary"
          );
        }
      }
    );
  });

  registerIDFCommand("espIdf.createSbom", () => {
    PreCheck.perform([openFolderCheck], async () => {
      const notificationMode = readParameter(
        "idf.notificationMode",
        this.curWorkspace
      ) as string;
      const ProgressLocation =
        notificationMode === NotificationMode.All ||
        notificationMode === NotificationMode.Notifications
          ? vscode.ProgressLocation.Notification
          : vscode.ProgressLocation.Window;
      vscode.window.withProgress(
        {
          title: vscode.l10n.t("ESP-IDF: Create SBOM summary"),
          location: ProgressLocation,
        },
        async () => {
          try {
            await installEspSBOM(workspaceRoot);
            await createSBOM(workspaceRoot);
          } catch (err) {
            return Logger.errorNotify(err.message, err, "extension sbom");
          }
        }
      );
    });
  });

  registerIDFCommand(
    "espIdf.webview.nvsPartitionEditor",
    async (args?: vscode.Uri) => {
      let filePath = args?.fsPath;
      if (!args) {
        try {
          const nvsFileName = await vscode.window.showInputBox({
            placeHolder: "Enter NVS CSV file name",
            value: "",
          });
          if (!nvsFileName) {
            return;
          }
          filePath = path.join(
            workspaceRoot.fsPath,
            `${nvsFileName.replace(".csv", "")}.csv`
          );
        } catch (error) {
          const errMsg = error.message
            ? error.message
            : "Error at NVS Partition Editor";
          Logger.errorNotify(errMsg, error, "extension nvsPartitionEditor");
        }
      }
      NVSPartitionTable.createOrShow(
        context.extensionPath,
        filePath,
        workspaceRoot
      );
    }
  );
  registerIDFCommand("esp.component-manager.ui.show", async () => {
    try {
      ComponentManagerUIPanel.show(context.extensionPath, workspaceRoot);
    } catch (error) {
      Logger.errorNotify(error.message, error, "extension component manager");
    }
  });

  // WALK-THROUGH
  let disposable = vscode.commands.registerCommand(
    "espIdf.openWalkthrough",
    () => {
      vscode.commands.executeCommand(
        "workbench.action.openWalkthrough",
        "espressif.esp-idf-extension#espIdf.walkthrough.basic-usage"
      );
    }
  );

  context.subscriptions.push(disposable);

  const hasWalkthroughBeenShown = await readParameter(
    "idf.hasWalkthroughBeenShown",
    workspaceRoot
  );

  if (!hasWalkthroughBeenShown) {
    await writeParameter(
      "idf.hasWalkthroughBeenShown",
      true,
      vscode.ConfigurationTarget.Global
    );
    vscode.commands.executeCommand(
      "workbench.action.openWalkthrough",
      "espressif.esp-idf-extension#espIdf.walkthrough.basic-usage"
    );
  }
  // Hints Viewer
  if (PreCheck.isWorkspaceFolderOpen()) {
    const treeDataProvider = new ErrorHintProvider(context);

    const treeView = vscode.window.createTreeView("espIdf.errorHints", {
      treeDataProvider: treeDataProvider,
      showCollapseAll: true,
    });

    treeView.title = "Error Hints";

    // Add the tree view to disposables
    context.subscriptions.push(treeView);

    // Register commands for clearing error hints
    registerIDFCommand("espIdf.errorHints.clearAll", () => {
      treeDataProvider.clearErrorHints(true); // Clear both build and OpenOCD errors
      updateHintsStatusBarItem(false);
    });

    registerIDFCommand("espIdf.errorHints.clearBuildErrors", () => {
      treeDataProvider.clearErrorHints(false); // Clear only build errors
      updateHintsStatusBarItem(false);
    });

    registerIDFCommand("espIdf.errorHints.clearOpenOCDErrors", () => {
      treeDataProvider.clearOpenOCDErrorsOnly(); // Clear only OpenOCD errors
      updateHintsStatusBarItem(false);
    });

    const openOCDErrorMonitor = OpenOCDErrorMonitor.init(
      treeDataProvider,
      workspaceRoot
    );
    await openOCDErrorMonitor.initialize();

    // Register disposal of the monitor
    context.subscriptions.push({
      dispose: () => {
        openOCDErrorMonitor.dispose();
      },
    });

    // Register command to manually search for errors
    registerIDFCommand("espIdf.searchError", async () => {
      const errorMsg = await vscode.window.showInputBox({
        placeHolder: "Enter the error message",
      });
      if (errorMsg) {
        treeDataProvider.searchError(errorMsg, workspaceRoot);
        await vscode.commands.executeCommand("espIdf.errorHints.focus");
      }
    });

    // Function to process all ESP-IDF diagnostics from the problems panel
    const processEspIdfDiagnostics = async () => {
      // Get all diagnostics from all files that have source "esp-idf"
      const espIdfDiagnostics: Array<{
        uri: vscode.Uri;
        diagnostic: vscode.Diagnostic;
      }> = [];

      // Collect all diagnostics from all files that have source "esp-idf"
      vscode.languages.getDiagnostics().forEach(([uri, diagnostics]) => {
        diagnostics
          .filter(
            (d) =>
              d.source === "esp-idf" &&
              d.severity === vscode.DiagnosticSeverity.Error
          )
          .forEach((diagnostic) => {
            espIdfDiagnostics.push({ uri, diagnostic });
          });
      });

      // Only clear build errors if no ESP-IDF diagnostics
      if (espIdfDiagnostics.length === 0) {
        treeDataProvider.clearErrorHints(false); // Don't clear OpenOCD errors
        return;
      }

      // Process all errors and collect hints
      for (const { diagnostic } of espIdfDiagnostics) {
        await treeDataProvider.searchError(diagnostic.message, workspaceRoot);
      }
    };

    // Attach a listener to the diagnostics collection
    vscode.languages.onDidChangeDiagnostics((_event) => {
      processEspIdfDiagnostics();
    });

    // Register the HintHoverProvider
    context.subscriptions.push(
      vscode.languages.registerHoverProvider(
        { pattern: "**" },
        new HintHoverProvider(treeDataProvider)
      )
    );

    // Subscribe to changes in the hints tree and update the status bar item
    treeDataProvider.onDidChangeTreeData(() => {
      updateHintsStatusBarItem(treeDataProvider.hasHints());
    });
  }

  checkAndNotifyMissingCompileCommands();

  // Remove ESP-IDF settings
  registerIDFCommand("espIdf.removeEspIdfSettings", asyncRemoveEspIdfSettings);

  if (workspaceRoot && workspaceRoot.fsPath) {
    new ProjectConfigurationManager(workspaceRoot, context, statusBarItems);
  }
}

function checkAndNotifyMissingCompileCommands() {
  if (vscode.workspace.workspaceFolders) {
    vscode.workspace.workspaceFolders.forEach(async (folder) => {
      try {
        const isIdfProject = await checkIsProjectCmakeLists(folder.uri.fsPath);
        if (isIdfProject) {
          const buildDirPath = readParameter(
            "idf.buildPath",
            workspaceRoot
          ) as string;
          const compileCommandsPath = path.join(
            buildDirPath,
            "compile_commands.json"
          );
          const compileCommandsExists = await pathExists(compileCommandsPath);

          if (!compileCommandsExists) {
            showInfoNotificationWithAction(
              vscode.l10n.t(
                "compile_commands.json is missing. This may cause errors with code analysis extensions."
              ),
              vscode.l10n.t("Generate compile_commands.json"),
              () => vscode.commands.executeCommand("espIdf.idfReconfigureTask")
            );
          }
        }
      } catch (error) {
        const msg = error.message
          ? error.message
          : "Error checking for compile_commands.json file.";
        Logger.error(
          msg,
          error,
          "extension checkAndNotifyMissingCompileCommands"
        );
      }
    });
  }
}

function registerTreeProvidersForIDFExplorer(context: vscode.ExtensionContext) {
  commandTreeDataProvider = new CommandsProvider();

  context.subscriptions.push(
    commandTreeDataProvider.registerDataProviderForTree("idfCommands")
  );
}

export function deactivate() {
  Telemetry.dispose();
  if (IDFMonitor.terminal) {
    IDFMonitor.dispose();
  }
  OutputChannel.end();
  ConfserverProcess.dispose();
  for (const item in statusBarItems) {
    statusBarItems[item].dispose();
  }
  espIdfCoverageRenderer.dispose();
  KconfigLangClient.stopKconfigLangServer();
  deactivateLanguageTool();
}
