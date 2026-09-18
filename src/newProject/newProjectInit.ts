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
import { l10n, Progress, window, WorkspaceFolder } from "vscode";
import { getExamplesList, IExampleCategory } from "./Example";
import { IComponent } from "../espIdf/idfComponent/IdfComponent";
import { SerialPort } from "../espIdf/serial/serialPort";
import { dirExistPromise } from "../utils";
import { Logger } from "../common/logger";
import {
  getBoards,
  getOpenOcdScripts,
  IdfBoard,
} from "../espIdf/openOcd/boardConfiguration";
import {
  getTargetsFromEspIdf,
  IdfTarget,
} from "../espIdf/setTarget/getTargets";
import { join } from "path";
import { IdfSetup } from "../eim/types";
import { readParameter } from "../configuration/idf";

export interface INewProjectArgs {
  espIdfSetup: IdfSetup;
  espAdfPath: string;
  idfTargets: IdfTarget[];
  boards: IdfBoard[];
  components: IComponent[];
  serialPortList: string[];
  templates: { [key: string]: IExampleCategory };
  workspaceFolder?: WorkspaceFolder;
}

async function loadSerialPorts(workspaceFolder?: WorkspaceFolder) {
  let serialPortList: Array<string> = ["detect"];
  if (!workspaceFolder) {
    return serialPortList;
  }
  try {
    const serialPortListDetails = await SerialPort.shared().getListArray(
      workspaceFolder.uri,
      true
    );
    serialPortList.push(...serialPortListDetails.map((p) => p.comName));
    return serialPortList;
  } catch (error) {
    const msg =
      error instanceof Error && error.message
        ? error.message
        : "Error looking for serial ports.";
    Logger.infoNotify(msg);
    Logger.error(msg, error as Error, "getNewProjectArgs getSerialPort");
    return ["no port"];
  }
}

export async function loadNewProjectTemplates(
  idfSetup: IdfSetup,
  espAdfPath?: string
) {
  const templates: { [key: string]: IExampleCategory } = {};
  const idfExists = await dirExistPromise(idfSetup.idfPath);
  const adfExists = espAdfPath ? await dirExistPromise(espAdfPath) : false;

  const exampleLoaders: Promise<void>[] = [];
  if (idfExists) {
    exampleLoaders.push(
      (async () => {
        templates["ESP-IDF Examples"] = await getExamplesList(
          idfSetup.idfPath,
          undefined,
          "ESP-IDF Examples"
        );
      })()
    );
    exampleLoaders.push(
      (async () => {
        const idfToolsTemplateExists = await dirExistPromise(
          join(idfSetup.idfPath, "tools", "templates")
        );
        if (!idfToolsTemplateExists) {
          return;
        }
        const idfToolsTemplates = await getExamplesList(
          idfSetup.idfPath,
          ["tools", "templates"],
          "ESP-IDF Templates"
        );
        if (idfToolsTemplates.examples.length > 0) {
          templates["ESP-IDF Templates"] = idfToolsTemplates;
        }
      })()
    );
  }
  if (adfExists && espAdfPath) {
    exampleLoaders.push(
      (async () => {
        const adfExamplesDir = (await dirExistPromise(
          join(espAdfPath, "adf_examples")
        ))
          ? "adf_examples"
          : "examples";
        templates["ESP-ADF"] = await getExamplesList(espAdfPath, [
          adfExamplesDir,
        ]);
      })()
    );
  }
  await Promise.all(exampleLoaders);
  return templates;
}

export async function getNewProjectArgs(
  progress: Progress<{ message: string; increment: number }>,
  workspaceFolder: WorkspaceFolder | undefined,
  idfSetups: IdfSetup[]
) {
  progress.report({ increment: 10, message: "Loading ESP-IDF setups list..." });

  const pickItems: {
    description: string;
    label: string;
    target: IdfSetup;
  }[] = [];
  for (const idfSetup of idfSetups) {
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
  const customExtraVars = readParameter(
    "idf.customExtraVars",
    workspaceFolder
  ) as { [key: string]: string };
  const espAdfPath = customExtraVars["ADF_PATH"];
  const adfExists = await dirExistPromise(espAdfPath);

  progress.report({ increment: 10, message: "Loading serial ports..." });
  const [targetsFromIdf, serialPortList, espBoards] = await Promise.all([
    getTargetsFromEspIdf(idfSetup.idfPath),
    loadSerialPorts(workspaceFolder),
    getOpenOcdScripts(workspaceFolder).then((openOcdScriptsPath) =>
      getBoards(openOcdScriptsPath)
    ),
  ]);

  progress.report({ increment: 50, message: "Initializing wizard..." });
  return {
    boards: espBoards,
    components: [],
    espIdfSetup: idfSetup,
    espAdfPath: adfExists ? espAdfPath : undefined,
    idfTargets: targetsFromIdf,
    serialPortList,
    templates: {},
    workspaceFolder: workspaceFolder,
  } as INewProjectArgs;
}
