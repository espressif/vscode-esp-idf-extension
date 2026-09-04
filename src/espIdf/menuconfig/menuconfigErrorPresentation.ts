import { ErrorPresentation } from "../../common/error/types";

export const menuconfigErrorPresentation = {
  fileNotFound: {
    userMessage:
      "Menuconfig menus file not found at {filePath}. Build the project first.",
    logMessage: "Menuconfig menus file not found: {filePath}.",
    actions: [],
    outputChannel: "SDK Configuration Editor",
  },
} satisfies Record<string, ErrorPresentation>;
