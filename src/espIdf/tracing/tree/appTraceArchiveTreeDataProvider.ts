/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 16th July 2019 1:38:00 pm
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { ESP } from "../../../config";
import {
  Disposable,
  Event,
  EventEmitter,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
  Uri,
  window,
  workspace,
} from "vscode";

export enum TraceType {
  AppTrace = 0,
  HeapTrace = 1,
}

export class AppTraceArchiveItems extends TreeItem {
  public fileName: string = "";
  public filePath: string = "";
  public type: TraceType = TraceType.AppTrace;
}

// tslint:disable-next-line: max-classes-per-file
export class AppTraceArchiveTreeDataProvider
  implements TreeDataProvider<AppTraceArchiveItems> {
  // tslint:disable-next-line: max-line-length
  public OnDidChangeTreeData: EventEmitter<AppTraceArchiveItems | null> = new EventEmitter<
    AppTraceArchiveItems
  >();
  public readonly onDidChangeTreeData: Event<AppTraceArchiveItems | null> = this
    .OnDidChangeTreeData.event;
  public appTraceArchives: AppTraceArchiveItems[] = Array<AppTraceArchiveItems>(
    0
  );

  constructor() {
    this.populateArchiveTree();
  }

  public registerDataProviderForTree(treeName: string): Disposable {
    return window.registerTreeDataProvider(treeName, this);
  }

  public getTreeItem(element: AppTraceArchiveItems): TreeItem {
    return element;
  }
  public getChildren(element?: AppTraceArchiveItems): AppTraceArchiveItems[] {
    return this.appTraceArchives;
  }
  public refresh() {
    this.OnDidChangeTreeData.fire(null);
  }

  public populateArchiveTree() {
    this.appTraceArchives = Array<AppTraceArchiveItems>(0);
    const storedUri = ESP.GlobalConfiguration.store.get<Uri>(
      ESP.GlobalConfiguration.SELECTED_WORKSPACE_FOLDER
    );
    let baseFolderPath: string | undefined;
    if (storedUri) {
      const wsFolder = workspace.getWorkspaceFolder(storedUri);
      if (wsFolder) {
        baseFolderPath = wsFolder.uri.fsPath;
      }
    }
    if (
      !baseFolderPath &&
      workspace.workspaceFolders &&
      workspace.workspaceFolders.length > 0
    ) {
      baseFolderPath = workspace.workspaceFolders[0].uri.fsPath;
    }
    if (!baseFolderPath) {
      this.refresh();
      return;
    }
    const traceFolder = join(baseFolderPath, "trace");
    if (existsSync(traceFolder)) {
      const traceLists = readdirSync(traceFolder);
      let appTraceCounter = 1;
      const appTraceArchives = new Array<AppTraceArchiveItems>();
      traceLists
        .filter((trace) => trace.endsWith(".trace"))
        .forEach((trace) => {
          const label = `Trace Log #${appTraceCounter++}`;
          const appTraceArchiveNode = this.constructAppTraceArchiveItemNode(
            label,
            trace,
            traceFolder,
            TraceType.AppTrace
          );
          appTraceArchives.push(appTraceArchiveNode);
        });

      appTraceArchives.reverse();
      this.appTraceArchives = this.appTraceArchives.concat(appTraceArchives);
      appTraceArchives.splice(0, appTraceArchives.length);
      appTraceCounter = 1;

      traceLists
        .filter((trace) => trace.endsWith(".svdat"))
        .forEach((trace) => {
          const label = `Heap Trace #${appTraceCounter++}`;
          const appTraceArchiveNode = this.constructAppTraceArchiveItemNode(
            label,
            trace,
            traceFolder,
            TraceType.HeapTrace
          );
          appTraceArchives.push(appTraceArchiveNode);
        });

      appTraceArchives.reverse();
      this.appTraceArchives = this.appTraceArchives.concat(appTraceArchives);
      appTraceArchives.splice(0, appTraceArchives.length);
    }
    this.refresh();
  }
  private constructAppTraceArchiveItemNode(
    label: string,
    fileName: string,
    traceFolder: string,
    type: TraceType
  ): AppTraceArchiveItems {
    const name = fileName.split("_");
    const appTraceArchiveNode = new AppTraceArchiveItems(label);
    appTraceArchiveNode.fileName = label;
    appTraceArchiveNode.filePath = join(traceFolder, fileName);
    appTraceArchiveNode.type = type;

    // Only set command for Heap Trace items - App Trace items will open the file directly
    if (appTraceArchiveNode.type === TraceType.HeapTrace) {
      appTraceArchiveNode.command = {
        command: "espIdf.apptrace.archive.showReport",
        title: "Show Report",
        arguments: [appTraceArchiveNode],
      };
      appTraceArchiveNode.iconPath = new ThemeIcon("pulse");
    } else {
      // For App Trace, set command to open file directly
      appTraceArchiveNode.command = {
        command: "vscode.open",
        title: "Open File",
        arguments: [Uri.file(appTraceArchiveNode.filePath)],
      };
      appTraceArchiveNode.iconPath = new ThemeIcon("archive");
    }

    const traceSize = statSync(appTraceArchiveNode.filePath);
    appTraceArchiveNode.description = `${this.sinceAgo(
      name[1].split(".trace")[0]
    )} ${traceSize.size}B`;
    appTraceArchiveNode.tooltip = `${label} has ${
      traceSize.size
    } bytes (${this.sinceAgo(name[1].split(".trace")[0])})`;
    return appTraceArchiveNode;
  }
  private sinceAgo(epoch: string): string {
    // tslint:disable-next-line: radix
    const d = new Date(parseInt(epoch));
    const n = new Date();
    if (n.getFullYear() - d.getFullYear() !== 0) {
      return `${n.getFullYear() - d.getFullYear()} year ago`;
    }
    if (n.getMonth() - d.getMonth() !== 0) {
      return `${n.getMonth() - d.getMonth()} month ago`;
    }
    if (n.getDate() - d.getDate() !== 0) {
      return `${n.getDate() - d.getDate()} day ago`;
    }
    if (n.getHours() - d.getHours() !== 0) {
      return `${n.getHours() - d.getHours()} hour ago`;
    }
    if (n.getMinutes() - d.getMinutes() !== 0) {
      return `${n.getMinutes() - d.getMinutes()} minute ago`;
    }
    return "a few seconds ago";
  }
}
