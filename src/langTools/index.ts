import * as vscode from "vscode";
import { OutputChannel } from "../logger/outputChannel";

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
      options: { input: { command: string; target?: string } },
      token: vscode.CancellationToken
    ) {
      const commandName = options.input.command;
      const target = options.input.target;
      const commandId = COMMAND_MAP[commandName];

      if (commandId) {
        try {
          if (commandName === "setTarget" && target) {
            await vscode.commands.executeCommand(commandId, target);
          } else {
            await vscode.commands.executeCommand(commandId);
          }
          await focusOnAppropriateOutput(commandName);

          const feedback = await getCommandFeedback(commandName, target);
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(feedback),
          ]);
        } catch (error) {
          const errorMessage = `Failed to execute command "${commandName}": ${error.message}`;
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(errorMessage),
          ]);
        }
      } else {
        throw new Error(`Unknown ESP-IDF command: ${commandName}`);
      }
    },

    async prepareInvocation(
      options: { input: { command: string; target?: string } },
      token: vscode.CancellationToken
    ) {
      const commandName = options.input.command;
      const target = options.input.target;

      if (CONFIRMATION_COMMANDS.has(commandName)) {
        const message = target
          ? `Are you sure you want to run the "${commandName}" command with target "${target}"? This may affect your ESP-IDF project or device.`
          : `Are you sure you want to run the "${commandName}" command? This may affect your ESP-IDF project or device.`;

        return {
          confirmationMessages: {
            title: `Confirm ESP-IDF Command`,
            message,
          },
        };
      }

      const invocationMessage = getInvocationMessage(commandName, target);

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
  target?: string
): Promise<string> {
  const targetInfo = target ? ` with target "${target}"` : "";

  if (TASK_COMMANDS.has(commandName)) {
    const taskDescription = getTaskDescription(commandName);
    return `Command "${commandName}"${targetInfo} has been started successfully. ${taskDescription} The task is now running in the background. The terminal tab has been focused for you to monitor the task progress. You can also check the output panel or status bar for additional information.`;
  }

  if (WEBVIEW_COMMANDS.has(commandName)) {
    const webviewDescription = getWebviewDescription(commandName);
    return `Command "${commandName}"${targetInfo} has been executed successfully. A webview panel has been opened for you to interact with the ${webviewDescription}. The ESP-IDF output channel has been focused to show any relevant information.`;
  }

  if (DIALOG_COMMANDS.has(commandName)) {
    if (commandName === "setTarget" && target) {
      return `Command "${commandName}" with target "${target}" is now running. The ESP-IDF target is being set to ${target}. The ESP-IDF output channel has been focused to show the operation details. You can verify this in the status bar or by checking your project configuration.`;
    }
    if (commandName === "selectPort") {
      return `Command "${commandName}"${targetInfo} is now running. A port selection dialog has been opened. The ESP-IDF output channel has been focused to show any relevant information. Please select the appropriate serial port for your ESP-IDF device.`;
    }
    if (commandName === "doctor") {
      return `Command "${commandName}"${targetInfo} is now running. The ESP-IDF doctor diagnostic tool is now running. The ESP-IDF output channel has been focused to show detailed information about your ESP-IDF setup and any potential issues.`;
    }
    return `Command "${commandName}"${targetInfo} is now running. A dialog or interface has been opened for you to complete the operation. The ESP-IDF output channel has been focused to show any relevant information.`;
  }

  return `Command "${commandName}"${targetInfo}  is now running. The ESP-IDF output channel has been focused to show any relevant information.`;
}

function getInvocationMessage(commandName: string, target?: string): string {
  const targetInfo = target ? ` with target ${target}` : "";

  if (TASK_COMMANDS.has(commandName)) {
    const taskDescription = getTaskDescription(commandName);
    return `Starting ESP-IDF task: ${commandName}${targetInfo}. ${taskDescription} This may take some time to complete. The terminal will be focused to show task progress.`;
  }

  if (WEBVIEW_COMMANDS.has(commandName)) {
    return `Opening ${getWebviewDescription(
      commandName
    )}: ${commandName}${targetInfo}. The ESP-IDF output channel will be focused.`;
  }

  if (DIALOG_COMMANDS.has(commandName)) {
    return `Executing ESP-IDF command: ${commandName}${targetInfo}. The ESP-IDF output channel will be focused.`;
  }

  return `Executing ESP-IDF command: ${commandName}${targetInfo}. The ESP-IDF output channel will be focused.`;
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
