import { commands } from "vscode";
import { ErrorPresentation } from "../../common/error/types";

const outputChannel = "Unit Test";
const viewTerminalOutput = {
  label: "View Terminal Output",
  execute: () => commands.executeCommand("workbench.action.terminal.focus"),
};

export const unitTestErrorPresentation = {
  unitTestTaskFailed: {
    userMessage: "Unit test app task failed. Check the terminal output for details.",
    logMessage: "Unit test app task failed: {detail}.",
    actions: [viewTerminalOutput],
    outputChannel,
  },
  taskFailedWithOutput: {
    userMessage:
      "Unit test app build failed. Check the terminal output for details.",
    logMessage: "Unit test app build task failed with captured output.",
    actions: [viewTerminalOutput],
    outputChannel,
  },
  alreadyBuilding: {
    userMessage: "Wait for ESP-IDF build to finish before building the unit test app.",
    logMessage:
      "Attempted to build unit test app while another build is in progress.",
    actions: [],
    outputChannel,
  },
  alreadyFlashing: {
    userMessage:
      "Wait for ESP-IDF flash to finish before flashing the unit test app.",
    logMessage:
      "Attempted to flash unit test app while another flash is in progress.",
    actions: [],
    outputChannel,
  },
  idfTaskInProgress: {
    userMessage: "Wait for ESP-IDF {taskName} to finish before running unit tests.",
    logMessage: "Unit test blocked while {taskName} is in progress.",
    actions: [],
    outputChannel,
  },
  buildTerminated: {
    userMessage: "Unit test app build was terminated.",
    logMessage: "Unit test app build was terminated by user cancellation.",
    actions: [],
    outputChannel,
  },
  flashTerminated: {
    userMessage: "Unit test app flash was stopped.",
    logMessage: "Unit test app flash was terminated by user cancellation.",
    actions: [],
    outputChannel,
  },
  noPortSelected: {
    userMessage: "Select a serial port before flashing the unit test app.",
    logMessage: "No serial port selected for unit test app flash.",
    actions: [
      {
        label: "Select Port",
        execute: () => commands.executeCommand("espIdf.selectPort"),
      },
    ],
    outputChannel,
  },
  noSerialPort: {
    userMessage: "No serial port found for current IDF_TARGET: {idfTarget}",
    logMessage: "No serial port found for IDF_TARGET {idfTarget}.",
    actions: [
      {
        label: "Select Port",
        execute: () => commands.executeCommand("espIdf.selectPort"),
      },
    ],
    outputChannel,
  },
  missingDependency: {
    userMessage: "Required dependency {dependency} is missing.",
    logMessage: "Missing dependency: {dependency}.",
    actions: [],
    outputChannel,
  },
} satisfies Record<string, ErrorPresentation>;
