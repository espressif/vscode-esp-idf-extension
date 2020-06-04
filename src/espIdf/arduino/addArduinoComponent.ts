/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 2nd June 2020 10:57:18 am
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { getEspIdfVersion } from "../../utils";
import { spawn } from "child_process";
import * as idfConf from "../../idfConfiguration";
import { join } from "path";
import { ensureDir } from "fs-extra";
import { OutputChannel } from "../../logger/outputChannel";
import { Logger } from "../../logger/logger";

export async function cloneArduinoInComponentsFolder(
  projectDir: string,
  branchToUse: string
) {
  const ARDUINO_ESP32_URL = "https://github.com/espressif/arduino-esp32.git";
  const componentsDir = join(projectDir, "components");
  await ensureDir(componentsDir);
  return new Promise((resolve, reject) => {
    const arduinoCloneProcess = spawn(
      `git`,
      [
        "clone",
        "--recursive",
        "--progress",
        "-b",
        branchToUse,
        ARDUINO_ESP32_URL,
        "arduino",
      ],
      { cwd: componentsDir }
    );
    arduinoCloneProcess.stderr.on("data", (data) => {
      OutputChannel.appendLine(data.toString());
    });

    arduinoCloneProcess.stdout.on("data", (data) => {
      OutputChannel.appendLine(data.toString());
    });
    arduinoCloneProcess.on("exit", (code, signal) => {
      if (!signal && code !== 0) {
        OutputChannel.appendLine(`Arduino ESP32 cloning has exit with ${code}`);
        reject(`Arduino ESP32 cloning has exit with ${code}`);
      }
      resolve();
    });
  });
}

export async function checkIdfVersion(espIdfPath?: string) {
  if (typeof espIdfPath === "undefined" || espIdfPath === "") {
    espIdfPath =
      idfConf.readParameter("idf.espIdfPath") || process.env.IDF_PATH;
  }
  const idfVersion = await getEspIdfVersion(espIdfPath);
  const results = {
    "4.0": "idf-release/v4.0",
    "3.3": "idf-release/v3.3",
  };
  return results[idfVersion] || undefined;
}

export async function addArduinoAsComponent(
  projectDir: string,
  espIdfPath?: string
) {
  const branchToUse = await checkIdfVersion(espIdfPath);
  if (!branchToUse) {
    Logger.infoNotify(
      "ESP-IDF version 4.0 or 3.3 is required for Arduino ESP32"
    );
    return;
  }
  await ensureDir(projectDir);
  await cloneArduinoInComponentsFolder(projectDir, branchToUse);
}
