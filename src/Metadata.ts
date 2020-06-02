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
  public static getMetadataFilePath() {
    return join(extensionContext.extensionPath, "metadata.json");
  }

  public static async read(): Promise<IMetadataFile> {
    const metadataFile = this.getMetadataFilePath();
    const doesMetadataExist = await doesPathExists(metadataFile);
    if (!doesMetadataExist) {
      const result = await vscode.window.showInformationMessage(
        "The metadata file doesn't exist. Create from current configuration?",
        "Yes",
        "No"
      );
      if (!result || result === "No") {
        throw new Error("Can't find metadata.json.");
      }
      await this.initializeMetadataFromCurrentSettings();
    }
    return (await readJson(metadataFile)) as IMetadataFile;
  }

  public static async write(metaObj: IMetadataFile) {
    try {
      const metadataFile = this.getMetadataFilePath();
      return await writeJson(metadataFile, metaObj);
    } catch (error) {
      Logger.error(`Error writing metadata.json`, error);
    }
  }

  private static async initializeMetadataFromCurrentSettings() {
    const pyBinPathDir = idfConf.readParameter("idf.pythonBinPath");
    const idfPathDir = idfConf.readParameter("idf.espIdfPath");
    const idfToolsManager = await IdfToolsManager.createIdfToolsManager(
      idfPathDir
    );
    const toolsDir = join(idfConf.readParameter("idf.toolsPath"), "tools");
    const idfPath: IPath = {
      id: uuidv4(),
      path: idfPathDir,
    } as IPath;
    const pyBinPath: IPath = {
      id: uuidv4(),
      path: pyBinPathDir,
    } as IPath;

    const toolsMeta = await idfToolsManager.generateToolsExtraPaths(toolsDir);
    const metadataObj: IMetadataFile = {
      idf: [idfPath],
      tools: toolsMeta,
      venv: [pyBinPath],
    };
    await this.write(metadataObj);
  }

  public static async addIdfToolsToMetadata(toolsInfo: ITool[]) {
    let metadata: IMetadataFile = (await this.read()) || ({} as IMetadataFile);
    if (!metadata.tools) {
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

  public static async addEspIdfPath(idfPath: string) {
    await this.addPathToMetadata("idf", idfPath);
  }

  public static async addPythonVenvPath(pythonEnvBinPath: string) {
    await this.addPathToMetadata("venv", pythonEnvBinPath);
  }

  public static async addPathToMetadata(prop: string, pathStr: string) {
    let metadata: IMetadataFile = (await this.read()) || ({} as IMetadataFile);
    const pathToAdd: IPath = {
      id: uuidv4(),
      path: pathStr,
    } as IPath;
    if (!Object.prototype.hasOwnProperty.call(metadata, prop)) {
      metadata[prop] = [pathToAdd];
    } else {
      const existingPath = metadata[prop].filter(
        (elem: IPath) => elem.path === pathStr
      );
      if (typeof existingPath === "undefined" || existingPath.length === 0) {
        metadata[prop].push(pathToAdd);
      }
    }
    await this.write(metadata);
  }
}
