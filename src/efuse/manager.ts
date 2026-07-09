/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 5th August 2020 3:35:46 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
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

import { spawn } from "../utils";
import { join } from "path";
import { readSerialPort } from "../configuration/idf";
import { tmpdir } from "os";
import { readJson, unlink } from "fs-extra";
import { Logger } from "../common/logger";
import { Uri } from "vscode";
import { getCurrentIdfConfiguration, getVirtualEnvPythonPath } from "../configuration/env";
import { getIdfTargetFromSdkconfig } from "../configuration/workspace";
import {
  efuseSummaryFailed,
  idfVersionTooLow,
  invalidConfiguration,
  isKnownError,
  missingDependency,
  noSerialPort,
} from "../common/error/knownError";

export type ESPEFuseSummary = {
  [category: string]: {
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
  }[];
};

export class ESPEFuseManager {
  constructor(private workspace: Uri) {
  }

  async summary(): Promise<ESPEFuseSummary> {
    const eFuseFields = await this.readSummary();

    const resp: ESPEFuseSummary = {};
    for (const name in eFuseFields) {
      const fields = eFuseFields[name];
      if (!fields.category) {
        throw idfVersionTooLow("4.3.x", "unknown");
      }
      if (!resp[fields.category]) {
        resp[fields.category] = [];
      }
      resp[fields.category].push(fields);
    }
    return resp;
  }

  async readSummary() {
    const tempFile = join(tmpdir(), "espefusejsondump.tmp");
    const pythonPath = getVirtualEnvPythonPath();

    if (!pythonPath) {
      throw missingDependency("Python");
    }

    const port = await readSerialPort(this.workspace, false);
    if (!port) {
      throw noSerialPort(await getIdfTargetFromSdkconfig(this.workspace));
    }

    try {
      await spawn(
        pythonPath,
        [
          this.toolPath,
          "-p",
          port,
          "summary",
          "--format",
          "json",
          "--file",
          tempFile,
        ],
        {}
      );
    } catch (error) {
      if (isKnownError(error)) {
        throw error;
      }
      const detail = error instanceof Error ? error.message : String(error);
      throw efuseSummaryFailed(detail);
    }

    const eFuseFields = await readJson(tempFile);

    unlink(tempFile, (err) => {
      if (err) {
        Logger.error(
          "Failed to delete the tmp espefuse json file",
          err,
          "readSummary",
          {
            tag: "ESPeFuse",
          }
        );
      }
    });

    return eFuseFields;
  }

  private get toolPath(): string {
    const currentEnvVars = getCurrentIdfConfiguration();
    const idfPath = currentEnvVars["IDF_PATH"] || process.env.IDF_PATH;
    if (!idfPath) {
      throw invalidConfiguration("IDF_PATH");
    }
    return join(
      idfPath,
      "components",
      "esptool_py",
      "esptool",
      "espefuse.py"
    );
  }
}
