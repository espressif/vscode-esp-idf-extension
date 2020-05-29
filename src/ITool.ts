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

import { IdfToolsManager } from "./idfToolsManager";

export interface IPath {
  id: string; // uuid package
  path: string;
}

export interface ITool extends IPath {
  name: string;
  version: string;
  env: {};
}

export async function getToolsInMetadataForIdfPath(
  idfPath: string,
  toolsList: ITool[]
) {
  const toolsManager = await IdfToolsManager.createIdfToolsManager(idfPath);
  const packages = await toolsManager.getPackageList();
  const toolsMetadata = packages.map((pkg) => {
    const versionToUse = toolsManager.getVersionToUse(pkg);
    const tool =
      toolsList.find(
        (t) => t.version === versionToUse && t.name === pkg.name
      ) ||
      ({
        env: pkg.export_vars,
        id: `${pkg.name}-${versionToUse}`,
        name: pkg.name,
        path: "",
      } as ITool);
    return tool;
  });
  return toolsMetadata;
}
