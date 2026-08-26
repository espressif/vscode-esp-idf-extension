import { commands } from "vscode";
import { OutputChannel } from "../../common/outputChannel";
import { ErrorPresentation } from "../../common/error/types";

const outputChannel = "Set Target";

export const setTargetErrorPresentation = {
  taskFailedWithOutput: {
    userMessage: "Set target failed. Check the output for details.",
    logMessage: "Set target task failed with captured output.",
    actions: [{ label: "View Output", execute: () => OutputChannel.show() }],
    outputChannel,
  },
  invalidIdfTarget: {
    userMessage:
      '"{target}" is not a supported IDF target. Supported targets: {supportedTargets}.',
    logMessage:
      'Invalid IDF target "{target}". Supported targets: {supportedTargets}.',
    actions: [
      {
        label: "Set Target",
        execute: () => commands.executeCommand("espIdf.setTarget"),
      },
    ],
    outputChannel,
  },
  idfTaskInProgress: {
    userMessage: "Wait for ESP-IDF set target to finish.",
    logMessage: "Attempted to start set target while set target is in progress.",
    actions: [],
    outputChannel,
  },
  fileNotFound: {
    userMessage: "Could not load ESP-IDF targets. File not found: {filePath}.",
    logMessage: "ESP-IDF targets file not found: {filePath}.",
    actions: [],
    outputChannel,
  },
  missingDependency: {
    userMessage: "Required dependency {dependency} is missing.",
    logMessage: "Missing dependency: {dependency}.",
    outputChannel,
  },
} satisfies Record<string, ErrorPresentation>;
