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
import { AppTraceManager } from "./espIdf/tracing/appTraceManager";
import { AppTracePanel } from "./espIdf/tracing/appTracePanel";
import { GdbHeapTraceManager } from "./espIdf/tracing/gdbHeapTraceManager";
import {
  AppTraceArchiveTreeDataProvider,
  AppTraceArchiveItems,
  TraceType,
} from "./espIdf/tracing/tree/appTraceArchiveTreeDataProvider";
import { AppTraceTreeDataProvider } from "./espIdf/tracing/tree/appTraceTreeDataProvider";
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
  getSDKConfigFilePath,
  getIdfTargetFromSdkconfig,
  getProjectName,
  initSelectedWorkspace,
  updateIdfComponentsTree,
} from "./configuration/workspace";
import { SystemViewResultParser } from "./espIdf/tracing/system-view";
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
import { PartitionTableEditorPanel } from "./espIdf/partition-table";
import { ESPEFuseTreeDataProvider } from "./efuse/view";
import { ESPEFuseManager } from "./efuse";
import { createFileSync, pathExists, readFile } from "fs-extra";
import { registerEspAdfCmd } from "./espAdf/espAdfDownload";
import { ChangelogViewer } from "./changelog-viewer";
import { CmakeListsEditorPanel } from "./cmake/cmakeEditorPanel";
import { NVSPartitionTable } from "./espIdf/nvs/partitionTable/panel";
import {
  getOpenOcdScripts,
  selectOpenOcdConfigFiles,
} from "./espIdf/openOcd/boardConfiguration";
import { clearAdapterSerial } from "./espIdf/openOcd/adapterSerial";
import { generateConfigurationReport } from "./support";
import { initializeReportObject } from "./support/initReportObj";
import { writeTextReport } from "./support/writeReport";
import { KconfigLangClient } from "./kconfig";
import { configureProjectWithGcov } from "./coverage/configureProject";
import { ComponentManagerUIPanel } from "./component-manager/panel";
import {
  PartitionItem,
  PartitionTreeDataProvider,
} from "./espIdf/partition-table/tree";
import { flashBinaryToPartition } from "./espIdf/partition-table/partitionFlasher";
import { WelcomePanel } from "./welcome/panel";
import { getWelcomePageInitialValues } from "./welcome/welcomeInit";
import {
  setIdfTarget,
  setIsSettingIDFTarget,
  isSettingIDFTarget,
} from "./espIdf/setTarget/main";
import { setTargetInIDF } from "./espIdf/setTarget/setTargetInIdf";
import { updateCurrentProfileIdfTarget } from "./project-conf";
import { ExtensionConfigStore } from "./common/store";
import { ProjectConfigStore } from "./project-conf";
import { UnitTest } from "./espIdf/unitTest/adapter";
import { saveDefSdkconfig } from "./espIdf/menuconfig/saveDefConfig";
import { createSBOM, installEspSBOM } from "./espBom";
import { selectIdfSetup } from "./eim/selectIdfSetup";
import { registerReconfigureCmd } from "./espIdf/reconfigure/task";
import { ErrorHintProvider, HintHoverProvider } from "./espIdf/hints/index";
import { TroubleshootingPanel } from "./support/troubleshootPanel";
import {
  createCmdsStatusBarItems,
  statusBarItems,
  updateOpenOcdAdapterStatusBarItem,
} from "./statusBar";
import { CommandKeys, commandDictionary } from "./cmdTreeView/cmdStore";
import { asyncRemoveEspIdfSettings } from "./uninstall";
import {
  clearSelectedProjectConfiguration,
  ProjectConfigurationManager,
} from "./project-conf/ProjectConfigurationManager";
import { readPartition } from "./espIdf/partition-table/partitionReader";
import { getTargetsFromEspIdf } from "./espIdf/setTarget/getTargets";
import { configureClangSettings } from "./clang";
import { OpenOCDErrorMonitor } from "./espIdf/hints/openocdhint";
import { updateHintsStatusBarItem } from "./statusBar";
import { activateLanguageTool, deactivateLanguageTool } from "./langTools";
import {
  minIdfVersionCheck,
  openFolderCheck,
  PreCheck,
  webIdeCheck,
} from "./common/PreCheck";
import { buildFlashAndMonitor } from "./buildFlashMonitor";
import { getCurrentIdfSetup, loadIdfSetup } from "./eim/loadIdfSetup";
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

// Global variables shared by commands
let workspaceRoot: vscode.Uri;

// App Tracing
let appTraceTreeDataProvider: AppTraceTreeDataProvider;
let appTraceArchiveTreeDataProvider: AppTraceArchiveTreeDataProvider;
let appTraceManager: AppTraceManager;
let gdbHeapTraceManager: GdbHeapTraceManager;

// Partition table
let partitionTableTreeDataProvider: PartitionTreeDataProvider;

// Commands Provider
let commandTreeDataProvider: CommandsProvider;

// ESP eFuse Explorer
let eFuseExplorer: ESPEFuseTreeDataProvider;

// Precheck methods and their messages

let projectConfigManager: ProjectConfigurationManager | undefined;

export async function activate(context: vscode.ExtensionContext) {
  // Always load Logger first
  Logger.init(context);
  resetIdfConfigurationSource();
  ESP.GlobalConfiguration.store = ExtensionConfigStore.init(context);
  ESP.ProjectConfiguration.store = ProjectConfigStore.init(context);

  context.environmentVariableCollection.clear();

  // Only clear selected project configuration if the setting is disabled
  const saveLastProjectConfiguration = readParameter(
    "idf.saveLastProjectConfiguration"
  );
  if (saveLastProjectConfiguration === false) {
    clearSelectedProjectConfiguration();
  }

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
  appTraceManager = new AppTraceManager(
    appTraceTreeDataProvider,
    appTraceArchiveTreeDataProvider
  );
  gdbHeapTraceManager = new GdbHeapTraceManager(
    appTraceTreeDataProvider,
    appTraceArchiveTreeDataProvider
  );

  if (PreCheck.isWorkspaceFolderOpen()) {
    await loadIdfSetup(vscode.workspace.workspaceFolders[0].uri);
    await createCmdsStatusBarItems(
      context,
      vscode.workspace.workspaceFolders[0].uri
    );
    workspaceRoot = initSelectedWorkspace(statusBarItems["workspace"]);
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
            workspaceRoot = initSelectedWorkspace(statusBarItems["workspace"]);
            await loadIdfSetup(workspaceRoot);
            ESP.GlobalConfiguration.store.setSelectedWorkspaceFolder(
              workspaceRoot
            );
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
          workspaceRoot = initSelectedWorkspace(statusBarItems["workspace"]);
          await loadIdfSetup(workspaceRoot);
          ESP.GlobalConfiguration.store.setSelectedWorkspaceFolder(
            workspaceRoot
          );
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
        if (projectConfigManager) {
          projectConfigManager.dispose();
          projectConfigManager = undefined;
        }
        projectConfigManager = new ProjectConfigurationManager(
          workspaceRoot,
          context,
          statusBarItems
        );
        context.subscriptions.push(projectConfigManager);
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

  registerIDFCommand("espIdf.rmProjectConfStatusBar", async () => {
    if (statusBarItems["projectConf"]) {
      statusBarItems["projectConf"].dispose();
      statusBarItems["projectConf"] = undefined;
    }
  });

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

  registerIDFCommand("espIdf.welcome.start", async () => {
    if (WelcomePanel.isCreatedAndHidden()) {
      WelcomePanel.createOrShow(context.extensionPath, undefined);
      return;
    }
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
        cancellable: false,
        location: ProgressLocation,
        title: "ESP-IDF: Welcome page",
      },
      async (
        progress: vscode.Progress<{ increment: number; message: string }>,
        cancelToken: vscode.CancellationToken
      ) => {
        try {
          const welcomeArgs = await getWelcomePageInitialValues(progress);
          if (!welcomeArgs) {
            throw new Error("Error getting welcome page initial values");
          }
          WelcomePanel.createOrShow(context.extensionPath, welcomeArgs);
        } catch (error) {
          Logger.errorNotify(error.message, error, "extension welcome");
        }
      }
    );
  });

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

  registerIDFCommand("espIdf.getOpenOcdConfigs", () => {
    const openOcfConfigs = readParameter(
      "idf.openOcdConfigs",
      workspaceRoot
    ) as string[];
    let result = "";
    openOcfConfigs.forEach((configFile) => {
      result = result + " -f " + configFile;
    });
    return result.trim();
  });

  registerIDFCommand("espIdf.selectOpenOcdConfigFiles", async () =>
    selectOpenOcdConfigFiles(workspaceRoot)
  );

  registerIDFCommand("espIdf.getOpenOcdScriptValue", async () => {
    return await getOpenOcdScripts(workspaceRoot);
  });

  registerIdfSizeUICmd(context);

  registerIDFCommand("espIdf.setGcovConfig", async () => {
    PreCheck.perform([openFolderCheck], async () => {
      try {
        await configureProjectWithGcov(workspaceRoot);
      } catch (error) {
        Logger.errorNotify(error.message, error, "extension setGcovConfig");
      }
    });
  });

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

  registerIDFCommand("espIdf.apptrace", () => {
    PreCheck.perform([webIdeCheck, openFolderCheck], async () => {
      const appTraceLabel =
        typeof appTraceTreeDataProvider.appTraceButton.label === "string"
          ? appTraceTreeDataProvider.appTraceButton.label.match(/start/gi)
          : appTraceTreeDataProvider.appTraceButton.label.label.match(
              /start/gi
            );
      if (appTraceLabel) {
        await appTraceManager.start(workspaceRoot);
      } else {
        await appTraceManager.stop(workspaceRoot);
      }
    });
  });

  registerIDFCommand("espIdf.heaptrace", async () => {
    const idfVersionCheck = await minIdfVersionCheck("4.2");
    PreCheck.perform(
      [idfVersionCheck, webIdeCheck, openFolderCheck],
      async () => {
        const heapTraceLabel =
          typeof appTraceTreeDataProvider.heapTraceButton.label === "string"
            ? appTraceTreeDataProvider.heapTraceButton.label.match(/start/gi)
            : appTraceTreeDataProvider.heapTraceButton.label.label.match(
                /start/gi
              );
        if (heapTraceLabel) {
          await gdbHeapTraceManager.start(workspaceRoot);
        } else {
          await gdbHeapTraceManager.stop();
        }
      }
    );
  });

  registerOpenOCDCommands(context);

  registerQEMUCommands(context);

  registerIDFCommand(
    "espIdf.flashBinaryToPartition",
    async (binPath: vscode.Uri) => {
      if (!binPath) {
        return;
      }
      let items = [];
      const partitionsInDevice = partitionTableTreeDataProvider.getChildren();
      if (!partitionsInDevice) {
        vscode.window.showInformationMessage("No partition found");
      } else {
        for (let devicePartition of partitionsInDevice) {
          const item = {
            label: devicePartition.name,
            target: devicePartition.offset,
            description: devicePartition.description,
          };
          items.push(item);
        }
      }
      items.push({
        label: "Custom offset",
        target: "custom",
        description: "Enter a custom offset",
      });
      const partitionAction = await vscode.window.showQuickPick(items, {
        placeHolder: vscode.l10n.t("Select a partition to use"),
      });
      if (!partitionAction) {
        return;
      }
      if (partitionAction.target === "custom") {
        const customOffset = await vscode.window.showInputBox({
          placeHolder: vscode.l10n.t("Enter custom partition table offset"),
          value: "",
          validateInput: (text) => {
            return /^(0x[0-9a-fA-F]+|[0-9]+)$/i.test(text)
              ? null
              : "The value is not a valid hexadecimal number";
          },
        });
        if (!customOffset) {
          return;
        }
        partitionAction.target = customOffset;
      }
      await flashBinaryToPartition(
        partitionAction.target,
        binPath.fsPath,
        workspaceRoot
      );
    }
  );

  registerIDFCommand(
    "espIdf.partition.actions",
    (partitionNode: PartitionItem) => {
      if (!partitionNode) {
        return;
      }
      PreCheck.perform([openFolderCheck], async () => {
        const partitionAction = await vscode.window.showQuickPick(
          [
            {
              label: vscode.l10n.t("Read partition from device"),
              target: "readPartition",
            },
            {
              label: vscode.l10n.t(`Flash binary to this partition`),
              target: "flashBinaryToPartition",
            },
          ],
          { placeHolder: vscode.l10n.t("Select an action to use") }
        );
        if (!partitionAction) {
          return;
        }
        if (partitionAction.target === "flashBinaryToPartition") {
          const selectedFile = await vscode.window.showOpenDialog({
            canSelectFolders: false,
            canSelectFiles: true,
            canSelectMany: false,
            filters: { Binaries: ["bin"] },
          });
          if (selectedFile && selectedFile.length > 0) {
            await flashBinaryToPartition(
              partitionNode.offset,
              selectedFile[0].fsPath,
              workspaceRoot
            );
          }
        } else if (partitionAction.target === "readPartition") {
          await readPartition(
            partitionNode.name,
            partitionNode.offset,
            partitionNode.size,
            workspaceRoot
          );
        }
      });
    }
  );

  registerIDFCommand("espIdf.partition.table.refresh", () => {
    PreCheck.perform([openFolderCheck], () => {
      partitionTableTreeDataProvider.populatePartitionItems(workspaceRoot);
    });
  });

  registerIDFCommand("espIdf.apptrace.archive.refresh", () => {
    PreCheck.perform([openFolderCheck], () => {
      appTraceArchiveTreeDataProvider.populateArchiveTree();
    });
  });

  registerIDFCommand("espIdf.doctorCommand", async () => {
    const notificationMode = readParameter(
      "idf.notificationMode",
      workspaceRoot
    ) as string;
    const ProgressLocation =
      notificationMode === NotificationMode.All ||
      notificationMode === NotificationMode.Notifications
        ? vscode.ProgressLocation.Notification
        : vscode.ProgressLocation.Window;
    await vscode.window.withProgress(
      {
        cancellable: false,
        location: ProgressLocation,
        title: vscode.l10n.t("ESP-IDF Doctor"),
      },
      async (
        progress: vscode.Progress<{ message: string; increment: number }>
      ) => {
        const reportedResult = initializeReportObject();
        try {
          await generateConfigurationReport(
            context,
            workspaceRoot,
            reportedResult,
            progress
          );
          await vscode.window.showTextDocument(
            vscode.Uri.file(path.join(context.extensionPath, "report.txt"))
          );
        } catch (error) {
          reportedResult.latestError = error;
          const errMsg = error.message
            ? error.message
            : "Configuration report error";
          Logger.error(errMsg, error, "extension DoctorCommand");
          Logger.warnNotify(
            vscode.l10n.t(
              "Extension configuration report has been copied to clipboard with errors"
            )
          );
          const reportOutput = await writeTextReport(reportedResult, context);
          await vscode.env.clipboard.writeText(reportOutput);
          await vscode.window.showTextDocument(
            vscode.Uri.file(path.join(context.extensionPath, "report.txt"))
          );
          return reportedResult;
        }
      }
    );
  });

  registerIDFCommand("espIdf.troubleshootPanel", async () => {
    TroubleshootingPanel.createOrShow(context, workspaceRoot);
  });

  registerIDFCommand(
    "espIdf.apptrace.archive.showReport",
    (trace: AppTraceArchiveItems) => {
      if (!trace) {
        Logger.errorNotify(
          vscode.l10n.t(
            "Cannot call this command directly, click on any Trace to view its report!"
          ),
          new Error("INVALID_COMMAND"),
          "extension apptrace showReport"
        );
        return;
      }
      PreCheck.perform([openFolderCheck], async () => {
        if (trace.type === TraceType.HeapTrace) {
          enum TracingViewType {
            HeapTracingPlot,
            SystemViewTracing,
          }
          //show option to render system trace view or heap trace
          const placeHolder = vscode.l10n.t(
            "Do you want to view Heap Trace plot or System View Trace"
          );
          const choice = await vscode.window.showQuickPick(
            [
              {
                type: TracingViewType.SystemViewTracing,
                label: "$(symbol-keyword) System View Tracing",
                detail: vscode.l10n.t(
                  "Show System View Tracing Plot (will open a webview window)"
                ),
              },
              {
                type: TracingViewType.HeapTracingPlot,
                label: "$(graph) Heap Tracing",
                detail: vscode.l10n.t("Open Old Heap/App Trace Panel"),
              },
            ],
            {
              placeHolder,
              ignoreFocusOut: true,
            }
          );
          if (!choice) {
            return;
          }
          if (choice.type === TracingViewType.SystemViewTracing) {
            return SystemViewResultParser.parseWithProgress(
              trace,
              context.extensionPath,
              workspaceRoot
            );
          }
        }

        // For App Trace, directly open the file instead of showing the webview
        if (trace.type === TraceType.AppTrace) {
          try {
            const textDocument = await vscode.workspace.openTextDocument(
              trace.filePath
            );
            const column = vscode.window.activeTextEditor
              ? vscode.window.activeTextEditor.viewColumn
              : undefined;
            await vscode.window.showTextDocument(textDocument, {
              viewColumn: column || vscode.ViewColumn.One,
            });
            return;
          } catch (error) {
            Logger.errorNotify(
              `Failed to open App Trace file: ${error.message}`,
              error,
              "extension apptrace showReport openFile"
            );
            return;
          }
        }

        // For Heap Trace, show the webview as before
        const currentEnvVars = getCurrentIdfConfiguration();
        let espIdfPath = currentEnvVars["IDF_PATH"];
        AppTracePanel.createOrShow(context, {
          trace: {
            fileName: trace.fileName,
            filePath: trace.filePath,
            type: trace.type,
            workspacePath: workspaceRoot.fsPath,
            idfPath: espIdfPath,
          },
        });
      });
    }
  );

  registerIDFCommand("espIdf.apptrace.customize", () => {
    PreCheck.perform([openFolderCheck], async () => {
      await AppTraceManager.saveConfiguration(workspaceRoot);
    });
  });

  registerRainMakerCommands(context);

  registerIDFCommand(
    "esp.webview.open.partition-table",
    async (args?: vscode.Uri) => {
      let filePath = args?.fsPath;
      if (!args) {
        // try to get the partition table name from sdkconfig and if not found create one
        try {
          const sdkconfigFilePath = await getSDKConfigFilePath(workspaceRoot);
          if (!sdkconfigFilePath || !(await pathExists(sdkconfigFilePath))) {
            const buildProject = await vscode.window.showInformationMessage(
              vscode.l10n.t(
                `Partition table editor requires sdkconfig file. Build the project?`
              ),
              "Build"
            );
            if (buildProject === "Build") {
              vscode.commands.executeCommand("espIdf.buildDevice");
            }
            return;
          }
          const isCustomPartitionTableEnabled = await utils.getConfigValueFromSDKConfig(
            "CONFIG_PARTITION_TABLE_CUSTOM",
            workspaceRoot
          );
          if (isCustomPartitionTableEnabled !== "y") {
            const enableCustomPartitionTable = await vscode.window.showInformationMessage(
              vscode.l10n.t(
                "Custom Partition Table not enabled for the project"
              ),
              "Enable"
            );
            if (enableCustomPartitionTable === "Enable") {
              await ConfserverProcess.initWithProgress(
                workspaceRoot,
                context.extensionPath
              );

              if (ConfserverProcess.exists()) {
                const customPartitionTableEnableRequest = `{"version": 2, "set": { "PARTITION_TABLE_CUSTOM": true }}\n`;
                ConfserverProcess.sendUpdatedValue(
                  customPartitionTableEnableRequest
                );
                ConfserverProcess.saveGuiConfigValues();
              }
            } else {
              throw new Error(
                vscode.l10n.t(
                  "Custom Partition Table not enabled for the project"
                )
              );
            }
          }

          let partitionTableFilePath = await utils.getConfigValueFromSDKConfig(
            "CONFIG_PARTITION_TABLE_CUSTOM_FILENAME",
            workspaceRoot
          );
          partitionTableFilePath = partitionTableFilePath.replace(/\"/g, "");
          if (!utils.isStringNotEmpty(partitionTableFilePath)) {
            throw new Error(
              vscode.l10n.t(
                "Empty CONFIG_PARTITION_TABLE_CUSTOM_FILENAME, please add a csv file to generate partition table"
              )
            );
          }

          partitionTableFilePath = path.join(
            workspaceRoot.fsPath,
            partitionTableFilePath
          );
          if (!utils.fileExists(partitionTableFilePath)) {
            // inform user and create file.
            Logger.infoNotify(
              vscode.l10n.t(
                `Partition Table File {partitionTableFilePath} doesn't exists, we are creating an empty file there`,
                { partitionTableFilePath }
              )
            );
            createFileSync(partitionTableFilePath);
          }
          filePath = partitionTableFilePath;
        } catch (error) {
          return Logger.errorNotify(
            error.message,
            error,
            "extension partition table"
          );
        }
      }
      PartitionTableEditorPanel.show(context.extensionPath, filePath);
    }
  );
  registerIDFCommand("esp.efuse.summary", async () => {
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
        title: vscode.l10n.t("ESP-IDF: Getting eFuse summary for your chip"),
        location: ProgressLocation,
      },
      async () => {
        try {
          const eFuse = new ESPEFuseManager(workspaceRoot);
          const resp = await eFuse.summary();
          eFuseExplorer.load(resp);
          eFuseExplorer.refresh();
        } catch (error) {
          if (error.name === "IDF_VERSION_MIN_REQUIREMENT_ERROR") {
            return Logger.errorNotify(error.message, error, "extension");
          }
          Logger.errorNotify(
            vscode.l10n.t(
              "Failed to get the eFuse Summary from the chip, please make sure you have selected a valid port"
            ),
            error,
            "extension efuse summary"
          );
        }
      }
    );
  });

  registerIDFCommand("espIdf.efuse.clearResults", async () => {
    eFuseExplorer.clearResults();
  });

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
    projectConfigManager = new ProjectConfigurationManager(
      workspaceRoot,
      context,
      statusBarItems
    );
    context.subscriptions.push(projectConfigManager);
  }

  registerIDFCommand("espIdf.projectConf", () => {
    PreCheck.perform([openFolderCheck], async () => {
      if (projectConfigManager) {
        await projectConfigManager.selectProjectConfiguration();
      } else {
        vscode.window.showErrorMessage(
          "Project Configuration Manager not initialized."
        );
      }
    });
  });

  registerIDFCommand("espIdf.createProjectConfiguration", () => {
    PreCheck.perform([openFolderCheck], async () => {
      if (projectConfigManager) {
        await projectConfigManager.createProjectConfiguration();
      } else {
        vscode.window.showErrorMessage(
          "Project Configuration Manager not initialized."
        );
      }
    });
  });
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
  appTraceTreeDataProvider = new AppTraceTreeDataProvider();
  appTraceArchiveTreeDataProvider = new AppTraceArchiveTreeDataProvider();

  commandTreeDataProvider = new CommandsProvider();

  eFuseExplorer = new ESPEFuseTreeDataProvider();

  partitionTableTreeDataProvider = new PartitionTreeDataProvider();

  context.subscriptions.push(
    appTraceTreeDataProvider.registerDataProviderForTree("idfAppTracer"),
    appTraceArchiveTreeDataProvider.registerDataProviderForTree(
      "idfAppTraceArchive"
    ),
    commandTreeDataProvider.registerDataProviderForTree("idfCommands"),
    eFuseExplorer.registerDataProviderForTree("espEFuseExplorer"),
    partitionTableTreeDataProvider.registerDataProvider("idfPartitionExplorer")
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
