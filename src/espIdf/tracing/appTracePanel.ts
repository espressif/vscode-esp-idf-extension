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
import { getElfFilePath, PreCheck } from "../../utils";
import { LogTraceProc } from "./tools/logTraceProc";
import { SysviewTraceProc } from "./tools/sysviewTraceProc";
import { Addr2Line } from "./tools/xtensa/addr2line";
import { ReadElf } from "./tools/xtensa/readelf";

export class AppTracePanel {
  public static createOrShow(
    context: vscode.ExtensionContext,
    traceData?: any
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;
    if (AppTracePanel.currentPanel) {
      AppTracePanel.currentPanel._panel.reveal(column);
      if (traceData) {
        AppTracePanel.currentPanel._traceData = traceData;
        AppTracePanel.currentPanel.sendCommandToWebview(
          "initialLoad",
          traceData
        );
      }
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      AppTracePanel.viewType,
      AppTracePanel.viewTitle,
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.extensionPath, "dist", "views")),
        ],
        retainContextWhenHidden: true,
      }
    );
    AppTracePanel.currentPanel = new AppTracePanel(
      panel,
      context.extensionPath,
      traceData
    );
  }

  private static currentPanel: AppTracePanel | undefined;
  private static readonly viewType = "idfTrace";
  private static readonly viewTitle = "IDF Tracing";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionPath: string;

  private _disposables: vscode.Disposable[] = [];
  private _traceData: any;
  private cache: any;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionPath: string,
    traceData: any
  ) {
    this._panel = panel;
    this._extensionPath = extensionPath;
    this._traceData = traceData;
    this.cache = {};
    this.initWebview();
  }
  private disposeWebview() {
    AppTracePanel.currentPanel = undefined;
  }

  private initWebview() {
    this._panel.webview.html = this.getHtmlContent();
    this.sendCommandToWebview("initialLoad", this._traceData);
    this._panel.onDidDispose(this.disposeWebview, null, this._disposables);
    this._panel.webview.onDidReceiveMessage(
      (msg) => {
        switch (msg.command) {
          case "webviewLoad":
            this.sendCommandToWebview("initialLoad", this._traceData);
            break;
          case "calculate":
            this.parseTraceLogData()
              .then((resp: string) => {
                const ansiToHtmlConverter = new AnsiToHtml();
                this.sendCommandToWebview("calculated", {
                  log: ansiToHtmlConverter.toHtml(resp),
                });
              })
              .catch((error) => {
                this.sendCommandToWebview("calculateFailed", { error });
                error.message
                  ? Logger.errorNotify(error.message, error)
                  : Logger.errorNotify(
                      `Failed to process the trace data`,
                      error
                    );
              });
            break;
          case "calculateHeapTrace":
            this.parseHeapTraceData()
              .then(async (plot) => {
                const elfMap = await this.readElf();
                this.cache.elfMap = elfMap;
                this.sendCommandToWebview("calculatedHeapTrace", { plot });
              })
              .catch((error) => {
                this.sendCommandToWebview("calculateFailed", { error });
                error.message
                  ? Logger.errorNotify(error.message, error)
                  : Logger.errorNotify(
                      `Failed to process the heap trace data`,
                      error
                    );
              });
            break;
          case "resolveAddresses":
            this.resolveAddresses(msg);
            break;
          case "openFileAtLine":
            this.openFileAtLineNumber(msg.filePath, msg.lineNumber);
            break;
          default:
            const err = new Error(
              `Unrecognized command received from webview (idf-trace) file: ${__filename}`
            );
            Logger.error(err.message, err);
            break;
        }
      },
      null,
      this._disposables
    );
  }
  private async openFileAtLineNumber(filePath: string, lineNumber: number) {
    try {
      const textDocument = await vscode.workspace.openTextDocument(filePath);
      const selectionRange = textDocument.lineAt(lineNumber - 1).range;

      const column = vscode.window.activeTextEditor
        ? vscode.window.activeTextEditor.viewColumn
        : undefined;
      await vscode.window.showTextDocument(textDocument, {
        selection: selectionRange,
        viewColumn: column || vscode.ViewColumn.One,
      });
      // editor.revealRange(selectionRange, vscode.TextEditorRevealType.InCenter);
    } catch (error) {
      Logger.errorNotify(error.message, error);
    }
  }
  private async readElf(): Promise<string[][]> {
    const emptyURI: vscode.Uri = undefined;
    const workspaceRoot = PreCheck.isWorkspaceFolderOpen()
      ? vscode.workspace.workspaceFolders[0].uri
      : emptyURI;
    const elfFile = await getElfFilePath(workspaceRoot);
    if (!elfFile) {
      throw new Error("Select Elf file to process the addresses");
    }
    const readElf = new ReadElf(workspaceRoot, elfFile);
    const resp = await readElf.run();
    const respStr = resp.toString();
    const respArr = respStr.split("\n");
    respArr.shift();
    respArr.shift();
    respArr.shift();
    return respArr
      .map((value) => {
        return value.trim().split(/\s+/);
      })
      .filter((value) => {
        return value[3] === "FUNC";
      });
  }
  private functionNameForAddress(address: string): string {
    const contains = (start: string, size: string, addr: string): boolean => {
      const startAddrDec = parseInt(start, 16);
      const addrDec = parseInt(addr, 16);
      const endAddrDec = startAddrDec + parseInt(size, 10);
      return addrDec >= startAddrDec && addrDec <= endAddrDec;
    };

    let funcName = "";
    if (this.cache && this.cache.elfMap) {
      const filteredArr = this.cache.elfMap.filter((e: string[]) => {
        return contains(e[1], e[2], address);
      });
      funcName = filteredArr.length > 0 ? filteredArr[0][7] : "";
    }

    return funcName;
  }
  private resolveAddresses({ addresses }) {
    const emptyURI: vscode.Uri = undefined;
    const workspaceRoot = PreCheck.isWorkspaceFolderOpen()
      ? vscode.workspace.workspaceFolders[0].uri
      : emptyURI;
    if (addresses) {
      const promises = Object.keys(addresses).map((add) => {
        const fn = async (address) => {
          const addr2line = new Addr2Line(
            workspaceRoot,
            await getElfFilePath(workspaceRoot),
            address
          );
          const resp = await addr2line.run();
          const respStr = resp.toString().trim();
          const fileSplit = respStr.split(":");
          const filePath = fileSplit[0];
          const fileName = filePath.split("/");
          const lineNumber = fileSplit[1];
          const funcName = this.functionNameForAddress(address);
          Object.assign(addresses[address], {
            filePath,
            lineNumber,
            fileName,
            funcName,
          });
        };
        return fn(add);
      });
      Promise.all(promises).then((resp) => {
        this.sendCommandToWebview("addressesResolved", addresses);
      });
    }
  }
  private async parseTraceLogData(): Promise<string> {
    const emptyURI: vscode.Uri = undefined;
    const workspaceRoot = PreCheck.isWorkspaceFolderOpen()
      ? vscode.workspace.workspaceFolders[0].uri
      : emptyURI;
    const logTraceProc = new LogTraceProc(
      workspaceRoot,
      this._traceData.trace.filePath,
      await getElfFilePath(workspaceRoot)
    );
    const resp = await logTraceProc.parse();
    return resp.toString();
  }
  private async parseHeapTraceData(): Promise<any> {
    const emptyURI: vscode.Uri = undefined;
    const workspaceRoot = PreCheck.isWorkspaceFolderOpen()
      ? vscode.workspace.workspaceFolders[0].uri
      : emptyURI;
    const sysviewTraceProc = new SysviewTraceProc(
      workspaceRoot,
      this._traceData.trace.filePath
    );
    const resp = await sysviewTraceProc.parse();
    const respStr = resp.toString();
    return JSON.parse(respStr);
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
    const htmlFilePath = path.join(
      this._extensionPath,
      "dist",
      "views",
      "tracing.html"
    );
    if (!fs.existsSync(htmlFilePath)) {
      return this.notFoundStaticHtml();
    }
    let html = fs.readFileSync(htmlFilePath).toString();
    const fileUrl = this._panel.webview.asWebviewUri(
      vscode.Uri.file(htmlFilePath)
    );
    if (/(<head(\s.*)?>)/.test(html)) {
      html = html.replace(
        /(<head(\s.*)?>)/,
        `$1<base href="${fileUrl.toString()}">`
      );
    } else if (/(<html(\s.*)?>)/.test(html)) {
      html = html.replace(
        /(<html(\s.*)?>)/,
        `$1<head><base href="${fileUrl.toString()}"></head>`
      );
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
