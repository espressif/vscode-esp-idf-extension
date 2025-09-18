// Copyright 2019 Espressif Systems (Shanghai) CO LTD
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

import * as childProcess from "child_process";
import * as crypto from "crypto";
import * as fs from "fs";
import {
  copy,
  ensureDir,
  mkdirp,
  move,
  pathExists,
  readdir,
  readFile,
  readJSON,
  remove,
  stat,
  writeFile,
  writeJSON,
} from "fs-extra";
import { marked } from "marked";
import { EOL, platform } from "os";
import * as path from "path";
import * as vscode from "vscode";
import { IdfComponent } from "./idfComponent";
import * as idfConf from "./idfConfiguration";
import { Logger } from "./logger/logger";
import { getIdfTargetFromSdkconfig, getProjectName } from "./workspaceConfig";
import { OutputChannel } from "./logger/outputChannel";
import { ESP } from "./config";
import * as sanitizedHtml from "sanitize-html";
import {
  getEnvVarsFromIdfTools,
  getPythonPath,
  getVirtualEnvPythonPath,
} from "./pythonManager";
import { IdfToolsManager } from "./idfToolsManager";

const currentFolderMsg = vscode.l10n.t("ESP-IDF: Current Project");

export let extensionContext: vscode.ExtensionContext;
let templateDir: string = path.join(
  vscode.extensions.getExtension(ESP.extensionID).extensionPath,
  "templates"
);
export function setExtensionContext(context: vscode.ExtensionContext): void {
  extensionContext = context;
}

export const packageJson = vscode.extensions.getExtension(ESP.extensionID)
  .packageJSON;

type PreCheckFunc = (...args: any[]) => boolean;
export type PreCheckInput = [PreCheckFunc, string];
export class PreCheck {
  public static perform(
    preCheckFunctions: PreCheckInput[],
    proceed: () => any
  ): any {
    let isPassedAll: boolean = true;
    preCheckFunctions.forEach((preCheck: PreCheckInput) => {
      if (!preCheck[0]()) {
        isPassedAll = false;
        Logger.errorNotify(
          preCheck[1],
          new Error("PRECHECK_FAILED"),
          "utils precheck failed"
        );
      }
    });
    if (isPassedAll) {
      return proceed();
    }
  }
  public static isWorkspaceFolderOpen(): boolean {
    return (
      vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders.length > 0
    );
  }
  public static isNotDockerContainer(): boolean {
    return vscode.env.remoteName !== "dev-container";
  }
  public static notUsingWebIde(): boolean {
    if (vscode.env.remoteName === "codespaces") {
      return false;
    }
    return process.env.WEB_IDE ? false : true;
  }

  /**
   * Checks if the extension is running in a VS Code fork (not the original Visual Studio Code)
   * @returns true if running in a fork like Cursor, VSCodium, etc., false if running in original VS Code
   * @example
   * if (PreCheck.isRunningInVSCodeFork()) {
   *   // Fork-specific behavior
   *   Logger.info("Running in VS Code fork");
   * }
   */
  public static isRunningInVSCodeFork(): boolean {
    return vscode.env.appName !== "Visual Studio Code";
  }

  public static openOCDVersionValidator(
    minVersion: string,
    currentVersion: string
  ) {
    try {
      const minVersionParsed = minVersion.match(/v(\d+.?\d+.?\d)-esp32-(\d+)/);
      const currentVersionParsed = currentVersion.match(
        /v(\d+.?\d+.?\d)-esp32-(\d+)/
      );
      if (!minVersionParsed || !currentVersionParsed) {
        throw new Error("Error parsing OpenOCD versions");
      }
      const validationResult =
        currentVersionParsed[1] >= minVersionParsed[1]
          ? currentVersionParsed[2] >= minVersionParsed[2]
            ? true
            : false
          : false;
      return validationResult;
    } catch (error) {
      Logger.error(
        `openOCDVersionValidator failed unexpectedly - min:${minVersion}, curr:${currentVersion}`,
        error,
        "src utils openOCDVersionValidator"
      );
      return false;
    }
  }
  public static espIdfVersionValidator(
    minVersion: string,
    currentVersion: string
  ) {
    try {
      return compareVersion(currentVersion, minVersion) !== -1;
    } catch (error) {
      Logger.error(
        `ESP-IDF version validator failed - min: ${minVersion}, current: ${currentVersion}`,
        error,
        "src utils espIdfVersionValidator"
      );
      return false;
    }
  }
}

export interface ISpawnOptions extends childProcess.SpawnOptions {
  /** Cancellation token to cancel the spawn */
  cancelToken?: vscode.CancellationToken;
  /** The maximum time in milliseconds to wait for the command to complete */
  timeout?: number;
  /** Whether to suppress output to the console */
  silent?: boolean;
  /** A string to return the output of the command */
  outputString?: string;
  /** Output append mode: 'appendLine', 'append', or undefined */
  appendMode?: "appendLine" | "append";
}

export function spawn(
  command: string,
  args: string[] = [],
  options: ISpawnOptions = {
    outputString: "",
    silent: false,
    appendMode: "appendLine",
  }
): Promise<Buffer> {
  let buff = Buffer.alloc(0);
  const sendToOutputChannel = (data: Buffer) => {
    buff = Buffer.concat([buff, data]);
    options.outputString += buff.toString();
    if (!options.silent) {
      if (options.appendMode === "append") {
        OutputChannel.append(data.toString());
      } else {
        OutputChannel.appendLine(data.toString());
      }
    }
  };
  return new Promise((resolve, reject) => {
    options.cwd = options.cwd || path.resolve(path.join(__dirname, ".."));
    const child = childProcess.spawn(command, args, options);
    let timeoutHandler = undefined;
    if (options.timeout > 0) {
      timeoutHandler = setTimeout(() => {
        child.kill();
      }, options.timeout);
    }

    if (options.cancelToken) {
      options.cancelToken.onCancellationRequested((e) => {
        child.kill();
      });
    }

    child.stdout.on("data", sendToOutputChannel);
    child.stderr.on("data", sendToOutputChannel);

    child.on("error", (error) => {
      if (timeoutHandler) {
        clearTimeout(timeoutHandler);
      }
      reject(error);
    });

    child.on("exit", (code) => {
      if (timeoutHandler) {
        clearTimeout(timeoutHandler);
      }
      if (code === 0) {
        resolve(buff);
      } else {
        const err = new Error("non zero exit code " + code + EOL + EOL + buff);
        Logger.error(err.message, err, "src utils spawn", { command });
        reject(err);
      }
    });
  });
}

export function canAccessFile(filePath: string, mode?: number): boolean {
  try {
    // tslint:disable-next-line: no-bitwise
    mode = mode || fs.constants.R_OK | fs.constants.W_OK | fs.constants.X_OK;
    fs.accessSync(filePath, mode);
    return true;
  } catch (error) {
    Logger.error(
      `Cannot access filePath: ${filePath}`,
      error,
      "src utils canAccessFile",
      undefined,
      false
    );
    return false;
  }
}

export async function sleep(ms: number): Promise<any> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function updateStatus(
  status: vscode.StatusBarItem,
  info: {
    currentWorkSpace: string;
    tooltip: string;
    clickCommand: string;
  }
): void {
  status.text = info ? `$(file-submodule)` : void 0;
  status.tooltip = info ? `${currentFolderMsg} ${info.tooltip}` : void 0;
  status.command = info ? info.clickCommand : void 0;

  if (info) {
    status.show();
  } else {
    status.hide();
  }
}

export async function createVscodeFolder(curWorkspaceFsPath: vscode.Uri) {
  const settingsDir = path.join(curWorkspaceFsPath.fsPath, ".vscode");
  const vscodeTemplateFolder = path.join(templateDir, ".vscode");
  await ensureDir(settingsDir);

  const files = await readdir(vscodeTemplateFolder);

  for (const f of files) {
    const fPath = path.join(settingsDir, f);
    const fSrcPath = path.join(vscodeTemplateFolder, f);
    const fExists = await pathExists(fPath);
    if (!fExists) {
      await copy(fSrcPath, fPath);
    }
  }
  await setCCppPropertiesJsonCompilerPath(curWorkspaceFsPath);
}

export async function createGitignoreFile(destinationDir: vscode.Uri) {
  const gitignoreSrcPath = path.join(templateDir, ".gitignore");
  const gitignoreDestPath = path.join(destinationDir.fsPath, ".gitignore");
  const gitignoreExists = await pathExists(gitignoreSrcPath);
  if (gitignoreExists) {
    await copy(gitignoreSrcPath, gitignoreDestPath);
  }
}

export async function setCCppPropertiesJsonCompilerPath(
  curWorkspaceFsPath: vscode.Uri
) {
  const modifiedEnv = await appendIdfAndToolsToPath(curWorkspaceFsPath);
  const idfTarget = modifiedEnv.IDF_TARGET || "esp32";
  const gccTool = getToolchainToolName(idfTarget, "gcc");
  const compilerAbsolutePath = await isBinInPath(gccTool, modifiedEnv);
  if (!compilerAbsolutePath) {
    return;
  }
  let compilerRelativePath = compilerAbsolutePath.split(
    modifiedEnv.IDF_TOOLS_PATH
  )[1];
  const settingToUse =
    process.platform === "win32"
      ? "${config:idf.toolsPathWin}"
      : "${config:idf.toolsPath}";
  await updateCCppPropertiesJson(
    curWorkspaceFsPath,
    "compilerPath",
    settingToUse + compilerRelativePath
  );
}

export async function setCCppPropertiesJsonCompileCommands(
  curWorkspaceFsPath: vscode.Uri
) {
  const buildDirPath = idfConf.readParameter(
    "idf.buildPath",
    curWorkspaceFsPath
  ) as string;
  const compileCommandsPath = path.join(buildDirPath, "compile_commands.json");

  await updateCCppPropertiesJson(
    curWorkspaceFsPath,
    "compileCommands",
    compileCommandsPath
  );
}

export async function updateCCppPropertiesJson(
  workspaceUri: vscode.Uri,
  fieldToUpdate: string,
  newFieldValue: string
) {
  const cCppPropertiesJsonPath = path.join(
    workspaceUri.fsPath,
    ".vscode",
    "c_cpp_properties.json"
  );
  const doesPathExists = await pathExists(cCppPropertiesJsonPath);
  if (!doesPathExists) {
    return;
  }
  const cCppPropertiesJson = await readJSON(cCppPropertiesJsonPath);
  if (
    cCppPropertiesJson &&
    cCppPropertiesJson.configurations &&
    cCppPropertiesJson.configurations.length
  ) {
    cCppPropertiesJson.configurations[0][fieldToUpdate] = newFieldValue;
    await writeJSON(cCppPropertiesJsonPath, cCppPropertiesJson, {
      spaces: 2,
    });
  }
}

export async function getToolchainPath(
  workspaceUri: vscode.Uri,
  tool: string = "gcc"
) {
  const modifiedEnv = await appendIdfAndToolsToPath(workspaceUri);
  const idfTarget = modifiedEnv.IDF_TARGET || "esp32";
  const gccTool = getToolchainToolName(idfTarget, tool);
  try {
    return await isBinInPath(gccTool, modifiedEnv);
  } catch (error) {
    Logger.errorNotify(
      `${tool} is not found in idf.toolsPath`,
      error,
      "utils getToolchainPath"
    );
    return;
  }
}

export function getToolchainToolName(idfTarget: string, tool: string = "gcc") {
  switch (idfTarget) {
    case "esp32":
    case "esp32s2":
    case "esp32s3":
      return `xtensa-${idfTarget}-elf-${tool}`;
    case "esp32c2":
    case "esp32c3":
    case "esp32c6":
    case "esp32h2":
    default:
      return `riscv32-esp-elf-${tool}`;
  }
}

export function chooseTemplateDir() {
  const templatesAvailable = fs.readdirSync(templateDir).filter((file) => {
    return (
      fs.statSync(path.join(templateDir, file)).isDirectory() &&
      file !== ".vscode" &&
      file !== ".devcontainer"
    );
  });
  const templates = [];
  templatesAvailable.forEach((templDir) => {
    templates.push({ label: templDir, target: templDir });
  });
  return templates;
}

export function getDirectories(dirPath) {
  return fs.readdirSync(dirPath).filter((file) => {
    return fs.statSync(path.join(dirPath, file)).isDirectory();
  });
}

export async function createSkeleton(
  curWorkspacePath: vscode.Uri,
  chosenTemplateDir: string
) {
  const templateDirToUse = path.join(templateDir, chosenTemplateDir);
  await copyFromSrcProject(templateDirToUse, curWorkspacePath);
}

export async function createDevContainer(curWorkspaceFsPath: string) {
  const containerDir = path.join(curWorkspaceFsPath, ".devcontainer");
  const vscodeTemplateFolder = path.join(templateDir, ".devcontainer");
  await ensureDir(containerDir);
  await copy(vscodeTemplateFolder, containerDir);
}

export async function copyFromSrcProject(
  srcDirPath: string,
  destinationDir: vscode.Uri
) {
  await copy(srcDirPath, destinationDir.fsPath);
  await createVscodeFolder(destinationDir);
  await createDevContainer(destinationDir.fsPath);
  await createGitignoreFile(destinationDir);
}

export function getVariableFromCMakeLists(workspacePath: string, key: string) {
  const cmakeListsFilePath = path.join(workspacePath, "CMakeLists.txt");
  if (!canAccessFile(cmakeListsFilePath, fs.constants.R_OK)) {
    throw new Error("CMakeLists.txt file doesn't exists or can't be read");
  }
  const cmakeListsContent = readFileSync(cmakeListsFilePath);
  const regexExp = new RegExp(`(?:set|SET)\\(${key} (.*)\\)`);
  const match = cmakeListsContent.match(regexExp);
  return match ? match[1] : "";
}

export async function getSDKConfigFilePath(workspacePath: vscode.Uri) {
  let sdkconfigFilePath = "";
  try {
    sdkconfigFilePath = getVariableFromCMakeLists(
      workspacePath.fsPath,
      "SDKCONFIG"
    );
  } catch (error) {
    const errMsg = error.message
      ? error.message
      : `CMakeLists.txt file doesn't exists or can't be read`;
    Logger.info(errMsg, error);
  }
  if (
    sdkconfigFilePath &&
    sdkconfigFilePath.indexOf("${CMAKE_BINARY_DIR}") !== -1
  ) {
    const buildDirPath = idfConf.readParameter(
      "idf.buildPath",
      workspacePath
    ) as string;
    sdkconfigFilePath = sdkconfigFilePath
      .replace("${CMAKE_BINARY_DIR}", buildDirPath)
      .replace(/"/g, "");
  }
  if (!sdkconfigFilePath) {
    sdkconfigFilePath = idfConf.readParameter(
      "idf.sdkconfigFilePath",
      workspacePath
    ) as string;
  }
  if (!workspacePath) {
    return;
  }
  if (!sdkconfigFilePath) {
    sdkconfigFilePath = path.join(workspacePath.fsPath, "sdkconfig");
  }
  if (!sdkconfigFilePath) {
    sdkconfigFilePath = path.join(workspacePath.fsPath, "sdkconfig.defaults");
  }
  return sdkconfigFilePath;
}

export async function getConfigValueFromSDKConfig(
  key: string,
  workspacePath: vscode.Uri
): Promise<string> {
  const sdkconfigFilePath = await getSDKConfigFilePath(workspacePath);
  if (
    !sdkconfigFilePath ||
    !canAccessFile(sdkconfigFilePath, fs.constants.R_OK)
  ) {
    throw new Error("sdkconfig file doesn't exists or can't be read");
  }
  const configs = readFileSync(sdkconfigFilePath);
  const re = new RegExp(`${key}=(.*)?`);
  const match = configs.match(re);
  return match ? match[1] : "";
}

export async function getMonitorBaudRate(workspacePath: vscode.Uri) {
  let sdkMonitorBaudRate = "";
  try {
    sdkMonitorBaudRate = idfConf.readParameter(
      "idf.monitorBaudRate",
      workspacePath
    ) as string;
    if (!sdkMonitorBaudRate) {
      sdkMonitorBaudRate = await getConfigValueFromSDKConfig(
        "CONFIG_ESP_CONSOLE_UART_BAUDRATE",
        workspacePath
      );
    }
  } catch (error) {
    const errMsg = error.message
      ? error.message
      : "ERROR reading CONFIG_ESP_CONSOLE_UART_BAUDRATE from sdkconfig";
    Logger.error(errMsg, error, "src utils getMonitorBaudRate");
  }
  return sdkMonitorBaudRate;
}

export async function delConfigFile(workspaceRoot: vscode.Uri) {
  const sdkconfigFile = await getSDKConfigFilePath(workspaceRoot);
  fs.unlinkSync(sdkconfigFile);
}

export function fileExists(filePath) {
  return fs.existsSync(filePath);
}

export function readFileSync(filePath) {
  return fs.readFileSync(filePath, "utf-8");
}

export function doesPathExists(inputPath: string) {
  return pathExists(inputPath);
}
export function readJson(jsonPath: string) {
  return readJSON(jsonPath);
}

export function writeJson(jsonPath: string, object: any) {
  return writeJSON(jsonPath, object, {
    spaces: 2,
  });
}

export function readComponentsDirs(filePath): IdfComponent[] {
  const filesOrFolders: IdfComponent[] = [];

  const files = fs.readdirSync(filePath);

  const openComponentMsg = vscode.l10n.t("ESP-IDF: Open IDF Component File");

  for (const file of files) {
    const stats = fs.statSync(path.join(filePath, file));
    const isCollapsable: vscode.TreeItemCollapsibleState = stats.isDirectory()
      ? 1
      : 0;
    const idfCommand = stats.isDirectory()
      ? void 0
      : {
          arguments: [vscode.Uri.file(path.join(filePath, file))],
          command: "espIdf.openIdfDocument",
          title: openComponentMsg,
        };
    const component = new IdfComponent(
      file,
      isCollapsable,
      vscode.Uri.file(path.join(filePath, file)),
      idfCommand
    );
    filesOrFolders.push(component);
  }

  return filesOrFolders;
}

export function isJson(jsonString: string) {
  try {
    JSON.parse(jsonString);
  } catch (error) {
    return false;
  }
  return true;
}

export function execChildProcess(
  command: string,
  args: string[] = [],
  workingDirectory: string,
  channel?: vscode.OutputChannel,
  opts?: childProcess.ExecFileOptions,
  cancelToken?: vscode.CancellationToken
): Promise<string> {
  const execOpts: childProcess.ExecFileOptions = opts
    ? opts
    : {
        cwd: workingDirectory,
        maxBuffer: 500 * 1024,
      };
  return new Promise<string>((resolve, reject) => {
    childProcess.execFile(
      command,
      args,
      execOpts,
      (error: Error | null, stdout: string, stderr: string) => {
        if (cancelToken && cancelToken.isCancellationRequested) {
          return reject(new Error("Process cancelled by user"));
        }
        if (channel) {
          let message: string = "";
          let err: boolean = false;
          if (stdout && stdout.length > 0) {
            message += stdout;
          }
          if (stderr && stderr.length > 0) {
            message += stderr;
            if (
              !stderr.toLowerCase().startsWith("warning") &&
              stderr.includes("Error")
            ) {
              err = true;
            }
          }
          if (error) {
            message += error.message;
            err = true;
          }
          if (err) {
            channel.append(message);
            channel.show();
          }
        }

        if (error) {
          if (error.message) {
            Logger.error(error.message, error, "utils execChildProcess", {
              command,
            });
          }
          return reject(error);
        }
        if (stderr && stderr.length > 2) {
          if (!stderr.startsWith("Open On-Chip Debugger v")) {
            Logger.error(
              stderr,
              new Error(stderr),
              "utils execChildProcess stderr",
              { command }
            );
          }
          if (
            !stderr.toLowerCase().startsWith("warning") &&
            stderr.includes("Error")
          ) {
            return reject(new Error(stderr));
          }
        }
        return resolve(stdout.concat(stderr));
      }
    );
  });
}

export async function getToolsJsonPath(newIdfPath: string) {
  const espIdfVersion = await getEspIdfFromCMake(newIdfPath);
  let jsonToUse: string = path.join(newIdfPath, "tools", "tools.json");
  await pathExists(jsonToUse).then((exists) => {
    if (!exists) {
      const idfToolsJsonToUse =
        espIdfVersion.localeCompare("4.0") < 0
          ? "fallback-tools.json"
          : "tools.json";
      jsonToUse = path.join(extensionContext.extensionPath, idfToolsJsonToUse);
    }
  });
  return jsonToUse;
}

export function readDirPromise(dirPath) {
  return new Promise<string[]>((resolve, reject) => {
    fs.readdir(dirPath, (err, files) => {
      if (err) {
        reject(err);
      }
      resolve(files);
    });
  });
}

export function dirExistPromise(dirPath) {
  return new Promise<boolean>((resolve, reject) => {
    if (!dirPath) {
      return resolve(false);
    }
    fs.stat(dirPath, (err, stats) => {
      if (err) {
        return resolve(false);
      } else {
        if (stats.isDirectory()) {
          return resolve(true);
        }
        return resolve(false);
      }
    });
  });
}

export function isStringNotEmpty(str: string) {
  // Check if there is at least 1 alphanumeric character in the string.
  return !!str.trim();
}

export function checkSpacesInPath(pathStr: string) {
  return /\s+/g.test(pathStr);
}

export async function getElfFilePath(
  workspaceURI: vscode.Uri
): Promise<string> {
  let projectName = "";
  if (!workspaceURI) {
    throw new Error("No Workspace open");
  }

  try {
    const buildDir = idfConf.readParameter(
      "idf.buildPath",
      workspaceURI
    ) as string;
    if (!canAccessFile(buildDir, fs.constants.R_OK)) {
      throw new Error("Build is required once to generate the ELF File");
    }
    projectName = await getProjectName(buildDir);
    const elfFilePath = path.join(buildDir, `${projectName}.elf`);
    if (!canAccessFile(elfFilePath, fs.constants.R_OK)) {
      throw new Error(`Failed to access .elf file at ${elfFilePath}`);
    }
    return elfFilePath;
  } catch (error) {
    Logger.errorNotify(
      "Failed to read project name while fetching elf file",
      error,
      "utils getElfFilePath"
    );
    return;
  }
}

export function checkIsProjectCmakeLists(dir: string) {
  // Check if folder contain CMakeLists.txt with project(name) call.
  const cmakeListFile = path.join(dir, "CMakeLists.txt");
  if (fileExists(cmakeListFile)) {
    const content = fs.readFileSync(cmakeListFile, "utf-8");
    const projectMatches = content.match(/(project\(.*?\))/g);
    if (projectMatches && projectMatches.length > 0) {
      return true;
    }
  }
  return false;
}

export function readProjectCMakeLists(dirPath: string) {
  const cmakeListFile = path.join(dirPath, "CMakeLists.txt");
  if (fileExists(cmakeListFile)) {
    const content = fs.readFileSync(cmakeListFile, "utf-8");
    const projectMatches = content.match(/(project\(.*?\))/g);
    if (projectMatches && projectMatches.length > 0) {
      return projectMatches;
    }
  }
}

export async function updateProjectNameInCMakeLists(
  dirPath: string,
  newProjectName: string
) {
  const cmakeListFile = path.join(dirPath, "CMakeLists.txt");
  if (fileExists(cmakeListFile)) {
    let content = await readFile(cmakeListFile, "utf-8");
    const projectMatches = content.match(/(project\(.*?\))/g);
    if (projectMatches && projectMatches.length) {
      content = content.replace(
        /(project\(.*?\))/g,
        `project(${newProjectName})`
      );
      await writeFile(cmakeListFile, content);
    }
  }
}

export function getSubProjects(dir: string): string[] {
  const subDirs = getDirectories(dir);
  if (checkIsProjectCmakeLists(dir)) {
    return [dir];
  } else {
    const subProjectsPathArray = [];
    subDirs.forEach((subDir) => {
      const subProjectsPaths = getSubProjects(path.join(dir, subDir));
      subProjectsPaths.forEach((subProjPath) => {
        subProjectsPathArray.push(subProjPath);
      });
    });
    return subProjectsPathArray;
  }
}

export async function getEspIdfFromCMake(espIdfPath: string) {
  const versionFilePath = path.join(
    espIdfPath,
    "tools",
    "cmake",
    "version.cmake"
  );
  const doesVersionFileExists = await pathExists(versionFilePath);
  if (!doesVersionFileExists) {
    Logger.info(`${versionFilePath} does not exist to get ESP-IDF version.`);
    return "x.x";
  }
  const versionFileContent = await readFile(versionFilePath, "utf8");
  let versionMatches: RegExpExecArray;
  let espVersion = {};
  const cmakeVersionRegex = new RegExp(
    /\s*set\s*\(\s*IDF_VERSION_([A-Z]{5})\s+(\d+)/gm
  );
  while ((versionMatches = cmakeVersionRegex.exec(versionFileContent))) {
    espVersion[versionMatches[1]] = versionMatches[2];
  }
  if (Object.keys(espVersion).length) {
    return `${espVersion["MAJOR"]}.${espVersion["MINOR"]}.${espVersion["PATCH"]}`;
  } else {
    return "x.x";
  }
}

export async function checkGitExists(workingDir: string, gitPath: string) {
  try {
    const gitBinariesExists = await pathExists(gitPath);
    if (!gitBinariesExists) {
      const gitInPath = await isBinInPath("git", process.env);
      if (!gitInPath) {
        return "Not found";
      }
      gitPath = gitInPath;
    }
    const gitRawVersion = await execChildProcess(
      gitPath,
      ["--version"],
      workingDir
    );
    const match = gitRawVersion.match(
      /(?:git\sversion\s)(\d+)(.\d+)?(.\d+)?(?:.windows.\d+)?/g
    );
    if (match && match.length) {
      return match[0].replace("git version ", "");
    } else {
      return "Not found";
    }
  } catch (error) {
    Logger.errorNotify(
      "Git is not found in current environment",
      error,
      "utils checkGitExists"
    );
    return "Not found";
  }
}

export async function cleanDirtyGitRepository(
  workingDir: string,
  gitPath: string
) {
  try {
    const gitBinariesExists = await pathExists(gitPath);
    if (!gitBinariesExists) {
      return;
    }
    const workingDirUri = vscode.Uri.file(workingDir);
    const modifiedEnv = await appendIdfAndToolsToPath(workingDirUri);
    const resetResult = await execChildProcess(
      gitPath,
      ["reset", "--hard", "--recurse-submodule"],
      workingDir,
      OutputChannel.init(),
      { env: modifiedEnv, cwd: workingDir }
    );
    OutputChannel.init().appendLine(resetResult + EOL);
    Logger.info(resetResult + EOL);
  } catch (error) {
    const errMsg = error.message ? error.message : "Error resetting repository";
    Logger.errorNotify(errMsg, error, "utils cleanDirtyGitRepository");
  }
}

export async function fixFileModeGitRepository(
  workingDir: string,
  gitPath: string
) {
  try {
    const gitBinariesExists = await pathExists(gitPath);
    if (!gitBinariesExists) {
      return;
    }
    const workingDirUri = vscode.Uri.file(workingDir);
    const modifiedEnv = await appendIdfAndToolsToPath(workingDirUri);
    const fixFileModeResult = await execChildProcess(
      gitPath,
      ["config", "--local", "core.fileMode", "false"],
      workingDir,
      OutputChannel.init(),
      { env: modifiedEnv, cwd: workingDir }
    );
    const fixSubmodulesFileModeResult = await execChildProcess(
      gitPath,
      [
        "submodule",
        "foreach",
        "--recursive",
        "git",
        "config",
        "--local",
        "core.fileMode",
        "false",
      ],
      workingDir,
      OutputChannel.init(),
      { env: modifiedEnv, cwd: workingDir }
    );
    OutputChannel.init().appendLine(
      fixFileModeResult + EOL + fixSubmodulesFileModeResult + EOL
    );
    Logger.info(fixFileModeResult + EOL + fixSubmodulesFileModeResult + EOL);
  } catch (error) {
    const errMsg = error.message
      ? error.message
      : "Error fixing FileMode in repository";
    Logger.errorNotify(errMsg, error, "utils fixFileModeGitRepository");
  }
}

export function buildPromiseChain<TItem, TPromise>(
  items: TItem[],
  promiseBuilder: (TItem: TItem) => Promise<TPromise>
): Promise<TPromise> {
  let promiseChain: Promise<TPromise> = Promise.resolve<TPromise>(null);
  for (const item of items) {
    promiseChain = promiseChain.then(() => {
      return promiseBuilder(item);
    });
  }
  return promiseChain;
}

export function fileNameFromUrl(urlToParse: string) {
  const matches = urlToParse.match(/\/([^\/?#]+)[^\/]*$/);
  if (matches.length > 1) {
    return matches[1];
  }
  return null;
}

export function validateFileSizeAndChecksum(
  filePath: string,
  expectedHash: string,
  expectedFileSize: number
) {
  return new Promise<boolean>(async (resolve, reject) => {
    const algo = "sha256";
    const shashum = crypto.createHash(algo);
    await pathExists(filePath).then((doesFileExists) => {
      if (doesFileExists) {
        const fileSize = fs.statSync(filePath).size;
        const readStream = fs.createReadStream(filePath);
        let fileChecksum: string;
        readStream.on("data", (data) => {
          shashum.update(data);
        });
        readStream.on("end", () => {
          fileChecksum = shashum.digest("hex");
          const isChecksumEqual = fileChecksum === expectedHash;
          const isSizeEqual = fileSize === expectedFileSize;
          const comparisonResult = isChecksumEqual && isSizeEqual;
          resolve(comparisonResult);
        });
        readStream.on("error", (e) => reject(e));
      } else {
        reject(false);
      }
    });
  });
}

export async function appendIdfAndToolsToPath(curWorkspace: vscode.Uri) {
  const modifiedEnv: { [key: string]: string } = <{ [key: string]: string }>(
    Object.assign({}, process.env)
  );

  const containerPath =
    process.platform === "win32" ? modifiedEnv.USERPROFILE : modifiedEnv.HOME;
  const defaultEspIdfPath = path.join(containerPath, "esp", "esp-idf");

  const idfPathDir = idfConf.readParameter("idf.espIdfPath", curWorkspace);
  modifiedEnv.IDF_PATH =
    idfPathDir || modifiedEnv.IDF_PATH || defaultEspIdfPath;

  const adfPathDir = idfConf.readParameter("idf.espAdfPath", curWorkspace);
  modifiedEnv.ADF_PATH = adfPathDir || modifiedEnv.ADF_PATH;

  const mdfPathDir = idfConf.readParameter("idf.espMdfPath", curWorkspace);
  modifiedEnv.MDF_PATH = mdfPathDir || modifiedEnv.MDF_PATH;

  const homekitPathDir = idfConf.readParameter(
    "idf.espHomeKitSdkPath",
    curWorkspace
  );
  modifiedEnv.HOMEKIT_PATH = homekitPathDir || modifiedEnv.HOMEKIT_PATH;

  const rainmakerPathDir = idfConf.readParameter(
    "idf.espRainmakerPath",
    curWorkspace
  );
  modifiedEnv.RMAKER_PATH = rainmakerPathDir || modifiedEnv.RMAKER_PATH;

  const defaultToolsPath = path.join(containerPath, ".espressif");
  const toolsPath = idfConf.readParameter(
    "idf.toolsPath",
    curWorkspace
  ) as string;
  modifiedEnv.IDF_TOOLS_PATH = toolsPath || defaultToolsPath;
  const matterPathDir = idfConf.readParameter(
    "idf.espMatterPath",
    curWorkspace
  ) as string;
  modifiedEnv.ESP_MATTER_PATH = matterPathDir || modifiedEnv.ESP_MATTER_PATH;

  const idfToolsManager = await IdfToolsManager.createIdfToolsManager(
    modifiedEnv.IDF_PATH
  );

  const extraPaths = await idfToolsManager.exportPathsInString(
    path.join(modifiedEnv.IDF_TOOLS_PATH, "tools"),
    ["cmake", "ninja"]
  );
  const customVars = await idfToolsManager.exportVars(
    path.join(modifiedEnv.IDF_TOOLS_PATH, "tools")
  );

  if (customVars) {
    try {
      for (const envVar in customVars) {
        if (envVar) {
          modifiedEnv[envVar] = customVars[envVar];
        }
      }
    } catch (error) {
      Logger.errorNotify(
        "Invalid ESP-IDF environment variables format",
        error,
        "appendIdfAndToolsToPath idf tools env vars"
      );
    }
  }

  let pathToPigweed: string;

  if (modifiedEnv.ESP_MATTER_PATH) {
    pathToPigweed = path.join(
      modifiedEnv.ESP_MATTER_PATH,
      "connectedhomeip",
      "connectedhomeip",
      ".environment",
      "cipd",
      "packages",
      "pigweed"
    );
    modifiedEnv.ZAP_INSTALL_PATH = path.join(
      modifiedEnv.ESP_MATTER_PATH,
      "connectedhomeip",
      "connectedhomeip",
      ".environment",
      "cipd",
      "packages",
      "zap"
    );
  }
  const sysPythonPath = await getPythonPath(curWorkspace);
  let pythonBinPath = "";
  if (sysPythonPath) {
    pythonBinPath = await getVirtualEnvPythonPath(curWorkspace);
  }
  if (!pythonBinPath) {
    pythonBinPath = idfConf.readParameter(
      "idf.pythonBinPath",
      curWorkspace
    ) as string;
  }
  modifiedEnv.PYTHON =
    pythonBinPath ||
    `${process.env.PYTHON}` ||
    `${path.join(process.env.IDF_PYTHON_ENV_PATH, "bin", "python")}`;

  const pythonBinPathExists = await pathExists(pythonBinPath);

  modifiedEnv.IDF_PYTHON_ENV_PATH = pythonBinPathExists
    ? path.dirname(path.dirname(pythonBinPath))
    : process.env.IDF_PYTHON_ENV_PATH;

  const gitPath = idfConf.readParameter("idf.gitPath", curWorkspace) as string;
  let pathToGitDir;
  if (gitPath && gitPath !== "git") {
    pathToGitDir = path.dirname(gitPath);
  }

  let IDF_ADD_PATHS_EXTRAS = path.join(
    modifiedEnv.IDF_PATH,
    "components",
    "espcoredump"
  );
  IDF_ADD_PATHS_EXTRAS = `${IDF_ADD_PATHS_EXTRAS}${path.delimiter}${path.join(
    modifiedEnv.IDF_PATH,
    "components",
    "partition_table"
  )}`;

  let pathNameInEnv: string = Object.keys(process.env).find(
    (k) => k.toUpperCase() == "PATH"
  );

  const idfPathExists = await pathExists(modifiedEnv.IDF_PATH);
  const idfToolsPathExists = await pathExists(modifiedEnv.IDF_TOOLS_PATH);

  if (pythonBinPathExists && idfPathExists && idfToolsPathExists) {
    const idfToolsExportVars = await getEnvVarsFromIdfTools(
      modifiedEnv.IDF_PATH,
      modifiedEnv.IDF_TOOLS_PATH,
      pythonBinPath
    );

    if (idfToolsExportVars) {
      try {
        for (const envVar in idfToolsExportVars) {
          if (envVar.toUpperCase() === pathNameInEnv.toUpperCase()) {
            modifiedEnv[pathNameInEnv] = idfToolsExportVars[envVar]
              .replace("%PATH%", modifiedEnv[pathNameInEnv])
              .replace("$PATH", modifiedEnv[pathNameInEnv]);
          } else {
            modifiedEnv[envVar] = idfToolsExportVars[envVar];
          }
        }
      } catch (error) {
        Logger.errorNotify(
          "Invalid ESP-IDF idf_tools.py export environment variables format",
          error,
          "appendIdfAndToolsToPath idf_tools export env vars"
        );
      }
    }
  }

  const customExtraVars = idfConf.readParameter(
    "idf.customExtraVars",
    curWorkspace
  ) as { [key: string]: string };
  if (customExtraVars) {
    try {
      for (const envVar in customExtraVars) {
        if (envVar) {
          modifiedEnv[envVar] = customExtraVars[envVar];
        }
      }
    } catch (error) {
      Logger.errorNotify(
        "Invalid user environment variables format",
        error,
        "appendIdfAndToolsToPath idf.customExtraVars"
      );
    }
  }

  try {
    const openOcdPath = await isBinInPath("openocd", modifiedEnv, [
      "openocd-esp32",
    ]);
    if (openOcdPath) {
      const openOcdDir = path.dirname(openOcdPath);
      const openOcdScriptsPath = path.join(
        openOcdDir,
        "..",
        "share",
        "openocd",
        "scripts"
      );
      const scriptsExists = await pathExists(openOcdScriptsPath);
      if (scriptsExists && modifiedEnv.OPENOCD_SCRIPTS !== openOcdScriptsPath) {
        modifiedEnv.OPENOCD_SCRIPTS = openOcdScriptsPath;
      }
    }
  } catch (error) {
    Logger.error(
      `Error processing OPENOCD_SCRIPTS path: ${error.message}`,
      error,
      "appendIdfAndToolsToPath OPENOCD_SCRIPTS"
    );
  }

  if (
    pathToGitDir &&
    !modifiedEnv[pathNameInEnv].split(path.delimiter).includes(pathToGitDir)
  ) {
    modifiedEnv[pathNameInEnv] += path.delimiter + pathToGitDir;
  }
  if (
    pathToPigweed &&
    !modifiedEnv[pathNameInEnv].split(path.delimiter).includes(pathToPigweed)
  ) {
    modifiedEnv[pathNameInEnv] += path.delimiter + pathToPigweed;
  }

  if (
    modifiedEnv[pathNameInEnv] &&
    !modifiedEnv[pathNameInEnv].includes(path.dirname(modifiedEnv.PYTHON))
  ) {
    modifiedEnv[pathNameInEnv] =
      path.dirname(modifiedEnv.PYTHON) +
      path.delimiter +
      modifiedEnv[pathNameInEnv];
  }

  if (
    modifiedEnv[pathNameInEnv] &&
    !modifiedEnv[pathNameInEnv].includes(
      path.join(modifiedEnv.IDF_PATH, "tools")
    )
  ) {
    modifiedEnv[pathNameInEnv] =
      path.join(modifiedEnv.IDF_PATH, "tools") +
      path.delimiter +
      modifiedEnv[pathNameInEnv];
  }

  const extraPathsArray = extraPaths.split(path.delimiter);
  for (let extraPath of extraPathsArray) {
    if (
      modifiedEnv[pathNameInEnv] &&
      !modifiedEnv[pathNameInEnv].includes(extraPath)
    ) {
      modifiedEnv[pathNameInEnv] =
        extraPath + path.delimiter + modifiedEnv[pathNameInEnv];
    }
  }

  modifiedEnv[
    pathNameInEnv
  ] = `${IDF_ADD_PATHS_EXTRAS}${path.delimiter}${modifiedEnv[pathNameInEnv]}`;

  let idfTarget = await getIdfTargetFromSdkconfig(curWorkspace);
  if (idfTarget) {
    modifiedEnv.IDF_TARGET =
      modifiedEnv.IDF_TARGET || idfTarget || process.env.IDF_TARGET;
  }

  let enableComponentManager = idfConf.readParameter(
    "idf.enableIdfComponentManager",
    curWorkspace
  ) as boolean;

  if (enableComponentManager) {
    modifiedEnv.IDF_COMPONENT_MANAGER = "1";
  }

  let sdkconfigFilePath = idfConf.readParameter(
    "idf.sdkconfigFilePath",
    curWorkspace
  ) as string;
  if (sdkconfigFilePath) {
    modifiedEnv.SDKCONFIG = sdkconfigFilePath;
  }

  return modifiedEnv;
}

export async function getAllBinPathInEnvPath(
  binaryName: string,
  env: NodeJS.ProcessEnv
) {
  let pathNameInEnv: string = Object.keys(process.env).find(
    (k) => k.toUpperCase() == "PATH"
  );
  const pathDirs = env[pathNameInEnv].split(path.delimiter);
  const foundBinaries: string[] = [];
  for (const pathDir of pathDirs) {
    let binaryPath = path.join(pathDir, binaryName);
    if (process.platform === "win32" && !binaryName.endsWith(".exe")) {
      binaryPath = `${binaryPath}.exe`;
    }
    const doesPathExists = await pathExists(binaryPath);
    if (doesPathExists) {
      const pathStats = await stat(binaryPath);
      if (pathStats.isFile() && canAccessFile(binaryPath, fs.constants.X_OK)) {
        foundBinaries.push(binaryPath);
      }
    }
  }
  return foundBinaries;
}

export async function isBinInPath(
  binaryName: string,
  env: NodeJS.ProcessEnv,
  containerDir?: string[]
) {
  let pathNameInEnv: string = Object.keys(process.env).find(
    (k) => k.toUpperCase() == "PATH"
  );
  const pathDirs = env[pathNameInEnv].split(path.delimiter);
  for (const pathDir of pathDirs) {
    let binaryPath = path.join(pathDir, binaryName);
    if (process.platform === "win32" && !binaryName.endsWith(".exe")) {
      binaryPath = `${binaryPath}.exe`;
    }
    const doesPathExists = await pathExists(binaryPath);
    if (doesPathExists) {
      if (containerDir && containerDir.length) {
        const resultContainerPath = containerDir.join(path.sep);
        if (binaryPath.indexOf(resultContainerPath) === -1) {
          return "";
        }
      }
      const pathStats = await stat(binaryPath);
      if (pathStats.isFile() && canAccessFile(binaryPath, fs.constants.X_OK)) {
        return binaryPath;
      }
    }
  }
  return "";
}

export async function startPythonReqsProcess(
  pythonBinPath: string,
  espIdfPath: string,
  requirementsPath: string
) {
  const reqFilePath = path.join(
    espIdfPath,
    "tools",
    "check_python_dependencies.py"
  );
  const modifiedEnv: { [key: string]: string } = <{ [key: string]: string }>(
    Object.assign({}, process.env)
  );
  modifiedEnv.IDF_PATH = espIdfPath;
  return execChildProcess(
    pythonBinPath,
    [reqFilePath, "-r", requirementsPath],
    extensionContext.extensionPath,
    OutputChannel.init(),
    { env: modifiedEnv, cwd: extensionContext.extensionPath }
  );
}

export function getWebViewFavicon(extensionPath: string): vscode.Uri {
  return vscode.Uri.file(
    path.join(extensionPath, "media", "espressif_icon.png")
  );
}

export async function createNewComponent(
  name: string,
  currentDirectory: string
) {
  const componentDirPath = path.join(currentDirectory, "components", name);
  await mkdirp(componentDirPath);
  const newComponentTemplatePath = path.join(
    extensionContext.extensionPath,
    "templates",
    "new_component"
  );
  await copy(newComponentTemplatePath, componentDirPath);
  const rename = async function (
    oldName: string,
    newName: string,
    ...containerPath: string[]
  ) {
    const oldPath = path.join(...containerPath, oldName);
    const newPath = path.join(...containerPath, newName);
    await robustMove(oldPath, newPath);
  };
  const replaceContentInFile = async function (
    replacementStr: string,
    filePath: string
  ) {
    let sourceContent = await readFile(filePath, "utf8");
    sourceContent = sourceContent.replace("new_component", replacementStr);
    await writeFile(filePath, sourceContent);
  };
  await rename("new_component.h", `${name}.h`, componentDirPath, "include");
  await rename("new_component.c", `${name}.c`, componentDirPath);
  await replaceContentInFile(name, path.join(componentDirPath, `${name}.c`));
  await replaceContentInFile(
    name,
    path.join(componentDirPath, "CMakeLists.txt")
  );
}

/**
 * Compare two version strings based on semantic versioning.
 * @param {string} v1 - String containing dot-separated numbers.
 * @param {string} v2 - String containing dot-separated numbers.
 * @return {number} v1 > v2 => 1 | v1 < v2 => -1 | v1 = v2 => 0
 */
export function compareVersion(v1: string, v2: string) {
  const v1Parts = v1.split(".");
  const v2Parts = v2.split(".");
  const minParts = Math.min(v1Parts.length, v2Parts.length);
  for (let i = 0; i < minParts; i++) {
    let v1Ver = parseInt(v1Parts[i], 10);
    let v2Ver = parseInt(v2Parts[i], 10);
    if (v1Ver > v2Ver) return 1;
    if (v1Ver < v2Ver) return -1;
  }
  return v1Parts.length === v2Parts.length
    ? 0
    : v1Parts.length < v2Parts.length
    ? -1
    : 1;
}

/**
 * Parse markdown into html and fix images with panel paths
 * @param {string} content - String with markdown content
 * @param {string} projectPath - Project absolute path where images are
 * @param {vscode.WebviewPanel} - Webview panel for webviewURI generation
 */
export function markdownToWebviewHtml(
  content: string,
  projectPath: string,
  panel: vscode.WebviewPanel
) {
  const rendererObj = new marked.Renderer();
  let contentStr = marked(content, {
    baseUrl: null,
    breaks: true,
    gfm: true,
    pedantic: false,
    renderer: rendererObj,
    smartLists: true,
    smartypants: false,
  });
  let cleanHtml = sanitizedHtml(contentStr);
  const srcLinkRegex = new RegExp(/src\s*=\s*"(.+?)"/g);
  let match: RegExpExecArray;
  while ((match = srcLinkRegex.exec(cleanHtml)) !== null) {
    const unresolvedPath = match[1];
    const absPath = `src="${panel.webview.asWebviewUri(
      vscode.Uri.file(path.resolve(projectPath, unresolvedPath))
    )}"`;
    cleanHtml = cleanHtml.replace(match[0], absPath);
  }
  const srcEncodedRegex = new RegExp(/&lt;img src=&quot;(.*?)&quot;\s?&gt;/g);
  let encodedMatch: RegExpExecArray;
  while ((encodedMatch = srcEncodedRegex.exec(cleanHtml)) !== null) {
    const pathToResolve = encodedMatch[0].match(
      /(?:src=&quot;)(.*?)(?:&quot;)/
    );
    const height = encodedMatch[0].match(/(?:height=&quot;)(.*?)(?:&quot;)/);
    const width = encodedMatch[0].match(/(?:width=&quot;)(.*?)(?:&quot;)/);
    const altText = encodedMatch[0].match(/(?:alt=&quot;)(.*?)(?:&quot;)/);
    const absPath = `<img src="${panel.webview.asWebviewUri(
      vscode.Uri.file(path.resolve(projectPath, pathToResolve[1]))
    )}" ${height && height.length > 0 ? `height="${height[1]}"` : ""} ${
      width && width.length > 0 ? `width="${width[1]}"` : ""
    } ${altText && altText.length > 0 ? `alt="${altText[1]}"` : ""} >`;
    cleanHtml = cleanHtml.replace(encodedMatch[0], absPath);
  }
  cleanHtml = cleanHtml.replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  return cleanHtml;
}

/**
 * Robust move function that handles Windows EPERM errors
 * Falls back to copy + remove if rename fails
 */
export async function robustMove(
  source: string,
  destination: string
): Promise<void> {
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await move(source, destination);
      return; // Success, exit the function
    } catch (error) {
      // On Windows, EPERM errors are common when moving directories
      if (error.code === "EPERM" || error.code === "EACCES") {
        if (attempt === maxRetries) {
          // Last attempt, use fallback method
          const fallbackMsg = `Move operation failed with ${error.code} after ${maxRetries} attempts, falling back to copy + remove...`;
          OutputChannel.init().appendLine(fallbackMsg);
          Logger.info(fallbackMsg);

          // Ensure destination directory doesn't exist
          if (await pathExists(destination)) {
            await remove(destination);
          }

          // Copy the directory
          await copy(source, destination);

          // Remove the source directory
          await remove(source);

          const successMsg = `Successfully moved directory using fallback method`;
          OutputChannel.init().appendLine(successMsg);
          Logger.info(successMsg);
          return;
        } else {
          // Retry with delay
          const retryMsg = `Move operation failed with ${error.code}, retrying in ${retryDelay}ms (attempt ${attempt}/${maxRetries})...`;
          OutputChannel.init().appendLine(retryMsg);
          Logger.error(retryMsg, new Error(retryMsg), "robustMove");
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      } else {
        // Re-throw other errors immediately
        const msg = error && error.message ? error.message : "Unknown error";
        Logger.error(msg, error, "robustMove");
      }
    }
  }
}

export function getUserShell() {
  const shell = vscode.env.shell;

  // list of shells to check
  const shells = ["powershell", "cmd", "bash", "zsh", "pwsh"];

  // if user's shell is in the list, return it
  for (let i = 0; i < shells.length; i++) {
    if (shell && shell.includes(shells[i])) {
      return shells[i];
    }
  }

  // if no match, pick one based on user's OS
  const userOS = platform();
  if (userOS === "win32") {
    return "powershell";
  } else if (userOS === "darwin") {
    return "zsh";
  } else if (userOS === "linux") {
    return "bash";
  }

  // if no match, return null
  return null;
}

export async function getConfigValueFromBuild(
  configKey: string,
  workspacePath: vscode.Uri
): Promise<string> {
  const buildPath = idfConf.readParameter(
    "idf.buildPath",
    workspacePath
  ) as string;
  const jsonFilePath = path.join(buildPath, "config", "sdkconfig.json");
  try {
    const data = await readFile(jsonFilePath, "utf-8");
    const config = JSON.parse(data);
    if (config[configKey] !== undefined) {
      // Key found, return the value assigned to it
      return config[configKey];
    } else {
      // Key not found, throw an error
      throw new Error(`The key ${configKey} was not found in ${jsonFilePath}.`);
    }
  } catch (error) {
    throw new Error(`Failed to read or parse the JSON file: ${error.message}`);
  }
}
