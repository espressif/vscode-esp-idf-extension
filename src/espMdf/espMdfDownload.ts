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
import { Uri } from "vscode";
import { AbstractCloning } from "../common/abstractCloning";
import { readParameter } from "../idfConfiguration";

export class MdfCloning extends AbstractCloning {
  constructor(gitBinPath: string = "git") {
    super(
      "https://github.com/espressif/esp-mdf.git",
      "ESP-MDF",
      "master",
      gitBinPath
    );
  }
}

export async function getEspMdf(workspace: Uri) {
  const gitPath = (await readParameter("idf.gitPath", workspace)) || "git";
  const adfInstaller = new MdfCloning(gitPath);
  await adfInstaller.getRepository("idf.espMdfPath", workspace);
}
