import * as vscode from "vscode";
import { Logger } from "../logger/logger";
import { OutputChannel } from "../logger/outputChannel";
import { ESP } from "../config";
import { buildMain } from "../build/buildMain";
import { readParameter, writeParameter } from "../idfConfiguration";
import { getEspIdfFromCMake } from "../utils";
import { IDFWebCommandKeys } from "../cmdTreeView/cmdStore";
import { isFlashEncryptionEnabled } from "../flash/verify/flashEncryption";
import { IdfTaskExecution } from "../taskManager";
import { getTargetsFromEspIdf } from "../espIdf/setTarget/getTargets";
import { updateCurrentProfileIdfTarget } from "../project-conf";
import { getIdfTargetFromSdkconfig } from "../workspaceConfig";
import { setTargetInIDF } from "../espIdf/setTarget/setTargetInIdf";
import { statusBarItems } from "../statusBar";
import { isSettingIDFTarget, setIsSettingIDFTarget } from "../espIdf/setTarget";
import {
  OutputCapturingExecution,
  ShellOutputCapturingExecution,
} from "../taskManager/customExecution";
import { configureEnvVariables } from "../common/prepareEnv";
import { flashMain } from "../flash/main";
import { isFlashRelatedTaskExitCode74 } from "../flash/shared/errHandling";
import { eraseFlashMain } from "../eraseFlash/main";
import { buildFlashAndMonitorCapture } from "../buildFlashMonitor";
import { monitorMain } from "../espIdf/monitor/main";

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
  "eraseFlash",
]);

const WEBVIEW_COMMANDS = new Set([
  "menuconfig",
  "size",
  "newProject",
  "partitionTable",
  "componentManager",
]);

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

      const workspaceFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      const workspaceUri = workspaceFolder?.uri;

      // Check if we have a valid workspace
      if (!workspaceUri) {
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
          workspaceFolder
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

      let encryptPartitions: boolean = false;
      if (commandName === "flash" || commandName === "buildFlashMonitor") {
        encryptPartitions = await isFlashEncryptionEnabled(workspaceUri);
      }

      let partitionToUse = options.input.partitionToUse as
        | ESP.BuildType
        | undefined;

      // If partitionToUse is explicitly set to undefined, keep it undefined
      // If it's not provided (null/undefined), use the default from configuration
      if (options.input.partitionToUse === undefined) {
        partitionToUse = readParameter(
          "idf.flashPartitionToUse",
          workspaceUri
        ) as ESP.BuildType;
      }

      if (
        partitionToUse &&
        !["app", "bootloader", "partition-table"].includes(partitionToUse)
      ) {
        partitionToUse = undefined;
      }
      const modifiedEnv = await configureEnvVariables(workspaceUri);

      let continueFlag = true;
      let taskExecutions: IdfTaskExecution[] = [];
      if (commandId) {
        let outputs: vscode.LanguageModelTextPart[] = [];
        try {
          await focusOnAppropriateOutput(commandName);
          if (commandName === "build") {
            let buildCmdResults = await buildMain(
              workspaceUri,
              token,
              flashType,
              partitionToUse,
              true // captureOutput = true for language tool
            );
            continueFlag = buildCmdResults.continueFlag;
            taskExecutions.push(...buildCmdResults.executions);
          } else if (commandName === "flash") {
            let flashResults = await flashMain(
              workspaceUri,
              token,
              flashType,
              encryptPartitions,
              partitionToUse,
              true // captureOutput = true for language tool
            );
            continueFlag = flashResults.continueFlag;
            taskExecutions.push(...flashResults.executions);
          } else if (commandName === "monitor") {
            if (vscode.env.uiKind === vscode.UIKind.Web) {
              vscode.commands.executeCommand(IDFWebCommandKeys.Monitor);
              return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                  "Redirecting to ESP-IDF Web Monitor command"
                ),
              ]);
            }
            await monitorMain(workspaceFolder);
          } else if (commandName === "buildFlashMonitor") {
            const bfmResults = await buildFlashAndMonitorCapture(
              workspaceFolder,
              token,
              true,
              flashType,
              partitionToUse
            );
            continueFlag = bfmResults.continueFlag;
            taskExecutions.push(...bfmResults.executions);
          } else if (commandName === "eraseFlash") {
            let eraseFlashResult = await eraseFlashMain(
              workspaceUri,
              token,
              flashType,
              true // captureOutput = true for language tool
            );
            continueFlag = eraseFlashResult.continueFlag;
            taskExecutions.push(...eraseFlashResult.executions);
          } else if (commandName === "setTarget") {
            if (!target) {
              return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                  "Please provide a ESP-IDF target name (esp32, esp32s2, etc.)"
                ),
              ]);
            }
            const targetsFromIdf = await getTargetsFromEspIdf(workspaceUri);
            const selectedTarget = targetsFromIdf.find(
              (t) => t.target === target
            );

            if (!selectedTarget) {
              const espIdfPath = modifiedEnv["IDF_PATH"];
              const espIdfVersion = await getEspIdfFromCMake(espIdfPath);
              return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                  `${target} is not a valid target for ESP-IDF ${espIdfVersion}`
                ),
              ]);
            }
            if (isSettingIDFTarget) {
              return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                  `"setTargetInIDF is already running."`
                ),
              ]);
            }
            setIsSettingIDFTarget(true);
            const setTargetResult = await setTargetInIDF(
              workspaceUri,
              selectedTarget
            );

            // Update configuration like setIdfTarget does
            const configurationTarget =
              vscode.ConfigurationTarget.WorkspaceFolder;
            const customExtraVars = readParameter(
              "idf.customExtraVars",
              workspaceUri
            ) as { [key: string]: string };
            customExtraVars["IDF_TARGET"] = selectedTarget.target;
            await writeParameter(
              "idf.customExtraVars",
              customExtraVars,
              configurationTarget,
              workspaceUri
            );
            await updateCurrentProfileIdfTarget(
              selectedTarget.target,
              workspaceUri
            );

            await getIdfTargetFromSdkconfig(
              workspaceUri,
              statusBarItems["target"]
            );

            setIsSettingIDFTarget(false);
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart(setTargetResult),
            ]);
          } else {
            await vscode.commands.executeCommand(commandId);
          }

          if (TASK_COMMANDS.has(commandName)) {
            if (!continueFlag) {
              outputs.unshift(
                new vscode.LanguageModelTextPart(
                  `Command "${commandName}" did not complete successfully.`
                )
              );
            }
            for (const execution of taskExecutions) {
              if (execution && "getOutput" in execution) {
                const output = await (execution as
                  | OutputCapturingExecution
                  | ShellOutputCapturingExecution).getOutput();
                outputs.push(new vscode.LanguageModelTextPart(output.stdout));
                outputs.push(new vscode.LanguageModelTextPart(output.stderr));
              }
            }
            return new vscode.LanguageModelToolResult(outputs);
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
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          if (errorMessage === "ALREADY_BUILDING") {
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart("Already a build is running!"),
            ]);
          }
          if (errorMessage === "BUILD_TERMINATED") {
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart("Build is Terminated"),
            ]);
          }
          if (errorMessage === "ALREADY_FLASHING") {
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart(
                "Already one flash process is running!"
              ),
            ]);
          }
          if (errorMessage === "ALREADY_ERASING") {
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart(
                "An erase-flash operation is already in progress."
              ),
            ]);
          }
          if (errorMessage === "NO_DFU_DEVICE_SELECTED") {
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart("No DFU was selected"),
            ]);
          }
          if (isFlashRelatedTaskExitCode74(error, errorMessage)) {
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart(
                "No DFU capable USB device available found"
              ),
            ]);
          }
          if (errorMessage === "FLASH_TERMINATED") {
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart("Flashing has been stopped!"),
            ]);
          }
          if (errorMessage === "SECTION_BIN_FILE_NOT_ACCESSIBLE") {
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart(
                "Flash (.bin) files don't exists or can't be accessed!"
              ),
            ]);
          }
          if (
            (error instanceof Error &&
              "code" in error &&
              error.code === "ENOENT") ||
            errorMessage === "SCRIPT_PERMISSION_ERROR"
          ) {
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart(
                "Make sure you have the esptool.py installed and set in $PATH with proper permission"
              ),
            ]);
          }
          const sanitizedMessage = `Failed to execute command "${commandName}": ${errorMessage}`;
          const errorForLog =
            error instanceof Error ? error : new Error(String(error));
          Logger.error(sanitizedMessage, errorForLog, "langToolsInvoke");
          return new vscode.LanguageModelToolResult([
            ...outputs,
            new vscode.LanguageModelTextPart(sanitizedMessage),
          ]);
        }
      } else {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            `Unknown ESP-IDF command: ${commandName}`
          ),
        ]);
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

  if (WEBVIEW_COMMANDS.has(commandName)) {
    const webviewDescription = getWebviewDescription(commandName);
    return `Command "${commandName}"${paramString} has been executed successfully. A webview panel has been opened for you to interact with the ${webviewDescription}. The ESP-IDF output channel has been focused to show any relevant information.`;
  }

  if (commandName === "setTarget" && target) {
    return `Command "${commandName}" with target "${target}" is now running. The ESP-IDF target is being set to ${target}. The ESP-IDF output channel has been focused to show the operation details. You can verify this in the status bar or by checking your project configuration.`;
  }
  if (commandName === "selectPort") {
    return `Command "${commandName}"${paramString} is now running. A port selection dialog has been opened. The ESP-IDF output channel has been focused to show any relevant information. Please select the appropriate serial port for your ESP-IDF device.`;
  }
  if (commandName === "doctor") {
    return `Command "${commandName}"${paramString} is now running. The ESP-IDF doctor diagnostic tool is now running. The ESP-IDF output channel has been focused to show detailed information about your ESP-IDF setup and any potential issues.`;
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
    case "eraseFlash":
      return "This will completely erase the flash memory of your ESP-IDF device.";
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
