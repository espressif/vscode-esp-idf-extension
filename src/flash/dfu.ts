/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 24th January 2022 3:15:44 pm
 * Copyright 2022 Espressif Systems (Shanghai) CO LTD
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

import { readParameter, writeParameter } from "../idfConfiguration";
import * as vscode from "vscode";
import { appendIdfAndToolsToPath, execChildProcess } from "../utils";
import { OutputChannel } from "../logger/outputChannel";

function deviceLabel(selectedDevice: string) {
  const regex = new RegExp(/:\d+\]/g);
  const pid = selectedDevice.match(regex)[0].slice(4, -1);

  if (pid[0] === "2") {
    return "ESP32-S2";
  }
  return "ESP32-S3";
}

export async function getDfuList(workspace: vscode.Uri) {
  const modifiedEnv = appendIdfAndToolsToPath(workspace);
  return await execChildProcess(
    "dfu-util --list",
    process.cwd(),
    OutputChannel.init(),
    {
      env: modifiedEnv,
      maxBuffer: 500 * 1024,
      cwd: process.cwd(),
    }
  );
}

export async function listAvailableDfuDevices(text) {
  const target = readParameter("idf.saveScope");
  const regex = new RegExp(
    /\[([0-9a-fA-F]{4}\:[0-9a-fA-F]{4}\]) ver=.+, devnum=[0-9]+, cfg=.+, intf=.+, path=".+", alt=.+, name=".+", serial=".+"/g
  );
  const arrayDfuDevices = text.match(regex);
  if (arrayDfuDevices) {
    await writeParameter("idf.listDfuDevices", arrayDfuDevices, target);
  } else {
    await writeParameter("idf.listDfuDevices", [], target);
  }
  return arrayDfuDevices;
}

/**
 * Select IDF target PID for DFU flashing
 * @param {string} chip - String to identify the chip (IDF_TARGET)
 * @returns {number} PID Number for DFU
 */
 export function selectedDFUAdapterId(chip: string): number {
  switch (chip) {
    case "esp32s2":
      return 2;
    case "esp32s3":
      return 9;
    default:
      return -1;
  }
}

export async function selectDfuDevice(arrDfuDevices: string[]) {
  const target = readParameter("idf.saveScope");
  let options = [];
  for (let i = 0; i < arrDfuDevices.length; i++) {
    options.push(
      new Object({
        label: deviceLabel(arrDfuDevices[i]),
        detail: arrDfuDevices[i],
      })
    );
  }

  let selectedDfuDevice = await vscode.window.showQuickPick(options, {
    ignoreFocusOut: true,
    matchOnDetail: true,
    placeHolder: "Select one of the available devices from the list",
  });

  if (selectedDfuDevice) {
    const regex = new RegExp(/path="[0-9.]+-[0-9.]+"/g);
    const pathValue = selectedDfuDevice.detail.match(regex)[0].slice(6, -1);

    await writeParameter(
      "idf.selectedDfuDevicePath",
      pathValue,
      target
    );
  } else {
    await writeParameter("idf.selectedDfuDevicePath", "", target);
  }
}
