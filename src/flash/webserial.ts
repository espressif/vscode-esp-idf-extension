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
} from "vscode";
import { OutputChannel } from "../logger/outputChannel";
import { ESPLoader, IEspLoaderTerminal, Transport } from "esptool-js";
import { readParameter } from "../idfConfiguration";
import { createReadStream, pathExists, readJSON } from "fs-extra";
import { join, parse } from "path";
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
        const transport = new Transport(port);
        const flashBaudRate = readParameter("idf.flashBaudRate", workspace);
        const outputChnl = OutputChannel.init();
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
        this.esploader = new ESPLoader(
          transport,
          flashBaudRate,
          loaderTerminal
        );
        const chip = await this.esploader.main_fn();
        const message = await getFlashSectionsForCurrentWorkspace(workspace);

        await this.esploader.write_flash(
          message.sections,
          message.flashSize,
          message.flashMode,
          message.flashFreq,
          undefined,
          undefined,
          (fileIndex: number, written: number, total: number) => {
            progress.report({
              message: `${message.sections[fileIndex].data} (${written}/${total})`,
            });
          },
          (image: string) => MD5(enc.Latin1.parse(image)).toString()
        );
      }
    );
  } catch (error) {}
}

async function getFlashSectionsForCurrentWorkspace(workspace: Uri) {
  const flashInfoFileName = join(
    workspace.fsPath,
    "build",
    this.flashInfoFileName
  );
  const isBuilt = await pathExists(flashInfoFileName);
  if (!isBuilt) {
    throw new Error("Build before flashing");
  }
  const flashFileJson = await readJSON(flashInfoFileName);
  const binPromises: Promise<PartitionInfo>[] = [];
  Object.keys(flashFileJson["flash_files"]).forEach((offset) => {
    const fileName = parse(flashFileJson["flash_files"][offset]).name;
    const filePath = join(
      workspace.fsPath,
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

async function readFileIntoBuffer(
  filePath: string,
  name: string,
  offset: string
) {
  return new Promise<PartitionInfo>((resolve, reject) => {
    const fileBuffer: Buffer[] = new Array<Buffer>();
    const stream = createReadStream(filePath);
    stream.on("data", (chunk: Buffer) => {
      fileBuffer.push(chunk);
    });
    stream.on("end", () => {
      const fileBufferResult: PartitionInfo = {
        data: Buffer.concat(fileBuffer).toString(),
        name,
        address: parseInt(offset),
      };
      return resolve(fileBufferResult);
    });
    stream.on("error", (err) => {
      return reject(err);
    });
  });
}
