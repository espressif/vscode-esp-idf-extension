/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 17th July 2019 3:58:48 pm
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

// tslint:disable: variable-name
import * as AnsiToHtml from "ansi-to-html";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { Logger } from "../../logger/logger";
import { LogTraceProc } from "./tools/logTraceProc";
import { SysviewTraceProc } from "./tools/sysviewTraceProc";

export class AppTracePanel {

    public static createOrShow(context: vscode.ExtensionContext, traceData?: any) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;
        if (AppTracePanel.currentPanel) {
            AppTracePanel.currentPanel._panel.reveal(column);
            if (traceData) {
                AppTracePanel.currentPanel._traceData = traceData;
                AppTracePanel.currentPanel.sendCommandToWebview("initialLoad", traceData);
            }
            return;
        }
        const panel = vscode.window.createWebviewPanel(
            AppTracePanel.viewType,
            AppTracePanel.viewTitle, column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, "out", "views"))],
                retainContextWhenHidden: true,
            });
        AppTracePanel.currentPanel = new AppTracePanel(panel, context.extensionPath, traceData);
    }

    private static currentPanel: AppTracePanel | undefined;
    private static readonly viewType = "idfTrace";
    private static readonly viewTitle = "IDF Tracing";

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionPath: string;

    private _disposables: vscode.Disposable[] = [];
    private _traceData: any;

    private constructor(panel: vscode.WebviewPanel, extensionPath: string, traceData: any) {
        this._panel = panel;
        this._extensionPath = extensionPath;
        this._traceData = traceData;
        this.initWebview();
    }
    private disposeWebview() {
        AppTracePanel.currentPanel = undefined;
    }

    private initWebview() {
        this._panel.webview.html = this.getHtmlContent();
        this.sendCommandToWebview("initialLoad", this._traceData);
        this._panel.onDidDispose(this.disposeWebview, null, this._disposables);
        this._panel.webview.onDidReceiveMessage((msg) => {
            switch (msg.command) {
                case "webviewLoad":
                    this.sendCommandToWebview("initialLoad", this._traceData);
                    break;
                case "calculate":
                    this.parseTraceLogData().then((resp: string) => {
                        const ansiToHtmlConverter = new AnsiToHtml();
                        this.sendCommandToWebview("calculated", { log: ansiToHtmlConverter.toHtml(resp) });
                    }).catch((error) => {
                        this.sendCommandToWebview("calculateFailed", { error });
                        error.message ? Logger.errorNotify(error.message, error) : Logger.errorNotify(
                            `Failed to process the trace data`, error);
                    });
                    break;
                case "calculateHeapTrace":
                    const plot = {};
                    this.sendCommandToWebview("calculatedHeapTrace", { plot });
                    break;
                default:
                    const err = new Error(`Unrecognized command received from webview (idf-trace) file: ${__filename}`);
                    Logger.error(err.message, err);
                    break;
            }
        }, null, this._disposables);
    }
    private async parseTraceLogData(): Promise<string> {
        const emptyURI: vscode.Uri = undefined;
        const workspaceRoot = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri : emptyURI;
        const logTraceProc = new LogTraceProc(
            workspaceRoot,
            this._traceData.trace.filePath,
            await this.getElfFilePath(workspaceRoot),
        );
        const resp = await logTraceProc.parse();
        return resp.toString();
    }
    private async parseHeapTraceData(): Promise<any> {
        const emptyURI: vscode.Uri = undefined;
        const workspaceRoot = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri : emptyURI;
        const sysviewTraceProc = new SysviewTraceProc(
            workspaceRoot,
            this._traceData.trace.filePath,
            "",
        );
        const resp = await sysviewTraceProc.parse();
        return resp.toString();
    }
    private async getElfFilePath(workspaceURI: vscode.Uri): Promise<string> {
        let elfFilePath = "";
        if (!workspaceURI) {
            return elfFilePath;
        }
        const elfPath = path.join(workspaceURI.path, "build");
        const elfFiles = [];
        fs.readdirSync(elfPath).forEach((file) => {
            if (file.endsWith(".elf")) {
                elfFiles.push({ label: file, description: path.join(elfPath, file) });
            }
        });
        if (elfFiles.length > 1) {
            const pickedElf = await vscode.window.showQuickPick(elfFiles, {
                placeHolder: "Select ELF File to be use for the report generation",
            });
            if (!pickedElf) {
                throw new Error("Select valid ELF file for showing report");
            }
            elfFilePath = pickedElf.description;
        } else if (elfFiles.length === 1) {
            elfFilePath = elfFiles[0].description;
        }
        return elfFilePath;
    }
    private sendCommandToWebview(command: string, value: any) {
        if (this._panel.webview) {
            this._panel.webview.postMessage({
                command,
                value,
            });
        }
    }
    private getHtmlContent(): string {
        const htmlFilePath = path.join(this._extensionPath, "out", "views", "espTrace.html");
        if (!fs.existsSync(htmlFilePath)) {
            return this.notFoundStaticHtml();
        }
        let html = fs.readFileSync(htmlFilePath).toString();
        const fileUrl = vscode.Uri.file(htmlFilePath).with({ scheme: "vscode-resource" });
        if (/(<head(\s.*)?>)/.test(html)) {
            html = html.replace(/(<head(\s.*)?>)/, `$1<base href="${fileUrl.toString()}">`);
        } else if (/(<html(\s.*)?>)/.test(html)) {
            html = html.replace(/(<html(\s.*)?>)/, `$1<head><base href="${fileUrl.toString()}"></head>`);
        } else {
            html = `<head><base href="${fileUrl.toString()}"></head>${html}`;
        }
        return html;
    }
    private notFoundStaticHtml(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>ESP-IDF Not Found</title>
</head>
<body>
    Error loading the page or the page not found
</body>
</html>`;
    }
}
