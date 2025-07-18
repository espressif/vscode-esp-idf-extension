import * as vscode from "vscode";

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

// Commands that require confirmation due to potential side effects
const CONFIRMATION_COMMANDS = new Set([
  "build",
  "flash",
  "menuconfig",
  "buildFlashMonitor",
  "eraseFlash",
  "fullClean",
  "setTarget",
]);

let disposable: vscode.Disposable | undefined;

export function activateLanguageTool(context: vscode.ExtensionContext) {
  disposable = vscode.lm.registerTool("espIdfCommands", {
    async invoke(
      options: { input: { command: string } },
      token: vscode.CancellationToken
    ) {
      const commandName = options.input.command;
      const commandId = COMMAND_MAP[commandName];

      if (commandId) {
        await vscode.commands.executeCommand(commandId);
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            `Command "${commandName}" executed successfully.`
          ),
        ]);
      } else {
        throw new Error(`Unknown ESP-IDF command: ${commandName}`);
      }
    },

    async prepareInvocation(
      options: { input: { command: string } },
      token: vscode.CancellationToken
    ) {
      const commandName = options.input.command;

      if (CONFIRMATION_COMMANDS.has(commandName)) {
        return {
          confirmationMessages: {
            title: `Confirm ESP-IDF Command`,
            message: `Are you sure you want to run the "${commandName}" command? This may affect your ESP-IDF project or device.`,
          },
        };
      }

      return {
        invocationMessage: `Executing ESP-IDF command: ${commandName}`,
      };
    },
  });
  context.subscriptions.push(disposable);
}

export function deactivateLanguageTool() {
  if (disposable) {
    disposable.dispose();
    disposable = undefined;
  }
}
