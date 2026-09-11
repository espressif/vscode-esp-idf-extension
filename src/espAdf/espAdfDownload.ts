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
import { ExtensionContext, Uri } from "vscode";
import { AbstractCloning } from "../common/abstractCloning";
import { registerIDFCommand } from "../common/registerCommand";
import { ESP } from "../config";
import { PreCheck } from "../common/PreCheck";
import {
  isKnownError,
  missingDependency,
  noWorkspaceOpen,
} from "../common/error/knownError";
import { ErrorCode } from "../common/error/types";
import { espAdfErrorPresentation } from "./espAdfErrorPresentation";

export class AdfCloning extends AbstractCloning {
  constructor() {
    super(
      "https://github.com/espressif/esp-adf.git",
      "ESP-ADF",
      "master",
      "https://gitee.com/EspressifSystems/esp-adf.git"
    );
  }
}

export async function getEspAdf(workspace?: Uri) {
  const adfInstaller = new AdfCloning();
  try {
    await adfInstaller.getRepository("ADF_PATH", workspace);
  } catch (error) {
    if (isKnownError(error) && error.code === ErrorCode.MISSING_DEPENDENCY) {
      throw missingDependency(
        String(error.metadata?.dependency),
        espAdfErrorPresentation.missingDependency
      );
    }
    throw error;
  }
}

export function registerEspAdfCmd(context: ExtensionContext) {
  registerIDFCommand(
    context,
    "espIdf.getEspAdf",
    async () => {
      if (!PreCheck.isWorkspaceFolderOpen()) {
        throw noWorkspaceOpen(espAdfErrorPresentation.noWorkspaceOpen);
      }
      const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      await getEspAdf(wsFolder?.uri);
    },
    { outputChannel: "ESP-ADF" }
  );
}
