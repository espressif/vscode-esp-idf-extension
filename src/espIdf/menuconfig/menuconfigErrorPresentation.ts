import { ErrorPresentation } from "../../common/error/types";

const outputChannel = "SDK Configuration Editor";

export const menuconfigErrorPresentation = {
  fileNotFound: {
    userMessage:
      "Menuconfig menus file not found at {filePath}. Build the project first.",
    logMessage: "Menuconfig menus file not found: {filePath}.",
    actions: [],
    outputChannel,
  },
  taskFailedWithOutput: {
    userMessage:
      "Save default SDK configuration failed. Check the terminal output for details.",
    logMessage: "save-defconfig task failed with captured output.",
    outputChannel,
  },
} satisfies Record<string, ErrorPresentation>;
