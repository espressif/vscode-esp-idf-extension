// /*
//  * Project: ESP-IDF VSCode Extension
//  * File Created: Thursday, 11th July 2019 10:52:59 am
//  * Copyright 2019 Espressif Systems (Shanghai) CO LTD
//  * 
//  * Licensed under the Apache License, Version 2.0 (the "License");
//  * you may not use this file except in compliance with the License.
//  * You may obtain a copy of the License at
//  * 
//  *    http://www.apache.org/licenses/LICENSE-2.0
//  * 
//  * Unless required by applicable law or agreed to in writing, software
//  * distributed under the License is distributed on an "AS IS" BASIS,
//  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  * See the License for the specific language governing permissions and
//  * limitations under the License.
//  */

// // tslint:disable: variable-name
// import * as fs from "fs";
// import * as path from "path";
// import * as vscode from "vscode";
// import * as idfConf from "../../idfConfiguration";
// import { Logger } from "../../logger/logger";
// import { OpenOCDController } from "./openOCDController";

// export class AppTracePanel {

//     public static createOrShow(context: vscode.ExtensionContext) {
//         const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;
//         if (AppTracePanel.currentPanel) {
//             AppTracePanel.currentPanel._panel.reveal(column);
//             return;
//         }
//         const panel = vscode.window.createWebviewPanel(
//             AppTracePanel.viewType,
//             AppTracePanel.viewTitle, column || vscode.ViewColumn.One,
//             {
//                 enableScripts: true,
//                 localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, "out", "views"))],
//                 retainContextWhenHidden: true,
//             });
//         AppTracePanel.currentPanel = new AppTracePanel(panel, context.extensionPath);
//     }

//     public static isCreatedAndHidden(): boolean {
//         return AppTracePanel.currentPanel && AppTracePanel.currentPanel._panel.visible === false;
//     }

//     private static currentPanel: AppTracePanel | undefined;
//     private static readonly viewType = "idfTrace";
//     private static readonly viewTitle = "IDF Tracing";

//     private readonly _panel: vscode.WebviewPanel;
//     private readonly _extensionPath: string;
//     private openOCDController: OpenOCDController;

//     private _disposables: vscode.Disposable[] = [];

//     private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
//         this._panel = panel;
//         this._extensionPath = extensionPath;
//         this.initOpenOCDServer();
//         this.initWebview();
//     }
//     private disposeWebview() {
//         AppTracePanel.currentPanel.openOCDController.stop();
//         AppTracePanel.currentPanel = undefined;
//     }
// tslint:disable-next-line: max-line-length
//     private async initOpenOCDServer(binPath?: string, scriptPath?: string, deviceInterface?: string, board?: string) {
//         const workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
//         binPath = idfConf.readParameter("idf.openOcdBin", workspaceRoot);
//         scriptPath = idfConf.readParameter("idf.openOcdScriptsPath", workspaceRoot);
//         deviceInterface = idfConf.readParameter("idf.deviceInterface", workspaceRoot);
//         board = idfConf.readParameter("idf.board", workspaceRoot);
//         this.openOCDController = new OpenOCDController({ binPath, scriptPath, deviceInterface, board });
//         this.openOCDController.on("error", (data: Buffer, error: Error) => {
//             let errorMsg: string = "OpenOCD server failed to start";
//             if (error.message === "STDERR_CHAN_RECV") {
//                 const regex = /^Error:.*$/gmi;
//                 const errStr = data.toString();
//                 const matchArr = errStr.match(regex);
//                 if (matchArr) {
//                     errorMsg += ` ${matchArr.join(" ")}`;
//                 }
//             }
//             this.sendMessageToWebview("openOCD-stopped", errorMsg, data);
//         });
//         await this.openOCDController.startServer();
//     }
//     private initWebview() {
//         this._panel.webview.html = this.getHtmlContent();
//         this._panel.onDidDispose(this.disposeWebview, null, this._disposables);
//         this._panel.webview.onDidReceiveMessage((msg) => {
//             switch (msg.command) {
//                 case "flash":
//                     vscode.commands.executeCommand("espIdf.flashDevice");
//                     break;
//                 case "retry":
//                     // this._panel.webview.postMessage(this._webviewData);
//                     break;
//                 default:
// tslint:disable-next-line: max-line-length
//                     const err = new Error(`Unrecognized command received from webview (idf-size), file: ${__filename}`);
//                     Logger.error(err.message, err);
//                     break;
//             }
//         }, null, this._disposables);
//     }
//     private sendMessageToWebview(message: string, ...args: any[]) {
//         if (this._panel) {
//             this._panel.webview.postMessage({message, args});
//         }
//     }
//     private getHtmlContent(): string {
//         const htmlFilePath = path.join(this._extensionPath, "out", "views", "espTrace.html");
//         if (!fs.existsSync(htmlFilePath)) {
//             return this.notFoundStaticHtml();
//         }
//         let html = fs.readFileSync(htmlFilePath).toString();
//         const fileUrl = vscode.Uri.file(htmlFilePath).with({ scheme: "vscode-resource" });
//         if (/(<head(\s.*)?>)/.test(html)) {
//             html = html.replace(/(<head(\s.*)?>)/, `$1<base href="${fileUrl.toString()}">`);
//         } else if (/(<html(\s.*)?>)/.test(html)) {
//             html = html.replace(/(<html(\s.*)?>)/, `$1<head><base href="${fileUrl.toString()}"></head>`);
//         } else {
//             html = `<head><base href="${fileUrl.toString()}"></head>${html}`;
//         }
//         return html;
//     }
//     private notFoundStaticHtml(): string {
//         return `<!DOCTYPE html>
// <html lang="en">
// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <meta http-equiv="X-UA-Compatible" content="ie=edge">
//     <title>ESP-IDF Not Found</title>
// </head>
// <body>
//     Error loading the page or the page not found
// </body>
// </html>`;
//     }
// }
