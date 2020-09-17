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

import * as path from "path";
import * as utils from "../utils";

export interface IExample {
  category: string;
  name: string;
  path: string;
}

export function getExamplesList(targetFrameworkFolder: string): IExample[] {
  const examplesPath = path.join(targetFrameworkFolder, "examples");
  const exampleCategories = utils.getDirectories(examplesPath);
  const examplesPathList = utils.getSubProjects(examplesPath);

  const examplesList = examplesPathList.map((examplePath) => {
    const category =
      exampleCategories.find((c) => examplePath.indexOf(c) > -1) || "";
    const regexToUse =
      process.platform === "win32" ? /([^\\]*)\\*$/ : /([^\/]*)\/*$/;
    const exampleName = examplePath.match(regexToUse)[1] || "";

    const example: IExample = {
      category,
      name: exampleName,
      path: examplePath,
    };
    return example;
  });
  return examplesList;
}
