import * as vscode from "vscode";
import { OutputChannel } from "../logger/outputChannel";
import { ESP } from "../config";
import { buildCommandMain } from "../build/buildCmd";
import {
  readParameter,
  readSerialPort,
  writeParameter,
} from "../idfConfiguration";
import { OpenOCDManager } from "../espIdf/openOcd/openOcdManager";
import {
  getEspIdfFromCMake,
  PreCheck,
  shouldDisableMonitorReset,
  sleep,
} from "../utils";
import { Logger } from "../logger/logger";
import { jtagFlashCommandMain } from "../flash/jtagCmd";
import { verifyCanFlash } from "../flash/flashCmd";
import { uartFlashCommandMain } from "../flash/uartFlash";
import { IDFMonitor } from "../espIdf/monitor";
import { IDFWebCommandKeys } from "../cmdTreeView/cmdStore";
import { createNewIdfMonitor } from "../espIdf/monitor/command";
import { isFlashEncryptionEnabled } from "../flash/verifyFlashEncryption";
import { EraseFlashTask } from "../flash/eraseFlashTask";
import { TaskManager } from "../taskManager";
import { getTargetsFromEspIdf } from "../espIdf/setTarget/getTargets";
import { updateCurrentProfileIdfTarget } from "../project-conf";
import { getIdfTargetFromSdkconfig } from "../workspaceConfig";
import { setTargetInIDF } from "../espIdf/setTarget/setTargetInIdf";
import { statusBarItems } from "../statusBar";
import { isSettingIDFTarget, setIsSettingIDFTarget } from "../espIdf/setTarget";

// Map of command names to their corresponding VS Code command IDs
const COMMAND_MAP: Record<string, string> = {
  build: "espIdf.buildDevice",
  flash: "espIdf.flashDevice",
  monitor: "espIdf.monitorDevice",
  buildFlashMonitor: "espIdf.buildFlashMonitor",
  fullClean: "espIdf.fullClean",
  menuconfig: "espIdf.menuconfig.start",
  size: "espIdf.size",
  eraseFlash: "espIdf.eraseFlash",
  selectPort: "espIdf.selectPort",
  setTarget: "espIdf.setTarget",
  doctor: "espIdf.doctorCommand",
  newProject: "espIdf.newProject.start",
  partitionTable: "esp.webview.open.partition-table",
  componentManager: "esp.component-manager.ui.show",
  apptrace: "espIdf.apptrace",
  heaptrace: "espIdf.heaptrace",
};

const CONFIRMATION_COMMANDS = new Set([
  "build",
  "flash",
  "menuconfig",
  "buildFlashMonitor",
  "eraseFlash",
  "fullClean",
  "setTarget",
]);

const TASK_COMMANDS = new Set([
  "build",
  "flash",
  "monitor",
  "buildFlashMonitor",
  "fullClean",
  "eraseFlash",
  "apptrace",
  "heaptrace",
]);

const WEBVIEW_COMMANDS = new Set([
  "menuconfig",
  "size",
  "newProject",
  "partitionTable",
  "componentManager",
]);

// Commands that show dialogs or simple operations
const DIALOG_COMMANDS = new Set(["selectPort", "setTarget", "doctor"]);

let disposable: vscode.Disposable | undefined;

export function activateLanguageTool(context: vscode.ExtensionContext) {
  disposable = vscode.lm.registerTool("espIdfCommands", {
    async invoke(
      options: {
        input: {
          command: string;
          target?: string;
          partitionToUse?: string;
          flashType?: string;
        };
      },
      token: vscode.CancellationToken
    ) {
      const commandName = options.input.command;
      const target = options.input.target;
      const commandId = COMMAND_MAP[commandName];

      const defaultWorkspace = vscode.workspace.workspaceFolders?.[0];

      const workspaceURI = ESP.GlobalConfiguration.store.get<vscode.Uri>(
        ESP.GlobalConfiguration.SELECTED_WORKSPACE_FOLDER,
        defaultWorkspace?.uri
      );

      // Check if we have a valid workspace
      if (!workspaceURI) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            "No ESP-IDF workspace found. Please open an ESP-IDF project folder first."
          ),
        ]);
      }

      let flashType = options.input.flashType as ESP.FlashType;
      if (!flashType) {
        flashType = readParameter(
          "idf.flashType",
          workspaceURI
        ) as ESP.FlashType;
        if (!flashType) {
          flashType = ESP.FlashType.UART;
        }
      }

      // Validate flash type
      if (flashType && !["UART", "JTAG", "DFU"].includes(flashType)) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            `Invalid flash type: ${flashType}. Valid options are: UART, JTAG, DFU`
          ),
        ]);
      }

      let encryptPartitions = await isFlashEncryptionEnabled(workspaceURI);

      let partitionToUse = options.input.partitionToUse as
        | ESP.BuildType
        | undefined;

      // If partitionToUse is explicitly set to undefined, keep it undefined
      // If it's not provided (null/undefined), use the default from configuration
      if (options.input.partitionToUse === undefined) {
        partitionToUse = readParameter(
          "idf.flashPartitionToUse",
          workspaceURI
        ) as ESP.BuildType;
      }

      if (
        partitionToUse &&
        !["app", "bootloader", "partition-table"].includes(partitionToUse)
      ) {
        partitionToUse = undefined;
      }

      let continueFlag = true;
      if (commandId) {
        try {
          await focusOnAppropriateOutput(commandName);
          if (commandName === "build") {
            continueFlag = await buildCommandMain(
              workspaceURI,
              token,
              flashType,
              partitionToUse
            );
          } else if (commandName === "flash") {
            if (IDFMonitor.terminal) {
              IDFMonitor.terminal.sendText(ESP.CTRL_RBRACKET);
              const monitorDelay = readParameter(
                "idf.monitorDelay",
                workspaceURI
              ) as number;
              await sleep(monitorDelay);
            }
            const port = await readSerialPort(workspaceURI, false);
            if (!port) {
              return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                  vscode.l10n.t(
                    "No serial port found for current IDF_TARGET: {0}",
                    await getIdfTargetFromSdkconfig(workspaceURI)
                  )
                ),
              ]);
            }
            const flashBaudRate = readParameter(
              "idf.flashBaudRate",
              workspaceURI
            );
            const canFlash = await verifyCanFlash(
              flashBaudRate,
              port,
              flashType,
              workspaceURI
            );
            if (!canFlash) {
              return;
            }
            if (flashType === ESP.FlashType.JTAG) {
              const openOCDManager = OpenOCDManager.init();
              const currOpenOcdVersion = await openOCDManager.version();
              const openOCDVersionIsValid = PreCheck.openOCDVersionValidator(
                "v0.10.0-esp32-20201125",
                currOpenOcdVersion
              );
              if (!openOCDVersionIsValid) {
                return new vscode.LanguageModelToolResult([
                  new vscode.LanguageModelTextPart(
                    `Minimum OpenOCD version v0.10.0-esp32-20201125 is required while you have ${currOpenOcdVersion} version installed`
                  ),
                ]);
              }
              await jtagFlashCommandMain(workspaceURI);
            } else {
              const idfPathDir = readParameter(
                "idf.espIdfPath",
                workspaceURI
              ) as string;
              await uartFlashCommandMain(
                token,
                flashBaudRate,
                idfPathDir,
                port,
                workspaceURI,
                flashType,
                encryptPartitions,
                partitionToUse
              );
            }
          } else if (commandName === "monitor") {
            if (IDFMonitor.terminal) {
              IDFMonitor.terminal.sendText(ESP.CTRL_RBRACKET);
            }
            if (vscode.env.uiKind === vscode.UIKind.Web) {
              vscode.commands.executeCommand(IDFWebCommandKeys.Monitor);
              return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                  "Redirecting to ESP-IDF Web Monitor command"
                ),
              ]);
            }
            const noReset = await shouldDisableMonitorReset(workspaceURI);
            await createNewIdfMonitor(workspaceURI, noReset);
          } else if (commandName === "buildFlashMonitor") {
            continueFlag = await buildCommandMain(
              workspaceURI,
              token,
              flashType,
              partitionToUse
            );
            if (!continueFlag) {
              return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                  "Build ended without success."
                ),
              ]);
            }
            if (vscode.env.uiKind === vscode.UIKind.Web) {
              vscode.commands.executeCommand(IDFWebCommandKeys.FlashAndMonitor);
              return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                  "Redirecting to ESP-IDF Web Flash and Monitor command"
                ),
              ]);
            }
            if (IDFMonitor.terminal) {
              IDFMonitor.terminal.sendText(ESP.CTRL_RBRACKET);
              const monitorDelay = readParameter(
                "idf.monitorDelay",
                workspaceURI
              ) as number;
              await sleep(monitorDelay);
            }
            const port = await readSerialPort(workspaceURI, false);
            if (!port) {
              return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                  vscode.l10n.t(
                    "No serial port found for current IDF_TARGET: {0}",
                    await getIdfTargetFromSdkconfig(workspaceURI)
                  )
                ),
              ]);
            }
            const flashBaudRate = readParameter(
              "idf.flashBaudRate",
              workspaceURI
            );
            const canFlash = await verifyCanFlash(
              flashBaudRate,
              port,
              flashType,
              workspaceURI
            );
            if (!canFlash) {
              return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                  "Flash verification has failed"
                ),
              ]);
            }
            if (flashType === ESP.FlashType.JTAG) {
              const openOCDManager = OpenOCDManager.init();
              const currOpenOcdVersion = await openOCDManager.version();
              const openOCDVersionIsValid = PreCheck.openOCDVersionValidator(
                "v0.10.0-esp32-20201125",
                currOpenOcdVersion
              );
              if (!openOCDVersionIsValid) {
                return new vscode.LanguageModelToolResult([
                  new vscode.LanguageModelTextPart(
                    `Minimum OpenOCD version v0.10.0-esp32-20201125 is required while you have ${currOpenOcdVersion} version installed`
                  ),
                ]);
              }
              await jtagFlashCommandMain(workspaceURI);
            } else {
              const idfPathDir = readParameter(
                "idf.espIdfPath",
                workspaceURI
              ) as string;
              await uartFlashCommandMain(
                token,
                flashBaudRate,
                idfPathDir,
                port,
                workspaceURI,
                flashType,
                encryptPartitions,
                partitionToUse
              );
            }
            if (IDFMonitor.terminal) {
              IDFMonitor.terminal.sendText(ESP.CTRL_RBRACKET);
            }
            const noReset = await shouldDisableMonitorReset(workspaceURI);
            await createNewIdfMonitor(workspaceURI, noReset);
          } else if (commandName === "eraseFlash") {
            const eraseFlashTask = new EraseFlashTask(workspaceURI);
            await eraseFlashTask.eraseFlash();
            await TaskManager.runTasks();
            if (!token.isCancellationRequested) {
              EraseFlashTask.isErasing = false;
              const msg = "Erase flash done";
              OutputChannel.appendLineAndShow(msg, "Erase flash");
              Logger.infoNotify(msg);
            }
            TaskManager.disposeListeners();
          } else if (commandName === "setTarget") {
            if (!target) {
              return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                  "Please provide a ESP-IDF target name (esp32, esp32s2, etc.)"
                ),
              ]);
            }
            const targetsFromIdf = await getTargetsFromEspIdf(workspaceURI);
            const selectedTarget = targetsFromIdf.find(
              (t) => t.target === target
            );

            if (!selectedTarget) {
              const espIdfPath = readParameter(
                "idf.espIdfPath",
                workspaceURI
              ) as string;
              const espIdfVersion = await getEspIdfFromCMake(espIdfPath);
              return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                  `${target} is not a valid target for ESP-IDF ${espIdfVersion}`
                ),
              ]);
            }
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(
              workspaceURI
            );
            if (isSettingIDFTarget) {
              Logger.info("setTargetInIDF is already running.");
              return;
            }
            setIsSettingIDFTarget(true);
            await setTargetInIDF(workspaceFolder, selectedTarget);

            // Update configuration like setIdfTarget does
            const configurationTarget =
              vscode.ConfigurationTarget.WorkspaceFolder;
            const customExtraVars = readParameter(
              "idf.customExtraVars",
              workspaceURI
            ) as { [key: string]: string };
            customExtraVars["IDF_TARGET"] = selectedTarget.target;
            await writeParameter(
              "idf.customExtraVars",
              customExtraVars,
              configurationTarget,
              workspaceFolder.uri
            );
            await updateCurrentProfileIdfTarget(
              selectedTarget.target,
              workspaceFolder.uri
            );

            await getIdfTargetFromSdkconfig(
              workspaceFolder.uri,
              statusBarItems["target"]
            );

            setIsSettingIDFTarget(false);
          } else {
            await vscode.commands.executeCommand(commandId);
          }

          const feedback = await getCommandFeedback(
            commandName,
            target,
            options.input.partitionToUse,
            options.input.flashType
          );
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(feedback),
          ]);
        } catch (error) {
          if (error.message === "ALREADY_BUILDING") {
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart("Already a build is running!"),
            ]);
          }
          if (error.message === "BUILD_TERMINATED") {
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart("Build is Terminated"),
            ]);
          }
          if (error.message === "ALREADY_FLASHING") {
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart(
                "Already one flash process is running!"
              ),
            ]);
          }
          if (error.message === "NO_DFU_DEVICE_SELECTED") {
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart("No DFU was selected"),
            ]);
          }
          if (error.message === "Task ESP-IDF Flash exited with code 74") {
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart(
                "No DFU capable USB device available found"
              ),
            ]);
          }
          if (error.message === "FLASH_TERMINATED") {
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart("Flashing has been stopped!"),
            ]);
          }
          if (error.message === "SECTION_BIN_FILE_NOT_ACCESSIBLE") {
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart(
                "Flash (.bin) files don't exists or can't be accessed!"
              ),
            ]);
          }
          if (
            error.code === "ENOENT" ||
            error.message === "SCRIPT_PERMISSION_ERROR"
          ) {
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart(
                "Make sure you have the esptool.py installed and set in $PATH with proper permission"
              ),
            ]);
          }
          const errorMessage = `Failed to execute command "${commandName}": ${error.message}\n${error.stack}`;
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(errorMessage),
          ]);
        }
      } else {
        throw new Error(`Unknown ESP-IDF command: ${commandName}`);
      }
    },

    async prepareInvocation(
      options: {
        input: {
          command: string;
          target?: string;
          partitionToUse?: string;
          flashType?: string;
        };
      },
      token: vscode.CancellationToken
    ) {
      const commandName = options.input.command;
      const target = options.input.target;

      if (CONFIRMATION_COMMANDS.has(commandName)) {
        const params = [];
        if (target) params.push(`target "${target}"`);
        if (options.input.partitionToUse !== undefined) {
          if (options.input.partitionToUse === null) {
            params.push(`partition "undefined (use default)"`);
          } else {
            params.push(`partition "${options.input.partitionToUse}"`);
          }
        }
        if (options.input.flashType)
          params.push(`flash type "${options.input.flashType}"`);

        const paramString =
          params.length > 0 ? ` with ${params.join(", ")}` : "";
        const message = `Are you sure you want to run the "${commandName}" command${paramString}? This may affect your ESP-IDF project or device.`;

        return {
          confirmationMessages: {
            title: `Confirm ESP-IDF Command`,
            message,
          },
        };
      }

      const invocationMessage = getInvocationMessage(
        commandName,
        target,
        options.input.partitionToUse,
        options.input.flashType
      );

      return {
        invocationMessage,
      };
    },
  });
  context.subscriptions.push(disposable);
}

async function focusOnAppropriateOutput(commandName: string): Promise<void> {
  if (TASK_COMMANDS.has(commandName)) {
    await focusOnTerminal();
  } else {
    OutputChannel.show();
  }
}

async function focusOnTerminal(): Promise<void> {
  try {
    await vscode.commands.executeCommand("workbench.action.terminal.focus");
  } catch (error) {
    OutputChannel.show();
  }
}

async function getCommandFeedback(
  commandName: string,
  target?: string,
  partitionToUse?: string | null,
  flashType?: string
): Promise<string> {
  const params = [];
  if (target) params.push(`target "${target}"`);
  if (partitionToUse !== undefined) {
    params.push(`partition "${partitionToUse}"`);
  }
  if (flashType) params.push(`flash type "${flashType}"`);
  const paramString = params.length > 0 ? ` with ${params.join(", ")}` : "";

  if (TASK_COMMANDS.has(commandName)) {
    const taskDescription = getTaskDescription(commandName);
    return `Command "${commandName}"${paramString} has been started successfully. ${taskDescription} The task is now running in the background. The terminal tab has been focused for you to monitor the task progress. You can also check the output panel or status bar for additional information.`;
  }

  if (WEBVIEW_COMMANDS.has(commandName)) {
    const webviewDescription = getWebviewDescription(commandName);
    return `Command "${commandName}"${paramString} has been executed successfully. A webview panel has been opened for you to interact with the ${webviewDescription}. The ESP-IDF output channel has been focused to show any relevant information.`;
  }

  if (DIALOG_COMMANDS.has(commandName)) {
    if (commandName === "setTarget" && target) {
      return `Command "${commandName}" with target "${target}" is now running. The ESP-IDF target is being set to ${target}. The ESP-IDF output channel has been focused to show the operation details. You can verify this in the status bar or by checking your project configuration.`;
    }
    if (commandName === "selectPort") {
      return `Command "${commandName}"${paramString} is now running. A port selection dialog has been opened. The ESP-IDF output channel has been focused to show any relevant information. Please select the appropriate serial port for your ESP-IDF device.`;
    }
    if (commandName === "doctor") {
      return `Command "${commandName}"${paramString} is now running. The ESP-IDF doctor diagnostic tool is now running. The ESP-IDF output channel has been focused to show detailed information about your ESP-IDF setup and any potential issues.`;
    }
    return `Command "${commandName}"${paramString} is now running. A dialog or interface has been opened for you to complete the operation. The ESP-IDF output channel has been focused to show any relevant information.`;
  }

  return `Command "${commandName}"${paramString}  is now running. The ESP-IDF output channel has been focused to show any relevant information.`;
}

function getInvocationMessage(
  commandName: string,
  target?: string,
  partitionToUse?: string | null,
  flashType?: string
): string {
  const params = [];
  if (target) params.push(`target ${target}`);
  if (partitionToUse) {
    params.push(`partition ${partitionToUse}`);
  }
  if (flashType) params.push(`flash type ${flashType}`);
  const paramString = params.length > 0 ? ` with ${params.join(", ")}` : "";

  if (TASK_COMMANDS.has(commandName)) {
    const taskDescription = getTaskDescription(commandName);
    return `Starting ESP-IDF task: ${commandName}${paramString}. ${taskDescription} This may take some time to complete. The terminal will be focused to show task progress.`;
  }

  if (WEBVIEW_COMMANDS.has(commandName)) {
    return `Opening ${getWebviewDescription(
      commandName
    )}: ${commandName}${paramString}. The ESP-IDF output channel will be focused.`;
  }

  if (DIALOG_COMMANDS.has(commandName)) {
    return `Executing ESP-IDF command: ${commandName}${paramString}. The ESP-IDF output channel will be focused.`;
  }

  return `Executing ESP-IDF command: ${commandName}${paramString}. The ESP-IDF output channel will be focused.`;
}

function getTaskDescription(commandName: string): string {
  switch (commandName) {
    case "build":
      return "This will compile your ESP-IDF project and generate the necessary binary files.";
    case "flash":
      return "This will upload the compiled firmware to your ESP-IDF device.";
    case "monitor":
      return "This will open a serial monitor to view device output and send commands.";
    case "buildFlashMonitor":
      return "This will build the project, flash it to the device, and start monitoring in sequence.";
    case "fullClean":
      return "This will clean all build artifacts and temporary files from your project.";
    case "eraseFlash":
      return "This will completely erase the flash memory of your ESP-IDF device.";
    case "apptrace":
      return "This will start application tracing to analyze performance and behavior.";
    case "heaptrace":
      return "This will start heap tracing to monitor memory allocation and usage.";
    default:
      return "This task will be executed in the background.";
  }
}

function getWebviewDescription(commandName: string): string {
  switch (commandName) {
    case "menuconfig":
      return "SDK Configuration Editor - Configure your ESP-IDF project settings";
    case "size":
      return "Size Analysis Tool - Analyze memory usage and optimize your application";
    case "newProject":
      return "New Project Wizard - Create a new ESP-IDF project from templates";
    case "partitionTable":
      return "Partition Table Editor - Configure flash memory layout";
    case "componentManager":
      return "Component Manager - Browse and install ESP-IDF components";
    default:
      return "interface";
  }
}

export function deactivateLanguageTool() {
  if (disposable) {
    disposable.dispose();
    disposable = undefined;
  }
}
