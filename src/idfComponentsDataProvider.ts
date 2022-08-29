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

import { EventEmitter, TreeDataProvider, TreeItem } from "vscode";
import * as vscode from "vscode";
import { IdfComponent } from "./idfComponent";
import * as idfConf from "./idfConfiguration";
import { LocDictionary } from "./localizationDictionary";
import { Logger } from "./logger/logger";
import * as utils from "./utils";
import { join } from "path";
const locDic = new LocDictionary(__filename);

export class IdfTreeDataProvider implements TreeDataProvider<IdfComponent> {
  private OnDidChangeTreeData: EventEmitter<
    IdfComponent | undefined
  > = new EventEmitter<IdfComponent | undefined>();
  // tslint:disable-next-line:member-ordering
  public readonly onDidChangeTreeData: vscode.Event<
    IdfComponent | undefined
  > = this.OnDidChangeTreeData.event;

  private projectDescriptionJsonPath: string;
  private workspaceFolder: vscode.Uri;

  constructor(workspaceFolder: vscode.Uri) {
    this.workspaceFolder = workspaceFolder;
    const buildDirName = idfConf.readParameter(
      "idf.buildDirectoryName",
      workspaceFolder
    ) as string;
    this.projectDescriptionJsonPath = join(
      buildDirName,
      "project_description.json"
    );
  }

  public refresh(workspaceFolder: vscode.Uri): void {
    this.workspaceFolder = workspaceFolder;
    const buildDirName = idfConf.readParameter(
      "idf.buildDirectoryName",
      workspaceFolder
    ) as string;
    this.projectDescriptionJsonPath = join(
      buildDirName,
      "project_description.json"
    );
    this.OnDidChangeTreeData.fire(null);
  }

  public getTreeItem(element: IdfComponent): TreeItem {
    return element;
  }

  public getChildren(element?: IdfComponent): Thenable<IdfComponent[]> {
    return new Promise((resolve) => {
      if (element) {
        resolve(utils.readComponentsDirs(element.uri.fsPath));
      } else {
        resolve(this.getComponentsInProject());
      }
    });
  }

  private getComponentsInProject(): IdfComponent[] {
    if (utils.fileExists(this.projectDescriptionJsonPath)) {
      const componentsList: IdfComponent[] = [];
      const userComponentsList: IdfComponent[] = [];
      const projDescJson = JSON.parse(
        utils.readFileSync(this.projectDescriptionJsonPath)
      );

      const defaultComponentsDir = idfConf.readParameter(
        "idf.espIdfPath",
        this.workspaceFolder
      );

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
          const element: IdfComponent = new IdfComponent(
            projDescJson.build_components[i],
            vscode.TreeItemCollapsibleState.Collapsed,
            vscode.Uri.file(projDescJson.build_component_paths[i]).with({
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
        locDic.localize(
          "idfComponentDataProvider.proj_desc_not_found",
          "File project_description.json cannot be found."
        ),
        new Error("File-Not-Found")
      );
      return null;
    }
  }
}
