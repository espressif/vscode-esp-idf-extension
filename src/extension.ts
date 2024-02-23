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
import { kill } from "process";
import { getNewProjectArgs } from "./newProject/newProjectInit";
import { NewProjectPanel } from "./newProject/newProjectPanel";
import { buildCommand } from "./build/buildCmd";
import { verifyCanFlash } from "./flash/flashCmd";
import { flashCommand } from "./flash/uartFlash";
import { jtagFlashCommand } from "./flash/jtagCmd";
import { createNewIdfMonitor } from "./espIdf/monitor/command";
import { KconfigLangClient } from "./kconfig";
import { configureProjectWithGcov } from "./coverage/configureProject";
import { ComponentManagerUIPanel } from "./component-manager/panel";
import { verifyAppBinary } from "./espIdf/debugAdapter/verifyApp";
import { mergeFlashBinaries } from "./qemu/mergeFlashBin";
import { IQemuOptions, QemuManager } from "./qemu/qemuManager";
import {
  PartitionItem,
  PartitionTreeDataProvider,
} from "./espIdf/partition-table/tree";
import { flashBinaryToPartition } from "./espIdf/partition-table/partitionFlasher";
import { CustomTask, CustomTaskType } from "./customTasks/customTaskProvider";
import { TaskManager } from "./taskManager";
import { WelcomePanel } from "./welcome/panel";
import { getWelcomePageInitialValues } from "./welcome/welcomeInit";
import { selectDfuDevice } from "./flash/dfu";
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
import { clearPreviousIdfSetups } from "./setup/existingIdfSetups";
import { getEspRainmaker } from "./rainmaker/download/espRainmakerDownload";
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

// Global variables shared by commands
let workspaceRoot: vscode.Uri;
const DEBUG_DEFAULT_PORT = 43474;
let covRenderer: CoverageRenderer;

// OpenOCD  and Debug Adapter Manager
let statusBarItems: { [key: string]: vscode.StatusBarItem };

const openOCDManager = OpenOCDManager.init();
let isOpenOCDLaunchedByDebug: boolean = false;
let debugAdapterManager: DebugAdapterManager;
let isMonitorLaunchedByDebug: boolean = false;

// QEMU
const qemuManager = QemuManager.init();

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

// Process to execute build, debug or monitor
let monitorTerminal: vscode.Terminal;

// Websocket Server
let wsServer: WSServer;

// Precheck methods and their messages

const openFolderFirstMsg = vscode.l10n.t("Open a folder first.");
const cmdNotForWebIdeMsg = vscode.l10n.t(
  "Selected command is not available in WebIDE"
);
const openFolderCheck = [
  PreCheck.isWorkspaceFolderOpen,
  openFolderFirstMsg,
] as utils.PreCheckInput;
const webIdeCheck = [
  PreCheck.notUsingWebIde,
  cmdNotForWebIdeMsg,
] as utils.PreCheckInput;

const minOpenOcdVersionCheck = async function () {
  const currOpenOcdVersion = await openOCDManager.version();
  return [
    () =>
      PreCheck.openOCDVersionValidator(
        "v0.10.0-esp32-20201125",
        currOpenOcdVersion
      ),
    `Minimum OpenOCD version v0.10.0-esp32-20201125 is required while you have ${currOpenOcdVersion} version installed`,
  ] as utils.PreCheckInput;
};

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

  // Create a status bar item with current workspace

  // Status Bar Item with common commands
  statusBarItems = await createCmdsStatusBarItems();

  // Create Kconfig Language Server Client
  KconfigLangClient.startKconfigLangServer(context);

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
    workspaceRoot = initSelectedWorkspace(statusBarItems["workspace"]);
    await getIdfTargetFromSdkconfig(workspaceRoot, statusBarItems["target"]);
    if (statusBarItems && statusBarItems["port"]) {
      statusBarItems["port"].text =
        "$(plug) " + idfConf.readParameter("idf.port", workspaceRoot);
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
  });
  context.subscriptions.push(srcWatchOnChangeDisposable);

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
              "$(plug) " + idfConf.readParameter("idf.port", workspaceRoot);
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
      qemuManager.configure({
        workspaceFolder: workspaceRoot,
      } as IQemuOptions);
    }
    ConfserverProcess.dispose();
  });

  vscode.debug.onDidTerminateDebugSession((e) => {
    if (isOpenOCDLaunchedByDebug) {
      isOpenOCDLaunchedByDebug = false;
      openOCDManager.stop();
    }
    debugAdapterManager.stop();
    if (isMonitorLaunchedByDebug) {
      isMonitorLaunchedByDebug = false;
      monitorTerminal.dispose();
    }
  });

  const sdkconfigWatcher = vscode.workspace.createFileSystemWatcher(
    "**/sdkconfig",
    false,
    false,
    false
  );
  const updateGuiValues = (e: vscode.Uri) => {
    if (ConfserverProcess.exists() && !ConfserverProcess.isSavedByUI()) {
      ConfserverProcess.loadGuiConfigValues();
    }
    ConfserverProcess.resetSavedByUI();
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
        Logger.errorNotify(error.message, error);
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
        Logger.errorNotify(error.message, error);
      }
    });
  });

  registerIDFCommand("espIdf.eraseFlash", async () => {
    PreCheck.perform([webIdeCheck, openFolderCheck], async () => {
      if (monitorTerminal) {
        monitorTerminal.sendText(ESP.CTRL_RBRACKET);
      }
      const pythonBinPath = idfConf.readParameter(
        "idf.pythonBinPath",
        workspaceRoot
      ) as string;
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
            const result = await utils.execChildProcess(
              `${pythonBinPath} ${flashScriptPath} -p ${port} erase_flash`,
              process.cwd(),
              OutputChannel.init(),
              null,
              cancelToken
            );
            OutputChannel.appendLine(result);
            Logger.infoNotify("Flash memory content has been erased.");
          } catch (error) {
            Logger.errorNotify(error.message, error);
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
            Logger.errorNotify(error.message, error);
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
    PreCheck.perform([webIdeCheck, openFolderCheck], async () => {
      const currentIdfSetup = await selectIdfSetup(
        workspaceRoot,
        statusBarItems["currentIdfVersion"]
      );
    });
  });

  registerIDFCommand("espIdf.customTask", async () => {
    try {
      const customTask = new CustomTask(workspaceRoot);
      customTask.addCustomTask(CustomTaskType.Custom);
      await TaskManager.runTasks();
    } catch (error) {
      const errMsg =
        error && error.message ? error.message : "Error at custom task";
      Logger.errorNotify(errMsg, error);
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
            "$(plug) " + idfConf.readParameter("idf.port", workspaceRoot);
        }
        updateIdfComponentsTree(workspaceRoot);
        const workspaceFolderInfo = {
          clickCommand: "espIdf.pickAWorkspaceFolder",
          currentWorkSpace: option.name,
          tooltip: option.uri.fsPath,
        };
        utils.updateStatus(statusBarItems["workspace"], workspaceFolderInfo);
        const debugAdapterConfig = {
          currentWorkspace: workspaceRoot,
        } as IDebugAdapterConfig;
        debugAdapterManager.configureAdapter(debugAdapterConfig);
        const openOCDConfig: IOpenOCDConfig = {
          workspace: workspaceRoot,
        } as IOpenOCDConfig;
        openOCDManager.configureServer(openOCDConfig);
        qemuManager.configure({
          workspaceFolder: workspaceRoot,
        } as IQemuOptions);
        ConfserverProcess.dispose();
        const coverageOptions = getCoverageOptions(workspaceRoot);
        covRenderer = new CoverageRenderer(workspaceRoot, coverageOptions);
      } catch (error) {
        Logger.errorNotify(error.message, error);
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

  registerIDFCommand("espIdf.setPath", () => {
    PreCheck.perform([webIdeCheck], async () => {
      const selectFrameworkMsg = vscode.l10n.t(
        "Select framework to define its path:"
      );
      try {
        const option = await vscode.window.showQuickPick(
          [
            {
              description: vscode.l10n.t("IDF_PATH Path"),
              label: "IDF_PATH",
              target: "esp",
            },
            {
              description: vscode.l10n.t("Set IDF_TOOLS_PATH Path"),
              label: "IDF_TOOLS_PATH",
              target: "idfTools",
            },
            {
              description: vscode.l10n.t("Set paths to append to PATH"),
              label: "Custom extra paths",
              target: "customExtraPath",
            },
          ],
          { placeHolder: selectFrameworkMsg }
        );
        if (!option) {
          const noOptionMsg = vscode.l10n.t("No option selected.");
          Logger.infoNotify(noOptionMsg);
          return;
        }
        let currentValue;
        let msg: string;
        let paramName: string;
        switch (option.target) {
          case "esp":
            msg = vscode.l10n.t("Enter IDF_PATH Path");
            paramName = "idf.espIdfPath";
            break;
          case "idfTools":
            msg = vscode.l10n.t("Enter IDF_TOOLS_PATH path");
            paramName = "idf.toolsPath";
            break;
          case "customExtraPath":
            msg = vscode.l10n.t("Enter extra paths to append to PATH");
            paramName = "idf.customExtraPaths";
            break;
          default:
            const noPathUpdatedMsg = vscode.l10n.t("No path has been updated");
            Logger.infoNotify(noPathUpdatedMsg);
            break;
        }
        if (msg && paramName) {
          currentValue = idfConf.readParameter(paramName, workspaceRoot);
          await idfConf.updateConfParameter(
            paramName,
            msg,
            currentValue,
            option.label,
            workspaceRoot
          );
        }
      } catch (error) {
        const errMsg =
          error && error.message
            ? error.message
            : "Error at defining framework path.";
        Logger.errorNotify(errMsg, error);
      }
    });
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
              Logger.errorNotify(error.message, error);
            }
          }
        );
      } catch (error) {
        Logger.errorNotify(error.message, error);
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
        "$(gear)" + option.target,
        vscode.l10n.t("ESP-IDF: Select Project Configuration"),
        "espIdf.projectConf",
        100
      );
      await getIdfTargetFromSdkconfig(workspaceRoot, statusBarItems["target"]);
    });
  });

  registerIDFCommand("espIdf.configDevice", async () => {
    const selectConfigMsg = vscode.l10n.t("Select option to define its path:");
    try {
      const option = await vscode.window.showQuickPick(
        [
          {
            description: "Target (IDF_TARGET)",
            label: "Device Target",
            target: "deviceTarget",
          },
          {
            description: "Serial port",
            label: "Device Port",
            target: "devicePort",
          },
          {
            description: "Flash baud rate",
            label: "Flash Baud Rate",
            target: "flashBaudRate",
          },
          {
            description: vscode.l10n.t(
              "Relative paths to OpenOCD Scripts directory separated by comma(,)"
            ),
            label: "OpenOcd Config Files",
            target: "openOcdConfig",
          },
        ],
        { placeHolder: selectConfigMsg }
      );
      if (!option) {
        const noOptionMsg = vscode.l10n.t("No option selected.");
        Logger.infoNotify(noOptionMsg);
        return;
      }
      let currentValue;
      let msg: string;
      let paramName: string;
      switch (option.target) {
        case "deviceTarget":
          return vscode.commands.executeCommand("espIdf.setTarget");
        case "devicePort":
          msg = vscode.l10n.t("Enter device port Path");
          paramName = "idf.port";
          break;
        case "flashBaudRate":
          msg = vscode.l10n.t("Enter flash baud rate");
          paramName = "idf.flashBaudRate";
          break;
        case "monitorBaudRate":
          msg = vscode.l10n.t("Enter monitor baud rate");
          paramName = "idf.monitorBaudRate";
          break;
        case "openOcdConfig":
          msg = vscode.l10n.t("Enter OpenOCD Configuration File Paths list");
          paramName = "idf.openOcdConfigs";
          break;
        default:
          const noParamUpdatedMsg = vscode.l10n.t(
            "No device parameter has been updated"
          );
          Logger.infoNotify(noParamUpdatedMsg);
          break;
      }
      if (msg && paramName) {
        currentValue = idfConf.readParameter(paramName, workspaceRoot);
        if (currentValue instanceof Array) {
          currentValue = currentValue.join(",");
        }
        await idfConf.updateConfParameter(
          paramName,
          msg,
          currentValue,
          option.label,
          workspaceRoot
        );
      }
    } catch (error) {
      const errMsg =
        error && error.message
          ? error.message
          : "Error at device configuration.";
      Logger.errorNotify(errMsg, error);
    }
  });

  vscode.workspace.onDidChangeConfiguration(async (e) => {
    const winFlag = process.platform === "win32" ? "Win" : "";
    if (e.affectsConfiguration("idf.enableStatusBar")) {
      const enableStatusBar = idfConf.readParameter(
        "idf.enableStatusBar",
        workspaceRoot
      ) as boolean;
      if (enableStatusBar) {
        statusBarItems = await createCmdsStatusBarItems();
      } else if (!enableStatusBar) {
        for (let statusItem in statusBarItems) {
          statusBarItems[statusItem].dispose();
          statusBarItems[statusItem] = undefined;
        }
      }
    } else if (e.affectsConfiguration("idf.openOcdConfigs")) {
      const openOcdConfigFilesList = idfConf.readParameter(
        "idf.openOcdConfigs",
        workspaceRoot
      );
      const openOCDConfig: IOpenOCDConfig = {
        openOcdConfigFilesList,
      } as IOpenOCDConfig;
      openOCDManager.configureServer(openOCDConfig);
    } else if (e.affectsConfiguration("idf.adapterTargetName")) {
      let idfTarget = idfConf.readParameter(
        "idf.adapterTargetName",
        workspaceRoot
      ) as string;
      if (idfTarget === "custom") {
        idfTarget = idfConf.readParameter(
          "idf.customAdapterTargetName",
          workspaceRoot
        ) as string;
      }
      const debugAdapterConfig = {
        target: idfTarget,
      } as IDebugAdapterConfig;
      debugAdapterManager.configureAdapter(debugAdapterConfig);
      if (statusBarItems && statusBarItems["target"]) {
        statusBarItems["target"].text = "$(circuit-board) " + idfTarget;
      }
    } else if (e.affectsConfiguration("idf.espIdfPath" + winFlag)) {
      ESP.URL.Docs.IDF_INDEX = undefined;
    } else if (e.affectsConfiguration("idf.qemuTcpPort")) {
      qemuManager.configure({
        tcpPort: idfConf.readParameter("idf.qemuTcpPort", workspaceRoot),
      } as IQemuOptions);
    } else if (e.affectsConfiguration("idf.port" + winFlag)) {
      if (statusBarItems && statusBarItems["port"]) {
        statusBarItems["port"].text =
          "$(plug) " + idfConf.readParameter("idf.port", workspaceRoot);
      }
    } else if (e.affectsConfiguration("idf.customAdapterTargetName")) {
      let idfTarget = idfConf.readParameter(
        "idf.adapterTargetName",
        workspaceRoot
      ) as string;
      if (idfTarget === "custom") {
        idfTarget = idfConf.readParameter(
          "idf.customAdapterTargetName",
          workspaceRoot
        ) as string;
        const debugAdapterConfig = {
          target: idfTarget,
        } as IDebugAdapterConfig;
        debugAdapterManager.configureAdapter(debugAdapterConfig);
        if (statusBarItems && statusBarItems["target"]) {
          statusBarItems["target"].text = "$(circuit-board) " + idfTarget;
        }
      }
    } else if (e.affectsConfiguration("openocd.tcl.host")) {
      const tclHost = idfConf.readParameter(
        "openocd.tcl.host",
        workspaceRoot
      ) as string;
      const openOCDConfig: IOpenOCDConfig = {
        host: tclHost,
      } as IOpenOCDConfig;
      openOCDManager.configureServer(openOCDConfig);
    } else if (e.affectsConfiguration("openocd.tcl.port")) {
      const tclPort = idfConf.readParameter(
        "openocd.tcl.port",
        workspaceRoot
      ) as number;
      const openOCDConfig: IOpenOCDConfig = {
        port: tclPort,
      } as IOpenOCDConfig;
      openOCDManager.configureServer(openOCDConfig);
    } else if (e.affectsConfiguration("idf.flashType")) {
      let flashType = idfConf.readParameter(
        "idf.flashType",
        workspaceRoot
      ) as string;
      if (statusBarItems && statusBarItems["flashType"]) {
        statusBarItems["flashType"].text = `$(star-empty) ${flashType}`;
      }
    } else if (e.affectsConfiguration("idf.buildPath")) {
      updateIdfComponentsTree(workspaceRoot);
    }
  });

  const debugProvider = new IdfDebugConfigurationProvider();
  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider("espidf", debugProvider)
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
          (session.configuration.sessionID !== "core-dump.debug.session.ws" ||
            session.configuration.sessionID !== "gdbstub.debug.session.ws") &&
          useMonitorWithDebug
        ) {
          isMonitorLaunchedByDebug = true;
          await createIdfMonitor(true);
        }
        if (
          launchMode === "auto" &&
          !openOCDManager.isRunning() &&
          session.configuration.sessionID !== "core-dump.debug.session.ws" &&
          session.configuration.sessionID !== "qemu.debug.session"
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
        if (
          session.configuration.sessionID === "core-dump.debug.session.ws" ||
          session.configuration.sessionID === "gdbstub.debug.session.ws"
        ) {
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
        return Logger.errorNotify(errMsg, error);
      }
    },
  });

  vscode.debug.onDidStartDebugSession((session) => {
    const svdFile = idfConf.readParameter(
      "idf.svdFilePath",
      workspaceRoot
    ) as string;
    peripheralTreeProvider.debugSessionStarted(session, svdFile, 16); // Move svdFile and threshold as conf settings
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
      await covRenderer.renderCoverage();
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
          Logger.errorNotify(errMsg, error);
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
            const pyPath = idfConf.readParameter(
              "idf.pythonBinPath",
              workspaceRoot
            ) as string;
            progress.report({
              message: vscode.l10n.t(
                `Installing ESP-IDF extension Python Requirements...`
              ),
            });
            await installExtensionPyReqs(
              pyPath,
              espIdfPath,
              toolsPath,
              undefined,
              OutputChannel.init()
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
            Logger.errorNotify(msg, error);
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
            const pyPath = idfConf.readParameter(
              "idf.pythonBinPath",
              workspaceRoot
            ) as string;
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
              OutputChannel.init(),
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
            Logger.errorNotify(msg, error);
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
        Logger.error(msg, error);
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
            Logger.error(msg, error);
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
            Logger.error(msg, error);
          }
        }
      );
    });
  });

  registerIDFCommand("espIdf.getXtensaGdb", () => {
    return PreCheck.perform([openFolderCheck], async () => {
      const modifiedEnv = utils.appendIdfAndToolsToPath(workspaceRoot);
      const idfTarget = modifiedEnv.IDF_TARGET || "esp32";
      const gdbTool = utils.getToolchainToolName(idfTarget, "gdb");
      try {
        return await utils.isBinInPath(
          gdbTool,
          workspaceRoot.fsPath,
          modifiedEnv
        );
      } catch (error) {
        Logger.errorNotify("gdb is not found in idf.customExtraPaths", error);
        return;
      }
    });
  });

  registerIDFCommand("espIdf.getXtensaGcc", () => {
    return PreCheck.perform([openFolderCheck], async () => {
      const modifiedEnv = utils.appendIdfAndToolsToPath(workspaceRoot);
      const idfTarget = modifiedEnv.IDF_TARGET || "esp32";
      const gccTool = utils.getToolchainToolName(idfTarget, "gcc");
      try {
        return await utils.isBinInPath(
          gccTool,
          workspaceRoot.fsPath,
          modifiedEnv
        );
      } catch (error) {
        Logger.errorNotify("gcc is not found in idf.customExtraPaths", error);
        return;
      }
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
        Logger.errorNotify(errMsg, error);
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
        Logger.errorNotify(errMsg, error);
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
        return Logger.errorNotify(errMsg, error);
      }
    });
  });

  registerIDFCommand("espIdf.createIdfTerminal", createIdfTerminal);
  registerIDFCommand("espIdf.jtag_flash", () =>
    flash(false, ESP.FlashType.JTAG)
  );
  registerIDFCommand("espIdf.flashDFU", () => flash(false, ESP.FlashType.DFU));
  registerIDFCommand("espIdf.flashUart", () =>
    flash(false, ESP.FlashType.UART)
  );
  registerIDFCommand("espIdf.buildDFU", () => build(ESP.FlashType.DFU));
  registerIDFCommand("espIdf.flashDevice", flash);
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
              Logger.errorNotify(error.message, error);
            }
          }
        );
      } catch (error) {
        Logger.errorNotify(error.message, error);
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
            Logger.errorNotify(error.message, error);
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
      Logger.errorNotify(error.message, error);
    }
  });

  registerIDFCommand("espIdf.setTarget", () => {
    PreCheck.perform([openFolderCheck], async () => {
      const enterDeviceTargetMsg = vscode.l10n.t(
        "Enter target name (IDF_TARGET)"
      );
      await setIdfTarget(enterDeviceTargetMsg);
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
              Logger.errorNotify(error.message, error);
            }
          }
        );
      } catch (error) {
        Logger.errorNotify(error.message, error);
      }
    });
  });

  registerIDFCommand("espIdf.examples.start", async () => {
    const pickItems = await getFrameworksPickItems();
    if (!pickItems || pickItems.length == 0) {
      return Logger.infoNotify(vscode.l10n.t("No ESP-IDF frameworks found"));
    }
    const examplesFolder = await vscode.window.showQuickPick(pickItems, {
      placeHolder: vscode.l10n.t("Select framework to use"),
    });
    if (!examplesFolder) {
      Logger.infoNotify(
        vscode.l10n.t("No framework selected to load examples.")
      );
      return;
    }
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
              examplesFolder.description
            );
          } catch (error) {
            Logger.errorNotify(error.message, error);
          }
        }
      );
    } catch (error) {
      Logger.errorNotify(error.message, error);
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
          new Error("INVALID_INVOCATION")
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
          Logger.errorNotify(error.message, error);
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
          if (!newProjectArgs || !newProjectArgs.targetList) {
            throw new Error("Could not find ESP-IDF Targets");
          }
          NewProjectPanel.createOrShow(context.extensionPath, newProjectArgs);
        } catch (error) {
          Logger.errorNotify(error.message, error);
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
      const openOcdScriptsPath = getOpenOcdScripts(workspaceRoot);
      let idfTarget = idfConf.readParameter(
        "idf.adapterTargetName",
        workspaceRoot
      ) as string;
      if (idfTarget === "custom") {
        idfTarget = idfConf.readParameter(
          "idf.customAdapterTargetName",
          workspaceRoot
        ) as string;
      }
      const boards = await getBoards(idfTarget, openOcdScriptsPath);
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
      await idfConf.writeParameter(
        "idf.adapterTargetName",
        selectedBoard.target.target,
        target
      );
      Logger.infoNotify(
        vscode.l10n.t("OpenOCD Board configuration files are updated.")
      );
    } catch (error) {
      const errMsg =
        error.message || "Failed to select openOCD configuration files";
      Logger.errorNotify(errMsg, error);
      return;
    }
  });

  registerIDFCommand("espIdf.getOpenOcdScriptValue", () => {
    return getOpenOcdScripts(workspaceRoot);
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
              Logger.errorNotify(msg, error);
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
          Logger.error(msg, error);
          return;
        }
        Logger.errorNotify(error.message, error);
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
        Logger.errorNotify(error.message, error);
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
            Logger.errorNotify(msg, error);
          }
        }
      );
    });
  });

  registerIDFCommand("espIdf.qemuDebug", () => {
    PreCheck.perform([openFolderCheck], async () => {
      if (qemuManager.isRunning()) {
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
      qemuManager.configure({
        launchArgs: [
          "-nographic",
          "-gdb tcp::3333",
          "-S",
          "-machine",
          "esp32",
          "-drive",
          "file=build/merged_qemu.bin,if=mtd,format=raw",
        ],
      } as IQemuOptions);
      await qemuManager.start();
      const debugAdapterConfig = {
        initGdbCommands: [
          "target remote localhost:3333",
          "monitor system_reset",
          "tb app_main",
          "c",
        ],
        isPostMortemDebugMode: false,
        isOocdDisabled: true,
        logLevel: 5,
      } as IDebugAdapterConfig;
      debugAdapterManager.configureAdapter(debugAdapterConfig);
      await vscode.debug.startDebugging(undefined, {
        name: "GDB QEMU",
        type: "espidf",
        request: "launch",
        sessionID: "qemu.debug.session",
      });
      vscode.debug.onDidTerminateDebugSession(async (session) => {
        if (session.configuration.sessionID === "qemu.debug.session") {
          qemuManager.stop();
        }
      });
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
          Logger.error(errMsg, error);
          Logger.warnNotify(
            vscode.l10n.t(
              "Extension configuration report has been copied to clipboard with errors"
            )
          );
          const reportOutput = await writeTextReport(reportedResult, context);
          await vscode.env.clipboard.writeText(reportOutput);
          return reportedResult;
        }
      }
    );
  });

  registerIDFCommand(
    "espIdf.apptrace.archive.showReport",
    (trace: AppTraceArchiveItems) => {
      if (!trace) {
        Logger.errorNotify(
          vscode.l10n.t(
            "Cannot call this command directly, click on any Trace to view its report!"
          ),
          new Error("INVALID_COMMAND")
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
            error
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
              error
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
            Logger.errorNotify(errorMsg, error);
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
              error
            );
          }
          return Logger.errorNotify(
            vscode.l10n.t("Select a serial port before flashing"),
            new Error("NOT_SELECTED_PORT")
          );
        }
        const pythonBinPath = idfConf.readParameter(
          "idf.pythonBinPath",
          workspaceRoot
        ) as string;
        if (!utils.canAccessFile(pythonBinPath, constants.R_OK)) {
          Logger.errorNotify(
            vscode.l10n.t("Python binary path is not defined"),
            new Error("idf.pythonBinPath is not defined")
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
            new Error(idfMonitorToolPath + " is not defined")
          );
        }
        const buildDirPath = idfConf.readParameter(
          "idf.buildPath",
          workspaceRoot
        ) as string;
        let idfTarget = idfConf.readParameter(
          "idf.adapterTargetName",
          workspaceRoot
        );
        if (idfTarget === "custom") {
          idfTarget = idfConf.readParameter(
            "idf.customAdapterTargetName",
            workspaceRoot
          );
        }
        const toolchainPrefix = utils.getToolchainToolName(idfTarget, "");
        const projectName = await getProjectName(buildDirPath);
        const elfFilePath = path.join(buildDirPath, `${projectName}.elf`);
        const wsPort = idfConf.readParameter("idf.wssPort", workspaceRoot);
        const idfVersion = await utils.getEspIdfFromCMake(idfPath);
        let sdkMonitorBaudRate: string = utils.getMonitorBaudRate(
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
        const monitor = new IDFMonitor({
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
          .on("started", () => {
            monitor.start();
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
                    debugAdapterManager.configureAdapter({
                      isPostMortemDebugMode: true,
                      elfFile: resp.prog,
                      coreDumpFile: coreElfFilePath,
                      isOocdDisabled: true,
                    });
                    await vscode.debug.startDebugging(undefined, {
                      name: "Core Dump Debug",
                      type: "espidf",
                      request: "launch",
                      sessionID: "core-dump.debug.session.ws",
                    });
                    vscode.debug.onDidTerminateDebugSession((session) => {
                      if (
                        session.configuration.sessionID ===
                        "core-dump.debug.session.ws"
                      ) {
                        monitor.dispose();
                        wsServer.close();
                      }
                    });
                  } catch (error) {
                    Logger.errorNotify(
                      vscode.l10n.t("Failed to launch debugger for postmortem"),
                      error
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
            const setupCmd = [`target remote ${resp.port}`];
            const debugAdapterConfig = {
              elfFile: resp.prog,
              initGdbCommands: setupCmd,
              isOocdDisabled: false,
              isPostMortemDebugMode: true,
              logLevel: 5,
            } as IDebugAdapterConfig;
            try {
              debugAdapterManager.configureAdapter(debugAdapterConfig);
              await vscode.debug.startDebugging(undefined, {
                name: "GDB Stub Debug",
                type: "espidf",
                request: "launch",
                sessionID: "gdbstub.debug.session.ws",
              });
              vscode.debug.onDidTerminateDebugSession((session) => {
                if (
                  session.configuration.sessionID === "gdbstub.debug.session.ws"
                ) {
                  monitor.dispose();
                  wsServer.close();
                }
              });
            } catch (error) {
              Logger.errorNotify(
                "Failed to launch debugger for postmortem",
                error
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
            Logger.errorNotify(message, err);
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
          const sdkconfigFilePath = utils.getSDKConfigFilePath(workspaceRoot);
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
          const isCustomPartitionTableEnabled = utils.getConfigValueFromSDKConfig(
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

          let partitionTableFilePath = utils.getConfigValueFromSDKConfig(
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
          return Logger.errorNotify(error.message, error);
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
            return Logger.errorNotify(error.message, error);
          }
          Logger.errorNotify(
            vscode.l10n.t(
              "Failed to get the eFuse Summary from the chip, please make sure you have selected a valid port"
            ),
            error
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
          const pythonBinPath = idfConf.readParameter(
            "idf.pythonBinPath",
            workspaceRoot
          ) as string;
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
          const summaryResult = await utils.execChildProcess(
            `${pythonBinPath} ${ninjaSummaryScript} -C ${buildDir}`,
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
            error
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
            return Logger.errorNotify(err.message, err);
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
          Logger.errorNotify(errMsg, error);
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
      Logger.errorNotify(error.message, error);
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
}

async function getFrameworksPickItems() {
  const espIdfPath = idfConf.readParameter(
    "idf.espIdfPath",
    workspaceRoot
  ) as string;
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

  const pickItems = [];
  try {
    const doesIdfPathExists = await utils.dirExistPromise(espIdfPath);
    if (doesIdfPathExists) {
      pickItems.push({
        description: "ESP-IDF",
        label: vscode.l10n.t(`Use current ESP-IDF {espIdfPath}`, {
          espIdfPath,
        }),
        target: espIdfPath,
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
      });
    }
  } catch (error) {
    const errMsg = error.message ? error.message : "Error getting frameworks";
    Logger.errorNotify(errMsg, error);
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

async function createCmdsStatusBarItems() {
  const enableStatusBar = idfConf.readParameter(
    "idf.enableStatusBar"
  ) as boolean;
  if (!enableStatusBar) {
    return {};
  }
  const port = idfConf.readParameter("idf.port", workspaceRoot) as string;
  let idfTarget = idfConf.readParameter("idf.adapterTargetName", workspaceRoot);
  let flashType = idfConf.readParameter(
    "idf.flashType",
    workspaceRoot
  ) as string;
  let projectConf = ESP.ProjectConfiguration.store.get<string>(
    ESP.ProjectConfiguration.SELECTED_CONFIG
  );
  if (idfTarget === "custom") {
    idfTarget = idfConf.readParameter(
      "idf.customAdapterTargetName",
      workspaceRoot
    );
  }
  let currentIdfVersion = await getCurrentIdfSetup(workspaceRoot);
  const statusBarItems: { [key: string]: vscode.StatusBarItem } = {};

  statusBarItems["currentIdfVersion"] = createStatusBarItem(
    "$(octoface) ESP-IDF v" + currentIdfVersion.version,
    "ESP-IDF: Select current ESP-IDF version",
    "espIdf.selectCurrentIdfVersion",
    102
  );

  statusBarItems["port"] = createStatusBarItem(
    "$(plug)" + port,
    vscode.l10n.t("ESP-IDF: Select Port to Use (COM, tty, usbserial)"),
    "espIdf.selectPort",
    101
  );

  if (projectConf) {
    statusBarItems["projectConf"] = createStatusBarItem(
      "$(gear)" + projectConf,
      vscode.l10n.t("ESP-IDF: Select Project Configuration"),
      "espIdf.projectConf",
      100
    );
  }

  statusBarItems["target"] = createStatusBarItem(
    "$(circuit-board) " + idfTarget,
    vscode.l10n.t("ESP-IDF: Set Espressif Device Target"),
    "espIdf.setTarget",
    99
  );
  statusBarItems["workspace"] = createStatusBarItem(
    "$(file-submodule)",
    vscode.l10n.t("ESP-IDF: Current Project"),
    "espIdf.pickAWorkspaceFolder",
    98
  );
  statusBarItems["menuconfig"] = createStatusBarItem(
    "$(gear)",
    vscode.l10n.t("ESP-IDF: SDK Configuration Editor (menuconfig)"),
    "espIdf.menuconfig.start",
    97
  );
  statusBarItems["clean"] = createStatusBarItem(
    "$(trash)",
    vscode.l10n.t("ESP-IDF: Full Clean"),
    "espIdf.fullClean",
    96
  );
  statusBarItems["build"] = createStatusBarItem(
    "$(database)",
    vscode.l10n.t("ESP-IDF: Build Project"),
    "espIdf.buildDevice",
    95
  );
  statusBarItems["flashType"] = createStatusBarItem(
    `$(star-empty) ${flashType}`,
    vscode.l10n.t("ESP-IDF: Select Flash Method"),
    "espIdf.selectFlashMethodAndFlash",
    94
  );
  statusBarItems["flash"] = createStatusBarItem(
    `$(zap)`,
    vscode.l10n.t("ESP-IDF: Flash Device"),
    "espIdf.flashDevice",
    93
  );
  statusBarItems["monitor"] = createStatusBarItem(
    "$(device-desktop)",
    vscode.l10n.t("ESP-IDF: Monitor Device"),
    "espIdf.monitorDevice",
    92
  );
  statusBarItems["buildFlashMonitor"] = createStatusBarItem(
    "$(flame)",
    vscode.l10n.t("ESP-IDF: Build, Flash and Monitor"),
    "espIdf.buildFlashMonitor",
    91
  );
  statusBarItems["terminal"] = createStatusBarItem(
    "$(terminal)",
    vscode.l10n.t("ESP-IDF: Open ESP-IDF Terminal"),
    "espIdf.createIdfTerminal",
    90
  );
  statusBarItems["espIdf.customTask"] = createStatusBarItem(
    "$(diff-renamed)",
    vscode.l10n.t("ESP-IDF: Execute Custom Task"),
    "espIdf.customTask",
    89
  );
  return statusBarItems;
}

function createStatusBarItem(
  icon: string,
  tooltip: string,
  cmd: string,
  priority: number
) {
  const alignment: vscode.StatusBarAlignment = vscode.StatusBarAlignment.Left;
  const statusBarItem = vscode.window.createStatusBarItem(alignment, priority);
  statusBarItem.text = icon;
  statusBarItem.tooltip = tooltip;
  statusBarItem.command = cmd;
  statusBarItem.show();
  return statusBarItem;
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
  encryptPartition: boolean = false,
  flashType?: ESP.FlashType
) => {
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
        await startFlashing(cancelToken, flashType, encryptPartition);
        OutputChannel.appendLine(
          "Flash has finished. You can monitor with ESP-IDF: Monitor your device command"
        );
      }
    );
  });
};

function createQemuMonitor(
  noReset: boolean = false,
  enableTimestamps: boolean = false,
  customTimestampFormat: string = ""
) {
  PreCheck.perform([openFolderCheck], async () => {
    const isQemuLaunched = await qemuManager.isRunning();
    if (!isQemuLaunched) {
      vscode.window.showInformationMessage(
        vscode.l10n.t("QEMU is not running. Run first.")
      );
      return;
    }
    const qemuTcpPort = idfConf.readParameter(
      "idf.qemuTcpPort",
      workspaceRoot
    ) as number;
    const serialPort = `socket://localhost:${qemuTcpPort}`;
    const idfMonitor = await createNewIdfMonitor(
      workspaceRoot,
      noReset,
      enableTimestamps,
      customTimestampFormat,
      serialPort
    );
    if (monitorTerminal) {
      monitorTerminal.sendText(ESP.CTRL_RBRACKET);
      monitorTerminal.sendText(`exit`);
    }
    monitorTerminal = idfMonitor.start();
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
        canContinue = await startFlashing(cancelToken, flashType, false);
        if (!canContinue) {
          return;
        }
        if (runMonitor) {
          progress.report({
            message: "Launching monitor...",
            increment: 10,
          });
          if (monitorTerminal) {
            monitorTerminal.sendText(ESP.CTRL_RBRACKET);
            monitorTerminal.sendText(`exit`);
          }
          createMonitor();
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

  const port = idfConf.readParameter("idf.port", workspaceRoot);
  const flashBaudRate = idfConf.readParameter(
    "idf.flashBaudRate",
    workspaceRoot
  );
  if (monitorTerminal) {
    monitorTerminal.sendText(ESP.CTRL_RBRACKET);
  }
  const canFlash = await verifyCanFlash(flashBaudRate, port, workspaceRoot);
  if (!canFlash) {
    return;
  }

  if (flashType === ESP.FlashType.JTAG) {
    const openOcdMinCheck = await minOpenOcdVersionCheck();
    PreCheck.perform([openOcdMinCheck], async () => {
      return await jtagFlashCommand(workspaceRoot);
    });
  } else {
    const arrDfuDevices = idfConf.readParameter(
      "idf.listDfuDevices",
      workspaceRoot
    ) as string[];
    if (flashType === ESP.FlashType.DFU && arrDfuDevices.length > 1) {
      await selectDfuDevice(arrDfuDevices);
    }
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
  PreCheck.perform([webIdeCheck, openFolderCheck], () => {
    const modifiedEnv = utils.appendIdfAndToolsToPath(workspaceRoot);
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

function createMonitor() {
  PreCheck.perform([webIdeCheck, openFolderCheck], async () => {
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
    await createIdfMonitor(noReset, enableTimestamps, customTimestampFormat);
  });
}

async function createIdfMonitor(
  noReset: boolean = false,
  enableTimestamps: boolean = false,
  customTimestampFormat: string = ""
) {
  const idfMonitor = await createNewIdfMonitor(
    workspaceRoot,
    noReset,
    enableTimestamps,
    customTimestampFormat
  );
  if (monitorTerminal) {
    monitorTerminal.sendText(ESP.CTRL_RBRACKET);
    monitorTerminal.sendText(`exit`);
  }
  monitorTerminal = idfMonitor.start();
  if (noReset) {
    const idfPath = idfConf.readParameter(
      "idf.espIdfPath",
      workspaceRoot
    ) as string;
    const idfVersion = await utils.getEspIdfFromCMake(idfPath);
    if (idfVersion <= "5.0") {
      const monitorDelay = idfConf.readParameter(
        "idf.monitorStartDelayBeforeDebug",
        workspaceRoot
      ) as number;
      await utils.sleep(monitorDelay);
    }
  }
}

export function deactivate() {
  Telemetry.dispose();
  if (monitorTerminal) {
    monitorTerminal.dispose();
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
      Logger.error(error.message, error);
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
