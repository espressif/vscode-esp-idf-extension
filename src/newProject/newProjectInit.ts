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
import { l10n, Progress, window, Uri } from "vscode";
import { getExamplesList, IExampleCategory } from "../examples/Example";
import { IComponent } from "../espIdf/idfComponent/IdfComponent";
import * as idfConf from "../idfConfiguration";
import { SerialPort } from "../espIdf/serial/serialPort";
import { dirExistPromise } from "../utils";
import { Logger } from "../logger/logger";
import {
  getBoards,
  getOpenOcdScripts,
  IdfBoard,
} from "../espIdf/openOcd/boardConfiguration";
import {
  getPreviousIdfSetups,
  loadIdfSetupsFromEspIdfJson,
} from "../setup/existingIdfSetups";
import { IdfSetup } from "../views/setup/types";
import {
  getTargetsFromEspIdf,
  IdfTarget,
} from "../espIdf/setTarget/getTargets";
import { getCurrentIdfSetup } from "../versionSwitcher";
import { join } from "path";

export interface INewProjectArgs {
  espIdfSetup: IdfSetup;
  espAdfPath: string;
  espMdfPath: string;
  espMatterPath: string;
  espHomeKitSdkPath: string;
  espRainmakerPath: string;
  idfTargets: IdfTarget[];
  boards: IdfBoard[];
  components: IComponent[];
  serialPortList: string[];
  templates: { [key: string]: IExampleCategory };
  workspaceFolder: Uri;
}

export async function getNewProjectArgs(
  extensionPath: string,
  progress: Progress<{ message: string; increment: number }>,
  workspace: Uri
) {
  progress.report({ increment: 10, message: "Loading ESP-IDF components..." });
  const components = [];
  progress.report({ increment: 10, message: "Loading serial ports..." });
  let serialPortList: Array<string>;
  try {
    const serialPortListDetails = await SerialPort.shared().getListArray(
      workspace
    );
    serialPortList = serialPortListDetails.map((p) => p.comName);
  } catch (error) {
    const msg = error.message
      ? error.message
      : "Error looking for serial ports.";
    Logger.infoNotify(msg);
    Logger.error(msg, error, "getNewProjectArgs getSerialPort");
    serialPortList = ["no port"];
  }
  progress.report({ increment: 10, message: "Loading ESP-IDF Boards list..." });
  const openOcdScriptsPath = await getOpenOcdScripts(workspace);
  let espBoards = await getBoards(openOcdScriptsPath);
  progress.report({ increment: 10, message: "Loading ESP-IDF setups list..." });
  const idfSetups = await getPreviousIdfSetups(true);
  const toolsPath = idfConf.readParameter("idf.toolsPath", workspace) as string;
  let existingIdfSetups = await loadIdfSetupsFromEspIdfJson(toolsPath);
  if (process.env.IDF_TOOLS_PATH && toolsPath !== process.env.IDF_TOOLS_PATH) {
    const systemIdfSetups = await loadIdfSetupsFromEspIdfJson(
      process.env.IDF_TOOLS_PATH
    );
    existingIdfSetups = [...existingIdfSetups, ...systemIdfSetups];
  }
  const currentIdfSetup = await getCurrentIdfSetup(workspace);
  let setupsToUse = [...idfSetups, ...existingIdfSetups, currentIdfSetup];
  setupsToUse = setupsToUse.filter(
    (setup, index, self) =>
      index ===
      self.findIndex(
        (s) => s.idfPath === setup.idfPath && s.toolsPath === setup.toolsPath
      )
  );
  if (setupsToUse.length === 0) {
    await window.showInformationMessage("No ESP-IDF Setups found");
    return;
  }
  const onlyValidIdfSetups = [
    ...new Map(
      setupsToUse.filter((i) => i.isValid).map((item) => [item.idfPath, item])
    ).values(),
  ];
  const pickItems: {
    description: string;
    label: string;
    target: IdfSetup;
  }[] = [];
  for (const idfSetup of onlyValidIdfSetups) {
    pickItems.push({
      description: `ESP-IDF v${idfSetup.version}`,
      label: l10n.t(`Use ESP-IDF {espIdfPath}`, {
        espIdfPath: idfSetup.idfPath,
      }),
      target: idfSetup,
    });
  }
  progress.report({ increment: 10, message: "Select ESP-IDF to use..." });
  const espIdfPathToUse = await window.showQuickPick(pickItems, {
    placeHolder: l10n.t("Select framework to use"),
  });
  if (!espIdfPathToUse) {
    Logger.infoNotify(l10n.t("No framework selected to load examples."));
    return;
  }
  const idfSetup = espIdfPathToUse.target;
  const espAdfPath = idfConf.readParameter(
    "idf.espAdfPath",
    workspace
  ) as string;
  const espMdfPath = idfConf.readParameter(
    "idf.espMdfPath",
    workspace
  ) as string;
  const espMatterPath = idfConf.readParameter(
    "idf.espMatterPath",
    workspace
  ) as string;
  const espHomeKitSdkPath = idfConf.readParameter(
    "idf.espHomeKitSdkPath",
    workspace
  ) as string;
  const espRainmakerPath = idfConf.readParameter(
    "idf.espRainmakerPath",
    workspace
  ) as string;
  let templates: { [key: string]: IExampleCategory } = {};
  const idfExists = await dirExistPromise(idfSetup.idfPath);
  if (idfExists) {
    const idfTemplates = getExamplesList(idfSetup.idfPath);
    templates["ESP-IDF"] = idfTemplates;
    const idfToolsTemplateExists = await dirExistPromise(
      join(idfSetup.idfPath, "tools", "templates")
    );
    if (idfToolsTemplateExists) {
      const idfToolsTemplates = getExamplesList(idfSetup.idfPath, [
        "tools",
        "templates",
      ], "ESP-IDF Templates");
      if (idfToolsTemplates.examples.length > 0) {
        templates["ESP-IDF Templates"] = idfToolsTemplates;
      }
    }
  }
  const adfExists = await dirExistPromise(espAdfPath);
  if (adfExists) {
    const adfTemplates = getExamplesList(espAdfPath);
    templates["ESP-ADF"] = adfTemplates;
  }
  const rainmakerExists = await dirExistPromise(espRainmakerPath);
  if (rainmakerExists) {
    const rainmakerTemplates = getExamplesList(espRainmakerPath);
    templates["ESP-RAINMAKER"] = rainmakerTemplates;
  }
  const matterExists = await dirExistPromise(espMatterPath);
  if (matterExists) {
    const matterTemplates = getExamplesList(espMatterPath);
    templates["ESP-MATTER"] = matterTemplates;
  }
  const mdfExists = await dirExistPromise(espMdfPath);
  if (mdfExists) {
    const mdfTemplates = getExamplesList(espMdfPath);
    templates["ESP-MDF"] = mdfTemplates;
  }
  const homekitSdkExists = await dirExistPromise(espHomeKitSdkPath);
  if (homekitSdkExists) {
    const homeKitSdkTemplates = getExamplesList(espHomeKitSdkPath);
    templates["ESP-HOMEKIT-SDK"] = homeKitSdkTemplates;
  }

  const targetsFromIdf = await getTargetsFromEspIdf(
    workspace,
    idfSetup.idfPath
  );

  progress.report({ increment: 50, message: "Initializing wizard..." });
  return {
    boards: espBoards,
    components,
    espIdfSetup: idfSetup,
    espAdfPath: adfExists ? espAdfPath : undefined,
    espMdfPath: mdfExists ? espMdfPath : undefined,
    idfTargets: targetsFromIdf,
    espMatterPath: matterExists ? espMatterPath : undefined,
    espHomeKitSdkPath: homekitSdkExists ? espHomeKitSdkPath : undefined,
    espRainmakerPath: rainmakerExists ? espRainmakerPath : undefined,
    serialPortList,
    templates,
    workspaceFolder: workspace,
  } as INewProjectArgs;
}
