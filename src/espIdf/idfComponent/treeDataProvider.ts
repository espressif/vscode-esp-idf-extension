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

import {
  EventEmitter,
  l10n,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
} from "vscode";
import { Event, Uri } from "vscode";
import { readParameter } from "../../configuration/idf";
import { Logger } from "../../common/logger";
import { join } from "path";
import { getCurrentIdfConfiguration } from "../../configuration/env";
import { IdfComponentTreeItem } from "./IdfComponent";
import { existsSync, readFileSync } from "fs";
import { readComponentsDirs } from "./readComponents";

export class IdfTreeDataProvider implements TreeDataProvider<IdfComponentTreeItem> {
  private OnDidChangeTreeData: EventEmitter<
    IdfComponentTreeItem | undefined
  > = new EventEmitter<IdfComponentTreeItem | undefined>();
  // tslint:disable-next-line:member-ordering
  public readonly onDidChangeTreeData: Event<IdfComponentTreeItem | undefined> = this
    .OnDidChangeTreeData.event;

  private projectDescriptionJsonPath: string;

  constructor(workspaceFolder: Uri) {
    const buildDirPath = readParameter(
      "idf.buildPath",
      workspaceFolder
    ) as string;
    this.projectDescriptionJsonPath = join(
      buildDirPath,
      "project_description.json"
    );
  }

  public refresh(workspaceFolder: Uri): void {
    const buildDirPath = readParameter(
      "idf.buildPath",
      workspaceFolder
    ) as string;
    this.projectDescriptionJsonPath = join(
      buildDirPath,
      "project_description.json"
    );
    this.OnDidChangeTreeData.fire(undefined);
  }

  public getTreeItem(element: IdfComponentTreeItem): TreeItem {
    return element;
  }

  public getChildren(element?: IdfComponentTreeItem): Thenable<IdfComponentTreeItem[]> {
    return new Promise((resolve) => {
      if (element) {
        resolve(readComponentsDirs(element.uri.fsPath));
      } else {
        resolve(this.getComponentsInProject());
      }
    });
  }

  private getComponentsInProject(): IdfComponentTreeItem[] {
    if (existsSync(this.projectDescriptionJsonPath)) {
      const componentsList: IdfComponentTreeItem[] = [];
      const userComponentsList: IdfComponentTreeItem[] = [];
      const projDescJson = JSON.parse(
        readFileSync(this.projectDescriptionJsonPath, "utf-8")
      );

      const currentEnvVars = getCurrentIdfConfiguration();
      let defaultComponentsDir = currentEnvVars["IDF_PATH"];

      if (
        Object.prototype.hasOwnProperty.call(
          projDescJson,
          "build_component_paths"
        )
      ) {
        for (let i = 0; i < projDescJson.build_component_paths.length; i++) {
          if (projDescJson.build_component_paths[i] === "") {
            continue;
          }
          const element: IdfComponentTreeItem = new IdfComponentTreeItem(
            projDescJson.build_components[i],
            TreeItemCollapsibleState.Collapsed,
            Uri.file(projDescJson.build_component_paths[i]).with({
              scheme: "vscode-resource",
            })
          );

          if (element.uri.fsPath.startsWith(defaultComponentsDir)) {
            componentsList.push(element);
          } else {
            userComponentsList.push(element);
          }
        }
      }
      const sortedUserList = userComponentsList.sort((a, b) =>
        a.label > b.label ? 1 : -1
      );
      const sortedDefaultList = componentsList.sort((a, b) =>
        a.label > b.label ? 1 : -1
      );

      return sortedUserList.concat(sortedDefaultList);
    } else {
      Logger.errorNotify(
        l10n.t("File project_description.json cannot be found."),
        new Error("File-Not-Found"),
        "IDFTreeDataProvider getComponentsInProject",
        undefined,
        false
      );
      return [];
    }
  }
}