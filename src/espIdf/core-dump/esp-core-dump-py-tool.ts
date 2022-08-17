/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 3rd July 2020 5:49:06 pm
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

import { join } from "path";
import { appendIdfAndToolsToPath, spawn } from "../../utils";
import { Logger } from "../../logger/logger";
import { Uri } from "vscode";

export enum InfoCoreFileFormat {
  Base64 = "b64",
  ELF = "elf",
  Raw = "raw",
}

export type CoreELFGenerationOptions = {
  coreElfFilePath: string;
  coreInfoFilePath: string;
  infoCoreFileFormat: InfoCoreFileFormat;
  progELFFilePath: string;
  pythonBinPath: string;
  workspaceUri: Uri;
};

export class ESPCoreDumpPyTool {
  public tag:string = "ESP-IDF Core Dump";
  private readonly toolPath: string;
  constructor(IDFPath: string) {
    this.toolPath = join(
      IDFPath,
      "components",
      "espcoredump",
      "espcoredump.py"
    );
  }
  public async generateCoreELFFile(options: CoreELFGenerationOptions) {
    let resp: Buffer;
    try {
      const env = appendIdfAndToolsToPath(options.workspaceUri);
      resp = await spawn(
        options.pythonBinPath,
        [
          this.toolPath,
          "info_corefile",
          "-t",
          options.infoCoreFileFormat,
          "-s",
          options.coreElfFilePath,
          "-c",
          options.coreInfoFilePath,
          options.progELFFilePath,
        ],
        { env }
      );
      return true;
    } catch (error) {
      Logger.error(
        "espcoredump.py failed",
        error,
        { 
          output: resp.toString(),
          tag: this.tag
        }
      );
      return false;
    }
  }
}
