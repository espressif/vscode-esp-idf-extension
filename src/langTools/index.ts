import * as vscode from "vscode";
import { Logger } from "../common/logger";
import { isKnownError, idfTaskInProgress, invalidIdfTarget, IdfTaskName } from "../common/error/knownError";
import { resolveKnownErrorUserMessage } from "../common/error/resolve";
import { OutputChannel } from "../common/outputChannel";
import { ESP } from "../config";
import { buildMain } from "../build/buildMain";
import { readParameter, writeParameter } from "../configuration/idf";
import { IDFWebCommandKeys } from "../cmdTreeView/cmdStore";
import { isFlashEncryptionEnabled } from "../flash/verify/flashEncryption";
import { IdfTaskExecution } from "../taskManager/taskManager";
import { getTargetsFromEspIdf } from "../espIdf/setTarget/getTargets";
import { updateCurrentProfileIdfTarget } from "../project-conf/utils";
import { getIdfTargetFromSdkconfig } from "../configuration/workspace";
import { setTargetInIDF } from "../espIdf/setTarget/setTargetInIdf";
import { setTargetCommandErrorMapping } from "../espIdf/setTarget/errorMapping";
import { statusBarItems } from "../statusBar";
import { isSettingIDFTarget, setIsSettingIDFTarget } from "../espIdf/setTarget/main";
import {
  OutputCapturingExecution,
} from "../taskManager/customExecution";
import { flashMain } from "../flash/main";
import { eraseFlashMain } from "../eraseFlash/main";
import { buildFlashAndMonitorCapture } from "../buildFlashMonitor";
import { monitorMain } from "../espIdf/monitor/main";
import { ShellOutputCapturingExecution } from "../taskManager/shellCaptureExecution";
import { getCurrentIdfConfiguration } from "../configuration/env";

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

export function activateLanguageTool(context: vscode.ExtensionContext) {
  const disposable = vscode.lm.registerTool("espIdfCommands", {
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

      // Check if we have a valid workspace
      if (!workspaceFolder) {
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
        encryptPartitions = await isFlashEncryptionEnabled(workspaceFolder.uri);
      }

      let partitionToUse = options.input.partitionToUse as
        | ESP.BuildType
        | undefined;

      // If partitionToUse is explicitly set to undefined, keep it undefined
      // If it's not provided (null/undefined), use the default from configuration
      if (options.input.partitionToUse === undefined) {
        partitionToUse = readParameter(
          "idf.flashPartitionToUse",
          workspaceFolder
        ) as ESP.BuildType;
      }

      if (
        partitionToUse &&
        !["app", "bootloader", "partition-table"].includes(partitionToUse)
      ) {
        partitionToUse = undefined;
      }
      const modifiedEnv = getCurrentIdfConfiguration();

      let continueFlag = true;
      let taskExecutions: IdfTaskExecution[] = [];
      if (commandId) {
        let outputs: vscode.LanguageModelTextPart[] = [];
        try {
          await focusOnAppropriateOutput(commandName);
          if (commandName === "build") {
            let buildCmdResults = await buildMain(
              workspaceFolder.uri,
              token,
              flashType,
              partitionToUse,
              true // captureOutput = true for language tool
            );
            continueFlag = buildCmdResults.continueFlag;
            taskExecutions.push(...buildCmdResults.executions);
          } else if (commandName === "flash") {
            let flashResults = await flashMain(
              workspaceFolder.uri,
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
              workspaceFolder,
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
            try {
              const targetsFromIdf = await getTargetsFromEspIdf(
                workspaceFolder.uri
              );
              const selectedTarget = targetsFromIdf.find(
                (t) => t.target === target
              );

              if (!selectedTarget) {
                const message =
                  resolveKnownErrorUserMessage(
                    invalidIdfTarget(
                      target,
                      targetsFromIdf.map((t) => t.target)
                    ),
                    setTargetCommandErrorMapping
                  ) ??
                  `${target} is not a valid target.`;
                return new vscode.LanguageModelToolResult([
                  new vscode.LanguageModelTextPart(message),
                ]);
              }
              if (isSettingIDFTarget) {
                const message =
                  resolveKnownErrorUserMessage(
                    idfTaskInProgress(IdfTaskName.SetTarget),
                    setTargetCommandErrorMapping
                  ) ?? "Set target is already running.";
                return new vscode.LanguageModelToolResult([
                  new vscode.LanguageModelTextPart(message),
                ]);
              }
              setIsSettingIDFTarget(true);
              try {
                const setTargetResult = await setTargetInIDF(
                  workspaceFolder.uri,
                  selectedTarget
                );

                const configurationTarget =
                  vscode.ConfigurationTarget.WorkspaceFolder;
                const customExtraVars = readParameter(
                  "idf.customExtraVars",
                  workspaceFolder
                ) as { [key: string]: string };
                customExtraVars["IDF_TARGET"] = selectedTarget.target;
                await writeParameter(
                  "idf.customExtraVars",
                  customExtraVars,
                  configurationTarget,
                  workspaceFolder
                );
                await updateCurrentProfileIdfTarget(
                  selectedTarget.target,
                  workspaceFolder.uri
                );

                await getIdfTargetFromSdkconfig(
                  workspaceFolder.uri,
                  statusBarItems["target"]
                );

                return new vscode.LanguageModelToolResult([
                  new vscode.LanguageModelTextPart(setTargetResult),
                ]);
              } finally {
                setIsSettingIDFTarget(false);
              }
            } catch (error) {
              if (isKnownError(error)) {
                const userMessage =
                  resolveKnownErrorUserMessage(
                    error,
                    setTargetCommandErrorMapping
                  ) ?? error.message;
                return new vscode.LanguageModelToolResult([
                  new vscode.LanguageModelTextPart(userMessage),
                ]);
              }
              throw error;
            }
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
          if (isKnownError(error)) {
            const userMessage = resolveKnownErrorUserMessage(error);
            if (userMessage) {
              return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(userMessage),
              ]);
            }
          }
          const errorMessage =
            error instanceof Error ? error.message : String(error);
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
    void focusOnTerminal();
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
