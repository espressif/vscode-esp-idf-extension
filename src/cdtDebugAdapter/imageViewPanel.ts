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

export interface ImageWithDimensionsElement {
  name: string;
  data: Uint8Array;
  dataSize?: number;
  dataAddress?: string;
  width: number;
  height: number;
  format: number;
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

  public static handleLVGLVariableFromContext(debugContext: {
    container: {
      expensive: boolean;
      name: string;
      variablesReference: number;
    };
    sessionId: string;
    variable: {
      evaluateName: string;
      memoryReference: string;
      name: string;
      value: string;
      variablesReference: number;
      type: string;
    };
  }) {
    if (ImageViewPanel.instance) {
      ImageViewPanel.instance.handleExtractLVGLImageProperties(
        debugContext.variable
      );
    }
  }

  public static handleOpenCVVariableFromContext(debugContext: {
    container: {
      expensive: boolean;
      name: string;
      variablesReference: number;
    };
    sessionId: string;
    variable: {
      evaluateName: string;
      memoryReference: string;
      name: string;
      value: string;
      variablesReference: number;
      type: string;
    };
  }) {
    if (ImageViewPanel.instance) {
      ImageViewPanel.instance.handleExtractOpenCVImageProperties(
        debugContext.variable
      );
    }
  }

  private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
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
          case "extractLVGLImageProperties":
            this.handleExtractLVGLImagePropertiesFromString(
              message.variableName
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

  private sendImageWithDimensionsData(
    imageElement: ImageWithDimensionsElement
  ) {
    const base64Data = Buffer.from(imageElement.data).toString("base64");
    this.panel.webview.postMessage({
      command: "updateLVGLImage",
      data: base64Data,
      dataAddress: imageElement.dataAddress,
      dataSize: imageElement.dataSize,
      name: imageElement.name,
      width: imageElement.width,
      height: imageElement.height,
      format: imageElement.format,
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
        const imageElement: ImageElement = {
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

  private async processLVGLImageProperties(
    variableName: string,
    variablesResponse: any,
    lvHeaderChildren: any,
    session: vscode.DebugSession
  ) {
    // Extract properties from the image descriptor
    const imageProperties: ImageWithDimensionsElement = {
      name: variableName,
      data: new Uint8Array(),
      width: 0,
      height: 0,
      format: 0,
    };

    // Extract data_size and data from the main structure
    variablesResponse.variables.forEach((child: any) => {
      if (child.name === "data_size") {
        imageProperties.dataSize = parseInt(child.value, 10);
      } else if (child.name === "data") {
        const match = child.value.match(/0x[0-9a-fA-F]+/);
        if (match) {
          imageProperties.dataAddress = match[0];
        }
      }
    });

    // Extract width, height, and format from header
    lvHeaderChildren.variables.forEach((child: any) => {
      if (child.name === "w") {
        imageProperties.width = parseInt(child.value, 10);
      } else if (child.name === "h") {
        imageProperties.height = parseInt(child.value, 10);
      } else if (child.name === "cf") {
        imageProperties.format = parseInt(child.value, 10);
      }
    });

    // Validate that we have the required data
    if (!imageProperties.dataAddress || !imageProperties.dataSize) {
      this.panel.webview.postMessage({
        command: "showError",
        error: `Could not extract data address or size from variable ${variableName}`,
      });
      return null;
    }

    // Read memory data
    const readResponse = await session.customRequest("readMemory", {
      memoryReference: imageProperties.dataAddress,
      count: imageProperties.dataSize,
    });

    if (readResponse && readResponse.data) {
      const binaryData = Buffer.from(readResponse.data, "base64");
      imageProperties.data = new Uint8Array(binaryData);

      // Update the panel title and send the data
      this.panel.title = `Image Viewer: ${variableName}`;
      this.sendImageWithDimensionsData(imageProperties);
      return imageProperties;
    } else {
      this.panel.webview.postMessage({
        command: "showError",
        error: `Could not read memory data for variable ${variableName}`,
      });
      return null;
    }
  }

  private async handleExtractLVGLImagePropertiesFromString(
    variableName: string
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

      // Get current thread and frame
      const threads = await session.customRequest("threads");
      const threadId = threads.threads[0].id;

      const stack = await session.customRequest("stackTrace", {
        threadId,
        startFrame: 0,
        levels: 1,
      });
      const frameId = stack.stackFrames[0].id;

      // Evaluate the variable to get its properties
      const evaluateResponse = await session.customRequest("evaluate", {
        expression: variableName,
        frameId,
      });

      if (!evaluateResponse || !evaluateResponse.result) {
        this.panel.webview.postMessage({
          command: "showError",
          error: `Could not evaluate variable ${variableName}`,
        });
        return;
      }

      // Check if the variable is of type lv_image_dsc_t
      if (
        !evaluateResponse.type ||
        evaluateResponse.type.indexOf("lv_image_dsc_t") === -1
      ) {
        this.panel.webview.postMessage({
          command: "showError",
          error: `Variable ${variableName} is not of type lv_image_dsc_t`,
        });
        return;
      }

      // Get the variable's children to access its structure
      const variablesResponse = await session.customRequest("variables", {
        variablesReference: evaluateResponse.variablesReference,
      });

      if (!variablesResponse || !variablesResponse.variables) {
        this.panel.webview.postMessage({
          command: "showError",
          error: `No children found for variable ${variableName}`,
        });
        return;
      }

      // Find the header child
      const headerObj = variablesResponse.variables.find(
        (child: any) => child.name === "header"
      );

      if (!headerObj) {
        this.panel.webview.postMessage({
          command: "showError",
          error: `No header found in variable ${variableName}`,
        });
        return;
      }

      // Get header children
      const lvHeaderChildren = await session.customRequest("variables", {
        variablesReference: headerObj.variablesReference,
      });

      if (!lvHeaderChildren || !lvHeaderChildren.variables) {
        this.panel.webview.postMessage({
          command: "showError",
          error: `No children found for header of variable ${variableName}`,
        });
        return;
      }

      // Process the LVGL image properties using shared function
      await this.processLVGLImageProperties(
        variableName,
        variablesResponse,
        lvHeaderChildren,
        session
      );
    } catch (error) {
      this.panel.webview.postMessage({
        command: "showError",
        error: `Error extracting LVGL image properties from string: ${error}`,
      });
    }
  }

  private async handleExtractLVGLImageProperties(variableName: {
    evaluateName: string;
    memoryReference: string;
    name: string;
    value: string;
    variablesReference: number;
    type: string;
  }) {
    try {
      const session = vscode.debug.activeDebugSession;
      if (!session) {
        this.panel.webview.postMessage({
          command: "showError",
          error: "No active debug session found",
        });
        return;
      }

      if (variableName.type.indexOf("lv_image_dsc_t") === -1) {
        this.panel.webview.postMessage({
          command: "showError",
          error: `Variable ${variableName.name} is not of type lv_image_dsc_t`,
        });
        return;
      }

      const lvImageDscChildren = await session.customRequest("variables", {
        variablesReference: variableName.variablesReference,
      });

      if (!lvImageDscChildren || lvImageDscChildren.length === 0) {
        this.panel.webview.postMessage({
          command: "showError",
          error: `No children found for variable ${variableName.name}`,
        });
        return;
      }

      // Try to find the 'header' child to determine if it's new or legacy format
      const headerObj = lvImageDscChildren.variables.find(
        (child: any) => child.name === "header"
      );

      const lvHeaderChildren = await session.customRequest("variables", {
        variablesReference: headerObj.variablesReference,
      });

      if (!lvHeaderChildren || lvHeaderChildren.length === 0) {
        this.panel.webview.postMessage({
          command: "showError",
          error: `No children found for variable ${headerObj.name}`,
        });
        return;
      }

      // Process the LVGL image properties using shared function
      await this.processLVGLImageProperties(
        variableName.name,
        lvImageDscChildren,
        lvHeaderChildren,
        session
      );
    } catch (error) {
      this.panel.webview.postMessage({
        command: "showError",
        error: `Error extracting LVGL image properties: ${error}`,
      });
    }
  }

  private async handleExtractOpenCVImageProperties(variableName: {
    evaluateName: string;
    memoryReference: string;
    name: string;
    value: string;
    variablesReference: number;
    type: string;
  }) {
    try {
      const session = vscode.debug.activeDebugSession;
      if (!session) {
        this.panel.webview.postMessage({
          command: "showError",
          error: "No active debug session found",
        });
        return;
      }

      // Check if the variable is of type cv::Mat
      if (variableName.type.indexOf("cv::Mat") === -1 && variableName.type.indexOf("Mat") === -1) {
        this.panel.webview.postMessage({
          command: "showError",
          error: `Variable ${variableName.name} is not of type cv::Mat`,
        });
        return;
      }

      // Get the Mat object's children
      const matChildren = await session.customRequest("variables", {
        variablesReference: variableName.variablesReference,
      });

      if (!matChildren || !matChildren.variables) {
        this.panel.webview.postMessage({
          command: "showError",
          error: `No children found for variable ${variableName.name}`,
        });
        return;
      }

      // Extract OpenCV Mat properties
      const imageProperties: ImageWithDimensionsElement = {
        name: variableName.name,
        data: new Uint8Array(),
        width: 0,
        height: 0,
        format: 0,
      };

      // Extract rows, cols, and data from the Mat structure
      matChildren.variables.forEach((child: any) => {
        if (child.name === "rows") {
          imageProperties.height = parseInt(child.value, 10);
        } else if (child.name === "cols") {
          imageProperties.width = parseInt(child.value, 10);
        } else if (child.name === "data") {
          const match = child.value.match(/0x[0-9a-fA-F]+/);
          if (match) {
            imageProperties.dataAddress = match[0];
          }
        } else if (child.name === "step") {
          // step[0] contains bytes per row
          // We'll need to get the step array children
        }
      });

      // Get step array to determine bytes per row
      const stepObj = matChildren.variables.find(
        (child: any) => child.name === "step"
      );

      let bytesPerRow = 0;
      if (stepObj) {
        const stepChildren = await session.customRequest("variables", {
          variablesReference: stepObj.variablesReference,
        });

        if (stepChildren && stepChildren.variables) {
          // step[0] is bytes per row
          const step0 = stepChildren.variables.find((child: any) => child.name === "[0]");
          if (step0) {
            bytesPerRow = parseInt(step0.value, 10);
          }
        }
      }

      // Calculate data size: rows * bytes_per_row
      if (imageProperties.height > 0 && bytesPerRow > 0) {
        imageProperties.dataSize = imageProperties.height * bytesPerRow;
      } else {
        // Fallback: estimate based on common OpenCV formats
        // Assume 3 channels (BGR) if we can't determine
        imageProperties.dataSize = imageProperties.width * imageProperties.height * 3;
      }

      // Validate that we have the required data
      if (!imageProperties.dataAddress || !imageProperties.dataSize || 
          imageProperties.width <= 0 || imageProperties.height <= 0) {
        this.panel.webview.postMessage({
          command: "showError",
          error: `Could not extract complete OpenCV Mat properties from variable ${variableName.name}. Width: ${imageProperties.width}, Height: ${imageProperties.height}, DataSize: ${imageProperties.dataSize}`,
        });
        return;
      }

      // Read memory data
      const readResponse = await session.customRequest("readMemory", {
        memoryReference: imageProperties.dataAddress,
        count: imageProperties.dataSize,
      });

      if (readResponse && readResponse.data) {
        const binaryData = Buffer.from(readResponse.data, "base64");
        imageProperties.data = new Uint8Array(binaryData);

        // OpenCV Mat typically uses BGR888 format (3 bytes per pixel)
        // Map this to our bgr888 format
        imageProperties.format = 0x0E; // Map to BGR888 equivalent

        // Update the panel title and send the data
        this.panel.title = `Image Viewer: ${variableName.name} (OpenCV Mat)`;
        this.sendImageWithDimensionsData(imageProperties);
      } else {
        this.panel.webview.postMessage({
          command: "showError",
          error: `Could not read memory data for variable ${variableName.name}`,
        });
      }
    } catch (error) {
      this.panel.webview.postMessage({
        command: "showError",
        error: `Error extracting OpenCV Mat image properties: ${error}`,
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
