import { commands } from "vscode";
import { ErrorPresentation } from "../../common/error/types";

const outputChannel = "Serial port";

const detectSerialPort = {
  label: "Detect",
  execute: () => commands.executeCommand("espIdf.detectSerialPort"),
};

export const serialErrorPresentation = {
  noSerialPort: {
    userMessage: "No serial port found for current IDF_TARGET: {idfTarget}",
    logMessage: "No serial port found for IDF_TARGET {idfTarget}.",
    actions: [detectSerialPort],
    outputChannel,
  },
  noSerialPortsAvailable: {
    userMessage: "No serial ports found.",
    logMessage: "No serial ports found on this system.",
    actions: [detectSerialPort],
    outputChannel,
  },
  esptoolNotAccessible: {
    userMessage:
      "Make sure you have the esptool.py installed and set in $PATH with proper permission",
    logMessage: "esptool.py is missing or not accessible.",
    actions: [],
    outputChannel,
  },
  childProcessFailed: {
    userMessage:
      "Failed to detect the default serial port. Check the output for details.",
    logMessage: "Serial port detection failed with captured process output.",
    actions: [],
    outputChannel,
  },
  missingDependency: {
    userMessage: "Required dependency {dependency} is missing.",
    logMessage: "Missing dependency: {dependency}.",
    outputChannel,
  },
} satisfies Record<string, ErrorPresentation>;
