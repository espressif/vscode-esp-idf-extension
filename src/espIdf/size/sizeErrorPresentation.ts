import { commands } from "vscode";
import { OutputChannel } from "../../common/outputChannel";
import { ErrorPresentation } from "../../common/error/types";

const outputChannel = "Size";

export const sizeErrorPresentation = {
  fileNotFound: {
    userMessage: "ESP-IDF Size requires a build first. Build your project?",
    logMessage: "Size analysis blocked: required file not found: {filePath}.",
    actions: [
      {
        label: "Build",
        execute: () => commands.executeCommand("espIdf.buildDevice"),
      },
    ],
    outputChannel,
  },
  taskFailedWithOutput: {
    userMessage: "Size analysis failed. Check the output for details.",
    logMessage: "Size analysis task failed with captured output.",
    actions: [{ label: "View Output", execute: () => OutputChannel.show() }],
    outputChannel,
  },
  missingDependency: {
    userMessage: "Required dependency {dependency} is missing.",
    logMessage: "Missing dependency: {dependency}.",
    actions: [],
    outputChannel,
  },
  parseError: {
    userMessage: "Failed to parse size analysis output from {filePath}.",
    logMessage: "Failed to parse idf_size.py output for {filePath}.",
    actions: [],
    outputChannel,
  },
  invalidConfiguration: {
    userMessage:
      "Extension setting {setting} is invalid. Please review your configuration.",
    logMessage: "Invalid extension configuration: {setting}.",
    actions: [
      {
        label: "Open Settings",
        execute: () =>
          commands.executeCommand("workbench.action.openSettings", "idf.buildPath"),
      },
    ],
    outputChannel,
  },
  invalidIdfVersion: {
    userMessage: "Failed to read ESP-IDF version from {idfPath}.",
    logMessage: "Failed to read ESP-IDF version from {idfPath}: {detail}.",
    actions: [],
    outputChannel,
  },
} satisfies Record<string, ErrorPresentation>;
