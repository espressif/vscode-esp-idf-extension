/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 31st March 2023 4:31:39 pm
 * Copyright 2023 Espressif Systems (Shanghai) CO LTD
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

import {
  CancellationToken,
  Progress,
  ProgressLocation,
  Uri,
  commands,
  window,
  workspace,
} from "vscode";
import { ESPLoader, IEspLoaderTerminal, Transport } from "esptool-js";
import { enc, MD5 } from "crypto-js";

export interface PartitionInfo {
  name: string;
  data: string;
  address: number;
}

export interface FlashSectionMessage {
  sections: PartitionInfo[];
  flashSize: string;
  flashMode: string;
  flashFreq: string;
}

export async function flashWithWebSerial(workspace: Uri) {
  try {
    window.withProgress(
      {
        cancellable: true,
        location: ProgressLocation.Notification,
        title: "Flashing with WebSerial...",
      },
      async (
        progress: Progress<{
          message: string;
        }>,
        cancelToken: CancellationToken
      ) => {
        const portInfo = (await commands.executeCommand(
          "workbench.experimental.requestSerialPort"
        )) as SerialPortInfo;
        if (!portInfo) {
          return;
        }
        const ports = await navigator.serial.getPorts();
        let port = ports.find((item) => {
          const info = item.getInfo();
          return (
            info.usbVendorId === portInfo.usbVendorId &&
            info.usbProductId === portInfo.usbProductId
          );
        });
        if (!port) {
          return;
        }
        const transport = new Transport(port);
        const outputChnl = window.createOutputChannel("ESP-IDF Webserial");
        const clean = () => {
          outputChnl.clear();
        };
        const writeLine = (data: string) => {
          outputChnl.appendLine(data);
        };
        const write = (data: string) => {
          outputChnl.append(data);
        };

        const loaderTerminal: IEspLoaderTerminal = {
          clean,
          write,
          writeLine,
        };

        const flashBaudRate = await window.showQuickPick(
          [
            { description: "115200", label: "115200", target: 115200 },
            { description: "230400", label: "230400", target: 230400 },
            { description: "460800", label: "460800", target: 460800 },
            { description: "921600", label: "921600", target: 921600 },
          ],
          { placeHolder: "Select baud rate" }
        );
        if (!flashBaudRate) {
          return;
        }
        const esploader = new ESPLoader(
          transport,
          flashBaudRate.target,
          loaderTerminal
        );
        const chip = await esploader.main_fn();
        const flashSectionsMessage = await getFlashSectionsForCurrentWorkspace(
          workspace
        );

        await esploader.write_flash(
          flashSectionsMessage.sections,
          flashSectionsMessage.flashSize,
          flashSectionsMessage.flashMode,
          flashSectionsMessage.flashFreq,
          undefined,
          undefined,
          (fileIndex: number, written: number, total: number) => {
            progress.report({
              message: `${flashSectionsMessage.sections[fileIndex].data} (${written}/${total})`,
            });
          },
          (image: string) => MD5(enc.Latin1.parse(image)).toString()
        );
      }
    );
  } catch (error: any) {
    const outputChnl = window.createOutputChannel("ESP-IDF Webserial");
    const errMsg = error && error.message ? error.message : error;
    outputChnl.appendLine(errMsg);
  }
}

async function getFlashSectionsForCurrentWorkspace(workspaceFolder: Uri) {
  const flashInfoFileName = Uri.joinPath(
    workspaceFolder,
    "build",
    "flasher_args.json"
  );
  const FlasherArgsContent = await workspace.fs.readFile(flashInfoFileName);
  if (!FlasherArgsContent) {
    throw new Error("Build before flashing");
  }
  const flashFileJson = JSON.parse(FlasherArgsContent.toString());
  const binPromises: Promise<PartitionInfo>[] = [];
  Object.keys(flashFileJson["flash_files"]).forEach((offset) => {
    const fileName = flashFileJson["flash_files"][offset].name;
    const filePath = Uri.joinPath(
      workspaceFolder,
      "build",
      flashFileJson["flash_files"][offset]
    );
    binPromises.push(readFileIntoBuffer(filePath, fileName, offset));
  });
  const binaries = await Promise.all(binPromises);
  const message: FlashSectionMessage = {
    sections: binaries,
    flashFreq: flashFileJson["flash_settings"]["flash_freq"],
    flashMode: flashFileJson["flash_settings"]["flash_mode"],
    flashSize: flashFileJson["flash_settings"]["flash_size"],
  };
  return message;
}

async function readFileIntoBuffer(filePath: Uri, name: string, offset: string) {
  const fileBuffer = await workspace.fs.readFile(filePath);
  const fileBufferResult: PartitionInfo = {
    data: fileBuffer.toString(),
    name,
    address: parseInt(offset),
  };
  return fileBufferResult;
}
