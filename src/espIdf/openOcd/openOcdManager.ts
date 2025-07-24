/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 12th July 2019 5:59:07 pm
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
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

import { ChildProcess, spawn } from "child_process";
import { EventEmitter } from "events";
import * as vscode from "vscode";
import * as idfConf from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import { OutputChannel } from "../../logger/outputChannel";
import { isBinInPath, PreCheck, spawn as sspawn } from "../../utils";
import { TCLClient, TCLConnection } from "./tcl/tclClient";
import { ESP } from "../../config";
import {
  statusBarItems,
  updateOpenOcdAdapterStatusBarItem,
} from "../../statusBar";
import {
  CommandKeys,
  createCommandDictionary,
} from "../../cmdTreeView/cmdStore";
import {
  parseAdapterSerialFromLog,
  storeAdapterSerial,
  getStoredAdapterSerial,
} from "./adapterSerial";
import { configureEnvVariables } from "../../common/prepareEnv";

export interface IOpenOCDConfig {
  workspace: vscode.Uri;
}

export class OpenOCDManager extends EventEmitter {
  public static init(): OpenOCDManager {
    if (!OpenOCDManager.instance) {
      OpenOCDManager.instance = new OpenOCDManager();
    }
    return OpenOCDManager.instance;
  }
  private static instance: OpenOCDManager;
  private server: ChildProcess;
  private chan: Buffer;
  private statusBar: vscode.StatusBarItem;
  private workspace: vscode.Uri;
  private encounteredErrors: boolean = false;

  private constructor() {
    super();
    this.configureServerWithDefaultParam();
  }

  public async version(silent: boolean = false): Promise<string> {
    const modifiedEnv = await configureEnvVariables(this.workspace);
    const openOcdPath = await isBinInPath("openocd", modifiedEnv, [
      "openocd-esp32",
    ]);
    if (!openOcdPath) {
      return "";
    }
    const resp = await sspawn(openOcdPath, ["--version"], {
      cwd: this.workspace.fsPath,
      env: modifiedEnv,
      silent,
    });
    const versionString = resp.toString();
    const match = versionString.match(/v\d+\.\d+\.\d+\-\S*/gi);
    if (!match) {
      return "failed+to+match+version";
    }
    return match[0].replace("-dirty", "");
  }

  public statusBarItem(): vscode.StatusBarItem {
    return this.statusBar;
  }

  public updateStatusText(text: string) {
    this.statusBar.text = text;
    this.statusBar.show();
  }

  public async commandHandler() {
    const openOCDCommandSelectionPick = [];
    if (!OpenOCDManager.instance.isRunning()) {
      openOCDCommandSelectionPick.push({
        label: "Start OpenOCD",
        description: "",
      });
    } else {
      openOCDCommandSelectionPick.push({
        label: "Stop OpenOCD",
        description: "Running",
      });
    }
    const pick = await vscode.window.showQuickPick(openOCDCommandSelectionPick);
    if (!pick) {
      return false;
    }
    try {
      switch (pick.label) {
        case "Start OpenOCD":
          await OpenOCDManager.instance.start();
          break;
        case "Stop OpenOCD":
          OpenOCDManager.instance.stop();
          break;
        default:
          break;
      }
    } catch (error) {
      const msg = error.message ? error.message : JSON.stringify(error);
      Logger.error(msg, error, "OpenOCDManager commandHandler");
      OutputChannel.appendLine(msg, "OpenOCD");
    }
    return true;
  }

  public configureServer(config: IOpenOCDConfig) {
    if (config.workspace) {
      this.workspace = config.workspace;
    }
  }

  public isRunning(): boolean {
    return this.server && !this.server.killed;
  }

  public async promptUserToLaunchOpenOCDServer(): Promise<boolean> {
    const host = idfConf.readParameter("openocd.tcl.host", this.workspace);
    const port = idfConf.readParameter("openocd.tcl.port", this.workspace);
    const tclConnectionParams: TCLConnection = { host, port };
    const tclClient = new TCLClient(tclConnectionParams);
    if (!(await tclClient.isOpenOCDServerRunning())) {
      const resp = await vscode.window.showInformationMessage(
        "OpenOCD is not running, do you want to launch it?",
        { modal: true },
        { title: "Yes" },
        { title: "Cancel", isCloseAffordance: true }
      );
      if (resp && resp.title === "Yes") {
        await OpenOCDManager.init().start();
        return await tclClient.isOpenOCDServerRunning();
      }
      return false;
    }
    return true;
  }

  public async start() {
    if (this.isRunning()) {
      return;
    }
    const modifiedEnv = await configureEnvVariables(this.workspace);
    const openOcdPath = await isBinInPath("openocd", modifiedEnv, [
      "openocd-esp32",
    ]);
    if (!openOcdPath) {
      throw new Error(
        "Invalid OpenOCD bin path or access is denied for the user"
      );
    }
    if (typeof modifiedEnv.OPENOCD_SCRIPTS === "undefined") {
      throw new Error(
        "OPENOCD_SCRIPTS environment variable is missing. Please set it in idf.customExtraVars or in your system environment variables."
      );
    }

    const openOcdArgs: string[] = [];
    const openOcdLaunchArgs = idfConf.readParameter(
      "idf.openOcdLaunchArgs",
      this.workspace
    ) as string[];

    const storedSerial = getStoredAdapterSerial(this.workspace);
    const needsSerialDiscovery = !storedSerial;

    if (openOcdLaunchArgs && openOcdLaunchArgs.length > 0) {
      openOcdArgs.push(...openOcdLaunchArgs);

      // If no adapter serial is stored yet, ensure OpenOCD runs at least at -d2
      // so the usb-jtag serial line is printed and can be parsed.
      if (
        needsSerialDiscovery &&
        !openOcdArgs.some((a) => typeof a === "string" && a.match(/^-d-?\d+$/))
      ) {
        openOcdArgs.unshift("-d2");
      }
    } else {
      const openOcdConfigFilesList = idfConf.readParameter(
        "idf.openOcdConfigs",
        this.workspace
      ) as string[];

      if (
        typeof openOcdConfigFilesList === "undefined" ||
        openOcdConfigFilesList.length < 1
      ) {
        throw new Error(
          "Invalid OpenOCD Config files. Check idf.openOcdConfigs configuration value."
        );
      }

      const openOcdDebugLevelRaw = idfConf.readParameter(
        "idf.openOcdDebugLevel",
        this.workspace
      ) as unknown;
      const parsedLevel =
        typeof openOcdDebugLevelRaw === "number"
          ? openOcdDebugLevelRaw
          : parseInt(String(openOcdDebugLevelRaw), 10);
      const hasValidLevel = Number.isFinite(parsedLevel);
      const debugLevelToUse = needsSerialDiscovery
        ? Math.max(hasValidLevel ? parsedLevel : 0, 2)
        : hasValidLevel
        ? parsedLevel
        : 0;

      openOcdArgs.push(`-d${debugLevelToUse}`);

      // Inject adapter serial command if we have a stored serial number
      if (storedSerial) {
        openOcdArgs.push("-c", `adapter serial ${storedSerial}`);
      }

      openOcdConfigFilesList.forEach((configFile) => {
        const isFileAlreadyInArgs = openOcdArgs.some((arg) =>
          arg.includes(configFile)
        );
        if (!isFileAlreadyInArgs) {
          openOcdArgs.push("-f");
          openOcdArgs.push(configFile);
        }
      });
    }

    this.server = spawn(openOcdPath, openOcdArgs, {
      cwd: this.workspace.fsPath,
      env: modifiedEnv,
    });
    this.server.stderr.on("data", (data) => {
      this.encounteredErrors = true;
      data = typeof data === "string" ? Buffer.from(data) : data;
      this.sendToOutputChannel(data);

      // Parse adapter serial number from log output
      const serialNumber = parseAdapterSerialFromLog(data);
      if (serialNumber && this.workspace) {
        storeAdapterSerial(this.workspace, serialNumber);
        updateOpenOcdAdapterStatusBarItem(this.workspace);
      }

      const regex = /Error:.*/i;
      const errStr = data.toString();
      const matchArr = errStr.match(regex);
      if (!matchArr) {
        this.emit("data", this.chan);
      } else {
        const errorMsg = `OpenOCD server failed to start because of ${matchArr.join(
          " "
        )}`;
        const err = new Error(errorMsg);
        Logger.error(errorMsg + `\n❌ ${errStr}`, err, "OpenOCDManager stderr");
        OutputChannel.appendLine(`❌ ${errStr}`, "OpenOCD");
        this.emit("error", err, this.chan);
      }
      OutputChannel.appendLine(errStr, "OpenOCD");
      Logger.info(errStr);
    });
    this.server.stdout.on("data", (data) => {
      data = typeof data === "string" ? Buffer.from(data) : data;
      this.sendToOutputChannel(data);

      // Parse adapter serial number from log output
      const serialNumber = parseAdapterSerialFromLog(data);
      if (serialNumber && this.workspace) {
        storeAdapterSerial(this.workspace, serialNumber);
        updateOpenOcdAdapterStatusBarItem(this.workspace);
      }

      this.emit("data", this.chan);
    });
    this.server.on("error", (error) => {
      this.emit("error", error, this.chan);
      this.stop();
    });
    this.server.on("close", (code: number, signal: string) => {
      if (this.encounteredErrors) {
        OutputChannel.appendLine(
          `For assistance with OpenOCD errors, please refer to our Troubleshooting FAQ: ${ESP.URL.OpenOcdTroubleshootingFaq}`,
          "OpenOCD"
        );
      }
      this.encounteredErrors = false;
      if (!signal && code && code !== 0) {
        Logger.error(
          `OpenOCD Exit with non-zero error code ${code}`,
          new Error("Spawn exit with non-zero" + code),
          "OpenOCDManager close"
        );
        OutputChannel.appendLine(
          `OpenOCD Exit with non-zero error code ${code}`,
          "OpenOCD"
        );
      }
      this.stop();
    });
    this.updateStatusText("❇️ OpenOCD Server (Running)");
    OutputChannel.show();
  }

  public stop() {
    if (this.server && !this.server.killed) {
      this.server.kill("SIGKILL");
      this.server = undefined;
      this.updateStatusText("❌ OpenOCD Server (Stopped)");
      const endMsg = "[Stopped] : OpenOCD Server";
      OutputChannel.appendLine(endMsg, "OpenOCD");
      Logger.info(endMsg);
    }
  }

  public showOutputChannel(preserveFocus?: boolean) {
    preserveFocus ? OutputChannel.show() : null;
  }

  private registerOpenOCDStatusBarItem() {
    this.statusBar = vscode.window.createStatusBarItem(
      CommandKeys.OpenOCD,
      vscode.StatusBarAlignment.Left,
      1
    );
    this.statusBar.name = this.statusBar.text = "OpenOCD Server";
    const commandDictionary = createCommandDictionary();
    this.statusBar.tooltip = commandDictionary[CommandKeys.OpenOCD].tooltip;
    this.statusBar.command = CommandKeys.OpenOCD;
    if (
      commandDictionary[CommandKeys.OpenOCD].checkboxState ===
      vscode.TreeItemCheckboxState.Checked
    ) {
      this.statusBar.show();
    }

    statusBarItems["openOCD"] = this.statusBar;
  }

  private configureServerWithDefaultParam() {
    if (PreCheck.isWorkspaceFolderOpen()) {
      this.workspace = vscode.workspace.workspaceFolders[0].uri;
    }
    this.chan = Buffer.alloc(0);
    OutputChannel.init();
    if (vscode.env.uiKind !== vscode.UIKind.Web) {
      this.registerOpenOCDStatusBarItem();
    }
  }

  private sendToOutputChannel(data: Buffer) {
    this.chan = Buffer.concat([this.chan, data]);
  }
}
