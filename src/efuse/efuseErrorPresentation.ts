import { commands } from "vscode";
import { ErrorPresentation } from "../common/error/types";

const outputChannel = "eFuse";
const installManager = {
  label: "Open ESP-IDF Install Manager",
  execute: () => commands.executeCommand("espIdf.installManager"),
};
const selectPort = {
  label: "Select Port",
  execute: () => commands.executeCommand("espIdf.selectPort"),
};

export const efuseErrorPresentation = {
  idfVersionTooLow: {
    userMessage:
      "ESP-IDF v{minVersion} or higher is required for the eFuse view (current: {currentVersion}).",
    logMessage:
      "eFuse summary blocked: ESP-IDF {currentVersion} is below required {minVersion}.",
    actions: [installManager],
    outputChannel,
  },
  invalidConfiguration: {
    userMessage:
      "IDF_PATH is not set. Configure ESP-IDF before reading eFuse data.",
    logMessage: "eFuse summary blocked: {setting} is not configured.",
    actions: [installManager],
    outputChannel,
  },
  missingDependency: {
    userMessage:
      "Required dependency {dependency} is missing. Configure ESP-IDF before reading eFuse data.",
    logMessage: "eFuse summary blocked: missing dependency {dependency}.",
    actions: [installManager],
    outputChannel,
  },
  noSerialPort: {
    userMessage:
      "No serial port found for current IDF_TARGET: {idfTarget}. Select a valid port and try again.",
    logMessage: "eFuse summary blocked: no serial port for target {idfTarget}.",
    actions: [selectPort],
    outputChannel,
  },
  efuseSummaryFailed: {
    userMessage:
      "Failed to get the eFuse summary from the chip. Make sure you have selected a valid port. {detail}",
    logMessage: "eFuse summary command failed: {detail}.",
    actions: [selectPort],
    outputChannel,
  },
} satisfies Record<string, ErrorPresentation>;
