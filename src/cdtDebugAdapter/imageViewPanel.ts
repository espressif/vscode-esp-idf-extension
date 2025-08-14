/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 23rd April 2025 5:52:06 pm
 * Copyright 2025 Espressif Systems (Shanghai) CO LTD
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

import * as vscode from "vscode";
import * as path from "path";

export interface ImageElement {
  name: string;
  data: Uint8Array;
}

export class ImageViewPanel {
  private static instance: ImageViewPanel;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionPath: string;
  private disposables: vscode.Disposable[] = [];

  public static show(extensionPath: string) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (ImageViewPanel.instance) {
      ImageViewPanel.instance.panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "espIdf.imageView",
      "Image Viewer",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(extensionPath, "dist", "views")),
        ],
      }
    );

    ImageViewPanel.instance = new ImageViewPanel(panel, extensionPath);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionPath: string
  ) {
    this.panel = panel;
    this.extensionPath = extensionPath;

    this.panel.iconPath = vscode.Uri.file(
      path.join(extensionPath, "media", "espressif_icon.png")
    );

    this.panel.webview.html = this.getHtmlContent(this.panel.webview);

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case "loadImageFromVariable":
            this.handleLoadImageFromVariable(
              message.variableName,
              message.size
            );
            break;
          default:
            break;
        }
      },
      null,
      this.disposables
    );
  }


  private sendImageData(imageElement: ImageElement) {
    const base64Data = Buffer.from(imageElement.data).toString("base64");
    this.panel.webview.postMessage({
      command: "updateImage",
      data: base64Data,
      name: imageElement.name,
    });
  }

  private async handleLoadImageFromVariable(
    variableName: string,
    size: string | number
  ) {
    try {
      const session = vscode.debug.activeDebugSession;
      if (!session) {
        this.panel.webview.postMessage({
          command: "showError",
          error: "No active debug session found",
        });
        return;
      }

      // Extract memory address from variable
      let memoryAddress: string | null = null;

      const threads = await session.customRequest("threads");
      const threadId = threads.threads[0].id;

      const stack = await session.customRequest("stackTrace", {
        threadId,
        startFrame: 0,
        levels: 1,
      });
      const frameId = stack.stackFrames[0].id;

      // Try to get the variable value to extract the address
      const evaluateResponse = await session.customRequest("evaluate", {
        expression: variableName,
        frameId,
      });

      if (evaluateResponse && evaluateResponse.result) {
        const match = evaluateResponse.result.match(/0x[0-9a-fA-F]+/);
        if (match) {
          memoryAddress = match[0];
        }
      }

      if (!memoryAddress) {
        this.panel.webview.postMessage({
          command: "showError",
          error: `Could not extract memory address from variable ${variableName}`,
        });
        return;
      }

      // Determine read size
      let readSize: number;
      if (typeof size === "number") {
        readSize = size;
      } else {
        // Try to evaluate the size variable
        const sizeResponse = await session.customRequest("evaluate", {
          expression: size,
          frameId,
        });
        if (sizeResponse && sizeResponse.result) {
          readSize = parseInt(sizeResponse.result, 10);
          if (isNaN(readSize)) {
            this.panel.webview.postMessage({
              command: "showError",
              error: `Could not parse size from variable ${size}`,
            });
            return;
          }
        } else {
          this.panel.webview.postMessage({
            command: "showError",
            error: `Could not evaluate size variable ${size}`,
          });
          return;
        }
      }

      // Read memory data
      const readResponse = await session.customRequest("readMemory", {
        memoryReference: memoryAddress,
        count: readSize,
      });

      if (readResponse && readResponse.data) {
        const binaryData = Buffer.from(readResponse.data, "base64");
        const imageElement = {
          name: variableName,
          data: new Uint8Array(binaryData),
        };

        // Update the panel title and send the data
        this.panel.title = `Image Viewer: ${variableName}`;
        this.sendImageData(imageElement);
      } else {
        this.panel.webview.postMessage({
          command: "showError",
          error: `Could not read memory data for variable ${variableName}`,
        });
      }
    } catch (error) {
      if (error && error.message && error.message.includes("-var-create")) {
        this.panel.webview.postMessage({
          command: "showError",
          error: `Variable ${variableName} not found in the current debug session.`,
        });
        return;
      }
      this.panel.webview.postMessage({
        command: "showError",
        error: `Error loading image: ${error}`,
      });
    }
  }

  private getHtmlContent(webview: vscode.Webview): string {
    const scriptPath = webview.asWebviewUri(
      vscode.Uri.file(
        path.join(this.extensionPath, "dist", "views", "imageView-bundle.js")
      )
    );

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Image Viewer</title>
    </head>
    <body>
      <section id="app"></section>
      <script src="${scriptPath}"></script>
    </body>
    </html>`;
  }

  private dispose() {
    ImageViewPanel.instance = undefined;
    this.disposables.forEach((d) => d.dispose());
  }
}
