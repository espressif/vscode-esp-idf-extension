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

import { env, workspace } from "vscode";
import { compareVersion, getEspIdfFromCMake } from "../utils";
import { Logger } from "./logger";
import { getCurrentIdfConfiguration } from "../configuration/env";
import {
  environmentNotSupported,
  idfVersionTooLow,
  KnownError,
  noWorkspaceOpen,
} from "./error/knownError";

type PreCheckFunc = (...args: any[]) => boolean;
export type PreCheckErrorFactory = () => KnownError;
export type PreCheckInput = [PreCheckFunc, PreCheckErrorFactory];
export class PreCheck {
  public static perform(
    preCheckFunctions: PreCheckInput[],
    proceed: () => any
  ): any {
    for (const [check, toError] of preCheckFunctions) {
      if (!check()) {
        throw toError();
      }
    }
    return proceed();
  }
  public static isWorkspaceFolderOpen(): boolean {
    return (
      typeof workspace.workspaceFolders !== "undefined" &&
      workspace.workspaceFolders.length > 0
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
      const openOcdVersionRe = /^v(\d+\.\d+\.\d+)-esp32-(\d+)$/;
      const minVersionParsed = minVersion.match(openOcdVersionRe);
      const currentVersionParsed = currentVersion.match(openOcdVersionRe);
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

export const openFolderCheck = [
  PreCheck.isWorkspaceFolderOpen,
  noWorkspaceOpen,
] as PreCheckInput;

export const webIdeCheck = [
  PreCheck.notUsingWebIde,
  () => environmentNotSupported("Codespaces"),
] as PreCheckInput;

export const isNotDockerContainerCheck = [
  PreCheck.isNotDockerContainer,
  () => environmentNotSupported("Docker container"),
] as PreCheckInput;

const UNRESOLVED_IDF_VERSION = "0.0.0";

export async function minIdfVersionCheck(minVersion: string) {
  const currentEnvVars = getCurrentIdfConfiguration();
  const idfPath = currentEnvVars["IDF_PATH"];
  let currentVersion = UNRESOLVED_IDF_VERSION;
  if (idfPath) {
    try {
      currentVersion = await getEspIdfFromCMake(idfPath);
    } catch (error) {
      Logger.error(
        `Failed to resolve ESP-IDF version from ${idfPath}`,
        error as Error,
        "common PreCheck minIdfVersionCheck"
      );
      currentVersion = UNRESOLVED_IDF_VERSION;
    }
  }
  return [
    () => PreCheck.espIdfVersionValidator(minVersion, currentVersion),
    () => idfVersionTooLow(minVersion, currentVersion),
  ] as PreCheckInput;
}
