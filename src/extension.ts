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
import { srcOp, UpdateCmakeLists } from "./cmake/srcsWatcher";
import {
  DebugAdapterManager,
  IDebugAdapterConfig,
} from "./espIdf/debugAdapter/debugAdapterManager";
import { ConfserverProcess } from "./espIdf/menuconfig/confServerProcess";
import {
  IOpenOCDConfig,
  OpenOCDManager,
} from "./espIdf/openOcd/openOcdManager";
import { SerialPort } from "./espIdf/serial/serialPort";
import { IDFSize } from "./espIdf/size/idfSize";
import { IDFSizePanel } from "./espIdf/size/idfSizePanel";
import { AppTraceManager } from "./espIdf/tracing/appTraceManager";
import { AppTracePanel } from "./espIdf/tracing/appTracePanel";
import { GdbHeapTraceManager } from "./espIdf/tracing/gdbHeapTraceManager";
import {
  AppTraceArchiveTreeDataProvider,
  AppTraceArchiveItems,
  TraceType,
} from "./espIdf/tracing/tree/appTraceArchiveTreeDataProvider";
import { AppTraceTreeDataProvider } from "./espIdf/tracing/tree/appTraceTreeDataProvider";
import { ExamplesPlanel } from "./examples/ExamplesPanel";
import * as idfConf from "./idfConfiguration";
import { Logger } from "./logger/logger";
import { OutputChannel } from "./logger/outputChannel";
import { showInfoNotificationWithAction } from "./logger/utils";
import * as utils from "./utils";
import { PreCheck } from "./utils";
import {
  getIdfTargetFromSdkconfig,
  getProjectName,
  initSelectedWorkspace,
  updateIdfComponentsTree,
} from "./workspaceConfig";
import { SystemViewResultParser } from "./espIdf/tracing/system-view";
import { Telemetry } from "./telemetry";
import { ESPRainMakerTreeDataProvider } from "./rainmaker";
import { CommandsProvider } from "./cmdTreeView/cmdTreeDataProvider";
import { RainmakerAPIClient } from "./rainmaker/client";
import { ESP } from "./config";
import { PromptUserToLogin } from "./rainmaker/view/login";
import { RMakerItem } from "./rainmaker/view/item";
import { RainmakerStore } from "./rainmaker/store";
import { RainmakerDeviceParamStructure } from "./rainmaker/client/model";
import { RainmakerOAuthManager } from "./rainmaker/oauth";
import { CoverageRenderer, getCoverageOptions } from "./coverage/renderer";
import { previewReport } from "./coverage/coverageService";
import { WSServer } from "./espIdf/communications/ws";
import { IDFMonitor } from "./espIdf/monitor";
import { BuildTask } from "./build/buildTask";
import { FlashTask } from "./flash/flashTask";
import { ESPCoreDumpPyTool, InfoCoreFileFormat } from "./espIdf/core-dump";
import { ArduinoComponentInstaller } from "./espIdf/arduino/addArduinoComponent";
import { PartitionTableEditorPanel } from "./espIdf/partition-table";
import { ESPEFuseTreeDataProvider } from "./efuse/view";
import { ESPEFuseManager } from "./efuse";
import { constants, createFileSync, pathExists } from "fs-extra";
import { getEspAdf } from "./espAdf/espAdfDownload";
import { getEspMdf } from "./espMdf/espMdfDownload";
import { SetupPanel } from "./setup/SetupPanel";
import { ChangelogViewer } from "./changelog-viewer";
import { getSetupInitialValues, ISetupInitArgs } from "./setup/setupInit";
import {
  getVirtualEnvPythonPath,
  installEspMatterPyReqs,
  installExtensionPyReqs,
} from "./pythonManager";
import { checkExtensionSettings } from "./checkExtensionSettings";
import { CmakeListsEditorPanel } from "./cmake/cmakeEditorPanel";
import { seachInEspDocs } from "./espIdf/documentation/getSearchResults";
import {
  DocSearchResult,
  DocSearchResultTreeDataProvider,
} from "./espIdf/documentation/docResultsTreeView";
import del from "del";
import { NVSPartitionTable } from "./espIdf/nvs/partitionTable/panel";
import {
  getBoards,
  getOpenOcdScripts,
} from "./espIdf/openOcd/boardConfiguration";
import { generateConfigurationReport } from "./support";
import { initializeReportObject } from "./support/initReportObj";
import { writeTextReport } from "./support/writeReport";
import { getNewProjectArgs } from "./newProject/newProjectInit";
import { NewProjectPanel } from "./newProject/newProjectPanel";
import { buildCommand } from "./build/buildCmd";
import { verifyCanFlash } from "./flash/flashCmd";
import {
  isFlashEncryptionEnabled,
  FlashCheckResultType,
  checkFlashEncryption,
  isJtagDisabled,
} from "./flash/verifyFlashEncryption";
import { flashCommand } from "./flash/uartFlash";
import { jtagFlashCommand } from "./flash/jtagCmd";
import { createNewIdfMonitor } from "./espIdf/monitor/command";
import { KconfigLangClient } from "./kconfig";
import { configureProjectWithGcov } from "./coverage/configureProject";
import { ComponentManagerUIPanel } from "./component-manager/panel";
import { verifyAppBinary } from "./espIdf/debugAdapter/verifyApp";
import { mergeFlashBinaries } from "./qemu/mergeFlashBin";
import { QemuLaunchMode, QemuManager } from "./qemu/qemuManager";
import {
  PartitionItem,
  PartitionTreeDataProvider,
} from "./espIdf/partition-table/tree";
import { flashBinaryToPartition } from "./espIdf/partition-table/partitionFlasher";
import { CustomTask, CustomTaskType } from "./customTasks/customTaskProvider";
import { TaskManager } from "./taskManager";
import { WelcomePanel } from "./welcome/panel";
import { getWelcomePageInitialValues } from "./welcome/welcomeInit";
import { getEspMatter } from "./espMatter/espMatterDownload";
import { setIdfTarget } from "./espIdf/setTarget";
import { PeripheralTreeView } from "./espIdf/debugAdapter/peripheralTreeView";
import { PeripheralBaseNode } from "./espIdf/debugAdapter/nodes/base";
import { ExtensionConfigStore } from "./common/store";
import { projectConfigurationPanel } from "./project-conf/projectConfPanel";
import {
  getProjectConfigurationElements,
  ProjectConfigStore,
} from "./project-conf";
import {
  clearPreviousIdfSetups,
  getPreviousIdfSetups,
} from "./setup/existingIdfSetups";
import { getEspRainmaker } from "./rainmaker/download/espRainmakerDownload";
import { getDocsUrl } from "./espIdf/documentation/getDocsVersion";
import { UnitTest } from "./espIdf/unitTest/adapter";
import {
  buildFlashTestApp,
  checkPytestRequirements,
  copyTestAppProject,
  installPyTestPackages,
} from "./espIdf/unitTest/configure";
import { getFileList, getTestComponents } from "./espIdf/unitTest/utils";
import { saveDefSdkconfig } from "./espIdf/menuconfig/saveDefConfig";
import { createSBOM, installEspSBOM } from "./espBom";
import { getEspHomeKitSdk } from "./espHomekit/espHomekitDownload";
import { getCurrentIdfSetup, selectIdfSetup } from "./versionSwitcher";
import { checkDebugAdapterRequirements } from "./espIdf/debugAdapter/checkPyReqs";
import { CDTDebugConfigurationProvider } from "./cdtDebugAdapter/debugConfProvider";
import { CDTDebugAdapterDescriptorFactory } from "./cdtDebugAdapter/server";
import { IdfReconfigureTask } from "./espIdf/reconfigure/task";
import { ErrorHintProvider, HintHoverProvider } from "./espIdf/hints/index";
import { installWebsocketClient } from "./espIdf/monitor/checkWebsocketClient";
import { TroubleshootingPanel } from "./support/troubleshootPanel";
import {
  createCmdsStatusBarItems,
  createStatusBarItem,
  statusBarItems,
} from "./statusBar";
import {
  CommandKeys,
  createCommandDictionary,
  IDFWebCommandKeys,
} from "./cmdTreeView/cmdStore";
import { IdfSetup } from "./views/setup/types";

// Global variables shared by commands
let workspaceRoot: vscode.Uri;
const DEBUG_DEFAULT_PORT = 43474;
let covRenderer: CoverageRenderer;

// OpenOCD  and Debug Adapter Manager

let openOCDManager: OpenOCDManager;
let isOpenOCDLaunchedByDebug: boolean = false;
let isDebugRestarted: boolean = false;
let debugAdapterManager: DebugAdapterManager;

// QEMU
let qemuManager: QemuManager;

// ESP-IDF Docs search results Tree view
let espIdfDocsResultTreeDataProvider: DocSearchResultTreeDataProvider;

// App Tracing
let appTraceTreeDataProvider: AppTraceTreeDataProvider;
let appTraceArchiveTreeDataProvider: AppTraceArchiveTreeDataProvider;
let appTraceManager: AppTraceManager;
let gdbHeapTraceManager: GdbHeapTraceManager;

// Partition table
let partitionTableTreeDataProvider: PartitionTreeDataProvider;

// ESP-IDF Search results
let idfSearchResults: vscode.TreeView<DocSearchResult>;

// ESP Rainmaker
let rainMakerTreeDataProvider: ESPRainMakerTreeDataProvider;

// Commands Provider
let commandTreeDataProvider: CommandsProvider;

// ESP eFuse Explorer
let eFuseExplorer: ESPEFuseTreeDataProvider;

// Peripheral Tree Data Provider
let peripheralTreeProvider: PeripheralTreeView;
let peripheralTreeView: vscode.TreeView<PeripheralBaseNode>;

// Websocket Server
let wsServer: WSServer;

// Precheck methods and their messages

const openFolderFirstMsg = vscode.l10n.t("Open a folder first.");
const cmdNotForWebIdeMsg = vscode.l10n.t(
  "Selected command is not available in Web"
);
const openFolderCheck = [
  PreCheck.isWorkspaceFolderOpen,
  openFolderFirstMsg,
] as utils.PreCheckInput;
const webIdeCheck = [
  PreCheck.notUsingWebIde,
  cmdNotForWebIdeMsg,
] as utils.PreCheckInput;

const minIdfVersionCheck = async function (
  minVersion: string,
  workspace: vscode.Uri
) {
  const espIdfPath = idfConf.readParameter(
    "idf.espIdfPath",
    workspace
  ) as string;
  const gitPath = idfConf.readParameter("idf.gitPath", workspace) || "git";
  const currentVersion = await utils.getEspIdfFromCMake(espIdfPath);
  return [
    () => PreCheck.espIdfVersionValidator(minVersion, currentVersion),
    `Selected command needs ESP-IDF v${minVersion} or higher`,
  ] as utils.PreCheckInput;
};

export async function activate(context: vscode.ExtensionContext) {
  // Always load Logger first
  Logger.init(context);
  Telemetry.init(idfConf.readParameter("idf.telemetry") || false);
  utils.setExtensionContext(context);
  ChangelogViewer.showChangeLogAndUpdateVersion(context);
  debugAdapterManager = DebugAdapterManager.init(context);
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

  ESP.GlobalConfiguration.store = ExtensionConfigStore.init(context);
  ESP.ProjectConfiguration.store = ProjectConfigStore.init(context);

  // Create Kconfig Language Server Client
  KconfigLangClient.startKconfigLangServer(context);

  openOCDManager = OpenOCDManager.init();
  qemuManager = QemuManager.init();
  const commandDictionary = createCommandDictionary();

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

  // Debug session Peripherals tree view
  peripheralTreeProvider = new PeripheralTreeView();
  peripheralTreeView = vscode.window.createTreeView("espIdf.peripheralView", {
    treeDataProvider: peripheralTreeProvider,
  });
  context.subscriptions.push(
    peripheralTreeView,
    peripheralTreeView.onDidExpandElement((e) => {
      e.element.expanded = true;
      e.element.getPeripheral().updateData();
      peripheralTreeProvider.refresh();
    })
  ),
    peripheralTreeView.onDidCollapseElement((e) => {
      e.element.expanded = false;
    });

  // register openOCD status bar item
  registerOpenOCDStatusBarItem(context);

  registerQemuStatusBarItem(context);

  if (PreCheck.isWorkspaceFolderOpen()) {
    await createCmdsStatusBarItems(vscode.workspace.workspaceFolders[0].uri);
    workspaceRoot = initSelectedWorkspace(statusBarItems["workspace"]);
    await getIdfTargetFromSdkconfig(workspaceRoot, statusBarItems["target"]);
    if (statusBarItems && statusBarItems["port"]) {
      statusBarItems["port"].text =
        `$(${commandDictionary[CommandKeys.SelectSerialPort].iconId}) ` +
        idfConf.readParameter("idf.port", workspaceRoot);
    }
    const coverageOptions = getCoverageOptions(workspaceRoot);
    covRenderer = new CoverageRenderer(workspaceRoot, coverageOptions);
  }
  let unitTestController = new UnitTest(context);
  // Add delete or update new sources in CMakeLists.txt of same folder
  const newSrcWatcher = vscode.workspace.createFileSystemWatcher(
    "**/*.{c,cpp,cc,S}",
    false,
    false,
    false
  );
  const srcWatchDeleteDisposable = newSrcWatcher.onDidDelete(async (e) => {
    if (UpdateCmakeLists.singletonPromise) {
      UpdateCmakeLists.singletonPromise.then(() => {
        UpdateCmakeLists.updateSrcsInCmakeLists(e.fsPath, srcOp.delete);
        UpdateCmakeLists.singletonPromise = undefined;
      });
    } else {
      UpdateCmakeLists.updateSrcsInCmakeLists(e.fsPath, srcOp.delete);
    }
  });
  context.subscriptions.push(srcWatchDeleteDisposable);
  const srcWatchCreateDisposable = newSrcWatcher.onDidCreate(async (e) => {
    if (UpdateCmakeLists.singletonPromise) {
      UpdateCmakeLists.singletonPromise.then(() => {
        UpdateCmakeLists.updateSrcsInCmakeLists(e.fsPath, srcOp.other);
        UpdateCmakeLists.singletonPromise = undefined;
      });
    } else {
      UpdateCmakeLists.updateSrcsInCmakeLists(e.fsPath, srcOp.other);
    }
  });
  context.subscriptions.push(srcWatchCreateDisposable);
  const srcWatchOnChangeDisposable = newSrcWatcher.onDidChange(async (e) => {
    if (UpdateCmakeLists.singletonPromise) {
      UpdateCmakeLists.singletonPromise.then(() => {
        UpdateCmakeLists.updateSrcsInCmakeLists(e.fsPath, srcOp.other);
        UpdateCmakeLists.singletonPromise = undefined;
      });
    } else {
      UpdateCmakeLists.updateSrcsInCmakeLists(e.fsPath, srcOp.other);
    }
    await binTimestampEventFunc(e);
  });
  context.subscriptions.push(srcWatchOnChangeDisposable);

  const buildWatcher = vscode.workspace.createFileSystemWatcher(
    "**/.bin_timestamp",
    false,
    false,
    true
  );

  const binTimestampEventFunc = async (e: vscode.Uri) => {
    const buildDirPath = idfConf.readParameter(
      "idf.buildPath",
      workspaceRoot
    ) as string;
    const qemuBinPath = path.join(buildDirPath, "merged_qemu.bin");
    const qemuBinExists = await pathExists(qemuBinPath);
    if (qemuBinExists) {
      await vscode.workspace.fs.delete(vscode.Uri.file(qemuBinPath));
    }
  };

  const buildWatcherDisposable = buildWatcher.onDidChange(
    binTimestampEventFunc
  );
  context.subscriptions.push(buildWatcherDisposable);
  const buildWatcherCreateDisposable = buildWatcher.onDidCreate(
    binTimestampEventFunc
  );
  context.subscriptions.push(buildWatcherCreateDisposable);
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(async (e) => {
      if (PreCheck.isWorkspaceFolderOpen()) {
        for (const ws of e.removed) {
          if (workspaceRoot && ws.uri === workspaceRoot) {
            workspaceRoot = initSelectedWorkspace(statusBarItems["workspace"]);
            await getIdfTargetFromSdkconfig(
              workspaceRoot,
              statusBarItems["target"]
            );
            if (statusBarItems && statusBarItems["port"]) {
              statusBarItems["port"].text =
                `$(${
                  commandDictionary[CommandKeys.SelectSerialPort].iconId
                }) ` + idfConf.readParameter("idf.port", workspaceRoot);
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
            const currentIdfSetup = await getCurrentIdfSetup(
              workspaceRoot,
              false
            );
            if (statusBarItems["currentIdfVersion"]) {
              statusBarItems["currentIdfVersion"].text = currentIdfSetup.isValid
                ? `$(${
                    commandDictionary[CommandKeys.SelectCurrentIdfVersion]
                      .iconId
                  }) ESP-IDF v${currentIdfSetup.version}`
                : `$(${
                    commandDictionary[CommandKeys.SelectCurrentIdfVersion]
                      .iconId
                  }) ESP-IDF InvalidSetup`;
            }
            const coverageOptions = getCoverageOptions(workspaceRoot);
            covRenderer = new CoverageRenderer(workspaceRoot, coverageOptions);
            break;
          }
        }
        if (typeof workspaceRoot === undefined) {
          workspaceRoot = initSelectedWorkspace(statusBarItems["workspace"]);
          await getIdfTargetFromSdkconfig(
            workspaceRoot,
            statusBarItems["target"]
          );
          const coverageOptions = getCoverageOptions(workspaceRoot);
          covRenderer = new CoverageRenderer(workspaceRoot, coverageOptions);
        }
        const buildDirPath = idfConf.readParameter(
          "idf.buildPath",
          workspaceRoot
        ) as string;
        const projectName = await getProjectName(buildDirPath);
        const projectElfFile = `${path.join(buildDirPath, projectName)}.elf`;
        const debugAdapterConfig = {
          currentWorkspace: workspaceRoot,
          elfFile: projectElfFile,
        } as IDebugAdapterConfig;
        debugAdapterManager.configureAdapter(debugAdapterConfig);
        const openOCDConfig: IOpenOCDConfig = {
          workspace: workspaceRoot,
        } as IOpenOCDConfig;
        openOCDManager.configureServer(openOCDConfig);
      }
      ConfserverProcess.dispose();
    })
  );

  vscode.debug.onDidTerminateDebugSession((e) => {
    if (isOpenOCDLaunchedByDebug && !isDebugRestarted) {
      isOpenOCDLaunchedByDebug = false;
      openOCDManager.stop();
    }
    debugAdapterManager.stop();
  });

  const sdkconfigWatcher = vscode.workspace.createFileSystemWatcher(
    "**/sdkconfig",
    false,
    false,
    false
  );
  const updateGuiValues = async (e: vscode.Uri) => {
    if (ConfserverProcess.exists() && !ConfserverProcess.isSavedByUI()) {
      ConfserverProcess.loadGuiConfigValues();
    }
    ConfserverProcess.resetSavedByUI();
    await getIdfTargetFromSdkconfig(workspaceRoot, statusBarItems["target"]);
  };
  const sdkCreateWatchDisposable = sdkconfigWatcher.onDidCreate(
    updateGuiValues
  );
  context.subscriptions.push(sdkCreateWatchDisposable);
  const sdkWatchDisposable = sdkconfigWatcher.onDidChange(updateGuiValues);
  context.subscriptions.push(sdkWatchDisposable);
  const sdkDeleteWatchDisposable = sdkconfigWatcher.onDidDelete(async () => {
    ConfserverProcess.dispose();
  });
  context.subscriptions.push(sdkDeleteWatchDisposable);

  vscode.window.onDidCloseTerminal(async (terminal: vscode.Terminal) => {});

  registerIDFCommand("espIdf.createFiles", async () => {
    const notificationMode = idfConf.readParameter(
      "idf.notificationMode",
      workspaceRoot
    ) as string;
    const ProgressLocation =
      notificationMode === idfConf.NotificationMode.All ||
      notificationMode === idfConf.NotificationMode.Notifications
        ? vscode.ProgressLocation.Notification
        : vscode.ProgressLocation.Window;
    PreCheck.perform([openFolderCheck], async () => {
      try {
        vscode.window.withProgress(
          {
            cancellable: true,
            location: ProgressLocation,
            title: "ESP-IDF: Creating ESP-IDF project...",
          },
          async (
            progress: vscode.Progress<{
              message: string;
              increment: number;
            }>,
            cancelToken: vscode.CancellationToken
          ) => {
            const projectDirOption = await vscode.window.showQuickPick(
              [
                {
                  label: vscode.l10n.t("Use current folder: {workspace}", {
                    workspace: workspaceRoot.fsPath,
                  }),
                  target: "current",
                },
                {
                  label: vscode.l10n.t("Choose a container directory..."),
                  target: "another",
                },
              ],
              { placeHolder: vscode.l10n.t("Select a directory to use") }
            );
            if (!projectDirOption) {
              return;
            }
            let projectDirToUse: string;
            if (projectDirOption.target === "another") {
              const newFolder = await vscode.window.showOpenDialog({
                canSelectFolders: true,
                canSelectFiles: false,
                canSelectMany: false,
              });
              if (!newFolder) {
                return;
              }
              projectDirToUse = newFolder[0].fsPath;
            } else {
              projectDirToUse = workspaceRoot.fsPath;
            }

            const selectedTemplate = await vscode.window.showQuickPick(
              utils.chooseTemplateDir(),
              { placeHolder: vscode.l10n.t("Select a template to use") }
            );
            if (!selectedTemplate) {
              return;
            }
            const resultFolder = path.join(
              projectDirToUse,
              selectedTemplate.target
            );
            const doesProjectExists = await pathExists(resultFolder);
            if (doesProjectExists) {
              Logger.infoNotify(`${resultFolder} already exists.`);
              return;
            }
            const projectPath = vscode.Uri.file(resultFolder);
            await utils.createSkeleton(projectPath, selectedTemplate.target);
            if (selectedTemplate.label === "arduino-as-component") {
              const gitPath =
                ((await idfConf.readParameter(
                  "idf.gitPath",
                  workspaceRoot
                )) as string) || "git";
              const idfPath = idfConf.readParameter(
                "idf.espIdfPath",
                workspaceRoot
              ) as string;
              const arduinoComponentManager = new ArduinoComponentInstaller(
                idfPath,
                resultFolder,
                gitPath
              );
              cancelToken.onCancellationRequested(() => {
                arduinoComponentManager.cancel();
              });
              await arduinoComponentManager.addArduinoAsComponent(idfPath);
            }
            vscode.commands.executeCommand(
              "vscode.openFolder",
              projectPath,
              true
            );
            const defaultFoldersMsg = vscode.l10n.t(
              "Template folders has been generated."
            );
            Logger.infoNotify(defaultFoldersMsg);
          }
        );
      } catch (error) {
        Logger.errorNotify(error.message, error, "extension createFiles");
      }
    });
  });

  registerIDFCommand("espIdf.fullClean", () => {
    PreCheck.perform([openFolderCheck], async () => {
      const buildDir = idfConf.readParameter(
        "idf.buildPath",
        workspaceRoot
      ) as string;
      const buildDirExists = await utils.dirExistPromise(buildDir);
      if (!buildDirExists) {
        const errStr = vscode.l10n.t(
          "There is no build directory to clean, exiting!"
        );
        OutputChannel.appendLineAndShow(errStr);
        return Logger.warnNotify(errStr);
      }
      if (ConfserverProcess.exists()) {
        const closingSDKConfigMsg = vscode.l10n.t(
          `Trying to delete the build folder. Closing existing SDK Configuration editor process...`
        );
        OutputChannel.init().appendLine(closingSDKConfigMsg);
        Logger.info(closingSDKConfigMsg);
        ConfserverProcess.dispose();
      }
      const cmakeCacheFile = path.join(buildDir, "CMakeCache.txt");
      const doesCmakeCacheExists = utils.canAccessFile(
        cmakeCacheFile,
        constants.R_OK
      );
      if (!doesCmakeCacheExists) {
        const errStr = vscode.l10n.t(
          `There is no CMakeCache.txt. Please try to delete the build directory manually.`
        );
        OutputChannel.appendLineAndShow(errStr);
        return Logger.warnNotify(errStr);
      }
      if (BuildTask.isBuilding || FlashTask.isFlashing) {
        const errStr = vscode.l10n.t(
          `There is a build or flash task running. Wait for it to finish or cancel them before clean.`
        );
        OutputChannel.appendLineAndShow(errStr);
        return Logger.warnNotify(errStr);
      }

      try {
        await del(buildDir, { force: true });
        const delComponentsOnFullClean = (await idfConf.readParameter(
          "idf.deleteComponentsOnFullClean",
          workspaceRoot
        )) as boolean;
        if (delComponentsOnFullClean) {
          const managedComponents = path.join(
            workspaceRoot.fsPath,
            "managed_components"
          );
          const componentDirExists = await pathExists(managedComponents);
          if (componentDirExists) {
            await del(managedComponents, { force: true });
          }
        }
        Logger.infoNotify(vscode.l10n.t("Build directory has been deleted."));
      } catch (error) {
        OutputChannel.appendLineAndShow(error.message);
        Logger.errorNotify(error.message, error, "extension fullClean");
      }
    });
  });

  registerIDFCommand("espIdf.eraseFlash", async () => {
    PreCheck.perform([webIdeCheck, openFolderCheck], async () => {
      if (IDFMonitor.terminal) {
        IDFMonitor.terminal.sendText(ESP.CTRL_RBRACKET);
      }
      const pythonBinPath = await getVirtualEnvPythonPath(workspaceRoot);
      const idfPathDir = idfConf.readParameter(
        "idf.espIdfPath",
        workspaceRoot
      ) as string;
      const port = idfConf.readParameter("idf.port", workspaceRoot) as string;
      const flashScriptPath = path.join(
        idfPathDir,
        "components",
        "esptool_py",
        "esptool",
        "esptool.py"
      );

      const notificationMode = idfConf.readParameter(
        "idf.notificationMode",
        workspaceRoot
      ) as string;
      const ProgressLocation =
        notificationMode === idfConf.NotificationMode.All ||
        notificationMode === idfConf.NotificationMode.Notifications
          ? vscode.ProgressLocation.Notification
          : vscode.ProgressLocation.Window;

      vscode.window.withProgress(
        {
          cancellable: true,
          location: ProgressLocation,
          title: vscode.l10n.t(
            "ESP-IDF: Erasing device flash memory (erase_flash)"
          ),
        },
        async (
          progress: vscode.Progress<{
            message: string;
            increment: number;
          }>,
          cancelToken: vscode.CancellationToken
        ) => {
          try {
            const args = [flashScriptPath, "-p", port, "erase_flash"];
            const result = await utils.execChildProcess(
              pythonBinPath,
              args,
              process.cwd(),
              OutputChannel.init(),
              null,
              cancelToken
            );
            OutputChannel.appendLine(result);
            Logger.infoNotify("Flash memory content has been erased.");
          } catch (error) {
            Logger.errorNotify(error.message, error, "extension eraseFlash");
          }
        }
      );
    });
  });

  registerIDFCommand("espIdf.addArduinoAsComponentToCurFolder", () => {
    PreCheck.perform([openFolderCheck], () => {
      const notificationMode = idfConf.readParameter(
        "idf.notificationMode",
        workspaceRoot
      ) as string;
      const ProgressLocation =
        notificationMode === idfConf.NotificationMode.All ||
        notificationMode === idfConf.NotificationMode.Notifications
          ? vscode.ProgressLocation.Notification
          : vscode.ProgressLocation.Window;
      vscode.window.withProgress(
        {
          cancellable: true,
          location: ProgressLocation,
          title: vscode.l10n.t("ESP-IDF: Arduino ESP32 as ESP-IDF component"),
        },
        async (
          progress: vscode.Progress<{
            message: string;
            increment: number;
          }>,
          cancelToken: vscode.CancellationToken
        ) => {
          try {
            const gitPath =
              (await idfConf.readParameter("idf.gitPath", workspaceRoot)) ||
              "git";
            const idfPath = idfConf.readParameter(
              "idf.espIdfPath",
              workspaceRoot
            ) as string;
            const arduinoComponentManager = new ArduinoComponentInstaller(
              idfPath,
              workspaceRoot.fsPath,
              gitPath
            );
            cancelToken.onCancellationRequested(() => {
              arduinoComponentManager.cancel();
            });
            const arduinoDirPath = path.join(
              workspaceRoot.fsPath,
              "components",
              "arduino"
            );
            const arduinoDirExists = await utils.dirExistPromise(
              arduinoDirPath
            );
            if (arduinoDirExists) {
              return Logger.infoNotify(
                vscode.l10n.t(`{arduinoDirPath} already exists.`, {
                  arduinoDirPath,
                })
              );
            }
            await arduinoComponentManager.addArduinoAsComponent();
          } catch (error) {
            Logger.errorNotify(
              error.message,
              error,
              "extension addArduinoAsComponentToCurFolder"
            );
          }
        }
      );
    });
  });

  registerIDFCommand("espIdf.getEspAdf", async () => getEspAdf(workspaceRoot));

  registerIDFCommand("espIdf.getEspMdf", async () => getEspMdf(workspaceRoot));

  registerIDFCommand("espIdf.getEspHomeKitSdk", async () =>
    getEspHomeKitSdk(workspaceRoot)
  );

  registerIDFCommand("espIdf.getEspMatter", async () => {
    if (process.platform === "win32") {
      return vscode.window.showInformationMessage(
        vscode.l10n.t(`ESP-Matter is not available for Windows.`)
      );
    }
    getEspMatter(workspaceRoot);
  });

  registerIDFCommand("espIdf.getEspRainmaker", async () =>
    getEspRainmaker(workspaceRoot)
  );

  registerIDFCommand("espIdf.setMatterDevicePath", async () => {
    if (process.platform === "win32") {
      return vscode.window.showInformationMessage(
        vscode.l10n.t(`ESP-Matter is not available for Windows.`)
      );
    }
    const configurationTarget = vscode.ConfigurationTarget.WorkspaceFolder;
    let workspaceFolder = await vscode.window.showWorkspaceFolderPick({
      placeHolder: vscode.l10n.t(
        `Pick Workspace Folder to which settings should be applied`
      ),
    });
    if (!workspaceFolder) {
      return;
    }
    const customMatterDevicePath = await vscode.window.showInputBox({
      placeHolder: vscode.l10n.t("Enter ESP_MATTER_DEVICE_PATH path"),
    });
    if (!customMatterDevicePath) {
      return;
    }
    const customVarsString = idfConf.readParameter(
      "idf.customExtraVars",
      workspaceFolder
    ) as { [key: string]: string };
    customVarsString["ESP_MATTER_DEVICE_PATH"] = customMatterDevicePath;
    await idfConf.writeParameter(
      "idf.customExtraVars",
      customVarsString,
      configurationTarget,
      workspaceFolder.uri
    );
    return vscode.window.showInformationMessage(
      vscode.l10n.t(
        `ESP_MATTER_DEVICE_PATH has been set in idf.customExtraVars configuration setting.`
      )
    );
  });

  registerIDFCommand("espIdf.selectPort", () => {
    PreCheck.perform([webIdeCheck, openFolderCheck], async () =>
      SerialPort.shared().promptUserToSelect(workspaceRoot)
    );
  });

  registerIDFCommand("espIdf.selectCurrentIdfVersion", () => {
    PreCheck.perform([openFolderCheck], async () => {
      const currentIdfSetup = await selectIdfSetup(
        workspaceRoot,
        statusBarItems["currentIdfVersion"]
      );
    });
  });

  registerIDFCommand("espIdf.idfReconfigureTask", async () => {
    const notificationMode = idfConf.readParameter(
      "idf.notificationMode",
      workspaceRoot
    ) as string;
    const ProgressLocation =
      notificationMode === idfConf.NotificationMode.All ||
      notificationMode === idfConf.NotificationMode.Notifications
        ? vscode.ProgressLocation.Notification
        : vscode.ProgressLocation.Window;
    await vscode.window.withProgress(
      {
        cancellable: false,
        location: ProgressLocation,
        title: "ESP-IDF: Project configuration",
      },
      async (
        progress: vscode.Progress<{ message: string; increment: number }>,
        cancelToken: vscode.CancellationToken
      ) => {
        try {
          const reconfigureTask = new IdfReconfigureTask(workspaceRoot);
          await reconfigureTask.reconfigure();
          await TaskManager.runTasks();
          if (!cancelToken.isCancellationRequested) {
            Logger.infoNotify("ESP-IDF Reconfigure Successfully");
            TaskManager.disposeListeners();
          }
        } catch (error) {
          const errMsg =
            error && error.message
              ? error.message
              : "Error trying to reconfigure the ESP-IDF project";
          Logger.errorNotify(errMsg, error, "extension idfReconfigureTask");
        }
      }
    );
  });

  registerIDFCommand("espIdf.customTask", async () => {
    try {
      const customTask = new CustomTask(workspaceRoot);
      await customTask.addCustomTask(CustomTaskType.Custom);
      await TaskManager.runTasks();
    } catch (error) {
      const errMsg =
        error && error.message ? error.message : "Error at custom task";
      Logger.errorNotify(errMsg, error, "extension customTask");
    }
  });

  registerIDFCommand("espIdf.pickAWorkspaceFolder", () => {
    PreCheck.perform([openFolderCheck], async () => {
      const selectCurrentFolderMsg = vscode.l10n.t(
        "Select your current folder"
      );
      try {
        const option = await vscode.window.showWorkspaceFolderPick({
          placeHolder: selectCurrentFolderMsg,
        });
        if (!option) {
          const noFolderMsg = vscode.l10n.t("No workspace selected.");
          Logger.infoNotify(noFolderMsg);
          return;
        }
        workspaceRoot = option.uri;
        await getIdfTargetFromSdkconfig(
          workspaceRoot,
          statusBarItems["target"]
        );
        if (statusBarItems && statusBarItems["port"]) {
          statusBarItems["port"].text =
            `$(${commandDictionary[CommandKeys.SelectSerialPort].iconId}) ` +
            idfConf.readParameter("idf.port", workspaceRoot);
        }
        updateIdfComponentsTree(workspaceRoot);
        const workspaceFolderInfo = {
          clickCommand: "espIdf.pickAWorkspaceFolder",
          currentWorkSpace: option.name,
          tooltip: option.uri.fsPath,
        };
        utils.updateStatus(statusBarItems["workspace"], workspaceFolderInfo);
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
        const currentIdfSetup = await getCurrentIdfSetup(workspaceRoot, false);
        if (statusBarItems["currentIdfVersion"]) {
          statusBarItems["currentIdfVersion"].text = currentIdfSetup.isValid
            ? `$(${
                commandDictionary[CommandKeys.SelectCurrentIdfVersion].iconId
              }) ESP-IDF v${currentIdfSetup.version}`
            : `$(${
                commandDictionary[CommandKeys.SelectCurrentIdfVersion].iconId
              }) ESP-IDF InvalidSetup`;
        }
        const debugAdapterConfig = {
          currentWorkspace: workspaceRoot,
        } as IDebugAdapterConfig;
        debugAdapterManager.configureAdapter(debugAdapterConfig);
        const openOCDConfig: IOpenOCDConfig = {
          workspace: workspaceRoot,
        } as IOpenOCDConfig;
        openOCDManager.configureServer(openOCDConfig);
        ConfserverProcess.dispose();
        const coverageOptions = getCoverageOptions(workspaceRoot);
        covRenderer = new CoverageRenderer(workspaceRoot, coverageOptions);
      } catch (error) {
        Logger.errorNotify(
          error.message,
          error,
          "extension pickAWorkspaceFolder"
        );
      }
    });
  });

  registerIDFCommand("espIdf.selectConfTarget", async () => {
    await idfConf.chooseConfigurationTarget();
  });

  registerIDFCommand("espIdf.selectNotificationMode", async () => {
    const notificationTarget = await vscode.window.showQuickPick(
      [
        {
          description: vscode.l10n.t(
            "Show no notifications and do not focus tasks output."
          ),
          label: "Silent",
          target: "Silent",
        },
        {
          description: vscode.l10n.t(
            "Show notifications but do not focus tasks output."
          ),
          label: "Notifications",
          target: "Notifications",
        },
        {
          description: vscode.l10n.t(
            "Do not show notifications but focus tasks output."
          ),
          label: "Output",
          target: "Output",
        },
        {
          description: vscode.l10n.t(
            "Show notifications and focus tasks output."
          ),
          label: "All",
          target: "All",
        },
      ],
      { placeHolder: vscode.l10n.t("Select the output and notification mode") }
    );
    if (!notificationTarget) {
      return;
    }
    const saveScope = idfConf.readParameter("idf.saveScope");

    await idfConf.writeParameter(
      "idf.notificationMode",
      notificationTarget.target,
      saveScope,
      workspaceRoot
    );
    Logger.infoNotify(
      vscode.l10n.t(`Notification mode has changed to {mode}`, {
        mode: notificationTarget.label,
      })
    );
  });

  registerIDFCommand("espIdf.clearSavedIdfSetups", async () => {
    await clearPreviousIdfSetups();
  });

  registerIDFCommand("espIdf.rmProjectConfStatusBar", async () => {
    if (statusBarItems["projectConf"]) {
      statusBarItems["projectConf"].dispose();
      statusBarItems["projectConf"] = undefined;
    }
  });

  registerIDFCommand("espIdf.projectConfigurationEditor", async () => {
    PreCheck.perform([openFolderCheck], async () => {
      try {
        if (projectConfigurationPanel.isCreatedAndHidden()) {
          projectConfigurationPanel.createOrShow(
            context.extensionPath,
            workspaceRoot
          );
          return;
        }
        const notificationMode = idfConf.readParameter(
          "idf.notificationMode",
          workspaceRoot
        ) as string;
        const ProgressLocation =
          notificationMode === idfConf.NotificationMode.All ||
          notificationMode === idfConf.NotificationMode.Notifications
            ? vscode.ProgressLocation.Notification
            : vscode.ProgressLocation.Window;
        await vscode.window.withProgress(
          {
            cancellable: false,
            location: ProgressLocation,
            title: "ESP-IDF: Project configuration",
          },
          async (
            progress: vscode.Progress<{ message: string; increment: number }>
          ) => {
            try {
              projectConfigurationPanel.createOrShow(
                context.extensionPath,
                workspaceRoot
              );
            } catch (error) {
              Logger.errorNotify(
                error.message,
                error,
                "extension projectConfigurationEditor"
              );
            }
          }
        );
      } catch (error) {
        Logger.errorNotify(
          error.message,
          error,
          "extension projectConfigurationEditor"
        );
      }
    });
  });

  registerIDFCommand("espIdf.projectConf", async () => {
    PreCheck.perform([openFolderCheck], async () => {
      const projectConfigurations = await getProjectConfigurationElements(
        workspaceRoot
      );
      if (!projectConfigurations) {
        const emptyOption = await vscode.window.showInformationMessage(
          vscode.l10n.t("No project configuration found"),
          "Open editor"
        );
        if (emptyOption === "Open editor") {
          vscode.commands.executeCommand("espIdf.projectConfigurationEditor");
        }
        return;
      }
      const selectConfigMsg = vscode.l10n.t("Select configuration to use:");
      let quickPickItems = Object.keys(projectConfigurations).map((k) => {
        return {
          description: k,
          label: `Configuration ${k}`,
          target: k,
        };
      });
      const option = await vscode.window.showQuickPick(quickPickItems, {
        placeHolder: selectConfigMsg,
      });
      if (!option) {
        const noOptionMsg = vscode.l10n.t("No option selected.");
        Logger.infoNotify(noOptionMsg);
        return;
      }
      ESP.ProjectConfiguration.store.set(
        ESP.ProjectConfiguration.SELECTED_CONFIG,
        option.target
      );
      ESP.ProjectConfiguration.store.set(
        option.target,
        projectConfigurations[option.target]
      );
      if (statusBarItems["projectConf"]) {
        statusBarItems["projectConf"].dispose();
      }
      statusBarItems["projectConf"] = createStatusBarItem(
        `$(${
          commandDictionary[CommandKeys.SelectProjectConfiguration].iconId
        }) ${option.target}`,
        commandDictionary[CommandKeys.SelectProjectConfiguration].tooltip,
        CommandKeys.SelectProjectConfiguration,
        99,
        commandDictionary[CommandKeys.SelectProjectConfiguration].checkboxState
      );
      await getIdfTargetFromSdkconfig(workspaceRoot, statusBarItems["target"]);
      await utils.setCCppPropertiesJsonCompileCommands(workspaceRoot);
      ConfserverProcess.dispose();
    });
  });

  vscode.workspace.onDidChangeConfiguration(async (e) => {
    const winFlag = process.platform === "win32" ? "Win" : "";
    if (e.affectsConfiguration("idf.enableStatusBar")) {
      const enableStatusBar = idfConf.readParameter(
        "idf.enableStatusBar",
        workspaceRoot
      ) as boolean;
      if (enableStatusBar) {
        await createCmdsStatusBarItems(workspaceRoot);
      } else if (!enableStatusBar) {
        for (let statusItem in statusBarItems) {
          statusBarItems[statusItem].dispose();
          statusBarItems[statusItem] = undefined;
        }
      }
    } else if (e.affectsConfiguration("idf.espIdfPath" + winFlag)) {
      ESP.URL.Docs.IDF_INDEX = undefined;
    } else if (e.affectsConfiguration("idf.port" + winFlag)) {
      if (statusBarItems && statusBarItems["port"]) {
        statusBarItems["port"].text =
          `$(${commandDictionary[CommandKeys.SelectSerialPort].iconId}) ` +
          idfConf.readParameter("idf.port", workspaceRoot);
      }
    } else if (e.affectsConfiguration("idf.flashType")) {
      let flashType = idfConf.readParameter(
        "idf.flashType",
        workspaceRoot
      ) as string;
      if (statusBarItems && statusBarItems["flashType"]) {
        statusBarItems["flashType"].text = `$(${
          commandDictionary[CommandKeys.SelectFlashType].iconId
        }) ${flashType}`;
      }
    } else if (e.affectsConfiguration("idf.buildPath")) {
      updateIdfComponentsTree(workspaceRoot);
    }
  });

  const debugProvider = new IdfDebugConfigurationProvider();
  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider("espidf", debugProvider)
  );

  const cdtDebugProvider = new CDTDebugConfigurationProvider();
  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider(
      "gdbtarget",
      cdtDebugProvider
    )
  );

  context.subscriptions.push(
    vscode.debug.registerDebugAdapterDescriptorFactory(
      "gdbtarget",
      new CDTDebugAdapterDescriptorFactory()
    )
  );

  vscode.debug.registerDebugAdapterDescriptorFactory("espidf", {
    async createDebugAdapterDescriptor(session: vscode.DebugSession) {
      try {
        const portToUse = session.configuration.debugPort || DEBUG_DEFAULT_PORT;
        const launchMode = session.configuration.mode || "auto";
        const useMonitorWithDebug = idfConf.readParameter(
          "idf.launchMonitorOnDebugSession",
          workspaceRoot
        );
        if (
          session.configuration.sessionID !== "core-dump.debug.session.ws" &&
          useMonitorWithDebug
        ) {
          await createNewIdfMonitor(workspaceRoot, true);
        }
        if (
          launchMode === "auto" &&
          !openOCDManager.isRunning() &&
          session.configuration.sessionID !== "core-dump.debug.session.ws"
        ) {
          isOpenOCDLaunchedByDebug = true;
          await openOCDManager.start();
        }
        if (session.configuration.sessionID === "qemu.debug.session") {
          const debugAdapterConfig = {
            appOffset: session.configuration.appOffset,
            elfFile: session.configuration.elfFilePath,
            debugAdapterPort: portToUse,
            tmoScaleFactor: session.configuration.tmoScaleFactor,
          } as IDebugAdapterConfig;
          debugAdapterManager.configureAdapter(debugAdapterConfig);
          await debugAdapterManager.start();
        }
        if (session.configuration.sessionID === "core-dump.debug.session.ws") {
          await debugAdapterManager.start();
        }
        if (launchMode === "auto" && !debugAdapterManager.isRunning()) {
          const debugAdapterConfig = {
            appOffset: session.configuration.appOffset,
            debugAdapterPort: portToUse,
            elfFile: session.configuration.elfFilePath,
            env: session.configuration.env,
            gdbinitFilePath: session.configuration.gdbinitFile,
            initGdbCommands: session.configuration.initGdbCommands || [],
            tmoScaleFactor: session.configuration.tmoScaleFactor,
            isPostMortemDebugMode: false,
            isOocdDisabled: false,
            logLevel: session.configuration.logLevel,
          } as IDebugAdapterConfig;
          debugAdapterManager.configureAdapter(debugAdapterConfig);
          await debugAdapterManager.start();
        }
        return new vscode.DebugAdapterServer(portToUse);
      } catch (error) {
        const errMsg =
          error && error.message
            ? error.message
            : "Error starting ESP-IDF Debug Adapter";
        return Logger.errorNotify(
          errMsg,
          error,
          "extension createDebugAdapterDescriptor espidf"
        );
      }
    },
  });

  vscode.debug.onDidStartDebugSession(async (session) => {
    const svdFile = idfConf.readParameter(
      "idf.svdFilePath",
      workspaceRoot
    ) as string;
    peripheralTreeProvider.debugSessionStarted(session, svdFile, 16); // Move svdFile and threshold as conf settings
    if (
      openOCDManager.isRunning() &&
      session.type === "gdbtarget" &&
      session.configuration.sessionID !== "core-dump.debug.session.ws" &&
      session.configuration.sessionID !== "gdbstub.debug.session.ws"
    ) {
      isOpenOCDLaunchedByDebug = true;
    }
    isDebugRestarted = false;
  });

  vscode.debug.registerDebugAdapterTrackerFactory("gdbtarget", {
    createDebugAdapterTracker(session: vscode.DebugSession) {
      return {
        onDidSendMessage: async (m) => {
          if (m && m.type === "event" && m.event === "stopped") {
            const peripherals = await peripheralTreeProvider.getChildren();
            for (const p of peripherals) {
              p.getPeripheral().updateData();
            }
            peripheralTreeProvider.refresh();
          }

          if (
            m &&
            m.type === "event" &&
            m.event === "output" &&
            m.body.output.indexOf(
              `From client: disconnect({"restart":true})`
            ) !== -1
          ) {
            isDebugRestarted = true;
          }
        },
      };
    },
  });

  vscode.debug.onDidTerminateDebugSession((session) => {
    peripheralTreeProvider.debugSessionTerminated(session);
  });

  vscode.debug.registerDebugAdapterTrackerFactory("espidf", {
    createDebugAdapterTracker(session: vscode.DebugSession) {
      return {
        onWillReceiveMessage: (m) => {},
      };
    },
  });

  registerIDFCommand("espIdf.genCoverage", () => {
    return PreCheck.perform([openFolderCheck], async () => {
      try {
        await covRenderer.renderCoverage();
      } catch (e) {
        const msg = e && e.message ? e.message : e;
        Logger.errorNotify(
          "Error building gcov data from gcda files.\nCheck the ESP-IDF output for more details.",
          e,
          "extension genCoverage"
        );
        OutputChannel.appendLine(
          msg +
            "\nError building gcov data from gcda files.\n\n" +
            "Review the code coverage tutorial https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/additionalfeatures/coverage.html \n" +
            "or ESP-IDF documentation: https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/app_trace.html#gcov-source-code-coverage \n"
        );
      }
    });
  });

  registerIDFCommand("espIdf.removeCoverage", () => {
    return PreCheck.perform([openFolderCheck], async () => {
      await covRenderer.removeCoverage();
    });
  });

  registerIDFCommand("espIdf.getCoverageReport", () => {
    return PreCheck.perform([openFolderCheck], async () => {
      await previewReport(workspaceRoot);
    });
  });

  registerIDFCommand("espIdf.getProjectName", () => {
    return PreCheck.perform([openFolderCheck], async () => {
      const buildDirPath = idfConf.readParameter(
        "idf.buildPath",
        workspaceRoot
      ) as string;
      return await getProjectName(buildDirPath);
    });
  });

  registerIDFCommand("espIdf.searchInEspIdfDocs", async () => {
    const notificationMode = idfConf.readParameter(
      "idf.notificationMode",
      workspaceRoot
    ) as string;
    const ProgressLocation =
      notificationMode === idfConf.NotificationMode.All ||
      notificationMode === idfConf.NotificationMode.Notifications
        ? vscode.ProgressLocation.Notification
        : vscode.ProgressLocation.Window;
    vscode.window.withProgress(
      {
        cancellable: true,
        location: ProgressLocation,
        title: "ESP-IDF: Documentation search results",
      },
      async () => {
        try {
          const currentEditor = vscode.window.activeTextEditor;
          if (!currentEditor) {
            return;
          }
          let selection = currentEditor.document.getText(
            currentEditor.selection
          );
          if (!selection) {
            const range = currentEditor.document.getWordRangeAtPosition(
              currentEditor.selection.active
            );
            selection = currentEditor.document.getText(range);
          }
          const searchResults = await seachInEspDocs(selection, workspaceRoot);
          espIdfDocsResultTreeDataProvider.getResults(
            searchResults,
            idfSearchResults
          );
        } catch (error) {
          const errMsg = error.message || "Error searching in ESP-IDF docs";
          Logger.errorNotify(errMsg, error, "extension searchInEspIdfDocs");
          return;
        }
      }
    );
  });

  registerIDFCommand("espIdf.installPyReqs", () => {
    return PreCheck.perform([openFolderCheck], async () => {
      const notificationMode = idfConf.readParameter(
        "idf.notificationMode",
        workspaceRoot
      ) as string;
      const ProgressLocation =
        notificationMode === idfConf.NotificationMode.All ||
        notificationMode === idfConf.NotificationMode.Notifications
          ? vscode.ProgressLocation.Notification
          : vscode.ProgressLocation.Window;
      vscode.window.withProgress(
        {
          cancellable: true,
          location: ProgressLocation,
          title: "ESP-IDF: Installing Python requirements",
        },
        async (
          progress: vscode.Progress<{ message: string; increment?: number }>,
          cancelToken: vscode.CancellationToken
        ) => {
          try {
            const espIdfPath = idfConf.readParameter(
              "idf.espIdfPath",
              workspaceRoot
            ) as string;
            const containerPath =
              process.platform === "win32"
                ? process.env.USERPROFILE
                : process.env.HOME;
            const confToolsPath = idfConf.readParameter(
              "idf.toolsPath",
              workspaceRoot
            ) as string;
            const toolsPath =
              confToolsPath ||
              process.env.IDF_TOOLS_PATH ||
              path.join(containerPath, ".espressif");
            const pyPath = await getVirtualEnvPythonPath(workspaceRoot);
            progress.report({
              message: vscode.l10n.t(
                `Installing ESP-IDF extension Python Requirements...`
              ),
            });
            await installExtensionPyReqs(
              pyPath,
              espIdfPath,
              toolsPath,
              undefined
            );
            vscode.window.showInformationMessage(
              vscode.l10n.t("ESP-IDF Python Requirements has been installed")
            );
          } catch (error) {
            const msg = error.message
              ? error.message
              : typeof error === "string"
              ? error
              : "Error installing Python requirements";
            Logger.errorNotify(msg, error, "extension installPyReqs");
          }
        }
      );
    });
  });

  registerIDFCommand("espIdf.installEspMatterPyReqs", () => {
    if (process.platform === "win32") {
      return vscode.window.showInformationMessage(
        vscode.l10n.t(`ESP-Matter is not available for Windows.`)
      );
    }
    return PreCheck.perform([openFolderCheck], async () => {
      const notificationMode = idfConf.readParameter(
        "idf.notificationMode",
        workspaceRoot
      ) as string;
      const ProgressLocation =
        notificationMode === idfConf.NotificationMode.All ||
        notificationMode === idfConf.NotificationMode.Notifications
          ? vscode.ProgressLocation.Notification
          : vscode.ProgressLocation.Window;
      vscode.window.withProgress(
        {
          cancellable: true,
          location: ProgressLocation,
          title: "ESP-IDF:",
        },
        async (
          progress: vscode.Progress<{ message: string; increment?: number }>,
          cancelToken: vscode.CancellationToken
        ) => {
          try {
            const espIdfPath = idfConf.readParameter(
              "idf.espIdfPath",
              workspaceRoot
            ) as string;
            const containerPath =
              process.platform === "win32"
                ? process.env.USERPROFILE
                : process.env.HOME;
            const confToolsPath = idfConf.readParameter(
              "idf.toolsPath",
              workspaceRoot
            ) as string;
            const toolsPath =
              confToolsPath ||
              process.env.IDF_TOOLS_PATH ||
              path.join(containerPath, ".espressif");
            const espMatterPath = idfConf.readParameter(
              "idf.espMatterPath",
              workspaceRoot
            ) as string;
            const pyPath = await getVirtualEnvPythonPath(workspaceRoot);
            progress.report({
              message: vscode.l10n.t(
                `Installing ESP-Matter Python Requirements...`
              ),
            });
            await installEspMatterPyReqs(
              espIdfPath,
              toolsPath,
              espMatterPath,
              pyPath,
              undefined,
              cancelToken
            );

            vscode.window.showInformationMessage(
              vscode.l10n.t(
                "ESP-Matter Python Requirements have been installed"
              )
            );
          } catch (error) {
            const msg = error.message
              ? error.message
              : typeof error === "string"
              ? error
              : "Error installing ESP-Matter Python Requirements";
            Logger.errorNotify(msg, error, "extension installEspMatterPyReqs");
          }
        }
      );
    });
  });

  registerIDFCommand("espIdf.unitTest.installPyTest", () => {
    return PreCheck.perform([openFolderCheck], async () => {
      try {
        const isPyTestInstalled = await checkPytestRequirements(workspaceRoot);
        if (isPyTestInstalled) {
          return Logger.infoNotify(
            vscode.l10n.t("PyTest python packages are already installed.")
          );
        }
      } catch (error) {
        const msg =
          error && error.message
            ? error.message
            : "Error checking PyTest python packages";
        OutputChannel.appendLine(msg, "idf-unit-test");
        Logger.error(msg, error, "extension checkPytestRequirements");
      }

      const notificationMode = idfConf.readParameter(
        "idf.notificationMode",
        workspaceRoot
      ) as string;
      const ProgressLocation =
        notificationMode === idfConf.NotificationMode.All ||
        notificationMode === idfConf.NotificationMode.Notifications
          ? vscode.ProgressLocation.Notification
          : vscode.ProgressLocation.Window;
      vscode.window.withProgress(
        {
          cancellable: true,
          location: ProgressLocation,
          title: "ESP-IDF:",
        },
        async (
          progress: vscode.Progress<{ message: string; increment?: number }>,
          cancelToken: vscode.CancellationToken
        ) => {
          try {
            await installPyTestPackages(workspaceRoot, cancelToken);
          } catch (error) {
            const msg =
              error && error.message
                ? error.message
                : "Error installing PyTest python packages";
            OutputChannel.appendLine(msg, "idf-unit-test");
            Logger.error(msg, error, "extension installPyTestPackages");
          }
        }
      );
    });
  });

  registerIDFCommand("espIdf.unitTest.buildFlashUnitTestApp", () => {
    return PreCheck.perform([openFolderCheck], async () => {
      const notificationMode = idfConf.readParameter(
        "idf.notificationMode",
        workspaceRoot
      ) as string;
      const ProgressLocation =
        notificationMode === idfConf.NotificationMode.All ||
        notificationMode === idfConf.NotificationMode.Notifications
          ? vscode.ProgressLocation.Notification
          : vscode.ProgressLocation.Window;
      vscode.window.withProgress(
        {
          cancellable: true,
          location: ProgressLocation,
          title: vscode.l10n.t("ESP-IDF: Building unit test app and flashing"),
        },
        async (
          progress: vscode.Progress<{ message: string; increment?: number }>,
          cancelToken: vscode.CancellationToken
        ) => {
          try {
            let unitTestAppUri = vscode.Uri.joinPath(
              workspaceRoot,
              "unity-app"
            );
            const doesUnitTestAppExists = await pathExists(
              unitTestAppUri.fsPath
            );
            if (!doesUnitTestAppExists) {
              const unitTestFiles = await getFileList();
              const testComponents = await getTestComponents(unitTestFiles);
              unitTestAppUri = await copyTestAppProject(
                workspaceRoot,
                testComponents
              );
            }
            await buildFlashTestApp(unitTestAppUri, cancelToken);
          } catch (error) {
            const msg =
              error && error.message
                ? error.message
                : "Error build or flashing PyTest Unit App for project";
            OutputChannel.appendLine(msg, "idf-unit-test");
            Logger.error(msg, error, "extension buildFlashTestApp");
          }
        }
      );
    });
  });

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

  registerIDFCommand("espIdf.createVsCodeFolder", () => {
    PreCheck.perform([openFolderCheck], async () => {
      try {
        await utils.createVscodeFolder(workspaceRoot);
        Logger.infoNotify(
          vscode.l10n.t("ESP-IDF vscode files have been added to the project.")
        );
      } catch (error) {
        const errMsg = error.message || "Error creating .vscode folder";
        Logger.errorNotify(errMsg, error, "extension createVsCodeFolder");
        return;
      }
    });
  });

  registerIDFCommand("espIdf.createDevContainer", () => {
    PreCheck.perform([openFolderCheck], async () => {
      try {
        await utils.createDevContainer(workspaceRoot.fsPath);
        Logger.infoNotify(
          vscode.l10n.t(
            "ESP-IDF container files have been added to the project."
          )
        );
      } catch (error) {
        const errMsg = error.message || "Error creating .devcontainer folder";
        Logger.errorNotify(errMsg, error, "extension createDevContainer");
        return;
      }
    });
  });

  registerIDFCommand("espIdf.createNewComponent", async () => {
    PreCheck.perform([openFolderCheck], async () => {
      try {
        const componentName = await vscode.window.showInputBox({
          placeHolder: vscode.l10n.t("Enter ESP-IDF component name"),
          value: "",
        });
        if (!componentName) {
          return;
        }
        await utils.createNewComponent(componentName, workspaceRoot.fsPath);
        Logger.infoNotify(
          vscode.l10n.t(
            `The ESP-IDF component {componentName} has been created`,
            { componentName }
          )
        );
      } catch (error) {
        const errMsg = error.message || "Error creating ESP-IDF component";
        return Logger.errorNotify(
          errMsg,
          error,
          "extension createNewComponent"
        );
      }
    });
  });

  registerIDFCommand("espIdf.createIdfTerminal", createIdfTerminal);
  registerIDFCommand("espIdf.jtag_flash", () =>
    flash(false, ESP.FlashType.JTAG)
  );
  registerIDFCommand("espIdf.flashDFU", () => flash(false, ESP.FlashType.DFU));
  registerIDFCommand("espIdf.flashUart", async () => {
    const isEncrypted = await isFlashEncryptionEnabled(workspaceRoot);
    return flash(isEncrypted, ESP.FlashType.UART);
  });
  registerIDFCommand("espIdf.buildDFU", () => build(ESP.FlashType.DFU));
  registerIDFCommand("espIdf.flashDevice", async () => {
    const isEncrypted = await isFlashEncryptionEnabled(workspaceRoot);
    return flash(isEncrypted);
  });
  registerIDFCommand("espIdf.flashAndEncryptDevice", () => flash(true));
  registerIDFCommand("espIdf.buildDevice", build);
  registerIDFCommand("espIdf.monitorDevice", createMonitor);
  registerIDFCommand("espIdf.buildFlashMonitor", buildFlashAndMonitor);
  registerIDFCommand("espIdf.monitorQemu", createQemuMonitor);

  registerIDFCommand("espIdf.menuconfig.start", async () => {
    PreCheck.perform([openFolderCheck], () => {
      try {
        if (ConfserverProcess.exists()) {
          ConfserverProcess.loadExistingInstance();
          return;
        }
        const isIdfProject = utils.checkIsProjectCmakeLists(
          workspaceRoot.fsPath
        );
        if (!isIdfProject) {
          Logger.infoNotify(
            vscode.l10n.t("The current directory is not an ESP-IDF project.")
          );
          return;
        }
        const notificationMode = idfConf.readParameter(
          "idf.notificationMode",
          workspaceRoot
        ) as string;
        const ProgressLocation =
          notificationMode === idfConf.NotificationMode.All ||
          notificationMode === idfConf.NotificationMode.Notifications
            ? vscode.ProgressLocation.Notification
            : vscode.ProgressLocation.Window;
        vscode.window.withProgress(
          {
            cancellable: true,
            location: ProgressLocation,
            title: vscode.l10n.t("ESP-IDF: SDK Configuration Editor"),
          },
          async (
            progress: vscode.Progress<{ message: string; increment: number }>,
            cancelToken: vscode.CancellationToken
          ) => {
            try {
              ConfserverProcess.registerProgress(progress);
              cancelToken.onCancellationRequested(() => {
                ConfserverProcess.dispose();
              });
              await ConfserverProcess.init(
                workspaceRoot,
                context.extensionPath
              );
            } catch (error) {
              Logger.errorNotify(
                error.message,
                error,
                "extension menuconfig confserver init"
              );
            }
          }
        );
      } catch (error) {
        Logger.errorNotify(error.message, error, "extension menuconfig start");
      }
    });
  });

  registerIDFCommand("espIdf.saveDefSdkconfig", async () => {
    const idfVersionCheck = await minIdfVersionCheck("5.0", workspaceRoot);
    PreCheck.perform([idfVersionCheck, openFolderCheck], () => {
      vscode.window.withProgress(
        {
          cancellable: true,
          location: vscode.ProgressLocation.Notification,
          title: vscode.l10n.t(
            "ESP-IDF: Save Default Configuration (save-defconfig)"
          ),
        },
        async (
          progress: vscode.Progress<{ message: string; increment: number }>,
          cancelToken: vscode.CancellationToken
        ) => {
          try {
            await saveDefSdkconfig(workspaceRoot, cancelToken);
          } catch (error) {
            Logger.errorNotify(
              error.message,
              error,
              "extension saveDefSdkconfig"
            );
          }
        }
      );
    });
  });

  registerIDFCommand("espIdf.disposeConfserverProcess", () => {
    try {
      if (ConfserverProcess.exists()) {
        ConfserverProcess.dispose();
      }
    } catch (error) {
      Logger.errorNotify(
        error.message,
        error,
        "extension disposeConfserverProcess"
      );
    }
  });

  registerIDFCommand("espIdf.setTarget", () => {
    PreCheck.perform([openFolderCheck], async () => {
      const enterDeviceTargetMsg = vscode.l10n.t(
        "Enter target name (IDF_TARGET)"
      );
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(
        workspaceRoot
      );
      await setIdfTarget(enterDeviceTargetMsg, workspaceFolder);
      await getIdfTargetFromSdkconfig(workspaceRoot, statusBarItems["target"]);
    });
  });

  registerIDFCommand("espIdf.setup.start", (setupArgs?: ISetupInitArgs) => {
    PreCheck.perform([webIdeCheck], async () => {
      try {
        if (SetupPanel.isCreatedAndHidden()) {
          SetupPanel.createOrShow(context);
          return;
        }
        const notificationMode = idfConf.readParameter(
          "idf.notificationMode",
          workspaceRoot
        ) as string;
        const ProgressLocation =
          notificationMode === idfConf.NotificationMode.All ||
          notificationMode === idfConf.NotificationMode.Notifications
            ? vscode.ProgressLocation.Notification
            : vscode.ProgressLocation.Window;
        await vscode.window.withProgress(
          {
            cancellable: false,
            location: ProgressLocation,
            title: vscode.l10n.t("ESP-IDF: Configure ESP-IDF extension"),
          },
          async (
            progress: vscode.Progress<{ message: string; increment: number }>
          ) => {
            try {
              setupArgs = setupArgs
                ? setupArgs
                : await getSetupInitialValues(
                    context.extensionPath,
                    progress,
                    workspaceRoot
                  );
              setupArgs.espIdfStatusBar = statusBarItems["currentIdfVersion"];
              SetupPanel.createOrShow(context, setupArgs);
            } catch (error) {
              Logger.errorNotify(
                error.message,
                error,
                "extension setup getSetupInitialValues"
              );
            }
          }
        );
      } catch (error) {
        Logger.errorNotify(error.message, error, "extension setup");
      }
    });
  });

  registerIDFCommand("espIdf.examples.start", async () => {
    try {
      const notificationMode = idfConf.readParameter(
        "idf.notificationMode",
        workspaceRoot
      ) as string;
      const ProgressLocation =
        notificationMode === idfConf.NotificationMode.All ||
        notificationMode === idfConf.NotificationMode.Notifications
          ? vscode.ProgressLocation.Notification
          : vscode.ProgressLocation.Window;
      vscode.window.withProgress(
        {
          cancellable: false,
          location: ProgressLocation,
          title: vscode.l10n.t("ESP-IDF: Loading examples"),
        },
        async (
          progress: vscode.Progress<{ message: string; increment: number }>
        ) => {
          try {
            const pickItems = await getFrameworksPickItems();
            if (!pickItems || pickItems.length == 0) {
              return Logger.infoNotify(
                vscode.l10n.t("No ESP-IDF frameworks found")
              );
            }
            const examplesFolder = await vscode.window.showQuickPick(
              pickItems,
              {
                placeHolder: vscode.l10n.t("Select framework to use"),
              }
            );
            if (!examplesFolder) {
              Logger.infoNotify(
                vscode.l10n.t("No framework selected to load examples.")
              );
              return;
            }
            const doesFolderExist = await utils.dirExistPromise(
              examplesFolder.target
            );
            if (!doesFolderExist) {
              Logger.infoNotify(`${examplesFolder.target} doesn't exist.`);
              return;
            }
            ExamplesPlanel.createOrShow(
              context.extensionPath,
              examplesFolder.target,
              examplesFolder.description,
              examplesFolder.idfSetup
            );
          } catch (error) {
            Logger.errorNotify(
              error.message,
              error,
              "extension examples create show"
            );
          }
        }
      );
    } catch (error) {
      Logger.errorNotify(error.message, error, "extension examples");
    }
  });

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
      WelcomePanel.createOrShow(context.extensionPath);
      return;
    }
    const notificationMode = idfConf.readParameter(
      "idf.notificationMode",
      workspaceRoot
    ) as string;
    const ProgressLocation =
      notificationMode === idfConf.NotificationMode.All ||
      notificationMode === idfConf.NotificationMode.Notifications
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
          const welcomeArgs = await getWelcomePageInitialValues(
            progress,
            workspaceRoot
          );
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

  registerIDFCommand("espIdf.newProject.start", () => {
    if (NewProjectPanel.isCreatedAndHidden()) {
      NewProjectPanel.createOrShow(context.extensionPath);
      return;
    }
    const notificationMode = idfConf.readParameter(
      "idf.notificationMode",
      workspaceRoot
    ) as string;
    const ProgressLocation =
      notificationMode === idfConf.NotificationMode.All ||
      notificationMode === idfConf.NotificationMode.Notifications
        ? vscode.ProgressLocation.Notification
        : vscode.ProgressLocation.Window;
    vscode.window.withProgress(
      {
        cancellable: false,
        location: ProgressLocation,
        title: "ESP-IDF: New project",
      },
      async (
        progress: vscode.Progress<{ increment: number; message: string }>,
        cancelToken: vscode.CancellationToken
      ) => {
        try {
          const newProjectArgs = await getNewProjectArgs(
            context.extensionPath,
            progress,
            workspaceRoot
          );
          if (!newProjectArgs || !newProjectArgs.boards) {
            throw new Error("Could not get ESP-IDF: New project arguments");
          }
          NewProjectPanel.createOrShow(context.extensionPath, newProjectArgs);
        } catch (error) {
          Logger.errorNotify(error.message, error, "extension newProject");
        }
      }
    );
  });

  registerIDFCommand("espIdf.openIdfDocument", (docUri: vscode.Uri) => {
    vscode.workspace.openTextDocument(docUri.fsPath).then((doc) => {
      vscode.window.showTextDocument(doc, vscode.ViewColumn.One, true);
    });
  });

  registerIDFCommand("espIdf.getExtensionPath", () => {
    return context.extensionPath;
  });

  registerIDFCommand("espIdf.getOpenOcdConfigs", () => {
    const openOcfConfigs = idfConf.readParameter(
      "idf.openOcdConfigs",
      workspaceRoot
    );
    let result = "";
    openOcfConfigs.forEach((configFile) => {
      result = result + " -f " + configFile;
    });
    return result.trim();
  });

  registerIDFCommand("espIdf.selectOpenOcdConfigFiles", async () => {
    try {
      const openOcdScriptsPath = await getOpenOcdScripts(workspaceRoot);
      let idfTarget = await getIdfTargetFromSdkconfig(workspaceRoot);
      if (!idfTarget) {
        vscode.commands.executeCommand("espIdf.setTarget");
        return;
      }
      const boards = await getBoards(openOcdScriptsPath, idfTarget);
      const choices = boards.map((b) => {
        return {
          description: `${b.description} (${b.configFiles})`,
          label: b.name,
          target: b,
        };
      });
      const selectOpenOCdConfigsMsg = vscode.l10n.t(
        "Enter OpenOCD Configuration File Paths list"
      );
      const selectedBoard = await vscode.window.showQuickPick(choices, {
        placeHolder: selectOpenOCdConfigsMsg,
      });
      if (!selectedBoard) {
        return;
      }

      if (selectedBoard.target.name.indexOf("Custom board") !== -1) {
        const inputBoard = await vscode.window.showInputBox({
          placeHolder: vscode.l10n.t(
            "Enter comma separated configuration files"
          ),
          value: selectedBoard.target.configFiles.join(","),
        });
        if (inputBoard) {
          selectedBoard.target.configFiles = inputBoard.split(",");
        }
      }

      const target = idfConf.readParameter("idf.saveScope");
      if (
        !PreCheck.isWorkspaceFolderOpen() &&
        target !== vscode.ConfigurationTarget.Global
      ) {
        const noWsOpenMSg = vscode.l10n.t(`Open a workspace or folder first.`);
        Logger.warnNotify(noWsOpenMSg);
        throw new Error(noWsOpenMSg);
      }
      await idfConf.writeParameter(
        "idf.openOcdConfigs",
        selectedBoard.target.configFiles,
        target
      );
      Logger.infoNotify(
        vscode.l10n.t("OpenOCD Board configuration files are updated.")
      );
    } catch (error) {
      const errMsg =
        error.message || "Failed to select openOCD configuration files";
      Logger.errorNotify(errMsg, error, "extension selectOpenOcdConfigFiles");
      return;
    }
  });

  registerIDFCommand("espIdf.getOpenOcdScriptValue", async () => {
    return await getOpenOcdScripts(workspaceRoot);
  });

  registerIDFCommand("espIdf.size", () => {
    PreCheck.perform([openFolderCheck], async () => {
      const idfSize = new IDFSize(workspaceRoot);
      try {
        if (IDFSizePanel.isCreatedAndHidden()) {
          IDFSizePanel.createOrShow(context);
          return;
        }

        const mapFileExists = await idfSize.isBuiltAlready();
        if (!mapFileExists) {
          throw new Error("Build is required for a size analysis");
        }

        const notificationMode = idfConf.readParameter(
          "idf.notificationMode",
          workspaceRoot
        ) as string;
        const ProgressLocation =
          notificationMode === idfConf.NotificationMode.All ||
          notificationMode === idfConf.NotificationMode.Notifications
            ? vscode.ProgressLocation.Notification
            : vscode.ProgressLocation.Window;
        vscode.window.withProgress(
          {
            cancellable: true,
            location: ProgressLocation,
            title: "ESP-IDF: Size",
          },
          async (
            progress: vscode.Progress<{ message: string; increment: number }>,
            cancelToken: vscode.CancellationToken
          ) => {
            try {
              cancelToken.onCancellationRequested(idfSize.cancel);
              const results = await idfSize.calculateWithProgress(progress);
              if (!cancelToken.isCancellationRequested) {
                IDFSizePanel.createOrShow(context, results);
              }
            } catch (error) {
              const msg: string =
                error && error.message ? error.message : JSON.stringify(error);
              Logger.errorNotify(
                msg,
                error,
                "extension IDFSizePanel calculate"
              );
            }
          }
        );
      } catch (error) {
        const msg: string =
          error && error.message ? error.message : JSON.stringify(error);
        if (
          msg.indexOf("project_description.json doesn't exist.") !== -1 ||
          msg.indexOf("Build is required for a size analysis") !== -1
        ) {
          const buildProject = await vscode.window.showInformationMessage(
            `ESP-IDF Size requires to build the project first. Build the project?`,
            "Build"
          );
          if (buildProject === "Build") {
            vscode.commands.executeCommand("espIdf.buildDevice");
          }
          Logger.error(msg, error, "extension IDFSizePanel build files");
          return;
        }
        Logger.errorNotify(error.message, error, "extension IDFSizePanel");
      }
    });
  });

  registerIDFCommand("espIdf.importProject", async () => {
    const srcFolder = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
    });
    if (!srcFolder || !srcFolder.length) {
      return;
    }
    const isIdfProject = utils.checkIsProjectCmakeLists(srcFolder[0].fsPath);
    if (!isIdfProject) {
      Logger.infoNotify(
        vscode.l10n.t(`{srcFolder} is not an ESP-IDF project.`, {
          srcFolder: srcFolder[0].fsPath,
        })
      );
      return;
    }
    const items = [
      {
        label: vscode.l10n.t("Choose a container directory..."),
        target: "another",
      },
    ];
    if (workspaceRoot) {
      items.push({
        label: vscode.l10n.t(`Use current folder: {workspace}`, {
          workspace: workspaceRoot.fsPath,
        }),
        target: "current",
      });
    }
    const projectDirOption = await vscode.window.showQuickPick(items, {
      placeHolder: vscode.l10n.t("Select a directory to use"),
    });
    if (!projectDirOption) {
      return;
    }
    let destFolder: vscode.Uri;
    if (projectDirOption.target === "another") {
      const newFolder = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
      });
      if (!newFolder || !newFolder.length) {
        return;
      }
      destFolder = newFolder[0];
    } else if (workspaceRoot) {
      destFolder = workspaceRoot;
    }
    if (!destFolder) {
      return;
    }
    const projectName = await vscode.window.showInputBox({
      placeHolder: vscode.l10n.t("Enter project name"),
      value: "",
    });
    if (!projectName) {
      return;
    }
    destFolder = vscode.Uri.file(path.join(destFolder.fsPath, projectName));
    const doesProjectExists = await pathExists(destFolder.fsPath);
    if (doesProjectExists) {
      Logger.infoNotify(
        vscode.l10n.t(`{destFolder} already exists.`, { destFolder })
      );
      return;
    }
    await utils.copyFromSrcProject(srcFolder[0].fsPath, destFolder);
    await utils.updateProjectNameInCMakeLists(destFolder.fsPath, projectName);
    const opt = await vscode.window.showInformationMessage(
      vscode.l10n.t("ESP-IDF Project has been imported"),
      "Open"
    );
    if (opt === "Open") {
      vscode.commands.executeCommand("vscode.openFolder", destFolder, true);
    }
  });

  registerIDFCommand("espIdf.setGcovConfig", async () => {
    PreCheck.perform([openFolderCheck], async () => {
      try {
        await configureProjectWithGcov(workspaceRoot);
      } catch (error) {
        Logger.errorNotify(error.message, error, "extension setGcovConfig");
      }
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
        await appTraceManager.stop();
      }
    });
  });

  registerIDFCommand("espIdf.heaptrace", async () => {
    const idfVersionCheck = await minIdfVersionCheck("4.2", workspaceRoot);
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

  registerIDFCommand("espIdf.openOCDCommand", () => {
    PreCheck.perform(
      [webIdeCheck, openFolderCheck],
      openOCDManager.commandHandler
    );
  });

  registerIDFCommand("espIdf.qemuCommand", () => {
    PreCheck.perform([openFolderCheck], async () => {
      const notificationMode = idfConf.readParameter(
        "idf.notificationMode",
        workspaceRoot
      ) as string;
      const ProgressLocation =
        notificationMode === idfConf.NotificationMode.All ||
        notificationMode === idfConf.NotificationMode.Notifications
          ? vscode.ProgressLocation.Notification
          : vscode.ProgressLocation.Window;
      await vscode.window.withProgress(
        {
          cancellable: true,
          location: ProgressLocation,
          title: "ESP-IDF: Starting ESP-IDF QEMU",
        },
        async (
          progress: vscode.Progress<{ message: string; increment: number }>,
          cancelToken: vscode.CancellationToken
        ) => {
          try {
            const buildDir = idfConf.readParameter(
              "idf.buildPath",
              workspaceRoot
            ) as string;
            const qemuBinExists = await pathExists(
              path.join(buildDir, "merged_qemu.bin")
            );
            if (!qemuBinExists) {
              progress.report({
                message: vscode.l10n.t("Merging binaries for flashing"),
                increment: 10,
              });
              await mergeFlashBinaries(workspaceRoot, cancelToken);
            }
            await qemuManager.commandHandler();
          } catch (error) {
            const msg = error.message
              ? error.message
              : "Error merging binaries for QEMU";
            Logger.errorNotify(msg, error, "extension qemu");
          }
        }
      );
    });
  });

  registerIDFCommand("espIdf.qemuDebug", () => {
    PreCheck.perform([openFolderCheck], async () => {
      const notificationMode = idfConf.readParameter(
        "idf.notificationMode",
        workspaceRoot
      ) as string;
      const ProgressLocation =
        notificationMode === idfConf.NotificationMode.All ||
        notificationMode === idfConf.NotificationMode.Notifications
          ? vscode.ProgressLocation.Notification
          : vscode.ProgressLocation.Window;
      await vscode.window.withProgress(
        {
          cancellable: true,
          location: ProgressLocation,
          title: vscode.l10n.t("ESP-IDF: Starting ESP-IDF QEMU Debug"),
        },
        async (
          progress: vscode.Progress<{ message: string; increment: number }>,
          cancelToken: vscode.CancellationToken
        ) => {
          try {
            if (IDFMonitor.terminal) {
              IDFMonitor.terminal.sendText(ESP.CTRL_RBRACKET);
            }
            const buildDirPath = idfConf.readParameter(
              "idf.buildPath",
              workspaceRoot
            ) as string;
            const qemuBinExists = await pathExists(
              path.join(buildDirPath, "merged_qemu.bin")
            );
            if (!qemuBinExists) {
              await mergeFlashBinaries(workspaceRoot);
            }
            if (qemuManager.isRunning()) {
              qemuManager.stop();
              await utils.sleep(1000);
            }
            await qemuManager.start(QemuLaunchMode.Debug, workspaceRoot);
            const gdbPath = await utils.getToolchainPath(workspaceRoot, "gdb");
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(
              workspaceRoot
            );
            await vscode.debug.startDebugging(workspaceFolder, {
              name: "GDB QEMU",
              type: "gdbtarget",
              request: "attach",
              sessionID: "qemu.debug.session",
              gdb: gdbPath,
              initCommands: [
                "set remote hardware-watchpoint-limit {IDF_TARGET_CPU_WATCHPOINT_NUM}",
                "mon reset halt",
                "maintenance flush register-cache",
                "thb app_main",
              ],
              target: {
                type: "remote",
                host: "localhost",
                port: "1234",
              },
            });
            vscode.debug.onDidTerminateDebugSession(async (session) => {
              if (session.configuration.sessionID === "qemu.debug.session") {
                qemuManager.stop();
              }
            });
          } catch (error) {
            const msg = error.message
              ? error.message
              : vscode.l10n.t("Error launching QEMU debugging");
            Logger.errorNotify(msg, error, "extension qemu debug");
          }
        }
      );
    });
  });

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
              label: vscode.l10n.t(`Flash binary to this partition`),
              target: "flashBinaryToPartition",
            },
            {
              label: vscode.l10n.t("Open partition table editor"),
              target: "openPartitionTableEditor",
            },
          ],
          { placeHolder: vscode.l10n.t("Select an action to use") }
        );
        if (!partitionAction) {
          return;
        }
        if (partitionAction.target === "openPartitionTableEditor") {
          vscode.commands.executeCommand("esp.webview.open.partition-table");
        } else if (partitionAction.target === "flashBinaryToPartition") {
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
    const notificationMode = idfConf.readParameter(
      "idf.notificationMode",
      workspaceRoot
    ) as string;
    const ProgressLocation =
      notificationMode === idfConf.NotificationMode.All ||
      notificationMode === idfConf.NotificationMode.Notifications
        ? vscode.ProgressLocation.Notification
        : vscode.ProgressLocation.Window;
    await vscode.window.withProgress(
      {
        cancellable: false,
        location: ProgressLocation,
        title: vscode.l10n.t("ESP-IDF: Preparing ESP-IDF extension report"),
      },
      async (
        progress: vscode.Progress<{ message: string; increment: number }>
      ) => {
        const reportedResult = initializeReportObject();
        try {
          await generateConfigurationReport(
            context,
            workspaceRoot,
            reportedResult
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

  registerIDFCommand("espIdf.debug", async () => {
    PreCheck.perform([webIdeCheck, openFolderCheck], async () => {
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(
        workspaceRoot
      );
      const launchJsonPath = path.join(
        workspaceRoot.fsPath,
        ".vscode",
        "launch.json"
      );
      const launchJsonPathExist = await pathExists(launchJsonPath);
      if (!launchJsonPathExist) {
        await vscode.window.showInformationMessage(
          vscode.l10n.t(
            `No launch.json found.
             Use the ESP-IDF: Add vscode Configuration Folder command.`
          )
        );
        return;
      }
      const config = vscode.workspace.getConfiguration("launch", workspaceRoot);

      // retrieve values
      const configurations = config.get(
        "configurations"
      ) as vscode.DebugConfiguration[];
      if (configurations && configurations.length) {
        for (const conf of configurations) {
          if (conf.type === "gdbtarget") {
            await vscode.debug.startDebugging(workspaceFolder, conf.name);
            return;
          }
        }
      }
      await vscode.window.showInformationMessage(
        vscode.l10n.t(
          `No gdbtarget configuration found in launch.json.
           Delete launch.json and use the ESP-IDF: Add vscode Configuration Folder' command.`
        )
      );
      return;
    });
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
              context.extensionPath
            );
          }
        }
        AppTracePanel.createOrShow(context, {
          trace: {
            fileName: trace.fileName,
            filePath: trace.filePath,
            type: trace.type,
            workspacePath: workspaceRoot.fsPath,
            idfPath: idfConf.readParameter("idf.espIdfPath", workspaceRoot),
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

  registerIDFCommand("esp.rainmaker.backend.connect", async () => {
    if (RainmakerAPIClient.isLoggedIn()) {
      return Logger.infoNotify(
        vscode.l10n.t("Already logged-in, please sign-out first")
      );
    }

    //ask to select login provider
    const accountDetails = await PromptUserToLogin();
    if (!accountDetails) {
      return;
    }

    if (accountDetails.provider) {
      RainmakerOAuthManager.openExternalOAuthURL(accountDetails.provider);
      return;
    }

    if (!accountDetails.username || !accountDetails.password) {
      return;
    }

    const notificationMode = idfConf.readParameter(
      "idf.notificationMode",
      workspaceRoot
    ) as string;
    const ProgressLocation =
      notificationMode === idfConf.NotificationMode.All ||
      notificationMode === idfConf.NotificationMode.Notifications
        ? vscode.ProgressLocation.Notification
        : vscode.ProgressLocation.Window;
    vscode.window.withProgress(
      {
        title: vscode.l10n.t(
          "ESP-IDF: Please wait checking with Rainmaker Cloud"
        ),
        location: ProgressLocation,
        cancellable: false,
      },
      async () => {
        try {
          await RainmakerAPIClient.login(
            accountDetails.username,
            accountDetails.password
          );
          await rainMakerTreeDataProvider.refresh();
          Logger.infoNotify("Rainmaker Cloud Linking Success!");
        } catch (error) {
          return Logger.errorNotify(
            vscode.l10n.t(
              "Failed to login with Rainmaker Cloud, double check your id and password"
            ),
            error,
            "extension rainmaker backend connect"
          );
        }
      }
    );
  });

  registerIDFCommand("esp.rainmaker.backend.logout", async () => {
    const shallLogout = await vscode.window.showWarningMessage(
      vscode.l10n.t(
        "Would you like to unlink your ESP Rainmaker cloud account?"
      ),
      { modal: true },
      { title: "Yes" },
      { title: "Cancel", isCloseAffordance: true }
    );
    if (!shallLogout || shallLogout.title === "Cancel") {
      return;
    }
    RainmakerAPIClient.logout();
    rainMakerTreeDataProvider.refresh();
  });

  registerIDFCommand("esp.rainmaker.backend.sync", async () => {
    rainMakerTreeDataProvider.refresh();
  });

  registerIDFCommand(
    "esp.rainmaker.backend.remove_node",
    async (item: RMakerItem) => {
      if (!item) {
        return;
      }
      const shallDelete = await vscode.window.showWarningMessage(
        vscode.l10n.t(
          "Would you like to delete this node from your ESP Rainmaker account?"
        ),
        { modal: true },
        { title: "Yes" },
        { title: "Cancel", isCloseAffordance: true }
      );
      if (!shallDelete || shallDelete.title === "Cancel") {
        return;
      }
      const notificationMode = idfConf.readParameter(
        "idf.notificationMode",
        workspaceRoot
      ) as string;
      const ProgressLocation =
        notificationMode === idfConf.NotificationMode.All ||
        notificationMode === idfConf.NotificationMode.Notifications
          ? vscode.ProgressLocation.Notification
          : vscode.ProgressLocation.Window;
      vscode.window.withProgress(
        {
          title: vscode.l10n.t(
            "ESP-IDF: Deleting node from your rainmaker account"
          ),
          location: ProgressLocation,
        },
        async () => {
          try {
            await RainmakerAPIClient.deleteNode(item.id);
            rainMakerTreeDataProvider.refresh();
          } catch (error) {
            Logger.errorNotify(
              vscode.l10n.t(
                "Failed to delete node, maybe the node is already marked for delete, please try again after sometime"
              ),
              error,
              "extension rainmaker backend remove node"
            );
          }
        }
      );
    }
  );
  registerIDFCommand("esp.rainmaker.backend.add_node", async () => {
    Logger.infoNotify(
      vscode.l10n.t(
        "Coming Soon!! until then you can add nodes using mobile app"
      )
    );
  });
  registerIDFCommand(
    "esp.rainmaker.backend.update_node_param",
    async (item: RMakerItem) => {
      if (!item) {
        return;
      }
      const idPayload = item.id.split("::");
      const params = item.getMeta<RainmakerDeviceParamStructure>();

      if (params.properties.indexOf("write") === -1) {
        return Logger.infoNotify("Readonly Property");
      }

      let newParamValue;
      if (params.data_type === "bool") {
        newParamValue = await vscode.window.showQuickPick(["true", "false"], {
          ignoreFocusOut: true,
          placeHolder: "Select a new param value",
        });
      } else {
        newParamValue = await vscode.window.showInputBox({
          ignoreFocusOut: true,
          placeHolder: "param value",
          value: item.description.toString(),
          prompt: "Enter the new param value",
          validateInput: (value: string): string => {
            return validateInputForRainmakerDeviceParam(
              value,
              params.data_type
            );
          },
        });
      }

      if (!newParamValue) {
        return;
      }

      newParamValue = convertTo(params.data_type, newParamValue);

      const notificationMode = idfConf.readParameter(
        "idf.notificationMode",
        workspaceRoot
      ) as string;
      const ProgressLocation =
        notificationMode === idfConf.NotificationMode.All ||
        notificationMode === idfConf.NotificationMode.Notifications
          ? vscode.ProgressLocation.Notification
          : vscode.ProgressLocation.Window;
      vscode.window.withProgress(
        {
          title: "ESP-IDF: Syncing params, please wait",
          location: ProgressLocation,
        },
        async () => {
          try {
            const nodeID = idPayload[0];
            const deviceName = idPayload[1];
            await RainmakerAPIClient.updateNodeParam(
              nodeID,
              deviceName,
              params.name,
              newParamValue
            );
            await rainMakerTreeDataProvider.refresh();
            Logger.infoNotify("Sent the param update request to cloud");
          } catch (error) {
            let errorMsg = vscode.l10n.t(
              "Failed to update the param, please try once more"
            );
            if (error.response) {
              errorMsg = `${vscode.l10n.t(
                "Failed to update param because, "
              )} ${error.response.data.description}`;
            }
            Logger.errorNotify(
              errorMsg,
              error,
              "extension rainmaker backend update node param"
            );
          }
        }
      );
    }
  );
  registerIDFCommand("espIdf.launchWSServerAndMonitor", async () => {
    const idfVersionCheck = await minIdfVersionCheck("4.3", workspaceRoot);
    PreCheck.perform(
      [idfVersionCheck, webIdeCheck, openFolderCheck],
      async () => {
        const port = idfConf.readParameter("idf.port", workspaceRoot) as string;
        if (!port) {
          try {
            await vscode.commands.executeCommand("espIdf.selectPort");
          } catch (error) {
            Logger.error(
              vscode.l10n.t("Unable to execute the command: espIdf.selectPort"),
              error,
              "extension launchWSServerAndMonitor selectPort"
            );
          }
          return Logger.errorNotify(
            vscode.l10n.t("Select a serial port before flashing"),
            new Error("NOT_SELECTED_PORT"),
            "extension launchWSServerAndMonitor select port"
          );
        }

        const pythonBinPath = await getVirtualEnvPythonPath(workspaceRoot);
        if (!utils.canAccessFile(pythonBinPath, constants.R_OK)) {
          Logger.errorNotify(
            vscode.l10n.t("Python binary path is not defined"),
            new Error("The Python Binary Path is not defined"),
            "extension launchWSServerAndMonitor python path not set"
          );
        }
        const idfPath = idfConf.readParameter(
          "idf.espIdfPath",
          workspaceRoot
        ) as string;
        const idfMonitorToolPath = path.join(
          idfPath,
          "tools",
          "idf_monitor.py"
        );
        if (!utils.canAccessFile(idfMonitorToolPath, constants.R_OK)) {
          Logger.errorNotify(
            idfMonitorToolPath + vscode.l10n.t(" is not defined"),
            new Error(idfMonitorToolPath + " is not defined"),
            "extension launchWSServerAndMonitor idf_monitor no access"
          );
        }
        await installWebsocketClient(workspaceRoot);
        const buildDirPath = idfConf.readParameter(
          "idf.buildPath",
          workspaceRoot
        ) as string;
        let idfTarget = await getIdfTargetFromSdkconfig(workspaceRoot);
        if (!idfTarget) {
          Logger.infoNotify("IDF_TARGET is not defined.");
          return;
        }
        const toolchainPrefix = utils.getToolchainToolName(idfTarget, "");
        const projectName = await getProjectName(buildDirPath);
        const gdbPath = await utils.getToolchainPath(workspaceRoot, "gdb");
        const elfFilePath = path.join(buildDirPath, `${projectName}.elf`);
        const wsPort = idfConf.readParameter("idf.wssPort", workspaceRoot);
        const idfVersion = await utils.getEspIdfFromCMake(idfPath);
        let sdkMonitorBaudRate: string = await utils.getMonitorBaudRate(
          workspaceRoot
        );
        const noReset = idfConf.readParameter(
          "idf.monitorNoReset",
          workspaceRoot
        ) as boolean;
        const enableTimestamps = idfConf.readParameter(
          "idf.monitorEnableTimestamps",
          workspaceRoot
        ) as boolean;
        const customTimestampFormat = idfConf.readParameter(
          "idf.monitorCustomTimestampFormat",
          workspaceRoot
        ) as string;
        const shellPath = idfConf.readParameter(
          "idf.customTerminalExecutable",
          workspaceRoot
        ) as string;
        const shellExecutableArgs = idfConf.readParameter(
          "idf.customTerminalExecutableArgs",
          workspaceRoot
        ) as string[];
        IDFMonitor.updateConfiguration({
          port,
          baudRate: sdkMonitorBaudRate,
          pythonBinPath,
          idfTarget,
          toolchainPrefix,
          idfMonitorToolPath,
          idfVersion,
          noReset,
          enableTimestamps,
          customTimestampFormat,
          elfFilePath,
          wsPort,
          workspaceFolder: workspaceRoot,
          shellPath,
          shellExecutableArgs,
        });
        if (wsServer) {
          wsServer.close();
        }
        wsServer = new WSServer(wsPort);
        wsServer.start();
        wsServer
          .on("started", async () => {
            if (IDFMonitor.terminal) {
              IDFMonitor.terminal.sendText(ESP.CTRL_RBRACKET);
              await utils.sleep(500);
            }
            IDFMonitor.start();
          })
          .on("core-dump-detected", async (resp) => {
            const notificationMode = idfConf.readParameter(
              "idf.notificationMode",
              workspaceRoot
            ) as string;
            const ProgressLocation =
              notificationMode === idfConf.NotificationMode.All ||
              notificationMode === idfConf.NotificationMode.Notifications
                ? vscode.ProgressLocation.Notification
                : vscode.ProgressLocation.Window;
            vscode.window.withProgress(
              {
                location: ProgressLocation,
                cancellable: false,
                title: vscode.l10n.t(
                  "ESP-IDF: Core-dump detected, please wait while we parse the data received"
                ),
              },
              async (progress) => {
                const espCoreDumpPyTool = new ESPCoreDumpPyTool(idfPath);
                const buildDirPath = idfConf.readParameter(
                  "idf.buildPath",
                  workspaceRoot
                ) as string;
                const projectName = await getProjectName(buildDirPath);
                const coreElfFilePath = path.join(
                  buildDirPath,
                  `${projectName}.coredump.elf`
                );
                if (
                  (await espCoreDumpPyTool.generateCoreELFFile({
                    coreElfFilePath,
                    coreInfoFilePath: resp.file,
                    infoCoreFileFormat: InfoCoreFileFormat.Base64,
                    progELFFilePath: resp.prog,
                    pythonBinPath,
                    workspaceUri: workspaceRoot,
                  })) === true
                ) {
                  progress.report({
                    message: vscode.l10n.t(
                      "Successfully created ELF file from the info received (espcoredump.py)"
                    ),
                  });
                  try {
                    const workspaceFolder = vscode.workspace.getWorkspaceFolder(
                      workspaceRoot
                    );
                    await vscode.debug.startDebugging(workspaceFolder, {
                      name: "Core Dump Debug",
                      sessionID: "core-dump.debug.session.ws",
                      type: "gdbtarget",
                      request: "attach",
                      gdb: gdbPath,
                      program: resp.prog,
                      logFile: `${path.join(
                        workspaceRoot.fsPath,
                        "coredump.log"
                      )}`,
                      target: {
                        connectCommands: [`core ${coreElfFilePath}`],
                      },
                    });
                    vscode.debug.onDidTerminateDebugSession((session) => {
                      if (
                        session.configuration.sessionID ===
                        "core-dump.debug.session.ws"
                      ) {
                        wsServer.done();
                        IDFMonitor.dispose();
                        wsServer.close();
                      }
                    });
                  } catch (error) {
                    Logger.errorNotify(
                      vscode.l10n.t("Failed to launch debugger for postmortem"),
                      error,
                      "extension launchWSServerAndMonitor coredump"
                    );
                  }
                } else {
                  Logger.warnNotify(
                    vscode.l10n.t(
                      "Failed to generate the ELF file from the info received, please close the core-dump monitor terminal manually"
                    )
                  );
                }
              }
            );
          })
          .on("gdb-stub-detected", async (resp) => {
            try {
              const workspaceFolder = vscode.workspace.getWorkspaceFolder(
                workspaceRoot
              );
              await vscode.debug.startDebugging(workspaceFolder, {
                name: "GDB Stub Debug",
                type: "gdbtarget",
                request: "attach",
                sessionID: "gdbstub.debug.session.ws",
                gdb: gdbPath,
                program: resp.prog,
                logFile: `${path.join(workspaceRoot.fsPath, "gdbstub.log")}`,
                target: {
                  connectCommands: [`target remote ${resp.port}`],
                },
              });
              vscode.debug.onDidTerminateDebugSession((session) => {
                if (
                  session.configuration.sessionID === "gdbstub.debug.session.ws"
                ) {
                  wsServer.done();
                  IDFMonitor.dispose();
                  wsServer.close();
                }
              });
            } catch (error) {
              Logger.errorNotify(
                "Failed to launch debugger for postmortem",
                error,
                "extension launchWSServerAndMonitor gdbstub"
              );
            }
          })
          .on("close", (resp) => {
            wsServer.close();
          })
          .on("error", (err) => {
            let message = err.message;
            if (err && err.message.includes("EADDRINUSE")) {
              message = vscode.l10n.t(
                `Your port {wsPort} is not available, use (idf.wssPort) to change to different port`,
                { wsPort }
              );
            }
            Logger.errorNotify(
              message,
              err,
              "extension launchWSServerAndMonitor error event"
            );
            wsServer.close();
          });
      }
    );
  });
  registerIDFCommand(
    "esp.webview.open.partition-table",
    async (args?: vscode.Uri) => {
      let filePath = args?.fsPath;
      if (!args) {
        // try to get the partition table name from sdkconfig and if not found create one
        try {
          const sdkconfigFilePath = await utils.getSDKConfigFilePath(
            workspaceRoot
          );
          const sdkconfigFileExists = await pathExists(sdkconfigFilePath);
          if (!sdkconfigFileExists) {
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
    const notificationMode = idfConf.readParameter(
      "idf.notificationMode",
      workspaceRoot
    ) as string;
    const ProgressLocation =
      notificationMode === idfConf.NotificationMode.All ||
      notificationMode === idfConf.NotificationMode.Notifications
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
    const notificationMode = idfConf.readParameter(
      "idf.notificationMode",
      workspaceRoot
    ) as string;
    const ProgressLocation =
      notificationMode === idfConf.NotificationMode.All ||
      notificationMode === idfConf.NotificationMode.Notifications
        ? vscode.ProgressLocation.Notification
        : vscode.ProgressLocation.Window;
    vscode.window.withProgress(
      {
        title: "ESP-IDF: Getting ninja build summary",
        location: ProgressLocation,
      },
      async () => {
        try {
          const pythonBinPath = await getVirtualEnvPythonPath(workspaceRoot);
          const ninjaSummaryScript = path.join(
            context.extensionPath,
            "external",
            "chromium",
            "ninja-build-summary.py"
          );
          const buildDir = idfConf.readParameter(
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
      const notificationMode = idfConf.readParameter(
        "idf.notificationMode",
        this.curWorkspace
      ) as string;
      const ProgressLocation =
        notificationMode === idfConf.NotificationMode.All ||
        notificationMode === idfConf.NotificationMode.Notifications
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

  registerIDFCommand("espIdf.selectFlashMethodAndFlash", () => {
    PreCheck.perform([openFolderCheck, webIdeCheck], async () => {
      await selectFlashMethod();
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
  vscode.window.registerUriHandler({
    handleUri: async (uri: vscode.Uri) => {
      const query = uri.query.split("=");
      if (uri.path === "/rainmaker" && query[0] === "code") {
        const code = query[1] || "";
        try {
          const notificationMode = idfConf.readParameter(
            "idf.notificationMode",
            workspaceRoot
          ) as string;
          const ProgressLocation =
            notificationMode === idfConf.NotificationMode.All ||
            notificationMode === idfConf.NotificationMode.Notifications
              ? vscode.ProgressLocation.Notification
              : vscode.ProgressLocation.Window;
          vscode.window.withProgress(
            {
              title: vscode.l10n.t(
                "ESP-IDF: Please wait mapping your rainmaker cloud account with the VS Code Extension, this could take a little while"
              ),
              location: ProgressLocation,
            },
            async () => {
              await RainmakerAPIClient.exchangeCodeForTokens(code);
              await rainMakerTreeDataProvider.refresh();
              Logger.infoNotify(
                vscode.l10n.t(
                  "Rainmaker Cloud is connected successfully (via OAuth)!"
                )
              );
            }
          );
        } catch (error) {
          return Logger.errorNotify(
            vscode.l10n.t("Failed to sign-in with Rainmaker (via OAuth)"),
            error,
            "extension rainmaker Uri handler",
            { meta: JSON.stringify(error) }
          );
        }
        return;
      }
      Logger.warn(`Failed to handle URI Open, ${uri.toString()}`);
    },
  });
  await checkExtensionSettings(
    context.extensionPath,
    workspaceRoot,
    statusBarItems["currentIdfVersion"]
  );

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

  const hasWalkthroughBeenShown = await idfConf.readParameter(
    "idf.hasWalkthroughBeenShown"
  );

  if (!hasWalkthroughBeenShown) {
    await idfConf.writeParameter(
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

  const treeDataProvider = new ErrorHintProvider(context);
  vscode.window.registerTreeDataProvider("errorHints", treeDataProvider);

  vscode.commands.registerCommand("espIdf.searchError", async () => {
    const errorMsg = await vscode.window.showInputBox({
      placeHolder: "Enter the error message",
    });
    if (errorMsg) {
      treeDataProvider.searchError(errorMsg, workspaceRoot);
      await vscode.commands.executeCommand("errorHints.focus");
    }
  });

  // Function to process diagnostics and update error hints
  const processDiagnostics = async (uri: vscode.Uri) => {
    const diagnostics = vscode.languages.getDiagnostics(uri);

    const errorDiagnostics = diagnostics.filter(
      (d) => d.severity === vscode.DiagnosticSeverity.Error
    );

    if (errorDiagnostics.length > 0) {
      const errorMsg = errorDiagnostics[0].message;
      await treeDataProvider.searchError(errorMsg, workspaceRoot);
    } else {
      treeDataProvider.clearErrorHints();
    }
  };

  // Attach a listener to the diagnostics collection
  context.subscriptions.push(
    vscode.languages.onDidChangeDiagnostics((event) => {
      event.uris.forEach((uri) => {
        processDiagnostics(uri);
      });
    })
  );

  // Listen to the active text editor change event
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        processDiagnostics(editor.document.uri);
      }
    })
  );

  // Register the HintHoverProvider
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      { pattern: "**" },
      new HintHoverProvider(treeDataProvider)
    )
  );

  checkAndNotifyMissingCompileCommands();

  // Remove ESP-IDF settings
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "espIdf.removeEspIdfSettings",
      removeEspIdfSettings
    )
  );
}

async function removeEspIdfSettings() {
  const config = vscode.workspace.getConfiguration();
  const settingsToDelete: string[] = [];

  // Helper function to recursively find idf settings
  function findIdfSettings(obj: any, prefix: string = "") {
    if (typeof obj === "object" && obj !== null) {
      Object.keys(obj).forEach((key) => {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        if (fullPath.startsWith("idf.") || fullPath.startsWith("esp.")) {
          settingsToDelete.push(fullPath);
        }
        findIdfSettings(obj[key], fullPath);
      });
    }
  }

  // Get all settings directly from configuration
  const allSettings = config.inspect("");
  // Check values saved in each scope
  if (allSettings?.globalValue) {
    findIdfSettings(allSettings.globalValue);
  }
  if (allSettings?.workspaceValue) {
    findIdfSettings(allSettings.workspaceValue);
  }

  if (allSettings?.workspaceFolderValue) {
    findIdfSettings(allSettings.workspaceFolderValue);
  }

  if (settingsToDelete.length === 0) {
    vscode.window.showInformationMessage(
      vscode.l10n.t("No ESP-IDF settings found to remove.")
    );
    return;
  }

  // Filter out any duplicate paths
  const uniqueSettingsToDelete = [...new Set(settingsToDelete)];

  // Ask user for confirmation
  const message = vscode.l10n.t(
    "Are you sure you want to remove all ESP-IDF settings? This will delete all idf.* configurations."
  );
  const result = await vscode.window.showWarningMessage(
    message,
    {
      modal: true,
      detail: vscode.l10n.t(
        "{0} settings will be removed.",
        uniqueSettingsToDelete.length
      ),
    },
    vscode.l10n.t("Yes"),
    vscode.l10n.t("No")
  );

  if (result !== vscode.l10n.t("Yes")) {
    return;
  }

  try {
    const message = vscode.l10n.t("Starting ESP-IDF settings cleanup...");
    OutputChannel.appendLineAndShow(message);
    Logger.info(message);

    // Delete each setting
    for (const setting of uniqueSettingsToDelete) {
      try {
        // Try to remove from each scope, but handle errors silently
        // Global settings
        try {
          const inspection = config.inspect(setting);
          if (inspection?.globalValue !== undefined) {
            await config.update(
              setting,
              undefined,
              vscode.ConfigurationTarget.Global
            );
            OutputChannel.appendLine(
              vscode.l10n.t("Removed global setting: {0}", setting)
            );
          }
        } catch (e) {
          // Silently continue if we can't modify global settings
        }

        // Workspace settings
        try {
          const inspection = config.inspect(setting);
          if (inspection?.workspaceValue !== undefined) {
            await config.update(
              setting,
              undefined,
              vscode.ConfigurationTarget.Workspace
            );
            OutputChannel.appendLine(
              vscode.l10n.t("Removed workspace setting: {0}", setting)
            );
          }
        } catch (e) {
          // Silently continue if we can't modify workspace settings
        }

        // WorkspaceFolder settings
        try {
          const inspection = config.inspect(setting);
          if (inspection?.workspaceFolderValue !== undefined) {
            await config.update(
              setting,
              undefined,
              vscode.ConfigurationTarget.WorkspaceFolder
            );
            OutputChannel.appendLine(
              vscode.l10n.t("Removed workspace folder setting: {0}", setting)
            );
          }
        } catch (e) {
          // Silently continue if we can't modify workspace folder settings
        }
      } catch (settingError) {
        OutputChannel.appendLine(
          vscode.l10n.t(
            "Warning: Could not fully remove setting {0}: {1}",
            setting,
            settingError.message
          )
        );
      }
    }

    OutputChannel.appendLineAndShow(
      vscode.l10n.t("ESP-IDF settings removed successfully.")
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(
      vscode.l10n.t("Failed to remove settings: {0}"),
      errorMessage
    );
    OutputChannel.appendLineAndShow(vscode.l10n.t("Error: {0}"), errorMessage);
    Logger.error(errorMessage, error, "extension removeEspIdfSettings");
  }
}

function checkAndNotifyMissingCompileCommands() {
  if (vscode.workspace.workspaceFolders) {
    vscode.workspace.workspaceFolders.forEach(async (folder) => {
      try {
        const isIdfProject = utils.checkIsProjectCmakeLists(folder.uri.fsPath);
        if (isIdfProject) {
          const buildDirPath = idfConf.readParameter(
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

async function getFrameworksPickItems() {
  const espAdfPath = idfConf.readParameter(
    "idf.espAdfPath",
    workspaceRoot
  ) as string;
  const espMdfPath = idfConf.readParameter(
    "idf.espMdfPath",
    workspaceRoot
  ) as string;
  const matterPathDir = idfConf.readParameter(
    "idf.espMatterPath",
    workspaceRoot
  ) as string;
  const rainmakerPathDir = idfConf.readParameter(
    "idf.espRainmakerPath",
    workspaceRoot
  ) as string;

  const espHomeKitPathDir = idfConf.readParameter(
    "idf.espHomeKitSdkPath",
    workspaceRoot
  ) as string;

  const pickItems: {
    description: string;
    label: string;
    target: string;
    idfSetup: IdfSetup;
  }[] = [];
  try {
    const idfSetups = await getPreviousIdfSetups(true);
    const currentIdfSetup = await getCurrentIdfSetup(workspaceRoot);
    const onlyValidIdfSetups = idfSetups.filter((i) => i.isValid);
    for (const idfSetup of onlyValidIdfSetups) {
      pickItems.push({
        description: `ESP-IDF v${idfSetup.version}`,
        label: vscode.l10n.t(`Use ESP-IDF {espIdfPath}`, {
          espIdfPath: idfSetup.idfPath,
        }),
        target: idfSetup.idfPath,
        idfSetup,
      });
    }
    const doesAdfPathExists = await utils.dirExistPromise(espAdfPath);
    if (doesAdfPathExists) {
      pickItems.push({
        description: "ESP-ADF",
        label: vscode.l10n.t(`Use current ESP-ADF {espAdfPath}`, {
          espAdfPath,
        }),
        target: espAdfPath,
        idfSetup: currentIdfSetup,
      });
    }
    const doesMdfPathExists = await utils.dirExistPromise(espMdfPath);
    if (doesMdfPathExists) {
      pickItems.push({
        description: "ESP-MDF",
        label: vscode.l10n.t(`Use current ESP-MDF {espMdfPath}`, {
          espMdfPath,
        }),
        target: espMdfPath,
        idfSetup: currentIdfSetup,
      });
    }
    const doesMatterPathExists = await utils.dirExistPromise(matterPathDir);
    if (doesMatterPathExists) {
      pickItems.push({
        description: "ESP-Matter",
        label: vscode.l10n.t(`Use current ESP-Matter {matterPathDir}`, {
          matterPathDir,
        }),
        target: matterPathDir,
        idfSetup: currentIdfSetup,
      });
    }
    const doesEspRainmakerPathExists = await utils.dirExistPromise(
      rainmakerPathDir
    );
    if (doesEspRainmakerPathExists) {
      pickItems.push({
        description: "ESP-Rainmaker",
        label: vscode.l10n.t(`Use current ESP-Rainmaker {rainmakerPathDir}`, {
          rainmakerPathDir,
        }),
        target: rainmakerPathDir,
        idfSetup: currentIdfSetup,
      });
    }
    const doesEspHomeKitSdkPathExists = await utils.dirExistPromise(
      espHomeKitPathDir
    );
    if (doesEspHomeKitSdkPathExists) {
      pickItems.push({
        description: "ESP-HomeKit-SDK",
        label: vscode.l10n.t(
          `Use current ESP-HomeKit-SDK {espHomeKitPathDir}`,
          { espHomeKitPathDir }
        ),
        target: espHomeKitPathDir,
        idfSetup: currentIdfSetup,
      });
    }
  } catch (error) {
    const errMsg = error.message ? error.message : "Error getting frameworks";
    Logger.errorNotify(errMsg, error, "extension getFrameworksPickItems");
    return pickItems;
  }
  return pickItems;
}

function validateInputForRainmakerDeviceParam(
  value: string,
  type: string
): string {
  if (type === "string" && value === "") {
    return vscode.l10n.t("Enter non empty string");
  }
  if (type === "int" && !value.match(/^[0-9]+$/)) {
    return vscode.l10n.t("Enter a valid integer");
  }
  return;
}

function convertTo(type: string, value: string): any {
  if (type === "bool") {
    return value === "true" ? true : false;
  }
  if (type === "int") {
    return parseInt(value);
  }
  return value;
}

function registerOpenOCDStatusBarItem(context: vscode.ExtensionContext) {
  const statusBarItem = openOCDManager.statusBarItem();
  context.subscriptions.push(statusBarItem);
}

function registerQemuStatusBarItem(context: vscode.ExtensionContext) {
  const statusBarItem = qemuManager.statusBarItem();
  context.subscriptions.push(statusBarItem);
}

function registerTreeProvidersForIDFExplorer(context: vscode.ExtensionContext) {
  appTraceTreeDataProvider = new AppTraceTreeDataProvider();
  appTraceArchiveTreeDataProvider = new AppTraceArchiveTreeDataProvider();

  espIdfDocsResultTreeDataProvider = new DocSearchResultTreeDataProvider();

  commandTreeDataProvider = new CommandsProvider();

  vscode.commands.registerCommand("espIdf.clearDocsSearchResult", () => {
    espIdfDocsResultTreeDataProvider.clearResults();
  });

  idfSearchResults = vscode.window.createTreeView("idfSearchResults", {
    treeDataProvider: espIdfDocsResultTreeDataProvider,
  });

  rainMakerTreeDataProvider = new ESPRainMakerTreeDataProvider();

  eFuseExplorer = new ESPEFuseTreeDataProvider();

  partitionTableTreeDataProvider = new PartitionTreeDataProvider();

  context.subscriptions.push(
    appTraceTreeDataProvider.registerDataProviderForTree("idfAppTracer"),
    appTraceArchiveTreeDataProvider.registerDataProviderForTree(
      "idfAppTraceArchive"
    ),
    commandTreeDataProvider.registerDataProviderForTree("idfCommands"),
    rainMakerTreeDataProvider.registerDataProviderForTree("espRainmaker"),
    eFuseExplorer.registerDataProviderForTree("espEFuseExplorer"),
    partitionTableTreeDataProvider.registerDataProvider("idfPartitionExplorer")
  );
}

const build = (flashType?: ESP.FlashType) => {
  PreCheck.perform([openFolderCheck], async () => {
    const notificationMode = idfConf.readParameter(
      "idf.notificationMode",
      workspaceRoot
    ) as string;
    const ProgressLocation =
      notificationMode === idfConf.NotificationMode.All ||
      notificationMode === idfConf.NotificationMode.Notifications
        ? vscode.ProgressLocation.Notification
        : vscode.ProgressLocation.Window;
    await vscode.window.withProgress(
      {
        cancellable: true,
        location: ProgressLocation,
        title: "ESP-IDF: Building project",
      },
      async (
        progress: vscode.Progress<{ message: string; increment: number }>,
        cancelToken: vscode.CancellationToken
      ) => {
        if (!flashType) {
          flashType = idfConf.readParameter(
            "idf.flashType",
            workspaceRoot
          ) as ESP.FlashType;
        }
        await buildCommand(workspaceRoot, cancelToken, flashType);
      }
    );
  });
};
const flash = (
  encryptPartitions: boolean = false,
  flashType?: ESP.FlashType
) => {
  PreCheck.perform([openFolderCheck], async () => {
    // Re route to ESP-IDF Web extension if using Codespaces or Browser
    if (vscode.env.uiKind === vscode.UIKind.Web) {
      vscode.commands.executeCommand(IDFWebCommandKeys.Flash);
      return;
    }
    const notificationMode = idfConf.readParameter(
      "idf.notificationMode",
      workspaceRoot
    ) as string;
    const ProgressLocation =
      notificationMode === idfConf.NotificationMode.All ||
      notificationMode === idfConf.NotificationMode.Notifications
        ? vscode.ProgressLocation.Notification
        : vscode.ProgressLocation.Window;
    await vscode.window.withProgress(
      {
        cancellable: true,
        location: ProgressLocation,
        title: "ESP-IDF: Flashing project",
      },
      async (
        progress: vscode.Progress<{ message: string; increment: number }>,
        cancelToken: vscode.CancellationToken
      ) => {
        if (!flashType) {
          flashType = idfConf.readParameter(
            "idf.flashType",
            workspaceRoot
          ) as ESP.FlashType;
        }
        if (await startFlashing(cancelToken, flashType, encryptPartitions)) {
          OutputChannel.appendLine(
            "Flash has finished. You can monitor your device with 'ESP-IDF: Monitor command'"
          );
        }
      }
    );
  });
};

function createQemuMonitor() {
  PreCheck.perform([openFolderCheck], async () => {
    const notificationMode = idfConf.readParameter(
      "idf.notificationMode",
      workspaceRoot
    ) as string;
    const ProgressLocation =
      notificationMode === idfConf.NotificationMode.All ||
      notificationMode === idfConf.NotificationMode.Notifications
        ? vscode.ProgressLocation.Notification
        : vscode.ProgressLocation.Window;
    await vscode.window.withProgress(
      {
        cancellable: true,
        location: ProgressLocation,
        title: "ESP-IDF: Starting ESP-IDF QEMU Monitor",
      },
      async (
        progress: vscode.Progress<{ message: string; increment: number }>,
        cancelToken: vscode.CancellationToken
      ) => {
        try {
          const isQemuLaunched = qemuManager.isRunning();
          if (isQemuLaunched) {
            qemuManager.stop();
          }
          const buildDirPath = idfConf.readParameter(
            "idf.buildPath",
            workspaceRoot
          ) as string;
          const qemuBinExists = await pathExists(
            path.join(buildDirPath, "merged_qemu.bin")
          );
          if (!qemuBinExists) {
            await mergeFlashBinaries(workspaceRoot);
          }
          const qemuTcpPort = idfConf.readParameter(
            "idf.qemuTcpPort",
            workspaceRoot
          ) as string;
          await qemuManager.start(QemuLaunchMode.Monitor, workspaceRoot);
          if (IDFMonitor.terminal) {
            await utils.sleep(1000);
          }
          const serialPort = `socket://localhost:${qemuTcpPort}`;
          const noReset = idfConf.readParameter(
            "idf.monitorNoReset",
            workspaceRoot
          ) as boolean;
          await createNewIdfMonitor(workspaceRoot, noReset, serialPort);
        } catch (error) {
          const msg = error.message
            ? error.message
            : "Error launching QEMU monitor";
          Logger.errorNotify(msg, error, "extension qemu monitor");
        }
      }
    );
  });
}

const buildFlashAndMonitor = async (runMonitor: boolean = true) => {
  PreCheck.perform([webIdeCheck, openFolderCheck], async () => {
    const notificationMode = idfConf.readParameter(
      "idf.notificationMode",
      workspaceRoot
    ) as string;
    const ProgressLocation =
      notificationMode === idfConf.NotificationMode.All ||
      notificationMode === idfConf.NotificationMode.Notifications
        ? vscode.ProgressLocation.Notification
        : vscode.ProgressLocation.Window;

    await vscode.window.withProgress(
      {
        cancellable: true,
        location: ProgressLocation,
        title: vscode.l10n.t("ESP-IDF: Building project"),
      },
      async (
        progress: vscode.Progress<{ message: string; increment: number }>,
        cancelToken: vscode.CancellationToken
      ) => {
        progress.report({ message: "Building project...", increment: 20 });
        const flashType = idfConf.readParameter("idf.flashType", workspaceRoot);
        let canContinue = await buildCommand(
          workspaceRoot,
          cancelToken,
          flashType
        );
        if (!canContinue) {
          return;
        }
        progress.report({
          message: "Flashing project into device...",
          increment: 60,
        });

        let encryptPartitions = await isFlashEncryptionEnabled(workspaceRoot);
        canContinue = await startFlashing(
          cancelToken,
          flashType,
          encryptPartitions
        );
        if (!canContinue) {
          return;
        }
        if (runMonitor) {
          progress.report({
            message: "Launching monitor...",
            increment: 10,
          });
          if (IDFMonitor.terminal) {
            IDFMonitor.terminal.sendText(ESP.CTRL_RBRACKET);
          }
          await createMonitor();
        }
      }
    );
  });
};

async function selectFlashMethod() {
  let curflashType = idfConf.readParameter(
    "idf.flashType",
    workspaceRoot
  ) as ESP.FlashType;
  let newFlashType = (await vscode.window.showQuickPick(
    Object.keys(ESP.FlashType),
    {
      ignoreFocusOut: true,
      placeHolder: vscode.l10n.t(
        "Select flash method, you can modify the choice later from 'settings.json' (idf.flashType)"
      ),
    }
  )) as ESP.FlashType;
  if (!newFlashType) {
    return curflashType;
  }
  await idfConf.writeParameter(
    "idf.flashType",
    newFlashType,
    vscode.ConfigurationTarget.WorkspaceFolder,
    workspaceRoot
  );
  vscode.window.showInformationMessage(
    `Flash method changed to ${newFlashType}.`
  );
  return newFlashType;
}

async function startFlashing(
  cancelToken: vscode.CancellationToken,
  flashType: ESP.FlashType,
  encryptPartitions: boolean
) {
  if (!flashType) {
    flashType = await selectFlashMethod();
  }

  if (encryptPartitions) {
    const encryptionValidationResult = await checkFlashEncryption(
      flashType,
      workspaceRoot
    );
    if (!encryptionValidationResult.success) {
      if (
        encryptionValidationResult.resultType ===
        FlashCheckResultType.ErrorEfuseNotSet
      ) {
        encryptPartitions = false;
      } else {
        return;
      }
    }
  }

  const port = idfConf.readParameter("idf.port", workspaceRoot);
  const flashBaudRate = idfConf.readParameter(
    "idf.flashBaudRate",
    workspaceRoot
  );
  if (IDFMonitor.terminal) {
    IDFMonitor.terminal.sendText(ESP.CTRL_RBRACKET);
  }
  const canFlash = await verifyCanFlash(flashBaudRate, port, workspaceRoot);
  if (!canFlash) {
    return;
  }

  if (flashType === ESP.FlashType.JTAG) {
    // Check if JTAG is disabled on the hardware
    const eFuse = new ESPEFuseManager(workspaceRoot);
    const eFuseSummary = await eFuse.readSummary();
    const jtagStatus = isJtagDisabled(eFuseSummary);
    if (jtagStatus.disabled) {
      Logger.errorNotify(
        vscode.l10n.t("Cannot flash via JTAG method: {0}", jtagStatus.message),
        new Error("JTAG Disabled"),
        "extension startFlashing"
      );
      return;
    } else if (jtagStatus.requiresVerification) {
      const message = vscode.l10n.t(
        "{0}\n\nThe JTAG configuration may depend on hardware strapping. Please consult the ESP32 technical documentation for your specific model to ensure proper JTAG configuration before proceeding.",
        jtagStatus.message
      );
      Logger.warnNotify(message);
      return;
    }

    const currOpenOcdVersion = await openOCDManager.version();
    const openOCDVersionIsValid = PreCheck.openOCDVersionValidator(
      "v0.10.0-esp32-20201125",
      currOpenOcdVersion
    );
    if (!openOCDVersionIsValid) {
      Logger.infoNotify(
        `Minimum OpenOCD version v0.10.0-esp32-20201125 is required while you have ${currOpenOcdVersion} version installed`
      );
      return;
    }
    return await jtagFlashCommand(workspaceRoot);
  } else {
    const idfPathDir = idfConf.readParameter(
      "idf.espIdfPath",
      workspaceRoot
    ) as string;
    return await flashCommand(
      cancelToken,
      flashBaudRate,
      idfPathDir,
      port,
      workspaceRoot,
      flashType,
      encryptPartitions
    );
  }
}

function createIdfTerminal() {
  PreCheck.perform([openFolderCheck], async () => {
    const modifiedEnv = await utils.appendIdfAndToolsToPath(workspaceRoot);
    const espIdfTerminal = vscode.window.createTerminal({
      name: "ESP-IDF Terminal",
      env: modifiedEnv,
      cwd: workspaceRoot.fsPath || modifiedEnv.IDF_PATH || process.cwd(),
      strictEnv: true,
      shellArgs: [],
      shellPath: vscode.env.shell,
    });
    espIdfTerminal.show();
  });
}

async function createMonitor() {
  PreCheck.perform([openFolderCheck], async () => {
    // Re route to ESP-IDF Web extension if using Codespaces or Browser
    if (vscode.env.uiKind === vscode.UIKind.Web) {
      vscode.commands.executeCommand(IDFWebCommandKeys.Monitor);
      return;
    }
    const noReset = await shouldDisableMonitorReset();
    await createNewIdfMonitor(workspaceRoot, noReset);
  });
}

/**
 * Determines if the monitor reset should be disabled.
 * If flash encryption is enabled for release mode, we add --no-reset flag for monitoring
 * because by default monitoring command resets the device which is not recommended.
 * Reset should happen by Bootloader itself once it completes encrypting all artifacts.
 *
 * @returns {Promise<boolean>} True if monitor reset should be disabled, false otherwise.
 */
const shouldDisableMonitorReset = async (): Promise<boolean> => {
  const configNoReset = idfConf.readParameter(
    "idf.monitorNoReset",
    workspaceRoot
  );

  if (configNoReset === true) {
    return true;
  }

  if (isFlashEncryptionEnabled(workspaceRoot)) {
    const valueReleaseModeEnabled = await utils.getConfigValueFromSDKConfig(
      "CONFIG_SECURE_FLASH_ENCRYPTION_MODE_RELEASE",
      workspaceRoot
    );
    return valueReleaseModeEnabled === "y";
  }

  return false;
};

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
  if (covRenderer) {
    covRenderer.dispose();
  }
  KconfigLangClient.stopKconfigLangServer();
}

class IdfDebugConfigurationProvider
  implements vscode.DebugConfigurationProvider {
  public async resolveDebugConfiguration(
    folder: vscode.WorkspaceFolder | undefined,
    config: vscode.DebugConfiguration,
    token?: vscode.CancellationToken
  ): Promise<vscode.DebugConfiguration> {
    try {
      const buildDirPath = idfConf.readParameter(
        "idf.buildPath",
        workspaceRoot
      ) as string;
      const projectName = await getProjectName(buildDirPath);
      const elfFilePath = path.join(buildDirPath, `${projectName}.elf`);
      const elfFileExists = await pathExists(elfFilePath);
      if (!elfFileExists) {
        throw new Error(
          `${elfFilePath} doesn't exist. Build this project first.`
        );
      }
      if (config.verifyAppBinBeforeDebug) {
        const isSameAppBinary = await verifyAppBinary(workspaceRoot);
        if (!isSameAppBinary) {
          throw new Error(
            vscode.l10n.t(
              `Current app binary is different from your project. Flash first.`
            )
          );
        }
      }
      config.elfFilePath = elfFilePath;
      const debugAdapterPackagesExist = await checkDebugAdapterRequirements(
        workspaceRoot
      );
      if (!debugAdapterPackagesExist) {
        const installDAPyPkgs = await vscode.window.showInformationMessage(
          "ESP-IDF Debug Adapter Python packages are not installed",
          "Install"
        );
        if (installDAPyPkgs && installDAPyPkgs === "Install") {
          await vscode.commands.executeCommand("espIdf.installPyReqs");
        }
        return;
      }
    } catch (error) {
      const msg = error.message
        ? error.message
        : "Some build files doesn't exist. Build this project first.";
      Logger.error(
        error.message,
        error,
        "extension IdfDebugConfigurationProvider"
      );
      const startBuild = await vscode.window.showInformationMessage(
        msg,
        "Build"
      );
      if (startBuild === "Build") {
        await buildFlashAndMonitor(false);
        return;
      }
    }
    return config;
  }
}
