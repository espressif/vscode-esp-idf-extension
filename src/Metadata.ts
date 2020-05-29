// Copyright 2019 Espressif Systems (Shanghai) CO LTD
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { IPath, ITool } from "./ITool";
import { readJson, writeJson } from "./utils";
import { join } from "path";
import { doesPathExists, extensionContext } from "./utils";
import { Logger } from "./logger/logger";
import * as idfConf from "./idfConfiguration";
import { IdfToolsManager } from "./idfToolsManager";
import { v4 as uuidv4 } from "uuid";
import vscode from "vscode";

export interface IMetadataFile {
  idf: IPath[];
  tools: ITool[];
  venv: IPath[];
}

export class MetadataJson {
  private static metadataFile = join(
    extensionContext.extensionPath,
    "metadata.json"
  );
  public static async read(): Promise<IMetadataFile> {
    try {
      const doesMetadataExist = await doesPathExists(this.metadataFile);
      if (!doesMetadataExist) {
        const result = await vscode.window.showInformationMessage(
          "The metadata file doesn't exist. Create from current configuration?",
          "Yes",
          "No"
        );
        if (!result || result === "No") {
          Logger.infoNotify(`${this.metadataFile} doesn't exist.`);
          return;
        }
        await this.initializeMetadataFromCurrentSettings();
      }
      const json = await readJson(this.metadataFile);
      return JSON.parse(json) as IMetadataFile;
    } catch (error) {
      Logger.error(`Error reading ${this.metadataFile}`, error);
    }
  }

  public static write(value: IMetadataFile) {
    try {
      const jsonString = JSON.stringify(value);
      return writeJson(this.metadataFile, jsonString);
    } catch (error) {
      Logger.error(`Error writing ${this.metadataFile}`, error);
    }
  }

  private static async initializeMetadataFromCurrentSettings() {
    const pyBinPath = idfConf.readParameter("idf.pythonBinPath");
    const idfPathDir = idfConf.readParameter("idf.espIdfPath");
    const idfToolsManager = await IdfToolsManager.createIdfToolsManager(
      idfPathDir
    );
    const toolsDir = join(idfConf.readParameter("idf.toolsPath"), "tools");
    await this.addEspIdfPath(idfPathDir);
    await idfToolsManager.generateToolsExtraPaths(toolsDir);
    await this.addPythonVenvPath(pyBinPath);
  }

  public static async addEspIdfPath(idfPath: string) {
    let metadata: IMetadataFile = await this.read();
    const idfMetadata: IPath = {
      id: uuidv4(),
      path: idfPath,
    } as IPath;
    if (!metadata) {
      metadata = { idf: [idfMetadata] } as IMetadataFile;
    } else if (!metadata.idf) {
      metadata.idf = [idfMetadata];
    } else {
      const existingPath = metadata.idf.filter(
        (idfMeta) => idfMeta.path === idfMetadata.path
      );
      if (typeof existingPath === "undefined" || existingPath.length === 0) {
        metadata.idf.push(idfMetadata);
      }
    }
    await this.write(metadata);
  }

  public static async addPythonVenvPath(pythonEnvBinPath: string) {
    const pythonEnvMetadata: IPath = {
      id: uuidv4(),
      path: pythonEnvBinPath,
    } as IPath;
    let metadata: IMetadataFile = await this.read();
    if (!metadata) {
      metadata = {
        venv: [pythonEnvMetadata],
      } as IMetadataFile;
    } else if (!metadata.venv) {
      metadata.venv = [pythonEnvMetadata];
    } else {
      const existingPath = metadata.venv.filter(
        (venvMeta) => venvMeta.path === pythonEnvMetadata.path
      );
      if (typeof existingPath === "undefined" || existingPath.length === 0) {
        metadata.venv.push(pythonEnvMetadata);
      }
    }
    await this.write(metadata);
  }

  public static async addIdfToolsToMetadata(toolsInfo: ITool[]) {
    let metadata: IMetadataFile = await this.read();
    if (!metadata) {
      metadata = { tools: toolsInfo } as IMetadataFile;
    } else if (!metadata.tools) {
      metadata.tools = toolsInfo;
    } else {
      for (const tool of toolsInfo) {
        const existingPath = metadata.tools.filter(
          (toolMeta) => toolMeta.path === tool.path
        );
        if (typeof existingPath === "undefined" || existingPath.length === 0) {
          metadata.tools.push(tool);
        }
      }
    }
    await this.write(metadata);
  }
}
