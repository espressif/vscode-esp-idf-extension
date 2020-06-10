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
import { readdirSync } from "fs";
import * as path from "path";
import * as vscode from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient";
import { BuildManager } from "./build/build";
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
import { AppTraceArchiveTreeDataProvider } from "./espIdf/tracing/tree/appTraceArchiveTreeDataProvider";
import { AppTraceTreeDataProvider } from "./espIdf/tracing/tree/appTraceTreeDataProvider";
import { ExamplesPlanel } from "./examples/ExamplesPanel";
import { FlashManager } from "./flash/flash";
import { createFlashModel } from "./flash/flashModelBuilder";
import { IdfTreeDataProvider } from "./idfComponentsDataProvider";
import * as idfConf from "./idfConfiguration";
import { LocDictionary } from "./localizationDictionary";
import { Logger } from "./logger/logger";
import { OutputChannel } from "./logger/outputChannel";
import { getOnboardingInitialValues } from "./onboarding/onboardingInit";
import { OnBoardingPanel } from "./onboarding/OnboardingPanel";
import * as utils from "./utils";
import { PreCheck } from "./utils";
import {
  getProjectName,
  initSelectedWorkspace,
  updateIdfComponentsTree,
} from "./workspaceConfig";
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

// Global variables shared by commands
let workspaceRoot: vscode.Uri;
const LOCALHOST_DEF_PORT = 43474;
let covRenderer: CoverageRenderer;

// OpenOCD  and Debug Adapter Manager
const statusBarItems: vscode.StatusBarItem[] = [];

const openOCDManager = OpenOCDManager.init();
let isOpenOCDLaunchedByDebug: boolean = false;
let debugAdapterManager: DebugAdapterManager;

// App Tracing
let appTraceTreeDataProvider: AppTraceTreeDataProvider;
let appTraceArchiveTreeDataProvider: AppTraceArchiveTreeDataProvider;
let appTraceManager: AppTraceManager;
let heapTraceManager: HeapTraceManager;

// ESP Rainmaker
let rainMakerTreeDataProvider: ESPRainMakerTreeDataProvider;

// Kconfig Language Client
let kconfigLangClient: LanguageClient;

// Process to execute build, debug or monitor
let monitorTerminal: vscode.Terminal;
const locDic = new LocDictionary(__filename);

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

const idfBuildChannel = vscode.window.createOutputChannel("ESP-IDF Build");
const idfFlashChannel = vscode.window.createOutputChannel("ESP-IDF Flash");

export async function activate(context: vscode.ExtensionContext) {
  utils.setExtensionContext(context);
  Logger.init(context);
  debugAdapterManager = DebugAdapterManager.init(context);
  OutputChannel.init();
  const registerIDFCommand = (
    name: string,
    callback: (...args: any[]) => any
  ): number => {
    return context.subscriptions.push(
      vscode.commands.registerCommand(name, callback)
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
  startKconfigLangServer(context);

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

  if (
    vscode.workspace.workspaceFolders &&
    vscode.workspace.workspaceFolders.length > 0
  ) {
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

  vscode.workspace.onDidChangeWorkspaceFolders((e) => {
    if (
      vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders.length > 0
    ) {
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
      const debugAdapterConfig = {
        currentWorkspace: workspaceRoot,
      } as IDebugAdapterConfig;
      debugAdapterManager.configureAdapter(debugAdapterConfig);
    }
    ConfserverProcess.resetSavedByUI();
  });

  vscode.debug.onDidTerminateDebugSession((e) => {
    // endOpenOcdServer(); // Should openOcd restart at every debug session?
    if (isOpenOCDLaunchedByDebug) {
      isOpenOCDLaunchedByDebug = false;
      openOCDManager.stop();
    }
    debugAdapterManager.stop();
  });

  const sdkconfigWatcher = vscode.workspace.createFileSystemWatcher(
    "**/sdkconfig",
    true,
    false,
    true
  );
  const sdkWatchDisposable = sdkconfigWatcher.onDidChange(async () => {
    if (ConfserverProcess.exists() && !ConfserverProcess.isSavedByUI()) {
      ConfserverProcess.loadGuiConfigValues();
    }
    ConfserverProcess.resetSavedByUI();
  });
  context.subscriptions.push(sdkWatchDisposable);

  vscode.window.onDidCloseTerminal((terminal: vscode.Terminal) => {
    terminal.dispose();
    setTimeout(() => {
      monitorTerminal = undefined;
    }, 200);
  });

  registerIDFCommand("espIdf.createFiles", async () => {
    const option = await vscode.window.showQuickPick(
      utils.chooseTemplateDir(),
      { placeHolder: "Select a template to use" }
    );
    PreCheck.perform([openFolderCheck], () => {
      if (option) {
        utils.createSkeleton(workspaceRoot.fsPath, option.target);
        const defaultFoldersMsg = locDic.localize(
          "extension.defaultFoldersGeneratedMessage",
          "Default folders were generated."
        );
        Logger.infoNotify(defaultFoldersMsg);
      }
    });
  });

  registerIDFCommand("espIdf.selectPort", () => {
    PreCheck.perform([webIdeCheck], SerialPort.shared().promptUserToSelect);
  });

  registerIDFCommand("espIdf.pickAWorkspaceFolder", () => {
    PreCheck.perform([openFolderCheck], () => {
      const selectCurrentFolderMsg = locDic.localize(
        "espIdf.pickAWorkspaceFolder.text",
        "Select your current folder"
      );
      vscode.window
        .showWorkspaceFolderPick({ placeHolder: selectCurrentFolderMsg })
        .then((option) => {
          if (typeof option === "undefined") {
            const noFolderMsg = locDic.localize(
              "extension.noFolderMessage",
              "No workspace selected."
            );
            Logger.infoNotify(noFolderMsg);
            return;
          } else {
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
          }
        });
    });
  });

  registerIDFCommand("espIdf.selectConfTarget", () => {
    idfConf.chooseConfigurationTarget();
  });

  registerIDFCommand("espIdf.setPath", () => {
    PreCheck.perform([webIdeCheck], () => {
      const selectFrameworkMsg = locDic.localize(
        "selectFrameworkMessage",
        "Select framework to define its path:"
      );
      vscode.window
        .showQuickPick(
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
        )
        .then((option) => {
          if (typeof option === "undefined") {
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
            idfConf.updateConfParameter(
              paramName,
              msg,
              currentValue,
              option.label
            );
          }
        });
    });
  });

  registerIDFCommand("espIdf.configDevice", () => {
    const selectConfigMsg = locDic.localize(
      "extension.selectConfigMessage",
      "Select option to define its path :"
    );
    vscode.window
      .showQuickPick(
        [
          {
            description: "Device target (esp32, esp32s2)",
            label: "Device Target",
            target: "deviceTarget",
          },
          {
            description: "Device port path",
            label: "Device Port",
            target: "devicePort",
          },
          {
            description: "Baud rate of device",
            label: "Baud Rate",
            target: "baudRate",
          },
          {
            description:
              "Relative paths to OpenOCD Scripts directory separated by comma(,)",
            label: "OpenOcd Config Files",
            target: "openOcdConfig",
          },
        ],
        { placeHolder: selectConfigMsg }
      )
      .then((option) => {
        if (typeof option === "undefined") {
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
            msg = locDic.localize(
              "extension.enterDeviceTargetMessage",
              "Enter device target name"
            );
            paramName = "idf.adapterTargetName";
            break;
          case "devicePort":
            msg = locDic.localize(
              "extension.enterDevicePortMessage",
              "Enter device port Path"
            );
            paramName = "idf.port";
            break;
          case "baudRate":
            msg = locDic.localize(
              "extension.enterDeviceBaudRateMessage",
              "Enter device baud rate"
            );
            paramName = "idf.baudRate";
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
          idfConf.updateConfParameter(
            paramName,
            msg,
            currentValue,
            option.label
          );
        }
      });
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
    }
  });

  const debugProvider = new IdfDebugConfigurationProvider();
  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider("espidf", debugProvider)
  );

  vscode.debug.registerDebugAdapterDescriptorFactory("espidf", {
    async createDebugAdapterDescriptor(session: vscode.DebugSession) {
      const portToUse = session.configuration.debugPort
        ? session.configuration.debugPort
        : LOCALHOST_DEF_PORT;
      const launchMode =
        session.configuration.mode !== undefined
          ? session.configuration.launchDebugAdapter
          : "auto";
      if (launchMode === "auto" && !openOCDManager.isRunning()) {
        isOpenOCDLaunchedByDebug = true;
        await openOCDManager.start();
      }
      if (launchMode === "auto" && !debugAdapterManager.isRunning()) {
        const debugAdapterConfig = {
          debugAdapterPort: portToUse,
          env: session.configuration.env,
          logLevel: session.configuration.logLevel,
        } as IDebugAdapterConfig;
        debugAdapterManager.configureAdapter(debugAdapterConfig);
        await debugAdapterManager.start();
      }
      return new vscode.DebugAdapterServer(portToUse);
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

  registerIDFCommand("espIdf.getXtensaGdb", () => {
    return PreCheck.perform([openFolderCheck], async () => {
      const modifiedEnv = utils.appendIdfAndToolsToPath();
      try {
        return await utils.isBinInPath(
          "xtensa-esp32-elf-gdb",
          this.workspaceRoot.fsPath,
          modifiedEnv
        );
      } catch (error) {
        Logger.errorNotify(
          "xtensa-esp32-elf-gdb is not found in idf.customExtraPaths",
          error
        );
        return;
      }
    });
  });

  registerIDFCommand("espIdf.createVsCodeFolder", () => {
    PreCheck.perform([openFolderCheck], () => {
      utils.createVscodeFolder(workspaceRoot.fsPath);
      Logger.infoNotify("ESP-IDF VSCode files have been added to project.");
    });
  });

  registerIDFCommand("espIdf.createIdfTerminal", createIdfTerminal);

  registerIDFCommand("espIdf.flashDevice", flash);
  registerIDFCommand("espIdf.buildDevice", build);
  registerIDFCommand("espIdf.monitorDevice", createMonitor);
  registerIDFCommand("espIdf.buildFlashMonitor", buildFlashAndMonitor);

  registerIDFCommand("menuconfig.start", () => {
    PreCheck.perform([openFolderCheck], () => {
      try {
        if (ConfserverProcess.exists()) {
          ConfserverProcess.loadExistingInstance();
          return;
        }
        vscode.window.withProgress(
          {
            cancellable: false,
            location: vscode.ProgressLocation.Notification,
            title: "ESP-IDF: Menuconfig",
          },
          async (
            progress: vscode.Progress<{ message: string; increment: number }>
          ) => {
            try {
              ConfserverProcess.registerProgress(progress);
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

  registerIDFCommand("espIdf.setTarget", () => {
    PreCheck.perform([openFolderCheck], () => {
      const enterDeviceTargetMsg = locDic.localize(
        "extension.enterDeviceTargetMessage",
        "Enter device target name"
      );
      vscode.window
        .showQuickPick(
          [
            { description: "ESP32", label: "ESP32", target: "esp32" },
            { description: "ESP32-S2", label: "ESP32-S2", target: "esp32s2" },
          ],
          { placeHolder: enterDeviceTargetMsg }
        )
        .then(async (selected) => {
          if (typeof selected === "undefined") {
            return;
          }
          const configurationTarget = idfConf.readParameter("idf.saveScope");
          await idfConf.writeParameter(
            "idf.adapterTargetName",
            selected.target,
            configurationTarget
          );
          if (selected.target === "esp32") {
            await idfConf.writeParameter(
              "idf.openOcdConfigs",
              ["interface/ftdi/esp32_devkitj_v1.cfg", "board/esp32-wrover.cfg"],
              configurationTarget
            );
          }
          if (selected.target === "esp32s2") {
            await idfConf.writeParameter(
              "idf.openOcdConfigs",
              ["interface/ftdi/esp32_devkitj_v1.cfg", "target/esp32s2.cfg"],
              configurationTarget
            );
          }
          const idfPathDir = idfConf.readParameter("idf.espIdfPath");
          const idfPy = path.join(idfPathDir, "tools", "idf.py");
          const modifiedEnv = utils.appendIdfAndToolsToPath();
          const pythonBinPath = idfConf.readParameter(
            "idf.pythonBinPath"
          ) as string;
          await utils
            .spawn(pythonBinPath, [idfPy, "set-target", selected.target], {
              cwd: workspaceRoot.fsPath,
              env: modifiedEnv,
            })
            .then((result) => {
              Logger.info(result.toString());
              OutputChannel.append(result.toString());
            })
            .catch((err) => {
              if (err.message && err.message.indexOf("are satisfied") > -1) {
                Logger.info(err.message.toString());
                OutputChannel.append(err.message.toString());
              } else {
                Logger.errorNotify(err, err);
                OutputChannel.append(err);
              }
            });
        });
    });
  });

  registerIDFCommand("onboarding.start", () => {
    PreCheck.perform([webIdeCheck], () => {
      try {
        if (OnBoardingPanel.isCreatedAndHidden()) {
          OnBoardingPanel.createOrShow(context.extensionPath);
          return;
        }
        vscode.window.withProgress(
          {
            cancellable: false,
            location: vscode.ProgressLocation.Notification,
            title: "ESP-IDF: Configure extension",
          },
          async (
            progress: vscode.Progress<{ message: string; increment: number }>
          ) => {
            try {
              const onboardingArgs = await getOnboardingInitialValues(
                context.extensionPath,
                progress
              );
              OnBoardingPanel.createOrShow(
                context.extensionPath,
                onboardingArgs
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

  registerIDFCommand("examples.start", () => {
    try {
      ExamplesPlanel.createOrShow(context.extensionPath);
    } catch (error) {
      Logger.errorNotify(error.message, error);
    }
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
            // tslint:disable-next-line: max-line-length
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

  registerIDFCommand("espIdf.apptrace", () => {
    PreCheck.perform([webIdeCheck, openFolderCheck], async () => {
      if (appTraceTreeDataProvider.appTraceButton.label.match(/start/gi)) {
        await appTraceManager.start();
      } else {
        await appTraceManager.stop();
      }
    });
  });

  registerIDFCommand("espIdf.heaptrace", () => {
    PreCheck.perform([webIdeCheck, openFolderCheck], async () => {
      if (appTraceTreeDataProvider.heapTraceButton.label.match(/start/gi)) {
        await heapTraceManager.start();
      } else {
        await heapTraceManager.stop();
      }
    });
  });

  registerIDFCommand("espIdf.openOCDCommand", () => {
    PreCheck.perform(
      [webIdeCheck, openFolderCheck],
      openOCDManager.commandHandler
    );
  });

  registerIDFCommand("espIdf.apptrace.archive.refresh", () => {
    PreCheck.perform([openFolderCheck], () => {
      appTraceArchiveTreeDataProvider.populateArchiveTree();
    });
  });

  registerIDFCommand("espIdf.apptrace.archive.showReport", (trace) => {
    if (!trace) {
      Logger.errorNotify(
        "Cannot call this command directly, click on any Trace to view its report!",
        new Error("INVALID_COMMAND")
      );
      return;
    }
    PreCheck.perform([openFolderCheck], () => {
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
  });

  registerIDFCommand("espIdf.apptrace.customize", () => {
    PreCheck.perform([openFolderCheck], async () => {
      await AppTraceManager.saveConfiguration();
    });
  });
  const showOnboardingInit = vscode.workspace
    .getConfiguration("idf")
    .get("showOnboardingOnInit");
  if (showOnboardingInit && typeof process.env.WEB_IDE === "undefined") {
    vscode.commands.executeCommand("onboarding.start");
  }

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
  vscode.window.registerUriHandler({
    handleUri: async (uri: vscode.Uri) => {
      const query = uri.query.split("=");
      if (uri.path === "/rainmaker" && query[0] === "code") {
        const code = query[1] || "";
        try {
          await RainmakerAPIClient.exchangeCodeForTokens(code);
          await rainMakerTreeDataProvider.refresh();
          Logger.infoNotify(
            "Rainmaker Cloud is connected successfully (via OAuth)!!"
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

function registerTreeProvidersForIDFExplorer(context: vscode.ExtensionContext) {
  appTraceTreeDataProvider = new AppTraceTreeDataProvider();
  appTraceArchiveTreeDataProvider = new AppTraceArchiveTreeDataProvider();

  rainMakerTreeDataProvider = new ESPRainMakerTreeDataProvider();
  vscode.window.registerTreeDataProvider(
    "espRainmaker",
    rainMakerTreeDataProvider
  );

  context.subscriptions.push(
    appTraceTreeDataProvider.registerDataProviderForTree("idfAppTracer")
  );
  context.subscriptions.push(
    appTraceArchiveTreeDataProvider.registerDataProviderForTree(
      "idfAppTraceArchive"
    )
  );
}

function creatCmdsStatusBarItems() {
  createStatusBarItem(
    "$(plug)",
    "ESP-IDF Select device port",
    "espIdf.selectPort",
    100
  );
  createStatusBarItem(
    "$(gear)",
    "ESP-IDF Launch GUI Configuration tool",
    "menuconfig.start",
    99
  );
  createStatusBarItem(
    "$(database)",
    "ESP-IDF Build project",
    "espIdf.buildDevice",
    98
  );
  createStatusBarItem(
    "$(zap)",
    "ESP-IDF Flash device",
    "espIdf.flashDevice",
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
  PreCheck.perform([openFolderCheck], () => {
    const buildManager = new BuildManager(
      workspaceRoot.fsPath,
      idfBuildChannel
    );
    if (BuildManager.isBuilding || FlashManager.isFlashing) {
      const waitProcessIsFinishedMsg = locDic.localize(
        "extension.waitProcessIsFinishedMessage",
        "Wait for ESP-IDF build or flash to finish"
      );
      Logger.errorNotify(
        waitProcessIsFinishedMsg,
        new Error("One_Task_At_A_Time")
      );
      return;
    }
    vscode.window.withProgress(
      {
        cancellable: true,
        location: vscode.ProgressLocation.Notification,
        title: "Building Project",
      },
      async (
        progress: vscode.Progress<{ message: string; increment: number }>,
        cancelToken: vscode.CancellationToken
      ) => {
        cancelToken.onCancellationRequested(() => {
          buildManager.cancel();
        });
        idfBuildChannel.clear();
        try {
          await buildManager.build();
          const projDescPath = path.join(
            workspaceRoot.fsPath,
            "build",
            "project_description.json"
          );
          updateIdfComponentsTree(projDescPath);
          Logger.infoNotify("Build Successfully");
        } catch (error) {
          if (error.message === "BUILD_TERMINATED") {
            return Logger.warnNotify(`Build is Terminated`);
          }
          if (error.message === "ALREADY_BUILDING") {
            return Logger.errorNotify("Already a build is running!", error);
          }
          if (error.message === "BUILD_TOOL_NOT_ACCESSIBLE") {
            return Logger.errorNotify(
              "IDF Path or IDF Tools path is invalid or not accessible",
              error
            );
          }
          if (error.code === "ENOENT") {
            return Logger.errorNotify(
              `Make sure you have the build tools installed and set in $PATH`,
              error
            );
          }
          idfBuildChannel.show();
          Logger.errorNotify(
            "Something went wrong while trying to build the project",
            error
          );
        }
      }
    );
  });
};
const flash = () => {
  PreCheck.perform([webIdeCheck, openFolderCheck], async () => {
    if (BuildManager.isBuilding || FlashManager.isFlashing) {
      const waitProcessIsFinishedMsg = locDic.localize(
        "extension.waitProcessIsFinishedMessage",
        "Wait for ESP-IDF build or flash to finish"
      );
      Logger.errorNotify(
        waitProcessIsFinishedMsg,
        new Error("One_Task_At_A_Time")
      );
      return;
    }

    if (monitorTerminal) {
      Logger.warnNotify("ESP-IDF Monitor was closed.");
      monitorTerminal.dispose();
      setTimeout(() => {
        monitorTerminal = undefined;
      }, 200);
    }

    const idfPathDir = idfConf.readParameter("idf.espIdfPath");
    const port = idfConf.readParameter("idf.port");
    const baudRate = idfConf.readParameter("idf.baudRate");

    const buildPath = path.join(workspaceRoot.fsPath, "build");

    if (!utils.canAccessFile(buildPath)) {
      return Logger.errorNotify(
        `Build is required before Flashing, ${buildPath} can't be accessed`,
        new Error("BUILD_PATH_ACCESS_ERROR")
      );
    }
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
    if (!baudRate) {
      return Logger.errorNotify(
        "Select a baud rate before flashing",
        new Error("NOT_SELECTED_BAUD_RATE")
      );
    }

    const binFiles = readdirSync(buildPath).filter(
      (fileName) => fileName.endsWith(".bin") === true
    );
    if (binFiles.length === 0) {
      return Logger.errorNotify(
        `Build is required before Flashing, .bin file can't be accessed`,
        new Error("BIN_FILE_ACCESS_ERROR")
      );
    }
    const flasherArgsJsonPath = path.join(buildPath, "flasher_args.json");

    vscode.window.withProgress(
      {
        cancellable: true,
        location: vscode.ProgressLocation.Notification,
        title: "Flashing Project",
      },
      async (
        progress: vscode.Progress<{ message: string; increment: number }>,
        cancelToken: vscode.CancellationToken
      ) => {
        idfFlashChannel.clear();
        try {
          const model = await createFlashModel(
            flasherArgsJsonPath,
            port,
            baudRate
          );
          const flashManager = new FlashManager(
            idfPathDir,
            buildPath,
            model,
            idfFlashChannel
          );
          await flashManager.flash();
          Logger.infoNotify("Flash Done ⚡️");
        } catch (error) {
          if (error.message === "ALREADY_FLASHING") {
            return Logger.errorNotify(
              "Already one flash process is running!",
              error
            );
          }
          if (error.message === "FLASH_TERMINATED") {
            return Logger.errorNotify("Flashing has been stopped!", error);
          }
          if (error.message === "SECTION_BIN_FILE_NOT_ACCESSIBLE") {
            return Logger.errorNotify(
              "Flash (.bin) files don't exists or can't be accessed!",
              error
            );
          }
          if (
            error.code === "ENOENT" ||
            error.message === "SCRIPT_PERMISSION_ERROR"
          ) {
            return Logger.errorNotify(
              `Make sure you have the esptool.py installed and set in $PATH with proper permission`,
              error
            );
          }
          idfFlashChannel.show();
          Logger.errorNotify(
            "Failed to flash because of some unusual error",
            error
          );
        }
      }
    );
  });
};
const buildFlashAndMonitor = (runMonitor: boolean = true) => {
  PreCheck.perform([webIdeCheck, openFolderCheck], async () => {
    if (BuildManager.isBuilding || FlashManager.isFlashing) {
      const waitProcessIsFinishedMsg = locDic.localize(
        "extension.waitProcessIsFinishedMessage",
        "Wait for ESP-IDF build or flash to finish"
      );
      Logger.errorNotify(
        waitProcessIsFinishedMsg,
        new Error("One_Task_At_A_Time")
      );
      return;
    }
    if (monitorTerminal) {
      Logger.warnNotify("ESP-IDF Monitor was closed.");
      monitorTerminal.dispose();
      setTimeout(() => {
        monitorTerminal = undefined;
      }, 200);
    }
    const buildManager = new BuildManager(
      workspaceRoot.fsPath,
      idfBuildChannel
    );
    const buildPath = path.join(workspaceRoot.fsPath, "build");
    const idfPathDir = idfConf.readParameter("idf.espIdfPath");
    const port = idfConf.readParameter("idf.port");
    const baudRate = idfConf.readParameter("idf.baudRate");
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
    if (!baudRate) {
      return Logger.errorNotify(
        "Select a baud rate before flashing",
        new Error("NOT_SELECTED_BAUD_RATE")
      );
    }
    const flasherArgsJsonPath = path.join(buildPath, "flasher_args.json");

    await vscode.window.withProgress(
      {
        cancellable: true,
        location: vscode.ProgressLocation.Notification,
        title: "ESP-IDF: ",
      },
      async (
        progress: vscode.Progress<{ message: string; increment: number }>,
        cancelToken: vscode.CancellationToken
      ) => {
        cancelToken.onCancellationRequested(() => {
          buildManager.cancel();
        });
        idfBuildChannel.clear();
        idfFlashChannel.clear();
        try {
          progress.report({ message: "Building project...", increment: 20 });
          await buildManager.build();
          const projDescPath = path.join(
            workspaceRoot.fsPath,
            "build",
            "project_description.json"
          );
          updateIdfComponentsTree(projDescPath);
          progress.report({
            message: "Flashing project into device...",
            increment: 60,
          });
          const model = await createFlashModel(
            flasherArgsJsonPath,
            port,
            baudRate
          );
          const flashManager = new FlashManager(
            idfPathDir,
            buildPath,
            model,
            idfFlashChannel
          );
          await flashManager.flash();
          if (runMonitor) {
            progress.report({ message: "Launching monitor...", increment: 10 });
            createMonitor();
          }
        } catch (error) {
          switch (error.message) {
            case "BUILD_TERMINATED":
              return Logger.warnNotify(`Build is Terminated`);
            case "ALREADY_BUILDING":
              return Logger.errorNotify("Already a build is running!", error);
            case "ALREADY_FLASHING":
              return Logger.errorNotify(
                "Already one flash process is running!",
                error
              );
            case "BUILD_TOOL_NOT_ACCESSIBLE":
              return Logger.errorNotify(
                "IDF Path or IDF Tools path is invalid or not accessible",
                error
              );
            case "ENOENT":
              return Logger.errorNotify(
                `Make sure you have the build tools installed and set in $PATH`,
                error
              );
            case "SCRIPT_PERMISSION_ERROR":
              return Logger.errorNotify(
                `Make sure you have the esptool.py installed and set in $PATH with proper permission`,
                error
              );
            case "FLASH_TERMINATED":
              return Logger.errorNotify("Flashing has been stopped!", error);
            case "SECTION_BIN_FILE_NOT_ACCESSIBLE":
              return Logger.errorNotify(
                "Flash (.bin) files don't exists or can't be accessed!",
                error
              );
            default:
              break;
          }
          Logger.errorNotify(
            "Something went wrong while trying to build the project",
            error
          );
        }
      }
    );
  });
};

function createMonitor(): any {
  PreCheck.perform([webIdeCheck, openFolderCheck], async () => {
    if (BuildManager.isBuilding || FlashManager.isFlashing) {
      const waitProcessIsFinishedMsg = locDic.localize(
        "extension.waitProcessIsFinishedMessage",
        "Wait for ESP-IDF build or flash to finish"
      );
      Logger.errorNotify(
        waitProcessIsFinishedMsg,
        new Error("One_Task_At_A_Time")
      );
      return;
    }

    const idfPathDir =
      idfConf.readParameter("idf.espIdfPath") || process.env.IDF_PATH;
    const pythonBinPath = idfConf.readParameter("idf.pythonBinPath") as string;
    const port = idfConf.readParameter("idf.port");
    const idfPath = path.join(idfPathDir, "tools", "idf.py");
    const modifiedEnv = utils.appendIdfAndToolsToPath();
    if (!utils.isBinInPath(pythonBinPath, workspaceRoot.fsPath, modifiedEnv)) {
      Logger.errorNotify(
        "Python binary path is not defined",
        new Error("idf.pythonBinPath is not defined")
      );
    }
    if (!idfPathDir) {
      Logger.errorNotify(
        "ESP-IDF Path is not defined",
        new Error("idf.espIdfPath is not defined")
      );
    }
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
    if (typeof monitorTerminal === "undefined") {
      monitorTerminal = vscode.window.createTerminal({
        name: "ESP-IDF Monitor",
        env: modifiedEnv,
        cwd: workspaceRoot.fsPath,
      });
    }
    monitorTerminal.show();
    const envSetCmd = process.platform === "win32" ? "set" : "export";
    monitorTerminal.sendText(`${envSetCmd} IDF_PATH=${idfPathDir}`);
    monitorTerminal.sendText(`${pythonBinPath} ${idfPath} -p ${port} monitor`);
  });
}

function createIdfTerminal() {
  PreCheck.perform([webIdeCheck, openFolderCheck], () => {
    const modifiedEnv = utils.appendIdfAndToolsToPath();
    const espIdfTerminal = vscode.window.createTerminal({
      name: "ESP-IDF Terminal",
      env: modifiedEnv,
      cwd: workspaceRoot.fsPath || modifiedEnv.IDF_PATH || process.cwd(),
      strictEnv: true,
    });
    espIdfTerminal.show();
    const shellExecutable = path.basename(vscode.env.shell);
    let winShellCmd = {
      "cmd.exe": `set "VARIABLE=`,
      "powershell.exe": `$Env:VARIABLE = "`,
    };
    const envSetCmd =
      process.platform === "win32"
        ? winShellCmd[shellExecutable].replace("VARIABLE", "IDF_PATH")
        : `export IDF_PATH="`;
    espIdfTerminal.sendText(`${envSetCmd}${modifiedEnv.IDF_PATH}"`);
    const setPythonEnvCmd =
      process.platform === "win32"
        ? winShellCmd[shellExecutable].replace("VARIABLE", "Path")
        : `export PATH="`;
    espIdfTerminal.sendText(
      `${setPythonEnvCmd}${path.dirname(modifiedEnv.PYTHON) + path.delimiter}${
        process.platform === "win32" ? modifiedEnv.Path : modifiedEnv.PATH
      }"`
    );
    const clearCmd = process.platform === "win32" ? "cls" : "clear";
    espIdfTerminal.sendText(clearCmd);
  });
}

export function deactivate() {
  if (monitorTerminal) {
    monitorTerminal.dispose();
  }
  OutputChannel.end();

  if (!kconfigLangClient) {
    return undefined;
  }
  kconfigLangClient.stop();
  ConfserverProcess.dispose();
  for (const statusItem of statusBarItems) {
    statusItem.dispose();
  }
  covRenderer.dispose();
}

class IdfDebugConfigurationProvider
  implements vscode.DebugConfigurationProvider {
  public resolveDebugConfiguration(
    folder: vscode.WorkspaceFolder | undefined,
    config: vscode.DebugConfiguration,
    token?: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DebugConfiguration> {
    return config;
  }
}

export function startKconfigLangServer(context: vscode.ExtensionContext) {
  const serverModule =
    __dirname.indexOf("out") > -1
      ? context.asAbsolutePath(path.join("out", "kconfig", "server.js"))
      : context.asAbsolutePath(path.join("dist", "kconfigServer.js"));

  const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

  const serverOptions: ServerOptions = {
    debug: {
      module: serverModule,
      options: debugOptions,
      transport: TransportKind.ipc,
    },
    run: { module: serverModule, transport: TransportKind.ipc },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: "file", pattern: "**/Kconfig" },
      { scheme: "file", pattern: "**/Kconfig.projbuild" },
      { scheme: "file", pattern: "**/Kconfig.in" },
    ],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher("**/.clientrc"),
    },
  };

  kconfigLangClient = new LanguageClient(
    "kconfigServer",
    "Kconfig Language Server",
    serverOptions,
    clientOptions
  );
  kconfigLangClient.start();
}
