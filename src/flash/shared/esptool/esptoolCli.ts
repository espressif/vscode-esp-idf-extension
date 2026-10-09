/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
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

import { Logger } from "../../../common/logger";
import { getPythonPackageVersion } from "../../../python/packageVersion";
import { compareVersion } from "../../../utils";

/**
 * esptool 5 renamed underscore commands and long options to hyphens and
 * deprecated the esptool.py wrapper in favor of `python -m esptool`.
 */
export const ESPTOOL_HYPHEN_CLI_MIN = "5.0.0";

const ESPTOOL_SUBCOMMANDS = new Set([
  "chip_id",
  "erase_flash",
  "read_flash",
  "verify_flash",
  "write_flash",
]);

export type EsptoolLaunchStyle = {
  hyphenCli: boolean;
  useModule: boolean;
};

export function esptoolUsesHyphenCli(version: string): boolean {
  return compareVersion(version, ESPTOOL_HYPHEN_CLI_MIN) >= 0;
}

export function esptoolProgramArgs(
  scriptPath: string,
  useModule: boolean
): string[] {
  return useModule ? ["-m", "esptool"] : [scriptPath];
}

export function formatEsptoolToken(token: string, hyphenCli: boolean): string {
  if (!hyphenCli) {
    return token;
  }
  if (token.startsWith("--") || ESPTOOL_SUBCOMMANDS.has(token)) {
    return token.replace(/_/g, "-");
  }
  return token;
}

export function formatEsptoolArgs(
  args: string[],
  hyphenCli: boolean
): string[] {
  return args.map((arg) => formatEsptoolToken(arg, hyphenCli));
}

export async function resolveEsptoolLaunchStyle(
  pythonBinPath: string
): Promise<EsptoolLaunchStyle> {
  try {
    const version = await getPythonPackageVersion("esptool", pythonBinPath);
    const v5 = esptoolUsesHyphenCli(version);
    return { hyphenCli: v5, useModule: v5 };
  } catch (error) {
    const logged =
      error instanceof Error
        ? error
        : new Error("Could not read the esptool package version.");
    try {
      Logger.error(
        "Could not read the esptool package version. Using the esptool.py wrapper and underscore CLI names.",
        logged,
        "resolveEsptoolLaunchStyle"
      );
    } catch {
      // Logger.init may not have run yet, for example in unit tests.
    }
    return { hyphenCli: false, useModule: false };
  }
}
