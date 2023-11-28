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
  const cmakeListsSchemaFile = join(extensionPath, "cmakeListsSchema.json");
  const doesSchemaExists = await pathExists(cmakeListsSchemaFile);
  if (!doesSchemaExists) {
    return;
  }
  const schemaJson = await readJSON(cmakeListsSchemaFile);

  // Component and Project settings are loaded together
  // Should refactor if there is a way to identify component/project CmakeLists.txt
  return schemaJson[type] as CmakeListsElement[];
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
  const resultCMakeListsEls: CmakeListsElement[] = [];
  for (const element of cmakeLists) {
    const regex = new RegExp(element.regex, "g");
    let resultStr: RegExpExecArray;
    while ((resultStr = regex.exec(cmakeListFileText))) {
      if (resultStr && resultStr.length > 1 && resultStr[1].length > 1) {
        let newElement: CmakeListsElement = JSON.parse(JSON.stringify(element));
        newElement.value = [];
        switch (element.type) {
          case "array":
            const listStr = resultStr[1].trim().replace(/\"/g, "");
            if (listStr) {
              newElement.value =
                listStr && listStr === " " ? [listStr] : listStr.split(" ");
            }
            break;
          case "binary_data":
            if (resultStr[1]) {
              newElement.variable = resultStr[1].trim();
            }
            if (resultStr[2]) {
              newElement.value = [resultStr[2].trim()];
            }
            if (resultStr[3]) {
              newElement.typeValue = resultStr[3].trim();
            }
            break;
          case "set":
            if (resultStr[1]) {
              newElement.variable = resultStr[1].trim();
            }
            if (resultStr[2]) {
              newElement.value = [resultStr[2].trim()];
            }
            break;
          default:
            newElement.value = [resultStr[1].trim()];
            break;
        }
        if (!newElement.canHaveMany) {
          const existing = resultCMakeListsEls.some((elem) => {
            return elem.template === newElement.template;
          });
          if (!existing) {
            resultCMakeListsEls.push(newElement);
          }
        } else {
          resultCMakeListsEls.push(newElement);
        }
      }
    }
  }
  return resultCMakeListsEls;
}

export async function updateCmakeListFile(
  fileUri: Uri,
  values: CmakeListsElement[]
) {
  let componentStr = "idf_component_register(";
  const spaces = new Array(componentStr.length + 1).join(" ");
  const componentValues: string[] = [];
  const otherValues: string[] = [];
  for (let el of values) {
    if (el.isComponentElement && el.value && el.value.length > 0) {
      const elStr = el.template.replace(
        "***",
        el.value.map((v) => `"${v}"`).join(" ")
      );
      componentValues.push(elStr + EOL + spaces);
    } else if (el.value && el.value.length > 0) {
      otherValues.push(
        el.template
          .replace("***", "".concat(...el.value))
          .replace("VARIABLE", el.variable)
          .replace("TYPE", el.typeValue)
      );
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
  const comments = await getExistingComments(fileUri);
  resultStr = comments ? comments + resultStr : resultStr;
  await writeFile(fileUri.fsPath, resultStr);
  return resultStr;
}

export async function getExistingComments(fileUri: Uri) {
  const fileString = await readFile(fileUri.fsPath, "utf-8");
  const singleLineMatches = fileString.match(/^#.*/gm);
  const multiLineMatches = fileString.match(/^#\[\[[\w\W]+?\]\]$/gm);
  let resultStr: string = "";
  if (multiLineMatches && multiLineMatches.length) {
    for (let multiLineMatch of multiLineMatches) {
      resultStr = resultStr + EOL + multiLineMatch;
    }
  }
  if (singleLineMatches && singleLineMatches.length) {
    for (let singleLineMatch of singleLineMatches) {
      if (resultStr.indexOf(singleLineMatch) === -1) {
        resultStr = resultStr + EOL + singleLineMatch;
      }
    }
  }
  return resultStr.concat(EOL);
}
