/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 9th November 2026 12:00:00 pm
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

export interface OpenOcdLaunchInput {
  launchArgs: unknown;
  configFiles: unknown;
  debugLevel: unknown;
  storedSerial?: string;
  adapterLocation?: string;
  useLocationCommand: boolean;
  useDetectConfigSerial: boolean;
}

export interface OpenOcdLaunchPlan {
  args: string[];
  envAdapterLocation?: string;
}

const DEBUG_LEVEL_ARG = /^-d-?\d+$/;

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

export function buildOpenOcdLaunch(
  input: OpenOcdLaunchInput
): OpenOcdLaunchPlan {
  const launchArgs = asStringArray(input.launchArgs);
  const configFiles = asStringArray(input.configFiles);
  const { storedSerial, adapterLocation, useLocationCommand } = input;
  const needsSerialDiscovery = !storedSerial && !input.useDetectConfigSerial;
  const args: string[] = [];

  if (launchArgs.length > 0) {
    args.push(...launchArgs);

    // If no adapter serial is stored yet, ensure OpenOCD runs at least at -d2
    // so the usb-jtag serial line is printed and can be parsed.
    if (needsSerialDiscovery && !args.some((a) => DEBUG_LEVEL_ARG.test(a))) {
      args.unshift("-d2");
    }

    const alreadyHasLocation = args.some((a) =>
      a.includes("adapter usb location")
    );
    if (useLocationCommand && adapterLocation && !alreadyHasLocation) {
      args.unshift("-c", `adapter usb location ${adapterLocation}`);
    }
  } else {
    const parsedLevel =
      typeof input.debugLevel === "number"
        ? input.debugLevel
        : parseInt(String(input.debugLevel), 10);
    const hasValidLevel = Number.isFinite(parsedLevel);
    const debugLevelToUse = needsSerialDiscovery
      ? Math.max(hasValidLevel ? parsedLevel : 0, 2)
      : hasValidLevel
      ? parsedLevel
      : 0;

    args.push(`-d${debugLevelToUse}`);

    if (storedSerial) {
      args.push("-c", `adapter serial ${storedSerial}`);
    }

    if (useLocationCommand && adapterLocation) {
      args.push("-c", `adapter usb location ${adapterLocation}`);
    }

    for (const configFile of configFiles) {
      if (!args.some((arg) => arg.includes(configFile))) {
        args.push("-f", configFile);
      }
    }
  }

  return {
    args,
    envAdapterLocation: useLocationCommand ? undefined : adapterLocation,
  };
}
