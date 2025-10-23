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
import * as fs from "fs";
import { readParameter } from "../idfConfiguration";
import { Logger } from "../logger/logger";
import { ESP } from "../config";
import { workspace } from "vscode";

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

  // Valid format strings that match the frontend dropdown
  private static readonly VALID_FORMATS = [
    "rgb565",
    "rgb888",
    "rgba8888",
    "argb8888",
    "xrgb8888",
    "bgr888",
    "bgra8888",
    "abgr8888",
    "xbgr8888",
    "rgb332",
    "rgb444",
    "rgb555",
    "rgb666",
    "rgb777",
    "rgb101010",
    "rgb121212",
    "rgb161616",
    "grayscale",
    "yuv420",
    "yuv422",
    "yuv444",
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

  public static async loadImageFromFile(
    extensionPath: string,
    filePath: string
  ) {
    try {
      // Show the ImageViewPanel
      ImageViewPanel.show(extensionPath);

      if (ImageViewPanel.instance) {
        await ImageViewPanel.instance.parseLvglImageFromFile(filePath);
      }
    } catch (error) {
      Logger.error(
        "Failed to load image from file:",
        error,
        "ImageViewPanel loadImageFromFile"
      );
      if (ImageViewPanel.instance) {
        ImageViewPanel.instance.panel.webview.postMessage({
          command: "showError",
          error: `Failed to load image from LVGL cfile: ${error}`,
        });
      }
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
    this.imageFormatConfigs = this.loadImageFormatConfigs();
  }

  private loadImageFormatConfigs(): ImageFormatConfig[] {
    // Load default configurations from JSON file
    const defaultConfigs = this.loadDefaultConfigs();

    // Load user configurations if specified
    const userConfigs = this.loadUserConfigs();

    // Merge configurations: user configs override default configs based on typePattern
    return this.mergeConfigurations(defaultConfigs, userConfigs);
  }

  private loadDefaultConfigs(): ImageFormatConfig[] {
    try {
      const defaultConfigPath = path.join(
        this.extensionPath,
        "DEFAULT_CONFIGS.json"
      );
      const configData = fs.readFileSync(defaultConfigPath, "utf8");
      const configs = JSON.parse(configData) as ImageFormatConfig[];

      // Convert string keys in imageFormats to numbers (JSON doesn't support numeric keys)
      return configs.map((config) => ({
        ...config,
        imageFormats: config.imageFormats
          ? this.convertImageFormatsKeys(config.imageFormats)
          : undefined,
      }));
    } catch (error) {
      Logger.error(
        "Failed to load default image format configurations:",
        error,
        "ImageViewPanel loadDefaultConfigs"
      );
      return [];
    }
  }

  private loadUserConfigs(): ImageFormatConfig[] {
    try {
      const userConfigPath = readParameter("idf.imageViewerConfigs");
      if (!userConfigPath) {
        return [];
      }

      // Resolve relative paths relative to workspace folder
      let workspaceFolderUri = ESP.GlobalConfiguration.store.get<vscode.Uri>(
        ESP.GlobalConfiguration.SELECTED_WORKSPACE_FOLDER
      );
      if (!workspaceFolderUri) {
        workspaceFolderUri = vscode.workspace.workspaceFolders
          ? workspace.workspaceFolders[0].uri
          : undefined;
      }
      const resolvedPath = workspaceFolderUri
        ? path.resolve(workspaceFolderUri.fsPath, userConfigPath)
        : userConfigPath;

      if (!fs.existsSync(resolvedPath)) {
        Logger.warn(
          `User image format configuration file not found: ${resolvedPath}`
        );
        return [];
      }

      const configData = fs.readFileSync(resolvedPath, "utf8");
      const configs = JSON.parse(configData) as ImageFormatConfig[];

      // Convert string keys in imageFormats to numbers
      return configs.map((config) => ({
        ...config,
        imageFormats: config.imageFormats
          ? this.convertImageFormatsKeys(config.imageFormats)
          : undefined,
      }));
    } catch (error) {
      Logger.error(
        "Failed to load user image format configurations:",
        error,
        "ImageViewPanel loadUserConfigs"
      );
      return [];
    }
  }

  private convertImageFormatsKeys(imageFormats: {
    [key: string]: string;
  }): { [key: number]: string } {
    const converted: { [key: number]: string } = {};
    for (const [key, value] of Object.entries(imageFormats)) {
      const numericKey = parseInt(key, 10);
      if (!isNaN(numericKey)) {
        converted[numericKey] = value;
      }
    }
    return converted;
  }

  private mergeConfigurations(
    defaultConfigs: ImageFormatConfig[],
    userConfigs: ImageFormatConfig[]
  ): ImageFormatConfig[] {
    const merged = [...defaultConfigs];

    for (const userConfig of userConfigs) {
      const existingIndex = merged.findIndex(
        (config) => config.typePattern === userConfig.typePattern
      );
      if (existingIndex >= 0) {
        // Override existing configuration
        merged[existingIndex] = userConfig;
      } else {
        // Add new configuration
        merged.push(userConfig);
      }
    }

    return merged;
  }

  private static isValidFormat(format: string): boolean {
    return ImageViewPanel.VALID_FORMATS.includes(format);
  }

  private static validateAndGetFormat(
    rawFormat: number | string,
    imageFormats?: { [key: number]: string },
    configName?: string
  ): string {
    // Handle numeric formats using imageFormats mapping
    if (typeof rawFormat === "number" && imageFormats) {
      const mappedFormat = imageFormats[rawFormat];
      if (mappedFormat && ImageViewPanel.isValidFormat(mappedFormat)) {
        return mappedFormat;
      } else {
        throw new Error(
          `Invalid format '${mappedFormat}' from backend mapping for format value ${rawFormat}. ` +
            `Please check the imageFormats configuration for ${
              configName || "unknown config"
            }.`
        );
      }
    }

    // Handle string formats
    if (typeof rawFormat === "string") {
      // Direct validation for string formats
      if (ImageViewPanel.isValidFormat(rawFormat)) {
        return rawFormat;
      }

      // Try partial matching for common variations
      const formatLower = rawFormat.toLowerCase();
      if (formatLower.includes("rgb565") || formatLower.includes("565"))
        return "rgb565";
      if (formatLower.includes("rgb888") || formatLower.includes("888"))
        return "rgb888";
      if (formatLower.includes("rgba8888") || formatLower.includes("rgba"))
        return "rgba8888";
      if (formatLower.includes("argb8888") || formatLower.includes("argb"))
        return "argb8888";
      if (formatLower.includes("xrgb8888") || formatLower.includes("xrgb"))
        return "xrgb8888";
      if (formatLower.includes("bgr888") || formatLower.includes("bgr"))
        return "bgr888";
      if (formatLower.includes("bgra8888") || formatLower.includes("bgra"))
        return "bgra8888";
      if (formatLower.includes("abgr8888") || formatLower.includes("abgr"))
        return "abgr8888";
      if (formatLower.includes("xbgr8888") || formatLower.includes("xbgr"))
        return "xbgr8888";
      if (formatLower.includes("rgb332") || formatLower.includes("332"))
        return "rgb332";
      if (formatLower.includes("rgb444") || formatLower.includes("444"))
        return "rgb444";
      if (formatLower.includes("rgb555") || formatLower.includes("555"))
        return "rgb555";
      if (formatLower.includes("rgb666") || formatLower.includes("666"))
        return "rgb666";
      if (formatLower.includes("rgb777") || formatLower.includes("777"))
        return "rgb777";
      if (formatLower.includes("rgb101010") || formatLower.includes("101010"))
        return "rgb101010";
      if (formatLower.includes("rgb121212") || formatLower.includes("121212"))
        return "rgb121212";
      if (formatLower.includes("rgb161616") || formatLower.includes("161616"))
        return "rgb161616";
      if (
        formatLower.includes("grayscale") ||
        formatLower.includes("gray") ||
        formatLower.includes("mono")
      )
        return "grayscale";
      if (formatLower.includes("yuv420") || formatLower.includes("420"))
        return "yuv420";
      if (formatLower.includes("yuv422") || formatLower.includes("422"))
        return "yuv422";
      if (formatLower.includes("yuv444") || formatLower.includes("444"))
        return "yuv444";

      // If no match found, throw error
      throw new Error(
        `Invalid format string '${rawFormat}'. Valid formats are: ${ImageViewPanel.VALID_FORMATS.join(
          ", "
        )}`
      );
    }

    // Fallback for unknown format types
    return "rgb888";
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
        this.sendImageWithDimensionsData(imageProperties, config.name);
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

      const rawFormat = await this.extractFieldValue(
        session,
        variablesReference,
        config.format,
        frameId
      );

      // Validate and convert format to final string
      const validatedFormat = ImageViewPanel.validateAndGetFormat(
        rawFormat,
        config.imageFormats,
        config.name
      );

      // Store both raw format (for display) and validated format (for processing)
      imageProperties.format = rawFormat as number; // Keep raw format for display
      (imageProperties as any).validatedFormat = validatedFormat; // Add validated format

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
    configName?: string
  ) {
    const base64Data = Buffer.from(imageElement.data).toString("base64");
    this.panel.webview.postMessage({
      command: "updateImageWithProperties",
      data: base64Data,
      dataAddress: imageElement.dataAddress,
      dataSize: imageElement.dataSize,
      name: imageElement.name,
      width: imageElement.width,
      height: imageElement.height,
      format: imageElement.format,
      configName: configName, // Pass the configuration name
      validatedFormat: (imageElement as any).validatedFormat, // Pass the validated format string
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

  private async parseLvglImageFromFile(filePath: string) {
    try {
      const fileContent = fs.readFileSync(filePath, "utf8");
      if (!fileContent.includes("lv_image_dsc_t")) {
        this.panel.webview.postMessage({
          command: "showError",
          error: `File does not contain LVGL image data (lv_image_dsc_t). Only LVGL C files are supported.`,
        });
        return;
      }
      const config = this.imageFormatConfigs.find(
        (c) => c.typePattern === "lv_image_dsc_t"
      );
      if (!config) {
        this.panel.webview.postMessage({
          command: "showError",
          error: `LVGL configuration not found.`,
        });
        return;
      }

      const imageData = this.parseImageDataFromCFile(fileContent, config);

      if (imageData) {
        this.panel.title = `Image Viewer: ${path.basename(filePath)} (LVGL)`;
        this.sendImageWithDimensionsData(imageData, config.name);
      }
    } catch (error) {
      this.panel.webview.postMessage({
        command: "showError",
        error: `Error parsing LVGL image from file: ${error}`,
      });
    }
  }

  private parseImageDataFromCFile(
    fileContent: string,
    config: ImageFormatConfig
  ): ImageWithDimensionsElement | null {
    try {
      const imageData: ImageWithDimensionsElement = {
        name: "parsed_image",
        data: new Uint8Array(),
        width: 0,
        height: 0,
        format: 0,
      };

      imageData.width = this.extractValueFromCFile(fileContent, config.width);
      imageData.height = this.extractValueFromCFile(fileContent, config.height);
      imageData.format = this.extractValueFromCFile(fileContent, config.format);

      imageData.dataSize = this.extractValueFromCFile(
        fileContent,
        config.dataSize
      );
      const dataAddress = this.extractDataAddressFromCFile(fileContent, config);
      if (!dataAddress) {
        throw new Error("Could not extract data address from C file");
      }

      const dataArray = this.extractDataArrayFromCFile(
        fileContent,
        dataAddress
      );
      if (dataArray) {
        imageData.data = new Uint8Array(dataArray);
      } else {
        throw new Error("Could not extract image data array from C file");
      }

      const validatedFormat = ImageViewPanel.validateAndGetFormat(
        imageData.format,
        config.imageFormats,
        config.name
      );

      (imageData as any).validatedFormat = validatedFormat;

      return imageData;
    } catch (error) {
      Logger.error(
        "Error parsing image data from C file:",
        error,
        "ImageViewPanel parseImageDataFromCFile"
      );
      return null;
    }
  }

  private extractValueFromCFile(
    fileContent: string,
    fieldConfig: FieldConfig | DataSizeConfig
  ): number {
    if (fieldConfig.type === "number") {
      const value = fieldConfig.value;
      if (value.startsWith("0x") || value.startsWith("0X")) {
        return parseInt(value, 16);
      } else {
        return parseInt(value, 10);
      }
    }

    if (fieldConfig.type === "string") {
      if (fieldConfig.isChild) {
        const pathParts = fieldConfig.value.split(".");
        const structMatch = this.findLvImageStruct(fileContent);
        if (!structMatch) {
          throw new Error(
            `Could not find lv_image_dsc_t struct definition for field: ${fieldConfig.value}`
          );
        }

        let currentContent = structMatch[0];

        for (const part of pathParts) {
          const fieldRegex = new RegExp(`\\.${part}\\s*=\\s*([^,}]+)`, "i");
          const match = currentContent.match(fieldRegex);
          if (match) {
            const valueStr = match[1].trim();
            if (valueStr.startsWith("0x") || valueStr.startsWith("0X")) {
              return parseInt(valueStr, 16);
            } else if (valueStr.startsWith("LV_COLOR_FORMAT_")) {
              return this.parseLvColorFormat(valueStr);
            } else if (valueStr.startsWith("sizeof(")) {
              const arrayMatch = valueStr.match(/sizeof\(([^)]+)\)/);
              if (arrayMatch) {
                return this.findArraySize(fileContent, arrayMatch[1]);
              }
            } else {
              // Try to parse as number
              const numValue = parseInt(valueStr, 10);
              if (!isNaN(numValue)) {
                return numValue;
              }
            }
          }
        }

        throw new Error(`Could not find field: ${fieldConfig.value}`);
      } else {
        throw new Error(
          "Direct expression evaluation not supported for file parsing"
        );
      }
    }

    if (fieldConfig.type === "formula") {
      throw new Error(
        "Formula-based data size supported for file parsing"
      );
    }

    throw new Error(`Unsupported field type: ${fieldConfig.type}`);
  }

  private findLvImageStruct(fileContent: string): RegExpMatchArray | null {
    // Look for lv_image_dsc_t struct definition with more specific pattern
    const patterns = [
      // Pattern 1: const lv_image_dsc_t name = { ... };
      /const\s+lv_image_dsc_t\s+\w+\s*=\s*\{([^}]+)\}/s,
      // Pattern 2: lv_image_dsc_t name = { ... };
      /lv_image_dsc_t\s+\w+\s*=\s*\{([^}]+)\}/s,
      // Pattern 3: const struct with lv_image_dsc_t
      /const\s+.*lv_image_dsc_t.*=\s*\{([^}]+)\}/s,
    ];

    for (const pattern of patterns) {
      const match = fileContent.match(pattern);
      if (match) {
        return match;
      }
    }

    return null;
  }

  private parseLvColorFormat(formatStr: string): number {
    const formatMap: { [key: string]: number } = {
      LV_COLOR_FORMAT_NATIVE_WITH_ALPHA: 15, // Same as ARGB8888
      LV_COLOR_FORMAT_NATIVE: 14, // Same as RGB888
      LV_COLOR_FORMAT_RGB565: 9,
      LV_COLOR_FORMAT_RGB888: 14,
      LV_COLOR_FORMAT_ARGB8888: 15,
      LV_COLOR_FORMAT_BGRA8888: 16,
      LV_COLOR_FORMAT_YUV420: 18,
      LV_COLOR_FORMAT_YUV422: 20,
      LV_COLOR_FORMAT_YUV444: 21,
      LV_COLOR_FORMAT_GRAYSCALE: 0,
    };

    const result = formatMap[formatStr] || 0;
    Logger.info(
      `Parsed LVGL color format: ${formatStr} -> ${result}`,
      "ImageViewPanel parseLvColorFormat"
    );
    return result;
  }

  private findArraySize(fileContent: string, arrayName: string): number {
    const arrayPattern = new RegExp(
      `const\\s+.*\\s+${arrayName}\\s*\\[\\]\\s*=\\s*\\{([^}]+)\\}`,
      "s"
    );
    const match = fileContent.match(arrayPattern);

    if (match) {
      const arrayContent = match[1];
      const items = arrayContent.split(",");
      return items.filter((item) => item.trim()).length;
    }

    return 0;
  }

  private extractDataAddressFromCFile(
    fileContent: string,
    config: ImageFormatConfig
  ): string | null {
    try {
      // Find the lv_image_dsc_t struct first
      const structMatch = this.findLvImageStruct(fileContent);
      if (!structMatch) {
        return null;
      }

      const structContent = structMatch[0];

      // Look for the data field assignment
      const dataFieldMatch = structContent.match(/\.data\s*=\s*(\w+)/);
      if (dataFieldMatch) {
        return dataFieldMatch[1];
      }

      return null;
    } catch (error) {
      Logger.error(
        "Error extracting data address from C file:",
        error,
        "ImageViewPanel extractDataAddressFromCFile"
      );
      return null;
    }
  }

  private extractDataArrayFromCFile(
    fileContent: string,
    dataAddress: string
  ): number[] | null {
    try {
      const rawData = this.findArrayByName(fileContent, dataAddress);
      if (!rawData) {
        return null;
      }
      return this.correctEndianness(rawData);
    } catch (error) {
      Logger.error(
        "Error extracting data array from C file:",
        error,
        "ImageViewPanel extractDataArrayFromCFile"
      );
      return null;
    }
  }

  private findArrayByName(
    fileContent: string,
    arrayName: string
  ): number[] | null {
    // Look for the specific array by name with various patterns
    const arrayPatterns = [
      // Pattern 1: const uint8_t arrayName[] = { ... };
      new RegExp(
        `const\\s+uint8_t\\s+${arrayName}\\s*\\[\\]\\s*=\\s*\\{([^}]+)\\}`,
        "s"
      ),
      // Pattern 2: const unsigned char arrayName[] = { ... };
      new RegExp(
        `const\\s+unsigned\\s+char\\s+${arrayName}\\s*\\[\\]\\s*=\\s*\\{([^}]+)\\}`,
        "s"
      ),
      // Pattern 3: const char arrayName[] = { ... };
      new RegExp(
        `const\\s+char\\s+${arrayName}\\s*\\[\\]\\s*=\\s*\\{([^}]+)\\}`,
        "s"
      ),
      // Pattern 4: uint8_t arrayName[] = { ... };
      new RegExp(
        `uint8_t\\s+${arrayName}\\s*\\[\\]\\s*=\\s*\\{([^}]+)\\}`,
        "s"
      ),
      // Pattern 5: unsigned char arrayName[] = { ... };
      new RegExp(
        `unsigned\\s+char\\s+${arrayName}\\s*\\[\\]\\s*=\\s*\\{([^}]+)\\}`,
        "s"
      ),
    ];

    for (const pattern of arrayPatterns) {
      const match = fileContent.match(pattern);
      if (match) {
        const arrayContent = match[1];
        return this.parseArrayContent(arrayContent);
      }
    }

    return null;
  }

  private parseArrayContent(arrayContent: string): number[] | null {
    try {
      const values: number[] = [];
      const cleanedContent = arrayContent.replace(/\s+/g, " ").trim();
      const items = cleanedContent.split(",");
      for (const item of items) {
        const trimmed = item.trim();
        if (trimmed && trimmed !== "") {
          let value: number;
          if (trimmed.startsWith("0x") || trimmed.startsWith("0X")) {
            value = parseInt(trimmed, 16);
          } else if (
            trimmed.startsWith("0") &&
            trimmed.length > 1 &&
            !trimmed.startsWith("0x")
          ) {
            value = parseInt(trimmed, 8);
          } else {
            value = parseInt(trimmed, 10);
          }

          if (!isNaN(value) && value >= 0 && value <= 255) {
            values.push(value);
          }
        }
      }

      return values.length > 0 ? values : null;
    } catch (error) {
      Logger.error(
        "Error parsing array content:",
        error,
        "ImageViewPanel parseArrayContent"
      );
      return null;
    }
  }

  private correctEndianness(rawData: number[]): number[] {
    try {

      if (rawData.length % 4 !== 0) {
        return rawData;
      }

      const correctedData: number[] = [];

      // Process data in groups of 4 bytes (one pixel)
      for (let i = 0; i < rawData.length; i += 4) {
        if (i + 3 < rawData.length) {
          // Swap bytes within each 4-byte pixel
          // Original: [B0, B1, B2, B3] (little-endian)
          // Corrected: [B3, B2, B1, B0] (big-endian)
          correctedData.push(rawData[i + 3]); // Alpha
          correctedData.push(rawData[i + 2]); // Red
          correctedData.push(rawData[i + 1]); // Green
          correctedData.push(rawData[i]); // Blue
        }
      }
      return correctedData;
    } catch (error) {
      Logger.error(
        "Error correcting endianness:",
        error,
        "ImageViewPanel correctEndianness"
      );
      return rawData;
    }
  }

  private dispose() {
    ImageViewPanel.instance = undefined;
    this.disposables.forEach((d) => d.dispose());
  }
}
