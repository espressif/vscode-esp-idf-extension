// Copyright 2020 Espressif Systems (Shanghai) CO LTD
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

import { EOL } from "os";
import { join } from "path";
import { Uri } from "vscode";
import { CmakeListsElement } from "./cmakeListsElement";
import { pathExists, readFile, readJSON, writeFile } from "fs-extra";

export enum CMakeListsType {
  Component = "component",
  Project = "project",
}

export async function loadCmakeListBuilder(
  extensionPath: string,
  type: CMakeListsType
) {
  const cmakeListsSchemaFile = join(
    extensionPath,
    "src",
    "cmake",
    "cmakeListsSchema.json"
  );
  const doesSchemaExists = await pathExists(cmakeListsSchemaFile);
  if (!doesSchemaExists) {
    return;
  }
  const schemaJson = await readJSON(cmakeListsSchemaFile);

  // Component and Project settings are loaded together
  // Should refactor if there is a way to identify component/project CmakeLists.txt
  console.log(schemaJson[type]);
  return schemaJson[type] as CmakeListsElement[];
  return [].concat(
    schemaJson.project as CmakeListsElement[],
    schemaJson.component as CmakeListsElement[]
  ) as CmakeListsElement[];
}

export async function updateWithValuesCMakeLists(
  fileUri: Uri,
  list: CmakeListsElement[]
) {
  const fileString = await readFile(fileUri.fsPath, "utf-8");
  return parseCmakeListsText(fileString, list);
}

export function parseCmakeListsText(
  cmakeListFileText: string,
  cmakeLists: CmakeListsElement[]
) {
  for (const element of cmakeLists) {
    if (element.type === "array") {
      const regex = new RegExp(element.regex);
      const resultStr = cmakeListFileText.match(regex);
      if (resultStr && resultStr[1].trim().split(" ").length > 0) {
        element.value = resultStr[1].trim().replace(/\"/g, "").split(" ");
      }
    } else {
      const regex = new RegExp(element.regex);
      const resultStr = cmakeListFileText.match(regex);
      if (resultStr && resultStr[1].trim().length > 0) {
        element.value = [resultStr[1].trim()];
      }
    }
  }
  return cmakeLists;
}

export async function updateCmakeListFile(
  fileUri: Uri,
  values: CmakeListsElement[]
) {
  let componentStr = "idf_component_register(";
  const spaces = new Array(componentStr.length + 1).join(" ");
  const componentValues: string[] = [];
  const otherValues: string[] = [];
  for (const el of values) {
    if (el.isComponentElement && el.value && el.value.length > 0) {
      const elStr = el.template.replace(
        "***",
        el.value.map((v) => `"${v}"`).join(" ")
      );
      componentValues.push(elStr + EOL + spaces);
    } else if (el.value && el.value.length > 0) {
      otherValues.push(el.template.replace("***", "".concat(...el.value)));
    }
  }
  let resultStr: string;
  if (componentValues.length > 0) {
    componentStr = componentStr.concat(...componentValues);
    componentStr = componentStr.slice(0, componentStr.lastIndexOf(EOL));
    componentStr = componentStr.concat(")" + EOL);
    resultStr =
      otherValues.length > 0
        ? otherValues.join(EOL).concat(EOL, componentStr)
        : componentStr;
  } else {
    resultStr = otherValues.join(EOL).concat(EOL);
  }
  await writeFile(fileUri.fsPath, resultStr);
  return resultStr;
}
