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

import * as vscode from "vscode";
import { IDocResult } from "./getSearchResults";
import { Logger } from "../../logger/logger";
import { ESP } from "../../config";

export class DocSearchResult extends vscode.TreeItem {
  name: string;
  docName: string;
  resultType: string;
  url: string;
  constructor(name: string, docName: string, resultType: string, url: string) {
    const label = `${name ? name : docName}`;
    super(label);
    this.command = {
      command: "espIdf.openDocUrl",
      title: "Open ESP-IDF Docs for" + name,
      arguments: [url],
    };
    this.tooltip = `${
      resultType ? `${resultType} in ` : "mentioned in "
    }${docName}`;
    this.iconPath = new vscode.ThemeIcon("globe");
  }
}

export class DocSearchResultTreeDataProvider
  implements vscode.TreeDataProvider<DocSearchResult> {
  public OnDidChangeTreeData: vscode.EventEmitter<
    DocSearchResult
  > = new vscode.EventEmitter<DocSearchResult>();
  public readonly onDidChangeTreeData: vscode.Event<DocSearchResult> = this
    .OnDidChangeTreeData.event;

  public docSearchResults: DocSearchResult[];

  constructor() {
    vscode.commands.registerCommand("espIdf.openDocUrl", (url: string) => {
      if (!url) {
        Logger.errorNotify(
          "Cannot call this command directly, click on any ESP-IDF search result!",
          new Error("INVALID_INVOCATION")
        );
        return;
      }
      vscode.env.openExternal(vscode.Uri.parse(url));
    });
    this.docSearchResults = Array<DocSearchResult>(0);
  }

  public getTreeItem(e) {
    return e;
  }

  public getParent(e: DocSearchResult) {
    return undefined;
  }

  public getChildren() {
    return this.docSearchResults;
  }

  public getResults(
    docs: IDocResult[],
    idfSearchResults: vscode.TreeView<DocSearchResult>
  ) {
    if (!docs || docs.length < 1) {
      docs = [
        { name: "No results found", url: ESP.URL.Docs.BASE_URL } as IDocResult,
      ];
    }
    this.docSearchResults = [];
    const docsTreeItems = docs.map(
      (d) => new DocSearchResult(d.name, d.docName, d.resultType, d.url)
    );
    this.docSearchResults = docsTreeItems;
    this.OnDidChangeTreeData.fire(null);
    idfSearchResults.reveal(docsTreeItems[0], { focus: true });
  }

  public clearResults() {
    this.docSearchResults = [];
    this.OnDidChangeTreeData.fire(null);
  }
}
