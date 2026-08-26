import { commands } from "vscode";
import { ErrorPresentation } from "../../common/error/types";

const viewErrorHints = {
  label: "View Error Hints",
  execute: () => commands.executeCommand("espIdf.errorHints.focus"),
};

export const hintsErrorPresentation = {
  parseError: {
    userMessage:
      "Failed to parse OpenOCD hints file at {filePath}. Please check the syntax.",
    logMessage: "Parse error in OpenOCD hints file: {filePath}.",
    actions: [viewErrorHints],
    outputChannel: "OpenOCD",
  },
  loadFailed: {
    userMessage: "Failed to load OpenOCD error hints: {detail}",
    logMessage: "OpenOCD hints load failed: {detail}",
    actions: [viewErrorHints],
    outputChannel: "OpenOCD",
  },
} satisfies Record<string, ErrorPresentation>;
