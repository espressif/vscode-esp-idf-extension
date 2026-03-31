/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 26th November 2025 10:51:20 am
 * Copyright 2025 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { env, l10n, workspace } from "vscode";
import { compareVersion, getEspIdfFromCMake } from "../utils";
import { Logger } from "../logger/logger";
import { ESP } from "../config";

type PreCheckFunc = (...args: any[]) => boolean;
export type PreCheckInput = [PreCheckFunc, string];
export class PreCheck {
  public static perform(
    preCheckFunctions: PreCheckInput[],
    proceed: () => any
  ): any {
    let isPassedAll: boolean = true;
    preCheckFunctions.forEach((preCheck: PreCheckInput) => {
      if (!preCheck[0]()) {
        isPassedAll = false;
        Logger.errorNotify(
          preCheck[1],
          new Error("PRECHECK_FAILED"),
          "utils precheck failed",
          undefined,
          false
        );
      }
    });
    if (isPassedAll) {
      return proceed();
    }
  }
  public static isWorkspaceFolderOpen(): boolean {
    return (
      (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) ||
      false
    );
  }
  public static isNotDockerContainer(): boolean {
    return env.remoteName !== "dev-container";
  }
  public static notUsingWebIde(): boolean {
    if (env.remoteName === "codespaces") {
      return false;
    }
    return process.env.WEB_IDE ? false : true;
  }

  /** Returns true if running in a VS Code fork (Cursor, VSCodium, etc.) */
  public static isRunningInVSCodeFork(): boolean {
    return env.appName !== "Visual Studio Code";
  }

  public static openOCDVersionValidator(
    minVersion: string,
    currentVersion: string
  ) {
    try {
      const minVersionParsed = minVersion.match(/v(\d+.?\d+.?\d)-esp32-(\d+)/);
      const currentVersionParsed = currentVersion.match(
        /v(\d+.?\d+.?\d)-esp32-(\d+)/
      );
      if (!minVersionParsed || !currentVersionParsed) {
        throw new Error("Error parsing OpenOCD versions");
      }
      const versionComparison = compareVersion(
        currentVersionParsed[1],
        minVersionParsed[1]
      );
      if (versionComparison !== 0) {
        return versionComparison > 0;
      }
      return (
        parseInt(currentVersionParsed[2], 10) >=
        parseInt(minVersionParsed[2], 10)
      );
    } catch (error) {
      Logger.error(
        `openOCDVersionValidator failed unexpectedly - min:${minVersion}, curr:${currentVersion}`,
        error as Error,
        "src utils openOCDVersionValidator"
      );
      return false;
    }
  }
  public static espIdfVersionValidator(
    minVersion: string,
    currentVersion: string
  ) {
    try {
      return compareVersion(currentVersion, minVersion) !== -1;
    } catch (error) {
      Logger.error(
        `ESP-IDF version validator failed - min: ${minVersion}, current: ${currentVersion}`,
        error as Error,
        "src utils espIdfVersionValidator"
      );
      return false;
    }
  }
}

const openFolderFirstMsg = l10n.t("Open a folder first.");
const cmdNotForWebIdeMsg = l10n.t(
  "Selected command is not available in {envName}",
  { envName: "Codespaces" }
);
const cmdNotDockerContainerMsg = l10n.t(
  "Selected command is not available in {envName}",
  { envName: "Docker container" }
);
const cmdNeedToolVersionOrHigher = (minVersion: string, tool: string) =>
  l10n.t("Selected command needs {tool} {minVersion} or higher", {
    minVersion,
    tool,
  });
export const openFolderCheck = [
  PreCheck.isWorkspaceFolderOpen,
  openFolderFirstMsg,
] as PreCheckInput;

export const webIdeCheck = [
  PreCheck.notUsingWebIde,
  cmdNotForWebIdeMsg,
] as PreCheckInput;

export const isNotDockerContainerCheck = [
  PreCheck.isNotDockerContainer,
  cmdNotDockerContainerMsg,
] as PreCheckInput;

export async function minIdfVersionCheck(minVersion: string) {
  const currentEnvVars = ESP.ProjectConfiguration.store.get<{
    [key: string]: string;
  }>(ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION, {});
  const currentVersion = await getEspIdfFromCMake(currentEnvVars["IDF_PATH"]);
  return [
    () => PreCheck.espIdfVersionValidator(minVersion, currentVersion),
    cmdNeedToolVersionOrHigher("v" + minVersion, "ESP-IDF"),
  ] as PreCheckInput;
}
