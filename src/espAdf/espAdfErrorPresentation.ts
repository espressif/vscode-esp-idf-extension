import { OutputChannel } from "../common/outputChannel";
import { ErrorPresentation } from "../common/error/types";

export const espAdfErrorPresentation = {
  missingDependency: {
    userMessage:
      "Required dependency {dependency} is missing. Install it and ensure it is in your PATH.",
    logMessage: "ESP-ADF install blocked: missing dependency {dependency}.",
    actions: [{ label: "View Output", execute: () => OutputChannel.show() }],
    outputChannel: "ESP-ADF",
  },
  noWorkspaceOpen: {
    userMessage: "Open a workspace folder before installing ESP-ADF.",
    logMessage: "ESP-ADF install blocked: no workspace open.",
    actions: [],
    outputChannel: "ESP-ADF",
  },
} satisfies Record<string, ErrorPresentation>;
