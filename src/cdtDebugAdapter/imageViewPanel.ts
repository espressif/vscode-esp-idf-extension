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

// Simplified JSON Configuration interfaces
export interface ImageFormatConfig {
  name: string;
  typePattern: string; // Regex pattern to match variable type
  width: FieldConfig;
  height: FieldConfig;
  format: FieldConfig;
  dataAddress: FieldConfig;
  dataSize: DataSizeConfig;
  imageFormats?: { [key: number]: string }; // Format number to dropdown string mapping
}

export interface FieldConfig {
  type: "number" | "string";
  isChild: boolean;
  value: string; // Field name or direct value
}

export interface DataSizeConfig {
  type: "number" | "string" | "formula";
  isChild: boolean;
  value: string; // Field name, direct value, or formula
}

export class ImageViewPanel {
  private static instance: ImageViewPanel;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionPath: string;
  private disposables: vscode.Disposable[] = [];
  private imageFormatConfigs: ImageFormatConfig[] = [];

  // Default configurations for built-in formats
  private static readonly DEFAULT_CONFIGS: ImageFormatConfig[] = [
    {
      name: "LVGL Image Descriptor",
      typePattern: "lv_image_dsc_t",
      width: {
        type: "string",
        isChild: true,
        value: "header.w",
      },
      height: {
        type: "string",
        isChild: true,
        value: "header.h",
      },
      format: {
        type: "string",
        isChild: true,
        value: "header.cf",
      },
      dataAddress: {
        type: "string",
        isChild: true,
        value: "data",
      },
      dataSize: {
        type: "string",
        isChild: true,
        value: "data_size",
      },
      imageFormats: {
        // IMPORTANT: All format values must match the frontend dropdown options
        // LVGL Color Format constants (lv_color_format_t) -> dropdown values
        0x00: "grayscale", // LV_COLOR_FORMAT_UNKNOWN -> fallback to grayscale
        0x01: "grayscale", // LV_COLOR_FORMAT_RAW -> not supported, fallback
        0x02: "grayscale", // LV_COLOR_FORMAT_RAW_ALPHA -> not supported, fallback
        0x03: "grayscale", // LV_COLOR_FORMAT_L8 -> not supported, fallback
        0x04: "grayscale", // LV_COLOR_FORMAT_I1 -> not supported, fallback
        0x05: "grayscale", // LV_COLOR_FORMAT_I2 -> not supported, fallback
        0x06: "grayscale", // LV_COLOR_FORMAT_I4 -> not supported, fallback
        0x07: "grayscale", // LV_COLOR_FORMAT_I8 -> not supported, fallback
        0x08: "grayscale", // LV_COLOR_FORMAT_A8 -> not supported, fallback
        0x09: "rgb565", // LV_COLOR_FORMAT_RGB565
        0x0a: "rgb565", // LV_COLOR_FORMAT_ARGB8565 -> closest match
        0x0b: "rgb565", // LV_COLOR_FORMAT_RGB565A8 -> closest match
        0x0c: "grayscale", // LV_COLOR_FORMAT_AL88 -> not supported, fallback
        0x0d: "rgb565", // LV_COLOR_FORMAT_RGB565_SWAPPED -> closest match
        0x0e: "rgb888", // LV_COLOR_FORMAT_RGB888
        0x0f: "argb8888", // LV_COLOR_FORMAT_ARGB8888
        0x10: "bgra8888", // LV_COLOR_FORMAT_XRGB8888 -> mapped to bgra8888
        0x11: "argb8888", // LV_COLOR_FORMAT_ARGB8888_PREMULTIPLIED -> closest match
        0x12: "grayscale", // LV_COLOR_FORMAT_A1 -> not supported, fallback
        0x13: "grayscale", // LV_COLOR_FORMAT_A2 -> not supported, fallback
        0x14: "grayscale", // LV_COLOR_FORMAT_A4 -> not supported, fallback
        0x15: "rgb555", // LV_COLOR_FORMAT_ARGB1555 -> closest match
        0x16: "rgb444", // LV_COLOR_FORMAT_ARGB4444 -> closest match
        0x17: "rgb332", // LV_COLOR_FORMAT_ARGB2222 -> closest match
        0x18: "yuv420", // LV_COLOR_FORMAT_YUV_START -> fallback to yuv420
        0x19: "yuv420", // LV_COLOR_FORMAT_I420
        0x1a: "yuv422", // LV_COLOR_FORMAT_I422
        0x1b: "yuv444", // LV_COLOR_FORMAT_I444
        0x1c: "grayscale", // LV_COLOR_FORMAT_I400 -> not supported, fallback
        0x1d: "yuv420", // LV_COLOR_FORMAT_NV21 -> closest match
        0x1e: "yuv420", // LV_COLOR_FORMAT_NV12 -> closest match
        0x1f: "yuv422", // LV_COLOR_FORMAT_YUY2 -> closest match
        0x20: "yuv422", // LV_COLOR_FORMAT_UYVY -> closest match
        0x21: "yuv420", // LV_COLOR_FORMAT_YUV_END -> fallback to yuv420
        0x22: "rgb888", // LV_COLOR_FORMAT_PROPRIETARY_START -> fallback
        0x23: "rgb888", // LV_COLOR_FORMAT_NEMA_TSC_START -> fallback
        0x24: "rgb444", // LV_COLOR_FORMAT_NEMA_TSC4 -> closest match
        0x25: "rgb666", // LV_COLOR_FORMAT_NEMA_TSC6 -> closest match
        0x26: "rgb666", // LV_COLOR_FORMAT_NEMA_TSC6A -> closest match
        0x27: "rgb666", // LV_COLOR_FORMAT_NEMA_TSC6AP -> closest match
        0x28: "rgb888", // LV_COLOR_FORMAT_NEMA_TSC12 -> closest match
        0x29: "rgb888", // LV_COLOR_FORMAT_NEMA_TSC12A -> closest match
        0x2a: "rgb888", // LV_COLOR_FORMAT_NEMA_TSC_END -> fallback
        0x2b: "rgb888", // LV_COLOR_FORMAT_NATIVE -> fallback to rgb888
        0x2c: "rgba8888", // LV_COLOR_FORMAT_NATIVE_WITH_ALPHA -> fallback to rgba8888
      },
    },
    {
      name: "OpenCV Mat",
      typePattern: "cv::Mat|Mat",
      width: {
        type: "string",
        isChild: true,
        value: "cols",
      },
      height: {
        type: "string",
        isChild: true,
        value: "rows",
      },
      format: {
        type: "number",
        isChild: false,
        value: "0x0E", // BGR888 equivalent
      },
      dataAddress: {
        type: "string",
        isChild: true,
        value: "data",
      },
      dataSize: {
        type: "formula",
        isChild: false,
        value: "$var.rows * $var.step.buf[0]",
      },
      imageFormats: {
        // IMPORTANT: All format values must match the frontend dropdown options
        // OpenCV Mat format mapping
        0x00: "grayscale", // OpenCV Grayscale (1 channel)
        0x0e: "bgr888", // OpenCV BGR888 (3 channels)
        0x0f: "bgra8888", // OpenCV BGRA8888 (4 channels)
        0x10: "bgra8888", // OpenCV XRGB8888 (4 channels)
      },
    },
    {
      name: "libpng image",
      typePattern: "png_image",
      width: {
        type: "string",
        isChild: true,
        value: "width",
      },
      height: {
        type: "string",
        isChild: true,
        value: "height",
      },
      format: {
        type: "string",
        isChild: true,
        value: "format",
      },
      dataAddress: {
        type: "string",
        isChild: false,
        value: "image_data",
      },
      dataSize: {
        type: "string",
        isChild: false,
        value: "buf_size",
      },
      imageFormats: {
        // IMPORTANT: All format values must match the frontend dropdown options
        // libpng PNG_COLOR_TYPE constants -> dropdown values
        0x00: "grayscale", // PNG_COLOR_TYPE_GRAY (8-bit grayscale)
        0x02: "rgb888", // PNG_COLOR_TYPE_RGB (24-bit RGB)
        0x03: "rgb888", // PNG_COLOR_TYPE_PALETTE -> fallback to rgb888 (palette not directly supported)
        0x04: "rgba8888", // PNG_COLOR_TYPE_GRAY_ALPHA (8-bit grayscale + alpha)
        0x06: "rgba8888", // PNG_COLOR_TYPE_RGB_ALPHA (32-bit RGBA)
        
        // Extended bit depth combinations (format = color_type | (bit_depth << 8))
        // 8-bit formats
        0x0200: "rgb888", // PNG_COLOR_TYPE_RGB, 8-bit
        0x0300: "rgb888", // PNG_COLOR_TYPE_PALETTE, 8-bit -> fallback
        0x0400: "rgba8888", // PNG_COLOR_TYPE_GRAY_ALPHA, 8-bit
        0x0600: "rgba8888", // PNG_COLOR_TYPE_RGB_ALPHA, 8-bit
        
        // 16-bit formats (mapped to closest 8-bit equivalents)
        0x1000: "grayscale", // PNG_COLOR_TYPE_GRAY, 16-bit -> grayscale
        0x1200: "rgb888", // PNG_COLOR_TYPE_RGB, 16-bit -> rgb888
        0x1300: "rgb888", // PNG_COLOR_TYPE_PALETTE, 16-bit -> fallback
        0x1400: "rgba8888", // PNG_COLOR_TYPE_GRAY_ALPHA, 16-bit -> rgba8888
        0x1600: "rgba8888", // PNG_COLOR_TYPE_RGB_ALPHA, 16-bit -> rgba8888
        
        // Other bit depths (1, 2, 4-bit) - mapped to grayscale
        0x0100: "grayscale", // PNG_COLOR_TYPE_GRAY, 1-bit
        0x0201: "grayscale", // PNG_COLOR_TYPE_GRAY, 2-bit  
        0x0401: "grayscale", // PNG_COLOR_TYPE_GRAY, 4-bit
      },
    },
  ];

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

  public static handleVariableAsImage(debugContext: {
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
      // Use the new configuration-based extraction with automatic type detection
      ImageViewPanel.instance.handleExtractImageWithConfig(
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
          default:
            break;
        }
      },
      null,
      this.disposables
    );

    // Initialize with default configurations
    this.initializeImageFormatConfigs();
  }

  private initializeImageFormatConfigs() {
    this.imageFormatConfigs = [...ImageViewPanel.DEFAULT_CONFIGS];
  }

  private findMatchingConfig(variableType: string): ImageFormatConfig | null {
    return (
      this.imageFormatConfigs.find((config) => {
        const regex = new RegExp(config.typePattern, "i");
        return regex.test(variableType);
      }) || null
    );
  }

  private async extractFieldValue(
    session: vscode.DebugSession,
    variablesReference: number,
    fieldConfig: FieldConfig,
    frameId: number,
    extractAsAddress: boolean = false
  ): Promise<number | string> {
    if (fieldConfig.type === "number") {
      // Direct number value - handle both decimal and hex
      const value = fieldConfig.value;
      if (value.startsWith("0x") || value.startsWith("0X")) {
        // Hex number
        return parseInt(value, 16);
      } else {
        // Decimal number
        return parseInt(value, 10);
      }
    }

    if (fieldConfig.type === "string") {
      if (fieldConfig.isChild) {
        // Navigate through child variables
        return await this.extractChildValue(
          session,
          variablesReference,
          fieldConfig.value,
          extractAsAddress
        );
      } else {
        // Evaluate as expression
        const evaluateResponse = await session.customRequest("evaluate", {
          expression: fieldConfig.value,
          frameId,
        });
        if (evaluateResponse && evaluateResponse.result) {
          if (extractAsAddress) {
            const match = evaluateResponse.result.match(/0x[0-9a-fA-F]+/);
            if (match) {
              return match[0];
            }
            throw new Error(
              `Could not extract address from: ${evaluateResponse.result}`
            );
          } else {
            return parseInt(evaluateResponse.result, 10);
          }
        }
        throw new Error(`Could not evaluate expression: ${fieldConfig.value}`);
      }
    }

    throw new Error(`Unsupported field type: ${fieldConfig.type}`);
  }

  private async extractChildValue(
    session: vscode.DebugSession,
    variablesReference: number,
    fieldPath: string,
    extractAsAddress: boolean = false
  ): Promise<number | string> {
    const pathParts = fieldPath.split(".");
    let currentRef = variablesReference;

    // Navigate through the path
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];

      const response = await session.customRequest("variables", {
        variablesReference: currentRef,
      });

      const variables = response.variables || [];
      const variable = variables.find((v: any) => v.name === part);

      if (!variable) {
        throw new Error(`Property '${part}' not found in path '${fieldPath}'`);
      }

      if (i === pathParts.length - 1) {
        // Last part - extract the value
        if (extractAsAddress) {
          const match = variable.value.match(/0x[0-9a-fA-F]+/);
          if (match) {
            return match[0];
          }
          throw new Error(`Could not extract address from: ${variable.value}`);
        } else {
          return parseInt(variable.value, 10);
        }
      } else {
        // Navigate deeper
        currentRef = variable.variablesReference;
      }
    }

    throw new Error(`Could not extract value from path: ${fieldPath}`);
  }

  private async extractDataSize(
    session: vscode.DebugSession,
    variablesReference: number,
    dataSizeConfig: DataSizeConfig,
    frameId: number,
    variableName: string
  ): Promise<number> {
    // Handle formula type specially
    if (dataSizeConfig.type === "formula") {
      // For formulas, we need to evaluate them in the context of the variable
      let formula = dataSizeConfig.value;

      // Replace $var with the actual variable name
      // Example: "$var.rows * $var.step.buf[0]" -> "opencv_image.rows * opencv_image.step.buf[0]"
      formula = formula.replace(/\$var/g, `${variableName}`);

      // Evaluate the final formula with GDB
      const evaluateResponse = await session.customRequest("evaluate", {
        expression: formula,
        frameId,
      });
      if (evaluateResponse && evaluateResponse.result) {
        return parseInt(evaluateResponse.result, 10);
      }
      throw new Error(`Could not evaluate formula: ${formula}`);
    }

    // For number and string types, use the unified extractFieldValue method
    // Convert DataSizeConfig to FieldConfig for compatibility
    const fieldConfig: FieldConfig = {
      type: dataSizeConfig.type as "number" | "string",
      isChild: dataSizeConfig.isChild,
      value: dataSizeConfig.value,
    };

    return (await this.extractFieldValue(
      session,
      variablesReference,
      fieldConfig,
      frameId
    )) as number;
  }

  private async handleExtractImageWithConfig(variable: {
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

      // Find matching configuration
      let config: ImageFormatConfig = this.findMatchingConfig(
        variable.type || ""
      );

      if (!config) {
        this.panel.webview.postMessage({
          command: "showError",
          error: `No matching configuration found for variable type: ${variable.type}`,
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

      // Extract image properties using the configuration
      const imageProperties = await this.extractImagePropertiesWithConfig(
        session,
        variable.name,
        variable.variablesReference,
        config,
        frameId
      );

      if (imageProperties) {
        // Update the panel title and send the data
        this.panel.title = `Image Viewer: ${variable.name} (${config.name})`;
        this.sendImageWithDimensionsData(imageProperties, config.name, config.imageFormats);
      }
    } catch (error) {
      this.panel.webview.postMessage({
        command: "showError",
        error: `Error extracting image with configuration: ${error}`,
      });
    }
  }

  private async extractImagePropertiesWithConfig(
    session: vscode.DebugSession,
    variableName: string,
    variablesReference: number,
    config: ImageFormatConfig,
    frameId: number
  ): Promise<ImageWithDimensionsElement | null> {
    const imageProperties: ImageWithDimensionsElement = {
      name: variableName,
      data: new Uint8Array(),
      width: 0,
      height: 0,
      format: 0,
    };

    try {
      // Extract basic properties first
      imageProperties.width = (await this.extractFieldValue(
        session,
        variablesReference,
        config.width,
        frameId
      )) as number;

      imageProperties.height = (await this.extractFieldValue(
        session,
        variablesReference,
        config.height,
        frameId
      )) as number;

      const rawFormat = (await this.extractFieldValue(
        session,
        variablesReference,
        config.format,
        frameId
      )) as number;

      // Convert numeric format to string using imageFormats mapping if available
      if (config.imageFormats && typeof rawFormat === 'number') {
        imageProperties.format = rawFormat; // Keep raw format for display
        // The frontend will use the imageFormats mapping to convert to display format
      } else {
        imageProperties.format = rawFormat;
      }

      imageProperties.dataAddress = (await this.extractFieldValue(
        session,
        variablesReference,
        config.dataAddress,
        frameId,
        true // extractAsAddress = true
      )) as string;

      // Extract data size (may use formula)
      imageProperties.dataSize = await this.extractDataSize(
        session,
        variablesReference,
        config.dataSize,
        frameId,
        variableName
      );

      // Validate required properties
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
        return imageProperties;
      } else {
        this.panel.webview.postMessage({
          command: "showError",
          error: `Could not read memory data for variable ${variableName}`,
        });
        return null;
      }
    } catch (error) {
      this.panel.webview.postMessage({
        command: "showError",
        error: `Error extracting image properties: ${error}`,
      });
      return null;
    }
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
    imageElement: ImageWithDimensionsElement,
    configName?: string,
    imageFormats?: { [key: number]: string }
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
      configName: configName, // Pass the configuration name
      imageFormats: imageFormats, // Pass the format mapping
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
