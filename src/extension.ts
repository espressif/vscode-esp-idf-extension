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
import { HeapTraceManager } from "./espIdf/tracing/heapTraceManager";
import {
  AppTraceArchiveTreeDataProvider,
  AppTraceArchiveItems,
  TraceType,
} from "./espIdf/tracing/tree/appTraceArchiveTreeDataProvider";
import { AppTraceTreeDataProvider } from "./espIdf/tracing/tree/appTraceTreeDataProvider";
import { ExamplesPlanel } from "./examples/ExamplesPanel";
import * as idfConf from "./idfConfiguration";
import { LocDictionary } from "./localizationDictionary";
import { Logger } from "./logger/logger";
import { OutputChannel } from "./logger/outputChannel";
import * as utils from "./utils";
import { PreCheck } from "./utils";
import {
  getProjectName,
  initSelectedWorkspace,
  updateIdfComponentsTree,
} from "./workspaceConfig";
import { SystemViewResultParser } from "./espIdf/tracing/system-view";
import { Telemetry } from "./telemetry";
import { ESPRainMakerTreeDataProvider } from "./rainmaker";
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
import { installPythonEnvFromIdfTools } from "./pythonManager";
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
import { uartFlashCommand } from "./flash/uartFlash";
import { jtagFlashCommand } from "./flash/jtagCmd";
import { createMonitorTerminal } from "./espIdf/monitor/command";
import { KconfigLangClient } from "./kconfig";
import { configureProjectWithGcov } from "./coverage/configureProject";
import { ComponentManagerUIPanel } from "./component-manager/panel";
import { copyOpenOcdRules } from "./setup/addOpenOcdRules";
import { verifyAppBinary } from "./espIdf/debugAdapter/verifyApp";
import { mergeFlashBinaries } from "./qemu/mergeFlashBin";
import { IQemuOptions, QemuManager } from "./qemu/qemuManager";

// Global variables shared by commands
let workspaceRoot: vscode.Uri;
const DEBUG_DEFAULT_PORT = 43474;
let covRenderer: CoverageRenderer;

// OpenOCD  and Debug Adapter Manager
const statusBarItems: vscode.StatusBarItem[] = [];

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
let heapTraceManager: HeapTraceManager;

// ESP-IDF Search results
let idfSearchResults: vscode.TreeView<DocSearchResult>;

// ESP Rainmaker
let rainMakerTreeDataProvider: ESPRainMakerTreeDataProvider;

// ESP eFuse Explorer
let eFuseExplorer: ESPEFuseTreeDataProvider;

// Process to execute build, debug or monitor
let monitorTerminal: vscode.Terminal;
const locDic = new LocDictionary(__filename);

// Websocket Server
let wsServer: WSServer;

// Precheck methods and their messages
const openFolderMsg = locDic.localize(
  "extension.openFolderFirst",
  "Open a folder first."
);
const cmdNotForWebIdeMsg = locDic.localize(
  "extension.cmdNotWebIDE",
  "Selected command is not available in WebIDE"
);
const openFolderCheck = [
  PreCheck.isWorkspaceFolderOpen,
  openFolderMsg,
] as utils.PreCheckInput;
const webIdeCheck = [
  PreCheck.notUsingWebIde,
  cmdNotForWebIdeMsg,
] as utils.PreCheckInput;

const minOpenOcdVersionCheck = async function () {
  const currOpenOcdVersion = await openOCDManager.version();
  return [
    PreCheck.openOCDVersionValidator(
      "v0.10.0-esp32-20201125",
      currOpenOcdVersion
    ),
    `Minimum OpenOCD version v0.10.0-esp32-20201125 is required while you have ${currOpenOcdVersion} version installed`,
  ] as utils.PreCheckInput;
};

const minIdfVersionCheck = async function (minVersion: string) {
  const espIdfPath = idfConf.readParameter("idf.espIdfPath") as string;
  const gitPath = idfConf.readParameter("idf.gitPath") || "git";
  const currentVersion = await utils.getEspIdfVersion(espIdfPath, gitPath);
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

  // Create a status bar item with current workspace
  const status = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    1000000
  );
  statusBarItems.push(status);
  context.subscriptions.push(status);

  // Status Bar Item with common commands
  creatCmdsStatusBarItems();

  // Create Kconfig Language Server Client
  KconfigLangClient.startKconfigLangServer(context);

  // Register Tree Provider for IDF Explorer
  registerTreeProvidersForIDFExplorer(context);
  appTraceManager = new AppTraceManager(
    appTraceTreeDataProvider,
    appTraceArchiveTreeDataProvider
  );
  heapTraceManager = new HeapTraceManager(
    appTraceTreeDataProvider,
    appTraceArchiveTreeDataProvider
  );

  // register openOCD status bar item
  registerOpenOCDStatusBarItem(context);

  registerQemuStatusBarItem(context);

  if (PreCheck.isWorkspaceFolderOpen()) {
    workspaceRoot = initSelectedWorkspace(status);
    const coverageOptions = getCoverageOptions();
    covRenderer = new CoverageRenderer(workspaceRoot, coverageOptions);
  }
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
          workspaceRoot = initSelectedWorkspace(status);
          const coverageOptions = getCoverageOptions();
          covRenderer = new CoverageRenderer(workspaceRoot, coverageOptions);
          break;
        }
      }
      if (typeof workspaceRoot === undefined) {
        workspaceRoot = initSelectedWorkspace(status);
        const coverageOptions = getCoverageOptions();
        covRenderer = new CoverageRenderer(workspaceRoot, coverageOptions);
      }
      const projectName = await getProjectName(workspaceRoot.fsPath);
      const projectElfFile = `${path.join(
        workspaceRoot.fsPath,
        "build",
        projectName
      )}.elf`;
      const debugAdapterConfig = {
        currentWorkspace: workspaceRoot,
        elfFile: projectElfFile,
      } as IDebugAdapterConfig;
      debugAdapterManager.configureAdapter(debugAdapterConfig);
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

  vscode.window.onDidCloseTerminal(async (terminal: vscode.Terminal) => {
    const terminalPid = await terminal.processId;
    const monitorTerminalPid = monitorTerminal
      ? await monitorTerminal.processId
      : -1;
    if (monitorTerminalPid === terminalPid) {
      monitorTerminal = undefined;
      kill(monitorTerminalPid, "SIGKILL");
    }
  });

  registerIDFCommand("espIdf.createFiles", async () => {
    PreCheck.perform([openFolderCheck], async () => {
      try {
        vscode.window.withProgress(
          {
            cancellable: true,
            location: vscode.ProgressLocation.Notification,
            title: "Creating ESP-IDF Project...",
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
                  label: `Use current folder (${workspaceRoot.fsPath})`,
                  target: "current",
                },
                { label: "Choose a container directory...", target: "another" },
              ],
              { placeHolder: "Select a directory to use" }
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
              { placeHolder: "Select a template to use" }
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
            await utils.createSkeleton(resultFolder, selectedTemplate.target);
            if (selectedTemplate.label === "arduino-as-component") {
              const gitPath =
                ((await idfConf.readParameter("idf.gitPath")) as string) ||
                "git";
              const arduinoComponentManager = new ArduinoComponentInstaller(
                resultFolder,
                gitPath
              );
              cancelToken.onCancellationRequested(() => {
                arduinoComponentManager.cancel();
              });
              await arduinoComponentManager.addArduinoAsComponent();
            }
            const projectPath = vscode.Uri.file(resultFolder);
            vscode.commands.executeCommand(
              "vscode.openFolder",
              projectPath,
              true
            );
            const defaultFoldersMsg = locDic.localize(
              "extension.defaultFoldersGeneratedMessage",
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
      const buildDir = path.join(workspaceRoot.fsPath, "build");
      const buildDirExists = await utils.dirExistPromise(buildDir);
      if (!buildDirExists) {
        return Logger.warnNotify(
          `There is no build directory to clean, exiting!`
        );
      }
      const cmakeCacheFile = path.join(buildDir, "CMakeCache.txt");
      const doesCmakeCacheExists = utils.canAccessFile(
        cmakeCacheFile,
        constants.R_OK
      );
      if (!doesCmakeCacheExists) {
        return Logger.warnNotify(
          `There is no build directory to clean, exiting!`
        );
      }
      if (BuildTask.isBuilding || FlashTask.isFlashing) {
        return Logger.warnNotify(
          `There is a build or flash task running. Wait for it to finish or cancel before clean.`
        );
      }

      try {
        await del(buildDir, { force: true });
      } catch (error) {
        Logger.errorNotify(error.message, error);
      }
    });
  });

  registerIDFCommand("espIdf.eraseFlash", async () => {
    PreCheck.perform([webIdeCheck], async () => {
      const pythonBinPath = idfConf.readParameter(
        "idf.pythonBinPath"
      ) as string;
      const idfPathDir = idfConf.readParameter("idf.espIdfPath") as string;
      const port = idfConf.readParameter("idf.port") as string;
      const flashScriptPath = path.join(
        idfPathDir,
        "components",
        "esptool_py",
        "esptool",
        "esptool.py"
      );

      vscode.window.withProgress(
        {
          cancellable: true,
          location: vscode.ProgressLocation.Notification,
          title: "Erasing device flash memory (erase_flash)",
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
      vscode.window.withProgress(
        {
          cancellable: true,
          location: vscode.ProgressLocation.Notification,
          title: "Arduino ESP32 as ESP-IDF Component",
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
              (await idfConf.readParameter("idf.gitPath")) || "git";
            const arduinoComponentManager = new ArduinoComponentInstaller(
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
              return Logger.infoNotify(`${arduinoDirPath} already exists.`);
            }
            await arduinoComponentManager.addArduinoAsComponent();
          } catch (error) {
            Logger.errorNotify(error.message, error);
          }
        }
      );
    });
  });

  registerIDFCommand("espIdf.getEspAdf", getEspAdf);

  registerIDFCommand("espIdf.getEspMdf", getEspMdf);

  registerIDFCommand("espIdf.selectPort", () => {
    PreCheck.perform([webIdeCheck], SerialPort.shared().promptUserToSelect);
  });

  registerIDFCommand("espIdf.pickAWorkspaceFolder", () => {
    PreCheck.perform([openFolderCheck], async () => {
      const selectCurrentFolderMsg = locDic.localize(
        "espIdf.pickAWorkspaceFolder.text",
        "Select your current folder"
      );
      try {
        const option = await vscode.window.showWorkspaceFolderPick({
          placeHolder: selectCurrentFolderMsg,
        });
        if (!option) {
          const noFolderMsg = locDic.localize(
            "extension.noFolderMessage",
            "No workspace selected."
          );
          Logger.infoNotify(noFolderMsg);
          return;
        }
        workspaceRoot = option.uri;
        const projDescPath = path.join(
          workspaceRoot.fsPath,
          "build",
          "project_description.json"
        );
        updateIdfComponentsTree(projDescPath);
        const workspaceFolderInfo = {
          clickCommand: "espIdf.pickAWorkspaceFolder",
          currentWorkSpace: option.name,
          tooltip: option.uri.fsPath,
        };
        utils.updateStatus(status, workspaceFolderInfo);
        const debugAdapterConfig = {
          currentWorkspace: workspaceRoot,
        } as IDebugAdapterConfig;
        debugAdapterManager.configureAdapter(debugAdapterConfig);
        ConfserverProcess.dispose();
        const coverageOptions = getCoverageOptions();
        covRenderer = new CoverageRenderer(workspaceRoot, coverageOptions);
      } catch (error) {
        Logger.errorNotify(error.message, error);
      }
    });
  });

  registerIDFCommand("espIdf.selectConfTarget", () => {
    idfConf.chooseConfigurationTarget();
  });

  registerIDFCommand("espIdf.setPath", () => {
    PreCheck.perform([webIdeCheck], async () => {
      const selectFrameworkMsg = locDic.localize(
        "selectFrameworkMessage",
        "Select framework to define its path:"
      );
      try {
        const option = await vscode.window.showQuickPick(
          [
            { description: "IDF_PATH Path", label: "IDF_PATH", target: "esp" },
            {
              description: "Set IDF_TOOLS_PATH Path",
              label: "IDF_TOOLS_PATH",
              target: "idfTools",
            },
            {
              description: "Set paths to append to PATH",
              label: "Custom extra paths",
              target: "customExtraPath",
            },
          ],
          { placeHolder: selectFrameworkMsg }
        );
        if (!option) {
          const noOptionMsg = locDic.localize(
            "extension.noOptionMessage",
            "No option selected."
          );
          Logger.infoNotify(noOptionMsg);
          return;
        }
        let currentValue;
        let msg: string;
        let paramName: string;
        switch (option.target) {
          case "esp":
            msg = locDic.localize(
              "extension.enterIdfPathMessage",
              "Enter IDF_PATH Path"
            );
            paramName = "idf.espIdfPath";
            break;
          case "idfTools":
            msg = locDic.localize(
              "extension.enterIdfToolsPathMessage",
              "Enter IDF_TOOLS_PATH path"
            );
            paramName = "idf.toolsPath";
            break;
          case "customExtraPath":
            msg = locDic.localize(
              "extension.enterCustomPathsMessage",
              "Enter extra paths to append to PATH"
            );
            paramName = "idf.customExtraPaths";
            break;
          default:
            const noPathUpdatedMsg = locDic.localize(
              "extension.noPathUpdatedMessage",
              "No path has been updated"
            );
            Logger.infoNotify(noPathUpdatedMsg);
            break;
        }
        if (msg && paramName) {
          currentValue = idfConf.readParameter(paramName);
          await idfConf.updateConfParameter(
            paramName,
            msg,
            currentValue,
            option.label
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

  registerIDFCommand("espIdf.configDevice", async () => {
    const selectConfigMsg = locDic.localize(
      "extension.selectConfigMessage",
      "Select option to define its path :"
    );
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
            description:
              "Relative paths to OpenOCD Scripts directory separated by comma(,)",
            label: "OpenOcd Config Files",
            target: "openOcdConfig",
          },
        ],
        { placeHolder: selectConfigMsg }
      );
      if (!option) {
        const noOptionMsg = locDic.localize(
          "extension.noOptionMessage",
          "No option selected."
        );
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
          msg = locDic.localize(
            "extension.enterDevicePortMessage",
            "Enter device port Path"
          );
          paramName = "idf.port";
          break;
        case "flashBaudRate":
          msg = locDic.localize(
            "extension.enterFlashBaudRateMessage",
            "Enter flash baud rate"
          );
          paramName = "idf.flashBaudRate";
          break;
        case "openOcdConfig":
          msg = locDic.localize(
            "extension.enterOpenOcdConfigMessage",
            "Enter OpenOCD Configuration File Paths list"
          );
          paramName = "idf.openOcdConfigs";
          break;
        default:
          const noParamUpdatedMsg = locDic.localize(
            "extension.noParamUpdatedMessage",
            "No device parameter has been updated"
          );
          Logger.infoNotify(noParamUpdatedMsg);
          break;
      }
      if (msg && paramName) {
        currentValue = idfConf.readParameter(paramName);
        if (currentValue instanceof Array) {
          currentValue = currentValue.join(",");
        }
        await idfConf.updateConfParameter(
          paramName,
          msg,
          currentValue,
          option.label
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

  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("idf.openOcdConfigs")) {
      const openOcdConfigFilesList = idfConf.readParameter(
        "idf.openOcdConfigs"
      );
      const openOCDConfig: IOpenOCDConfig = {
        openOcdConfigFilesList,
      } as IOpenOCDConfig;
      openOCDManager.configureServer(openOCDConfig);
    } else if (e.affectsConfiguration("idf.adapterTargetName")) {
      const debugAdapterConfig = {
        target: idfConf.readParameter("idf.adapterTargetName"),
      } as IDebugAdapterConfig;
      debugAdapterManager.configureAdapter(debugAdapterConfig);
    } else if (e.affectsConfiguration("idf.espIdfPath")) {
      ESP.URL.Docs.IDF_INDEX = undefined;
    } else if (e.affectsConfiguration("idf.qemuTcpPort")) {
      qemuManager.configure({
        tcpPort: idfConf.readParameter("idf.qemuTcpPort"),
      } as IQemuOptions);
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
            logLevel: session.configuration.logLevel,
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
            isPostMortemDebugMode: false,
            isOocdDisabled: false,
            logLevel: session.configuration.logLevel,
          } as IDebugAdapterConfig;
          debugAdapterManager.configureAdapter(debugAdapterConfig);
          await debugAdapterManager.start();
        }
        const useMonitorWithDebug = idfConf.readParameter(
          "idf.launchMonitorOnDebugSession"
        );
        if (
          (session.configuration.sessionID !== "core-dump.debug.session.ws" ||
            session.configuration.sessionID !== "gdbstub.debug.session.ws") &&
          useMonitorWithDebug
        ) {
          isMonitorLaunchedByDebug = true;
          await createMonitor();
        }
        return new vscode.DebugAdapterServer(portToUse);
      } catch (error) {
        const errMsg = error.message || "Error starting ESP-IDF Debug Adapter";
        return Logger.errorNotify(errMsg, error);
      }
    },
  });

  vscode.debug.registerDebugAdapterTrackerFactory("espidf", {
    createDebugAdapterTracker(session: vscode.DebugSession) {
      return {
        onWillReceiveMessage: (m) => {
          const useMonitorWithDebug = idfConf.readParameter(
            "idf.launchMonitorOnDebugSession"
          );
          if (
            m &&
            m.command &&
            m.command === "stackTrace" &&
            (session.configuration.sessionID !== "core-dump.debug.session.ws" ||
              session.configuration.sessionID !== "gdbstub.debug.session.ws") &&
            monitorTerminal &&
            useMonitorWithDebug
          ) {
            monitorTerminal.show();
          }
        },
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
      await previewReport(workspaceRoot.fsPath);
    });
  });

  registerIDFCommand("espIdf.getProjectName", () => {
    return PreCheck.perform([openFolderCheck], async () => {
      return await getProjectName(workspaceRoot.fsPath);
    });
  });

  registerIDFCommand("espIdf.searchInEspIdfDocs", async () => {
    vscode.window.withProgress(
      {
        cancellable: true,
        location: vscode.ProgressLocation.Notification,
        title: "ESP-IDF Docs search results",
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
          const searchResults = await seachInEspDocs(selection);
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
      vscode.window.withProgress(
        {
          cancellable: true,
          location: vscode.ProgressLocation.Notification,
          title: "ESP-IDF:",
        },
        async (
          progress: vscode.Progress<{ message: string; increment?: number }>,
          cancelToken: vscode.CancellationToken
        ) => {
          try {
            const espIdfPath = idfConf.readParameter(
              "idf.espIdfPath"
            ) as string;
            const gitPath =
              (idfConf.readParameter("idf.gitPath") as string) || "git";
            const containerPath =
              process.platform === "win32"
                ? process.env.USERPROFILE
                : process.env.HOME;
            const confToolsPath = idfConf.readParameter(
              "idf.toolsPath"
            ) as string;
            const toolsPath =
              confToolsPath ||
              process.env.IDF_TOOLS_PATH ||
              path.join(containerPath, ".espressif");
            const pyPath = idfConf.readParameter("idf.pythonBinPath") as string;
            progress.report({
              message: `Installing ESP-IDF Python Requirements...`,
            });
            await installPythonEnvFromIdfTools(
              espIdfPath,
              toolsPath,
              undefined,
              pyPath,
              gitPath,
              OutputChannel.init(),
              cancelToken
            );
            vscode.window.showInformationMessage(
              "ESP-IDF Python Requirements has been installed"
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

  registerIDFCommand("espIdf.getXtensaGdb", () => {
    return PreCheck.perform([openFolderCheck], async () => {
      const modifiedEnv = utils.appendIdfAndToolsToPath();
      const idfTarget = modifiedEnv.IDF_TARGET || "esp32";
      const gdbTool =
        idfTarget === "esp32c3"
          ? "riscv32-esp-elf-gdb"
          : `xtensa-${idfTarget}-elf-gdb`;
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
      const modifiedEnv = utils.appendIdfAndToolsToPath();
      const idfTarget = modifiedEnv.IDF_TARGET || "esp32";
      const gccTool =
        idfTarget === "esp32c3"
          ? "riscv32-esp-elf-gcc"
          : `xtensa-${idfTarget}-elf-gcc`;
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

  registerIDFCommand("espIdf.copyOpenOcdRules", async () => {
    if (process.platform !== "linux") {
      return Logger.infoNotify("This command is for linux users.");
    }
    try {
      await copyOpenOcdRules();
      vscode.window.showInformationMessage(
        "openOCD rules file has been copied"
      );
    } catch (error) {
      const msg = error.message
        ? error.message
        : "Error copying openOCD rules file";
      return Logger.errorNotify(msg, error);
    }
  });

  registerIDFCommand("espIdf.createVsCodeFolder", () => {
    PreCheck.perform([openFolderCheck], async () => {
      try {
        await utils.createVscodeFolder(workspaceRoot.fsPath);
        Logger.infoNotify(
          "ESP-IDF vscode files have been added to the project."
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
          "ESP-IDF container files have been added to the project."
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
          placeHolder: "Enter ESP-IDF component name",
          value: "",
        });
        if (!componentName) {
          return;
        }
        await utils.createNewComponent(componentName, workspaceRoot.fsPath);
        Logger.infoNotify(
          `The ESP-IDF component ${componentName} has been created`
        );
      } catch (error) {
        const errMsg = error.message || "Error creating ESP-IDF component";
        return Logger.errorNotify(errMsg, error);
      }
    });
  });

  registerIDFCommand("espIdf.createIdfTerminal", createIdfTerminal);

  registerIDFCommand("espIdf.flashDevice", flash);
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
        vscode.window.withProgress(
          {
            cancellable: true,
            location: vscode.ProgressLocation.Notification,
            title: "ESP-IDF: Menuconfig",
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
      const enterDeviceTargetMsg = locDic.localize(
        "extension.enterDeviceTargetMessage",
        "Enter target name (IDF_TARGET)"
      );
      const selectedTarget = await vscode.window.showQuickPick(
        [
          { description: "ESP32", label: "ESP32", target: "esp32" },
          { description: "ESP32-S2", label: "ESP32-S2", target: "esp32s2" },
          { description: "ESP32-S3", label: "ESP32-S3", target: "esp32s3" },
          {
            description: "ESP32-C3 (Built-in USB JTAG)",
            label: "ESP32-C3 (Built-in USB JTAG)",
            target: "esp32c3",
            type: "usb",
          },
          {
            description: "ESP32-C3 (ESP-PROG JTAG)",
            label: "ESP32-C3 (ESP-PROG JTAG)",
            target: "esp32c3",
            type: "prog",
          },
          {
            description: "Custom target",
            label: "Custom target",
            target: "custom",
          },
        ],
        { placeHolder: enterDeviceTargetMsg }
      );
      if (!selectedTarget) {
        return;
      }
      const configurationTarget = idfConf.readParameter("idf.saveScope");
      if (selectedTarget.target === "custom") {
        const customIdfTarget = await vscode.window.showInputBox({
          placeHolder: enterDeviceTargetMsg,
          value: "",
        });
        if (!customIdfTarget) {
          return;
        }
        await idfConf.writeParameter(
          "idf.adapterTargetName",
          selectedTarget.target,
          configurationTarget
        );
        await idfConf.writeParameter(
          "idf.customAdapterTargetName",
          customIdfTarget,
          configurationTarget
        );
        return Logger.infoNotify(
          `IDF_TARGET has been set to custom. Remember to set the configuration files for OpenOCD`
        );
      }
      await idfConf.writeParameter(
        "idf.adapterTargetName",
        selectedTarget.target,
        configurationTarget
      );
      if (selectedTarget.target === "esp32") {
        await idfConf.writeParameter(
          "idf.openOcdConfigs",
          ["interface/ftdi/esp32_devkitj_v1.cfg", "target/esp32.cfg"],
          configurationTarget
        );
      }
      if (selectedTarget.target === "esp32s2") {
        await idfConf.writeParameter(
          "idf.openOcdConfigs",
          ["interface/ftdi/esp32_devkitj_v1.cfg", "target/esp32s2.cfg"],
          configurationTarget
        );
      }
      if (selectedTarget.target === "esp32s3") {
        await idfConf.writeParameter(
          "idf.openOcdConfigs",
          ["interface/ftdi/esp32_devkitj_v1.cfg", "target/esp32s3.cfg"],
          configurationTarget
        );
      }
      if (
        selectedTarget.target === "esp32c3" &&
        selectedTarget.type === "usb"
      ) {
        await idfConf.writeParameter(
          "idf.openOcdConfigs",
          ["board/esp32c3-builtin.cfg"],
          configurationTarget
        );
      }
      if (
        selectedTarget.target === "esp32c3" &&
        selectedTarget.type === "prog"
      ) {
        await idfConf.writeParameter(
          "idf.openOcdConfigs",
          ["board/esp32c3-ftdi.cfg"],
          configurationTarget
        );
      }
      await vscode.window.withProgress(
        {
          cancellable: false,
          location: vscode.ProgressLocation.Notification,
          title: "ESP-IDF: Setting device target...",
        },
        async (
          progress: vscode.Progress<{ message: string; increment: number }>
        ) => {
          try {
            const idfPathDir = idfConf.readParameter("idf.espIdfPath");
            const idfPy = path.join(idfPathDir, "tools", "idf.py");
            const modifiedEnv = utils.appendIdfAndToolsToPath();
            const pythonBinPath = idfConf.readParameter(
              "idf.pythonBinPath"
            ) as string;
            const setTargetResult = await utils.spawn(
              pythonBinPath,
              [idfPy, "set-target", selectedTarget.target],
              {
                cwd: workspaceRoot.fsPath,
                env: modifiedEnv,
              }
            );
            Logger.info(setTargetResult.toString());
            OutputChannel.append(setTargetResult.toString());
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
    });
  });

  registerIDFCommand("espIdf.setup.start", (setupArgs?: ISetupInitArgs) => {
    PreCheck.perform([webIdeCheck], async () => {
      try {
        if (SetupPanel.isCreatedAndHidden()) {
          SetupPanel.createOrShow(context.extensionPath);
          return;
        }
        await vscode.window.withProgress(
          {
            cancellable: false,
            location: vscode.ProgressLocation.Notification,
            title: "ESP-IDF: Configure extension",
          },
          async (
            progress: vscode.Progress<{ message: string; increment: number }>
          ) => {
            try {
              setupArgs = setupArgs
                ? setupArgs
                : await getSetupInitialValues(context.extensionPath, progress);
              SetupPanel.createOrShow(context.extensionPath, setupArgs);
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

  registerIDFCommand("espIdf.examples.start", () => {
    try {
      vscode.window.withProgress(
        {
          cancellable: false,
          location: vscode.ProgressLocation.Notification,
          title: "ESP-IDF: Loading examples",
        },
        async (
          progress: vscode.Progress<{ message: string; increment: number }>
        ) => {
          try {
            const espIdfPath = idfConf.readParameter(
              "idf.espIdfPath"
            ) as string;
            const espAdfPath = idfConf.readParameter(
              "idf.espAdfPath"
            ) as string;
            const espMdfPath = idfConf.readParameter(
              "idf.espMdfPath"
            ) as string;

            const pickItems = [];
            const doesIdfPathExists = await utils.dirExistPromise(espIdfPath);
            if (doesIdfPathExists) {
              pickItems.push({
                description: "ESP-IDF",
                label: `Use current ESP-IDF (${espIdfPath})`,
                target: espIdfPath,
              });
            }
            const doesAdfPathExists = await utils.dirExistPromise(espAdfPath);
            if (doesAdfPathExists) {
              pickItems.push({
                description: "ESP-ADF",
                label: `Use current ESP-ADF (${espAdfPath})`,
                target: espAdfPath,
              });
            }
            const doesMdfPathExists = await utils.dirExistPromise(espMdfPath);
            if (doesMdfPathExists) {
              pickItems.push({
                description: "ESP-MDF",
                label: `Use current ESP-MDF (${espMdfPath})`,
                target: espMdfPath,
              });
            }
            const examplesFolder = await vscode.window.showQuickPick(
              pickItems,
              { placeHolder: "Select framework to use" }
            );
            if (!examplesFolder) {
              Logger.infoNotify("No framework selected to load examples.");
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
          "Cannot call this command directly, right click on any CMakeLists.txt file!",
          new Error("INVALID_INVOCATION")
        );
        return;
      }
      PreCheck.perform([openFolderCheck], async () => {
        await CmakeListsEditorPanel.createOrShow(
          context.extensionPath,
          fileUri
        );
      });
    }
  );

  registerIDFCommand("espIdf.newProject.start", () => {
    if (NewProjectPanel.isCreatedAndHidden()) {
      NewProjectPanel.createOrShow(context.extensionPath);
      return;
    }
    vscode.window.withProgress(
      {
        cancellable: false,
        location: vscode.ProgressLocation.Notification,
        title: "ESP-IDF: New Project",
      },
      async (
        progress: vscode.Progress<{ increment: number; message: string }>,
        cancelToken: vscode.CancellationToken
      ) => {
        try {
          const newProjectArgs = await getNewProjectArgs(
            context.extensionPath,
            progress
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
    const openOcfConfigs = idfConf.readParameter("idf.openOcdConfigs");
    let result = "";
    openOcfConfigs.forEach((configFile) => {
      result = result + " -f " + configFile;
    });
    return result.trim();
  });

  registerIDFCommand("espIdf.selectOpenOcdConfigFiles", async () => {
    try {
      const openOcdScriptsPath = getOpenOcdScripts();
      const boards = await getBoards(openOcdScriptsPath);
      const choices = boards.map((b) => {
        return {
          description: `${b.description} (${b.configFiles})`,
          label: b.name,
          target: b,
        };
      });
      const selectOpenOCdConfigsMsg = locDic.localize(
        "extension.enterOpenOcdConfigMessage",
        "Enter OpenOCD Configuration File Paths list"
      );
      const selectedBoard = await vscode.window.showQuickPick(choices, {
        placeHolder: selectOpenOCdConfigsMsg,
      });
      if (!selectedBoard) {
        return;
      }
      const target = idfConf.readParameter("idf.saveScope");
      if (
        !PreCheck.isWorkspaceFolderOpen() &&
        target !== vscode.ConfigurationTarget.Global
      ) {
        const noWsOpenMSg = `Open a workspace or folder first.`;
        Logger.warnNotify(noWsOpenMSg);
        throw new Error(noWsOpenMSg);
      }
      await idfConf.writeParameter(
        "idf.openOcdConfigs",
        selectedBoard.target.configFiles,
        target
      );
      Logger.infoNotify("OpenOCD Board configuration files are updated.");
    } catch (error) {
      const errMsg =
        error.message || "Failed to select openOCD configuration files";
      Logger.errorNotify(errMsg, error);
      return;
    }
  });

  registerIDFCommand("espIdf.getOpenOcdScriptValue", () => {
    const customExtraVars = idfConf.readParameter("idf.customExtraVars");
    try {
      const jsonDict = JSON.parse(customExtraVars);
      return jsonDict.hasOwnProperty("OPENOCD_SCRIPTS")
        ? jsonDict.OPENOCD_SCRIPTS
        : process.env.OPENOCD_SCRIPTS
        ? process.env.OPENOCD_SCRIPTS
        : undefined;
    } catch (error) {
      Logger.error(error, error);
      return process.env.OPENOCD_SCRIPTS
        ? process.env.OPENOCD_SCRIPTS
        : undefined;
    }
  });

  registerIDFCommand("espIdf.size", () => {
    PreCheck.perform([openFolderCheck], () => {
      const idfSize = new IDFSize(workspaceRoot);
      try {
        if (IDFSizePanel.isCreatedAndHidden()) {
          IDFSizePanel.createOrShow(context);
          return;
        }

        vscode.window.withProgress(
          {
            cancellable: true,
            location: vscode.ProgressLocation.Notification,
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
              Logger.errorNotify(error.message, error);
            }
          }
        );
      } catch (error) {
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
      Logger.infoNotify(`${srcFolder[0].fsPath} is not an ESP-IDF project.`);
      return;
    }
    const items = [
      { label: "Choose a container directory...", target: "another" },
    ];
    if (workspaceRoot) {
      items.push({
        label: `Use current folder (${workspaceRoot.fsPath})`,
        target: "current",
      });
    }
    const projectDirOption = await vscode.window.showQuickPick(items, {
      placeHolder: "Select a directory to use",
    });
    if (!projectDirOption) {
      return;
    }
    let destFolder: string;
    if (projectDirOption.target === "another") {
      const newFolder = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
      });
      if (!newFolder || !newFolder.length) {
        return;
      }
      destFolder = newFolder[0].fsPath;
    } else if (workspaceRoot) {
      destFolder = workspaceRoot.fsPath;
    }
    if (!destFolder) {
      return;
    }
    const projectName = await vscode.window.showInputBox({
      placeHolder: "Enter project name",
      value: "",
    });
    if (!projectName) {
      return;
    }
    destFolder = path.join(destFolder, projectName);
    const doesProjectExists = await pathExists(destFolder);
    if (doesProjectExists) {
      Logger.infoNotify(`${destFolder} already exists.`);
      return;
    }
    await utils.copyFromSrcProject(srcFolder[0].fsPath, destFolder);
    await utils.updateProjectNameInCMakeLists(destFolder, projectName);
    const opt = await vscode.window.showInformationMessage(
      "Project has been imported",
      "Open"
    );
    if (opt === "Open") {
      vscode.commands.executeCommand(
        "vscode.openFolder",
        vscode.Uri.file(destFolder),
        true
      );
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
        await appTraceManager.start();
      } else {
        await appTraceManager.stop();
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
          await heapTraceManager.start();
        } else {
          await heapTraceManager.stop();
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
      await vscode.window.withProgress(
        {
          cancellable: true,
          location: vscode.ProgressLocation.Notification,
          title: "Starting ESP-IDF QEMU",
        },
        async (
          progress: vscode.Progress<{ message: string; increment: number }>,
          cancelToken: vscode.CancellationToken
        ) => {
          try {
            const qemuBinExists = await pathExists(
              path.join(workspaceRoot.fsPath, "build", "merged_qemu.bin")
            );
            if (!qemuBinExists) {
              progress.report({
                message: "Merging binaries for flashing",
                increment: 10,
              });
              await mergeFlashBinaries(workspaceRoot.fsPath, cancelToken);
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

  registerIDFCommand("espIdf.qemuDebug", async () => {
    if (qemuManager.isRunning()) {
      qemuManager.stop();
    }
    qemuManager.configure({
      launchArgs: [
        "-nographic",
        "-s",
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
        "target remote :1234",
        "monitor system_reset",
        "tb app_main",
        "c",
      ],
      isPostMortemDebugMode: false,
      isOocdDisabled: true,
      target: "qemu",
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

  registerIDFCommand("espIdf.apptrace.archive.refresh", () => {
    PreCheck.perform([openFolderCheck], () => {
      appTraceArchiveTreeDataProvider.populateArchiveTree();
    });
  });

  registerIDFCommand("espIdf.doctorCommand", async () => {
    await vscode.window.withProgress(
      {
        cancellable: false,
        location: vscode.ProgressLocation.Notification,
        title: "ESP-IDF: Preparing ESP-IDF extension report",
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
        } catch (error) {
          reportedResult.latestError = error;
          const errMsg = error.message
            ? error.message
            : "Configuration report error";
          Logger.error(errMsg, error);
          Logger.warnNotify(
            "Extension configuration report has been copied to clipboard with errors"
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
          "Cannot call this command directly, click on any Trace to view its report!",
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
          const placeHolder =
            "Do you want to view Heap Trace plot or System View Trace";
          const choice = await vscode.window.showQuickPick(
            [
              {
                type: TracingViewType.SystemViewTracing,
                label: "$(symbol-keyword) System View Tracing",
                detail:
                  "Show System View Tracing Plot (will open a webview window)",
              },
              {
                type: TracingViewType.HeapTracingPlot,
                label: "$(graph) Heap Tracing",
                detail: "Open Old Heap/App Trace Panel",
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
            idfPath: idfConf.readParameter("idf.espIdfPath"),
          },
        });
      });
    }
  );

  registerIDFCommand("espIdf.apptrace.customize", () => {
    PreCheck.perform([openFolderCheck], async () => {
      await AppTraceManager.saveConfiguration();
    });
  });

  registerIDFCommand("esp.rainmaker.backend.connect", async () => {
    if (RainmakerAPIClient.isLoggedIn()) {
      return Logger.infoNotify("Already logged-in, please sign-out first");
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

    vscode.window.withProgress(
      {
        title: "Please wait checking with Rainmaker Cloud",
        location: vscode.ProgressLocation.Notification,
        cancellable: false,
      },
      async () => {
        try {
          await RainmakerAPIClient.login(
            accountDetails.username,
            accountDetails.password
          );
          await rainMakerTreeDataProvider.refresh();
          Logger.infoNotify("Rainmaker Cloud Linking Success!!");
        } catch (error) {
          return Logger.errorNotify(
            "Failed to login with Rainmaker Cloud, double check your id and password",
            error
          );
        }
      }
    );
  });

  registerIDFCommand("esp.rainmaker.backend.logout", async () => {
    const shallLogout = await vscode.window.showWarningMessage(
      "Would you like to unlink your ESP Rainmaker cloud account?",
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
        "Would you like to delete this node from your ESP Rainmaker account?",
        { modal: true },
        { title: "Yes" },
        { title: "Cancel", isCloseAffordance: true }
      );
      if (!shallDelete || shallDelete.title === "Cancel") {
        return;
      }
      vscode.window.withProgress(
        {
          title: "Deleting node from your rainmaker account",
          location: vscode.ProgressLocation.Notification,
        },
        async () => {
          try {
            await RainmakerAPIClient.deleteNode(item.id);
            rainMakerTreeDataProvider.refresh();
          } catch (error) {
            Logger.errorNotify(
              "Failed to delete node, maybe the node is already marked for delete, please try again after sometime",
              error
            );
          }
        }
      );
    }
  );
  registerIDFCommand("esp.rainmaker.backend.add_node", async () => {
    Logger.infoNotify(
      "Coming Soon!! until then you can add nodes using mobile app"
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

      vscode.window.withProgress(
        {
          title: "Syncing params, please wait",
          location: vscode.ProgressLocation.Notification,
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
            let errorMsg = "Failed to update the param, please try once more";
            if (error.response) {
              errorMsg = `Failed to update param because, ${error.response.data.description}`;
            }
            Logger.errorNotify(errorMsg, error);
          }
        }
      );
    }
  );
  registerIDFCommand("espIdf.launchWSServerAndMonitor", async () => {
    const port = idfConf.readParameter("idf.port") as string;
    if (!port) {
      try {
        await vscode.commands.executeCommand("espIdf.selectPort");
      } catch (error) {
        Logger.error("Unable to execute the command: espIdf.selectPort", error);
      }
      return Logger.errorNotify(
        "Select a serial port before flashing",
        new Error("NOT_SELECTED_PORT")
      );
    }
    let sdkMonitorBaudRate: string = utils.getMonitorBaudRate(
      workspaceRoot.fsPath
    );
    const pythonBinPath = idfConf.readParameter("idf.pythonBinPath") as string;
    if (!utils.canAccessFile(pythonBinPath, constants.R_OK)) {
      Logger.errorNotify(
        "Python binary path is not defined",
        new Error("idf.pythonBinPath is not defined")
      );
    }
    const idfPath = idfConf.readParameter("idf.espIdfPath") as string;
    const idfMonitorToolPath = path.join(idfPath, "tools", "idf_monitor.py");
    if (!utils.canAccessFile(idfMonitorToolPath, constants.R_OK)) {
      Logger.errorNotify(
        idfMonitorToolPath + " is not defined",
        new Error(idfMonitorToolPath + " is not defined")
      );
    }
    const elfFilePath = path.join(
      workspaceRoot.fsPath,
      "build",
      (await getProjectName(workspaceRoot.fsPath.toString())) + ".elf"
    );
    const wsPort = idfConf.readParameter("idf.wssPort");
    const monitor = new IDFMonitor({
      port,
      baudRate: sdkMonitorBaudRate,
      pythonBinPath,
      idfMonitorToolPath,
      elfFilePath,
      wsPort,
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
        vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            cancellable: false,
            title:
              "Core-dump detected, please wait while we parse the data received",
          },
          async (progress) => {
            const espCoreDumpPyTool = new ESPCoreDumpPyTool(idfPath);
            const projectName = await getProjectName(workspaceRoot.fsPath);
            const coreElfFilePath = path.join(
              workspaceRoot.fsPath,
              "build",
              `${projectName}.coredump.elf`
            );
            if (
              (await espCoreDumpPyTool.generateCoreELFFile({
                coreElfFilePath,
                coreInfoFilePath: resp.file,
                infoCoreFileFormat: InfoCoreFileFormat.Base64,
                progELFFilePath: resp.prog,
                pythonBinPath,
              })) === true
            ) {
              progress.report({
                message:
                  "Successfully created ELF file from the info received (espcoredump.py)",
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
                  "Failed to launch debugger for postmortem",
                  error
                );
              }
            } else {
              Logger.warnNotify(
                "Failed to generate the ELF file from the info received, please close the core-dump monitor terminal manually"
              );
            }
          }
        );
      })
      .on("gdb-stub-detected", async (resp) => {
        const setupCmd = [`target remote ${resp.port}`];
        const debugAdapterConfig = {
          initGdbCommands: setupCmd,
          isPostMortemDebugMode: true,
          elfFile: resp.prog,
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
          Logger.errorNotify("Failed to launch debugger for postmortem", error);
        }
      })
      .on("close", (resp) => {
        wsServer.close();
      })
      .on("error", (err) => {
        let message = err.message;
        if (err && err.message.includes("EADDRINUSE")) {
          message = `Your port ${wsPort} is not available, use (idf.wssPort) to change to different port`;
        }
        Logger.errorNotify(message, err);
        wsServer.close();
      });
  });
  registerIDFCommand(
    "esp.webview.open.partition-table",
    async (args?: vscode.Uri) => {
      let filePath = args?.fsPath;
      if (!args) {
        // try to get the partition table name from sdkconfig and if not found create one
        try {
          const isCustomPartitionTableEnabled = utils.getConfigValueFromSDKConfig(
            "CONFIG_PARTITION_TABLE_CUSTOM",
            workspaceRoot.fsPath
          );
          if (isCustomPartitionTableEnabled !== "y") {
            throw new Error(
              "Custom Partition Table not enabled for the project"
            );
          }

          let partitionTableFilePath = utils.getConfigValueFromSDKConfig(
            "CONFIG_PARTITION_TABLE_CUSTOM_FILENAME",
            workspaceRoot.fsPath
          );
          partitionTableFilePath = partitionTableFilePath.replace(/\"/g, "");
          if (!utils.isStringNotEmpty(partitionTableFilePath)) {
            throw new Error(
              "Empty CONFIG_PARTITION_TABLE_CUSTOM_FILENAME, please add a csv file to generate partition table"
            );
          }

          partitionTableFilePath = path.join(
            workspaceRoot.fsPath,
            partitionTableFilePath
          );
          if (!utils.fileExists(partitionTableFilePath)) {
            // inform user and create file.
            Logger.infoNotify(
              `Partition Table File (${partitionTableFilePath}) doesn't exists, we are creating an empty file there`
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
    vscode.window.withProgress(
      {
        title: "Getting eFuse Summary for your chip",
        location: vscode.ProgressLocation.Notification,
      },
      async () => {
        try {
          const eFuse = new ESPEFuseManager();
          const resp = await eFuse.summary();
          eFuseExplorer.load(resp);
          eFuseExplorer.refresh();
        } catch (error) {
          if (error.name === "IDF_VERSION_MIN_REQUIREMENT_ERROR") {
            return Logger.errorNotify(error.message, error);
          }
          Logger.errorNotify(
            "Failed to get the eFuse Summary from the chip, please make sure you have selected a valid port",
            error
          );
        }
      }
    );
  });

  registerIDFCommand("espIdf.ninja.summary", async () => {
    vscode.window.withProgress(
      {
        title: "Getting ninja build summary",
        location: vscode.ProgressLocation.Notification,
      },
      async () => {
        try {
          const pythonBinPath = idfConf.readParameter(
            "idf.pythonBinPath"
          ) as string;
          const ninjaSummaryScript = path.join(
            context.extensionPath,
            "external",
            "chromium",
            "ninja-build-summary.py"
          );
          const buildDir = path.join(workspaceRoot.fsPath, "build");
          const summaryResult = await utils.execChildProcess(
            `${pythonBinPath} ${ninjaSummaryScript} -C ${buildDir}`,
            workspaceRoot.fsPath,
            OutputChannel.init()
          );
          OutputChannel.appendLine(
            `Ninja build summary - ${Date().toLocaleString()}`
          );
          OutputChannel.appendLine(summaryResult);
          OutputChannel.show();
        } catch (error) {
          Logger.errorNotify("Ninja build summary found an error", error);
        }
      }
    );
  });

  registerIDFCommand("espIdf.jtag_flash", async () => {
    const openOcdMinCheck = await minOpenOcdVersionCheck();
    PreCheck.perform(
      [openFolderCheck, webIdeCheck, openOcdMinCheck],
      async () => {
        const port = idfConf.readParameter("idf.port");
        const flashBaudRate = idfConf.readParameter("idf.flashBaudRate");
        if (monitorTerminal) {
          monitorTerminal.sendText(ESP.CTRL_RBRACKET);
        }
        const canFlash = await verifyCanFlash(
          flashBaudRate,
          port,
          workspaceRoot
        );
        if (canFlash) {
          const buildPath = path.join(workspaceRoot.fsPath, "build");
          await jtagFlashCommand(buildPath);
        }
      }
    );
  });
  registerIDFCommand("espIdf.selectFlashMethodAndFlash", () => {
    PreCheck.perform([openFolderCheck, webIdeCheck], async () => {
      await vscode.window.withProgress(
        {
          cancellable: true,
          location: vscode.ProgressLocation.Notification,
          title: "Flashing Project",
        },
        async (
          progress: vscode.Progress<{ message: string; increment: number }>,
          cancelToken: vscode.CancellationToken
        ) => {
          await selectFlashMethod(cancelToken);
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
          Logger.errorNotify(errMsg, error);
        }
      }
      NVSPartitionTable.createOrShow(context.extensionPath, filePath);
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
          vscode.window.withProgress(
            {
              title:
                "Please wait mapping your rainmaker cloud account with the VS Code Extension, this could take a little while",
              location: vscode.ProgressLocation.Notification,
            },
            async () => {
              await RainmakerAPIClient.exchangeCodeForTokens(code);
              await rainMakerTreeDataProvider.refresh();
              Logger.infoNotify(
                "Rainmaker Cloud is connected successfully (via OAuth)!!"
              );
            }
          );
        } catch (error) {
          return Logger.errorNotify(
            "Failed to sign-in with Rainmaker (via OAuth)",
            error,
            { meta: JSON.stringify(error) }
          );
        }
        return;
      }
      Logger.warn(`Failed to handle URI Open, ${uri.toString()}`);
    },
  });
  await checkExtensionSettings(context.extensionPath);
}

function validateInputForRainmakerDeviceParam(
  value: string,
  type: string
): string {
  if (type === "string" && value === "") {
    return "Enter non empty string";
  }
  if (type === "int" && !value.match(/^[0-9]+$/)) {
    return "Enter a valid integer";
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

  vscode.commands.registerCommand("espIdf.clearDocsSearchResult", () => {
    espIdfDocsResultTreeDataProvider.clearResults();
  });

  idfSearchResults = vscode.window.createTreeView("idfSearchResults", {
    treeDataProvider: espIdfDocsResultTreeDataProvider,
  });

  rainMakerTreeDataProvider = new ESPRainMakerTreeDataProvider();

  eFuseExplorer = new ESPEFuseTreeDataProvider();

  context.subscriptions.push(
    appTraceTreeDataProvider.registerDataProviderForTree("idfAppTracer"),
    appTraceArchiveTreeDataProvider.registerDataProviderForTree(
      "idfAppTraceArchive"
    ),
    rainMakerTreeDataProvider.registerDataProviderForTree("espRainmaker"),
    eFuseExplorer.registerDataProviderForTree("espEFuseExplorer")
  );
}

function creatCmdsStatusBarItems() {
  createStatusBarItem(
    "$(plug)",
    "ESP-IDF Select device port",
    "espIdf.selectPort",
    101
  );
  createStatusBarItem(
    "$(gear)",
    "ESP-IDF Launch GUI Configuration tool",
    "espIdf.menuconfig.start",
    100
  );
  createStatusBarItem("$(trash)", "ESP-IDF Full Clean", "espIdf.fullClean", 99);
  createStatusBarItem(
    "$(database)",
    "ESP-IDF Build project",
    "espIdf.buildDevice",
    98
  );
  createStatusBarItem(
    "$(zap)",
    "ESP-IDF Flash device",
    "espIdf.selectFlashMethodAndFlash",
    97
  );
  createStatusBarItem(
    "$(device-desktop)",
    "ESP-IDF Monitor device",
    "espIdf.monitorDevice",
    96
  );
  createStatusBarItem(
    "$(flame)",
    "ESP-IDF Build, Flash and Monitor",
    "espIdf.buildFlashMonitor",
    95
  );
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
  statusBarItems.push(statusBarItem);
}

const build = () => {
  PreCheck.perform([openFolderCheck], async () => {
    await vscode.window.withProgress(
      {
        cancellable: true,
        location: vscode.ProgressLocation.Notification,
        title: "Building Project",
      },
      async (
        progress: vscode.Progress<{ message: string; increment: number }>,
        cancelToken: vscode.CancellationToken
      ) => {
        await buildCommand(workspaceRoot, cancelToken);
      }
    );
  });
};
const flash = () => {
  PreCheck.perform([webIdeCheck, openFolderCheck], async () => {
    await vscode.window.withProgress(
      {
        cancellable: true,
        location: vscode.ProgressLocation.Notification,
        title: "Flashing Project",
      },
      async (
        progress: vscode.Progress<{ message: string; increment: number }>,
        cancelToken: vscode.CancellationToken
      ) => {
        const idfPathDir = idfConf.readParameter("idf.espIdfPath");
        const port = idfConf.readParameter("idf.port");
        const flashBaudRate = idfConf.readParameter("idf.flashBaudRate");
        if (monitorTerminal) {
          monitorTerminal.sendText(ESP.CTRL_RBRACKET);
        }
        const canFlash = await verifyCanFlash(
          flashBaudRate,
          port,
          workspaceRoot
        );
        if (canFlash) {
          await uartFlashCommand(
            cancelToken,
            flashBaudRate,
            idfPathDir,
            port,
            workspaceRoot
          );
        }
      }
    );
  });
};

function createQemuMonitor() {
  PreCheck.perform([openFolderCheck], async () => {
    const isQemuLaunched = await qemuManager.isRunning();
    if (!isQemuLaunched) {
      vscode.window.showInformationMessage("QEMU is not running. Run first.");
      return;
    }
    const qemuTcpPort = idfConf.readParameter("idf.qemuTcpPort") as number;
    const serialPort = `socket://localhost:${qemuTcpPort}`;
    await createMonitorTerminal(monitorTerminal, workspaceRoot, serialPort);
  });
}

const buildFlashAndMonitor = async (runMonitor: boolean = true) => {
  PreCheck.perform([openFolderCheck], async () => {
    await vscode.window.withProgress(
      {
        cancellable: true,
        location: vscode.ProgressLocation.Notification,
        title: "Building Project",
      },
      async (
        progress: vscode.Progress<{ message: string; increment: number }>,
        cancelToken: vscode.CancellationToken
      ) => {
        progress.report({ message: "Building project...", increment: 20 });
        let canContinue = await buildCommand(workspaceRoot, cancelToken);
        if (!canContinue) {
          return;
        }
        progress.report({
          message: "Flashing project into device...",
          increment: 60,
        });
        canContinue = await selectFlashMethod(cancelToken);
        if (!canContinue) {
          return;
        }
        if (runMonitor) {
          progress.report({
            message: "Launching monitor...",
            increment: 10,
          });
          createMonitor();
        }
      }
    );
  });
};

async function selectFlashMethod(cancelToken) {
  let flashType = idfConf.readParameter("idf.flashType");
  if (!flashType) {
    flashType = await vscode.window.showQuickPick(["JTAG", "UART"], {
      ignoreFocusOut: true,
      placeHolder:
        "Select flash method, you can modify the choice later from settings 'idf.flashType'",
    });
    const target = idfConf.readParameter("idf.saveScope");
    await idfConf.writeParameter("idf.flashType", flashType, target);
  }

  if (!flashType) {
    return;
  }

  const idfPathDir = idfConf.readParameter("idf.espIdfPath");
  const port = idfConf.readParameter("idf.port");
  const flashBaudRate = idfConf.readParameter("idf.flashBaudRate");
  if (monitorTerminal) {
    monitorTerminal.sendText(ESP.CTRL_RBRACKET);
  }
  const canFlash = await verifyCanFlash(flashBaudRate, port, workspaceRoot);
  if (!canFlash) {
    return;
  }

  if (flashType === "JTAG") {
    const buildPath = path.join(workspaceRoot.fsPath, "build");
    return await jtagFlashCommand(buildPath);
  } else if (flashType === "UART") {
    return await uartFlashCommand(
      cancelToken,
      flashBaudRate,
      idfPathDir,
      port,
      workspaceRoot
    );
  }
}

function createIdfTerminal() {
  PreCheck.perform([webIdeCheck, openFolderCheck], () => {
    const modifiedEnv = utils.appendIdfAndToolsToPath();
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
    monitorTerminal = await createMonitorTerminal(
      monitorTerminal,
      workspaceRoot
    );
  });
}

export function deactivate() {
  Telemetry.dispose();
  if (monitorTerminal) {
    monitorTerminal.dispose();
  }
  OutputChannel.end();
  ConfserverProcess.dispose();
  for (const statusItem of statusBarItems) {
    statusItem.dispose();
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
      const projectName = await getProjectName(workspaceRoot.fsPath);
      const elfFilePath = path.join(
        workspaceRoot.fsPath,
        "build",
        `${projectName}.elf`
      );
      const elfFileExists = await pathExists(elfFilePath);
      if (!elfFileExists) {
        throw new Error(
          `${elfFilePath} doesn't exist. Build this project first.`
        );
      }
      if (!config.skipVerifyAppBinBeforeDebug) {
        const isSameAppBinary = await verifyAppBinary(workspaceRoot.fsPath);
        if (!isSameAppBinary) {
          throw new Error(
            `Current app binary is different from your project. Flash first.`
          );
        }
      }
      config.elfFilePath = elfFilePath;
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
