/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 5th August 2020 3:35:46 pm
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

import { spawn } from "../utils";
import { join } from "path";
import { readParameter } from "../idfConfiguration";
import { tmpdir } from "os";
import { readJson, unlink } from "fs-extra";
import { Logger } from "../logger/logger";
import { Uri } from "vscode";

const tag: string = "Efuse";

export type ESPEFuseSummary = {
  [category: string]: [
    {
      name: string;
      value: string;
      readable: boolean;
      writeable: boolean;

      description: string;
      category: string;

      block: number;
      word: number;
      pos: number;

      efuse_type: string;
      bit_len: number;
    }
  ];
};

export class ESPEFuseManager {
  private pythonPath: string;
  private idfPath: string;

  constructor(private workspace: Uri) {
    this.pythonPath = readParameter("idf.pythonBinPath", workspace) as string;
    this.idfPath =
      readParameter("idf.espIdfPath", workspace) || process.env.IDF_PATH;
  }

  async summary(): Promise<ESPEFuseSummary> {
    const tempFile = join(tmpdir(), "espefusejsondump.tmp");
    await spawn(
      this.pythonPath,
      [
        this.toolPath,
        "-p",
        this.serialPort,
        "summary",
        "--format",
        "json",
        "--file",
        tempFile,
      ],
      {}
    );
    const eFuseFields = await readJson(tempFile);
    unlink(tempFile, (err) => {
      Logger.error(
        "Failed to delete the tmp espfuse json file",
        err,
        { tag }
      );
    });
    const resp = {};
    for (const name in eFuseFields) {
      const fields = eFuseFields[name];
      if (!fields.category) {
        const error = new Error(
          "IDF Version >= 4.3.x required to have e-fuse view"
        );
        error.name = "IDF_VERSION_MIN_REQUIREMENT_ERROR";
        throw error;
      }
      if (!resp[fields.category]) {
        resp[fields.category] = [];
      }
      resp[fields.category].push(fields);
    }
    return resp;
  }

  private get toolPath(): string {
    return join(
      this.idfPath,
      "components",
      "esptool_py",
      "esptool",
      "espefuse.py"
    );
  }

  private get serialPort(): string {
    const port = readParameter("idf.port", this.workspace) as string;
    return port;
  }
}
