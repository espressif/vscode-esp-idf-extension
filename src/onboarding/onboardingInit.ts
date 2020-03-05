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

import { Progress } from "vscode";
import { IdfToolsManager } from "../idfToolsManager";
import { IMetadataFile } from "../ITool";
import { OutputChannel } from "../logger/outputChannel";
import { PlatformInformation } from "../PlatformInformation";
import * as utils from "../utils";
import { getEspIdfVersions, IEspIdfLink } from "./espIdfDownload";
import { getPythonList } from "./pythonReqsManager";

export interface IOnboardingArgs {
  expectedEnvVars: {};
  espIdfVersionList: IEspIdfLink[];
  gitVersion: string;
  idfToolsManager: IdfToolsManager;
  pythonVersions: string[];
  metadataJson: IMetadataFile;
}

export async function getOnboardingInitialValues(
  extensionPath: string,
  progress: Progress<{
    message: string;
    increment: number;
  }>
) {
  const platformInfo = await PlatformInformation.GetPlatformInformation();
  const toolsJsonPath = await utils.getToolsJsonPath(extensionPath);
  const toolsJson = JSON.parse(utils.readFileSync(toolsJsonPath));
  progress.report({
    increment: 10,
    message: "Loading ESP-IDF Tools information...",
  });
  const idfToolsManager = new IdfToolsManager(
    toolsJson,
    platformInfo,
    OutputChannel.init()
  );
  progress.report({ increment: 20, message: "Getting ESP-IDF versions..." });
  const espIdfVersionList = await getEspIdfVersions(extensionPath);
  progress.report({ increment: 20, message: "Getting Python versions..." });
  const pythonVersions = await getPythonList(extensionPath);
  const gitVersion = await utils.checkGitExists(extensionPath);
  progress.report({ increment: 5, message: "Reading metadata file..." });
  const metadataJson = await utils.loadMetadata();
  progress.report({ increment: 15, message: "Preparing onboarding view..." });
  const expectedEnvVars = await idfToolsManager.getListOfReqEnvVars();
  return {
    espIdfVersionList,
    expectedEnvVars,
    gitVersion,
    idfToolsManager,
    pythonVersions,
    metadataJson,
  } as IOnboardingArgs;
}
