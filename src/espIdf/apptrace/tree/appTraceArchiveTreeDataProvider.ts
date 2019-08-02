/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 16th July 2019 1:38:00 pm
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { existsSync, readdirSync } from "fs";
import { join } from "path";
import * as vscode from "vscode";

class AppTraceArchiveItems extends vscode.TreeItem {
    public fileName: string;
    public filePath: string;
}

// tslint:disable-next-line: max-classes-per-file
export class AppTraceArchiveTreeDataProvider implements vscode.TreeDataProvider<AppTraceArchiveItems> {
    // tslint:disable-next-line: max-line-length
    public OnDidChangeTreeData: vscode.EventEmitter<AppTraceArchiveItems> = new vscode.EventEmitter<AppTraceArchiveItems>();
    public readonly onDidChangeTreeData: vscode.Event<AppTraceArchiveItems> = this.OnDidChangeTreeData.event;
    public appTraceArchives: AppTraceArchiveItems[];

    constructor() {
        this.populateArchiveTree();
    }

    public registerDataProviderForTree(treeName: string): vscode.Disposable {
        return vscode.window.registerTreeDataProvider(treeName, this);
    }

    public getTreeItem(element: AppTraceArchiveItems): vscode.TreeItem {
        return element;
    }
    public getChildren(element?: AppTraceArchiveItems): AppTraceArchiveItems[] {
        return this.appTraceArchives;
    }
    public refresh() {
        this.OnDidChangeTreeData.fire();
    }

    public populateArchiveTree() {
        this.appTraceArchives = Array<AppTraceArchiveItems>(0);
        const workspace = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.path : "";
        const traceFolder = join(workspace, "trace");
        if (existsSync(traceFolder)) {
            let i = 1;
            readdirSync(traceFolder).filter((trace) => trace.endsWith(".trace")).forEach((trace) => {
                const name = trace.split("_");
                const appTraceArchiveNode = new AppTraceArchiveItems(`Trace Log #${i++}`);
                appTraceArchiveNode.fileName = trace;
                appTraceArchiveNode.filePath = join(traceFolder, trace);
                appTraceArchiveNode.command = {
                    command: "espIdf.apptrace.archive.showReport",
                    title: "Show Report",
                    arguments: [appTraceArchiveNode],
                };
                appTraceArchiveNode.iconPath = {
                    light: join(__filename, "..", "..", "..", "..", "..", "media", "log_light.svg"),
                    dark: join(__filename, "..", "..", "..", "..", "..", "media", "log_dark.svg"),
                };
                appTraceArchiveNode.description = this.sinceAgo(name[1].split(".trace")[0]);
                this.appTraceArchives.push(appTraceArchiveNode);
            });
        }
        this.appTraceArchives = this.appTraceArchives.reverse();
        this.refresh();
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
