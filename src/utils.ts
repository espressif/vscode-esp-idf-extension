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
  writeFile,
  writeJSON,
} from "fs-extra";
import * as HttpsProxyAgent from "https-proxy-agent";
import { marked } from "marked";
import { EOL } from "os";
import * as path from "path";
import * as url from "url";
import * as vscode from "vscode";
import { IdfComponent } from "./idfComponent";
import * as idfConf from "./idfConfiguration";
import { LocDictionary } from "./localizationDictionary";
import { Logger } from "./logger/logger";
import { getProjectName } from "./workspaceConfig";
import { OutputChannel } from "./logger/outputChannel";
import { ESP } from "./config";
import * as sanitizedHtml from "sanitize-html";

const locDic = new LocDictionary(__filename);
const currentFolderMsg = locDic.localize(
  "utils.currentFolder",
  "ESP-IDF Current Project"
);

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
        Logger.errorNotify(preCheck[1], new Error("PRECHECK_FAILED"));
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
  public static notUsingWebIde(): boolean {
    return process.env.WEB_IDE ? false : true;
  }
  public static openOCDVersionValidator(
    minVersion: string,
    currentVersion: string
  ) {
    return (): boolean => {
      try {
        return (
          parseInt(currentVersion.split("-").pop()) >=
          parseInt(minVersion.split("-").pop())
        );
      } catch (error) {
        Logger.error(
          `openOCDVersionValidator failed unexpectedly - min:${minVersion}, curr:${currentVersion}`,
          error
        );
        return false;
      }
    };
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
        error
      );
      return false;
    }
  }
}

export function spawn(
  command: string,
  args: string[] = [],
  options: any = {}
): Promise<Buffer> {
  let buff = Buffer.alloc(0);
  const sendToOutputChannel = (data: Buffer) => {
    buff = Buffer.concat([buff, data]);
  };
  return new Promise((resolve, reject) => {
    options.cwd = options.cwd || path.resolve(path.join(__dirname, ".."));
    const child = childProcess.spawn(command, args, options);

    child.stdout.on("data", sendToOutputChannel);
    child.stderr.on("data", sendToOutputChannel);

    child.on("error", (error) => reject(error));

    child.on("exit", (code) => {
      if (code === 0) {
        resolve(buff);
      } else {
        const err = new Error("non zero exit code " + code + EOL + EOL + buff);
        Logger.error(err.message, err);
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
    Logger.error(`Cannot access filePath: ${filePath}`, error);
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
  status.tooltip = info ? `${currentFolderMsg}: ${info.tooltip}` : void 0;
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

export async function setCCppPropertiesJsonCompilerPath(
  curWorkspaceFsPath: vscode.Uri
) {
  const cCppPropertiesJsonPath = path.join(
    curWorkspaceFsPath.fsPath,
    ".vscode",
    "c_cpp_properties.json"
  );
  const doesPathExists = await pathExists(cCppPropertiesJsonPath);
  if (!doesPathExists) {
    return;
  }
  const modifiedEnv = appendIdfAndToolsToPath(curWorkspaceFsPath);
  const idfTarget = modifiedEnv.IDF_TARGET || "esp32";
  const gccTool = getToolchainToolName(idfTarget, "gcc");
  const compilerPath = await isBinInPath(
    gccTool,
    curWorkspaceFsPath.fsPath,
    modifiedEnv
  );
  const cCppPropertiesJson = await readJSON(cCppPropertiesJsonPath);
  if (
    cCppPropertiesJson &&
    cCppPropertiesJson.configurations &&
    cCppPropertiesJson.configurations.length
  ) {
    cCppPropertiesJson.configurations[0].compilerPath = compilerPath;
    await writeJSON(cCppPropertiesJsonPath, cCppPropertiesJson, {
      spaces: vscode.workspace.getConfiguration().get("editor.tabSize") || 2,
    });
  }
}

export function getToolchainToolName(idfTarget: string, tool: string = "gcc") {
  switch (idfTarget) {
    case "esp32c2":
    case "esp32c3":
    case "esp32h2":
      return `riscv32-esp-elf-${tool}`;
    case "esp32":
    case "esp32s2":
    case "esp32s3":
      return `xtensa-${idfTarget}-elf-${tool}`;
    default:
      return undefined;
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
  await createVscodeFolder(destinationDir);
  await createDevContainer(destinationDir.fsPath);
  await copy(srcDirPath, destinationDir.fsPath);
}

export function getConfigValueFromSDKConfig(
  key: string,
  workspacePath: string,
  sdkconfigFileName: string = "sdkconfig"
): string {
  const sdkconfigFilePath = path.join(workspacePath, sdkconfigFileName);
  if (!canAccessFile(sdkconfigFilePath, fs.constants.R_OK)) {
    throw new Error("sdkconfig file doesn't exists or can't be read");
  }
  const configs = readFileSync(sdkconfigFilePath);
  const re = new RegExp(`${key}=(.*)?`);
  const match = configs.match(re);
  return match ? match[1] : "";
}

export function getMonitorBaudRate(workspacePath: string) {
  let sdkMonitorBaudRate: string = "";
  try {
    sdkMonitorBaudRate = getConfigValueFromSDKConfig(
      "CONFIG_ESPTOOLPY_MONITOR_BAUD",
      workspacePath
    );
  } catch (error) {
    const errMsg = error.message
      ? error.message
      : "Error reading CONFIG_ESPTOOLPY_MONITOR_BAUD from sdkconfig";
    Logger.error(errMsg, error);
  }
  return sdkMonitorBaudRate;
}

export function delConfigFile(workspaceRoot: vscode.Uri) {
  const sdkconfigFile = path.join(workspaceRoot.fsPath, "sdkconfig");
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
    spaces: vscode.workspace.getConfiguration().get("editor.tabSize") || 2,
  });
}

export function readComponentsDirs(filePath): IdfComponent[] {
  const filesOrFolders: IdfComponent[] = [];

  const files = fs.readdirSync(filePath);

  const openComponentMsg = locDic.localize(
    "utils.openComponentTitle",
    "Open IDF component file"
  );

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
  processStr: string,
  workingDirectory: string,
  channel?: vscode.OutputChannel,
  opts?: childProcess.ExecOptions,
  cancelToken?: vscode.CancellationToken
): Promise<string> {
  const execOpts: childProcess.ExecOptions = opts
    ? opts
    : {
        cwd: workingDirectory,
        maxBuffer: 500 * 1024,
      };
  return new Promise<string>((resolve, reject) => {
    childProcess.exec(
      processStr,
      execOpts,
      (error: Error, stdout: string, stderr: string) => {
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
            if (stderr.indexOf("Error") !== -1) {
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
            Logger.error(error.message, error);
          }
          return reject(error);
        }
        if (stderr && stderr.length > 2) {
          Logger.error(stderr, new Error(stderr));
          if (stderr.indexOf("Error") !== -1) {
            return reject(stderr);
          }
        }
        return resolve(stdout.concat(stderr));
      }
    );
  });
}

export async function getToolsJsonPath(newIdfPath: string, gitPath: string) {
  const espIdfVersion = await getEspIdfVersion(newIdfPath, gitPath);
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

export function getHttpsProxyAgent(): HttpsProxyAgent {
  let proxy: string = vscode.workspace.getConfiguration().get("http.proxy");
  if (!proxy) {
    proxy =
      process.env.HTTPS_PROXY ||
      process.env.https_proxy ||
      process.env.HTTP_PROXY ||
      process.env.http_proxy;
    if (!proxy) {
      return null;
    }
  }

  const proxyUrl: any = url.parse(proxy);
  if (proxyUrl.protocol !== "https:" && proxyUrl.protocol !== "http:") {
    return null;
  }

  const strictProxy: any = vscode.workspace
    .getConfiguration()
    .get("http.proxyStrictSSL", true);
  const proxyOptions: any = {
    auth: proxyUrl.auth,
    host: proxyUrl.hostname,
    port: parseInt(proxyUrl.port, 10),
    rejectUnauthorized: strictProxy,
  };
  return new HttpsProxyAgent(proxyOptions);
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
      "idf.buildDirectoryName",
      workspaceURI
    ) as string;
    if (!canAccessFile(buildDir, fs.constants.R_OK)) {
      throw new Error("Build is required once to generate the ELF File");
    }

    const elfFilePath = path.join(buildDir, `${projectName}.elf`);
    if (!canAccessFile(elfFilePath, fs.constants.R_OK)) {
      throw new Error(`Failed to access .elf file at ${elfFilePath}`);
    }
    return elfFilePath;
  } catch (error) {
    Logger.errorNotify(
      "Failed to read project name while fetching elf file",
      error
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

export async function getEspIdfVersion(workingDir: string, gitPath: string) {
  try {
    const doesWorkingDirExists = await pathExists(workingDir);
    if (!doesWorkingDirExists) {
      Logger.info(`${workingDir} does not exists to get ESP-IDF version.`);
      return "x.x";
    }
    const gitVersion = await checkGitExists(workingDir, gitPath);
    if (!gitVersion || gitVersion === "Not found") {
      throw new Error("Git is not found in current environment");
    }
    const rawEspIdfVersion = await execChildProcess(
      `"${gitPath}" describe --tags`,
      workingDir
    );
    const espIdfVersionMatch = rawEspIdfVersion.match(
      /v(\d+)(?:\.)?(\d+)?(?:\.)?(\d+)?.*/
    );
    if (espIdfVersionMatch && espIdfVersionMatch.length > 0) {
      let espVersion: string = "";
      for (let i = 1; i < espIdfVersionMatch.length; i++) {
        if (espIdfVersionMatch[i]) {
          espVersion = `${espVersion}.${espIdfVersionMatch[i]}`;
        }
      }
      return espVersion.substr(1);
    } else {
      return "x.x";
    }
  } catch (error) {
    const espIdfVersionFromCmake = await getEspIdfFromCMake(workingDir);
    if (espIdfVersionFromCmake) {
      return espIdfVersionFromCmake;
    }
    Logger.info(error);
    return "x.x";
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
      const gitInPath = await isBinInPath("git", workingDir, process.env);
      if (!gitInPath) {
        return "Not found";
      }
      gitPath = gitInPath;
    }
    const gitRawVersion = await execChildProcess(
      `"${gitPath}" --version`,
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
    Logger.errorNotify("Git is not found in current environment", error);
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
    const modifiedEnv = appendIdfAndToolsToPath(workingDirUri);
    const resetResult = await execChildProcess(
      `"${gitPath}" reset --hard --recurse-submodule`,
      workingDir,
      OutputChannel.init(),
      { env: modifiedEnv, cwd: workingDir }
    );
    OutputChannel.init().appendLine(resetResult + EOL);
    Logger.info(resetResult + EOL);
  } catch (error) {
    const errMsg = error.message ? error.message : "Error resetting repository";
    Logger.errorNotify(errMsg, error);
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
    const modifiedEnv = appendIdfAndToolsToPath(workingDirUri);
    const fixFileModeResult = await execChildProcess(
      `"${gitPath}" config --local core.fileMode false`,
      workingDir,
      OutputChannel.init(),
      { env: modifiedEnv, cwd: workingDir }
    );
    const fixSubmodulesFileModeResult = await execChildProcess(
      `"${gitPath}" submodule foreach --recursive git config --local core.fileMode false`,
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
    Logger.errorNotify(errMsg, error);
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

export function appendIdfAndToolsToPath(curWorkspace: vscode.Uri) {
  const modifiedEnv: { [key: string]: string } = <{ [key: string]: string }>(
    Object.assign({}, process.env)
  );
  const extraPaths = idfConf.readParameter(
    "idf.customExtraPaths",
    curWorkspace
  );

  const customVarsString = idfConf.readParameter(
    "idf.customExtraVars",
    curWorkspace
  ) as string;
  if (customVarsString) {
    try {
      const customVars = JSON.parse(customVarsString);
      for (const envVar in customVars) {
        if (envVar) {
          modifiedEnv[envVar] = customVars[envVar];
        }
      }
    } catch (error) {
      Logger.errorNotify("Invalid custom environment variables format", error);
    }
  }

  const containerPath =
    process.platform === "win32" ? process.env.USERPROFILE : process.env.HOME;
  const defaultEspIdfPath = path.join(containerPath, "esp", "esp-idf");

  const idfPathDir = idfConf.readParameter("idf.espIdfPath", curWorkspace);
  modifiedEnv.IDF_PATH =
    idfPathDir || process.env.IDF_PATH || defaultEspIdfPath;

  const adfPathDir = idfConf.readParameter("idf.espAdfPath", curWorkspace);
  modifiedEnv.ADF_PATH = adfPathDir || process.env.ADF_PATH;

  const mdfPathDir = idfConf.readParameter("idf.espMdfPath", curWorkspace);
  modifiedEnv.MDF_PATH = mdfPathDir || process.env.MDF_PATH;

  const defaultToolsPath = path.join(containerPath, ".espressif");
  const toolsPath = idfConf.readParameter(
    "idf.toolsPath",
    curWorkspace
  ) as string;
  modifiedEnv.IDF_TOOLS_PATH = toolsPath || defaultToolsPath;
  const matterPathDir = idfConf.readParameter("idf.espMatterPath") as string;
  modifiedEnv.ESP_MATTER_PATH = matterPathDir || process.env.ESP_MATTER_PATH;

  let pathToPigweed: string;

  if (modifiedEnv.ESP_MATTER_PATH) {
    pathToPigweed = path.join(
      modifiedEnv.ESP_MATTER_PATH,
      "connectedhomeip",
      "connectedhomeip",
      ".environment",
      "cipd",
      "pigweed"
    );
    modifiedEnv.ESP_MATTER_DEVICE_PATH = path.join(
      modifiedEnv.ESP_MATTER_PATH,
      "device_hal",
      "device",
      "m5stack"
    );
  }

  modifiedEnv.PYTHON =
    `${idfConf.readParameter("idf.pythonBinPath", curWorkspace)}` ||
    `${process.env.PYTHON}` ||
    `${path.join(process.env.IDF_PYTHON_ENV_PATH, "bin", "python")}`;

  modifiedEnv.IDF_PYTHON_ENV_PATH =
    path.dirname(path.dirname(modifiedEnv.PYTHON)) ||
    process.env.IDF_PYTHON_ENV_PATH;

  const gitPath = idfConf.readParameter("idf.gitPath", curWorkspace) as string;
  let pathToGitDir;
  if (gitPath && gitPath !== "git") {
    pathToGitDir = path.dirname(gitPath);
  }

  let IDF_ADD_PATHS_EXTRAS = path.join(
    modifiedEnv.IDF_PATH,
    "components",
    "esptool_py",
    "esptool"
  );
  IDF_ADD_PATHS_EXTRAS = `${IDF_ADD_PATHS_EXTRAS}${path.delimiter}${path.join(
    modifiedEnv.IDF_PATH,
    "components",
    "espcoredump"
  )}`;
  IDF_ADD_PATHS_EXTRAS = `${IDF_ADD_PATHS_EXTRAS}${path.delimiter}${path.join(
    modifiedEnv.IDF_PATH,
    "components",
    "partition_table"
  )}`;

  let pathNameInEnv: string;
  if (process.platform === "win32") {
    pathNameInEnv = "Path";
  } else {
    pathNameInEnv = "PATH";
  }
  if (pathToGitDir) {
    modifiedEnv[pathNameInEnv] =
      pathToGitDir + path.delimiter + modifiedEnv[pathNameInEnv];
  }
  if (pathToPigweed) {
    modifiedEnv[pathNameInEnv] =
      pathToPigweed + path.delimiter + modifiedEnv[pathNameInEnv];
  }
  modifiedEnv[pathNameInEnv] =
    path.dirname(modifiedEnv.PYTHON) +
    path.delimiter +
    path.join(modifiedEnv.IDF_PATH, "tools") +
    path.delimiter +
    modifiedEnv[pathNameInEnv];

  if (
    modifiedEnv[pathNameInEnv] &&
    !modifiedEnv[pathNameInEnv].includes(extraPaths)
  ) {
    modifiedEnv[pathNameInEnv] =
      extraPaths + path.delimiter + modifiedEnv[pathNameInEnv];
  }
  modifiedEnv[
    pathNameInEnv
  ] = `${IDF_ADD_PATHS_EXTRAS}${path.delimiter}${modifiedEnv[pathNameInEnv]}`;

  let idfTarget = idfConf.readParameter("idf.adapterTargetName", curWorkspace);
  if (idfTarget === "custom") {
    idfTarget = idfConf.readParameter(
      "idf.customAdapterTargetName",
      curWorkspace
    );
  }
  modifiedEnv.IDF_TARGET = idfTarget || process.env.IDF_TARGET;

  let enableComponentManager = idfConf.readParameter(
    "idf.enableIdfComponentManager",
    curWorkspace
  ) as boolean;

  if (enableComponentManager) {
    modifiedEnv.IDF_COMPONENT_MANAGER = "1";
  }

  return modifiedEnv;
}

export async function isBinInPath(
  binaryName: string,
  workDirectory: string,
  env: NodeJS.ProcessEnv
) {
  const cmd = process.platform === "win32" ? "where" : "which";
  try {
    const result = await spawn(cmd, [binaryName], { cwd: workDirectory, env });
    if (
      result.toString() === "" ||
      result.toString().indexOf("Could not find files") < 0
    ) {
      return binaryName.localeCompare(result.toString().trim()) === 0
        ? ""
        : result.toString().trim();
    }
  } catch (error) {
    Logger.error(`Cannot access filePath: ${binaryName}`, error);
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
  const modifiedEnv = appendIdfAndToolsToPath(extensionContext.extensionUri);
  return execChildProcess(
    `"${pythonBinPath}" "${reqFilePath}" -r "${requirementsPath}"`,
    extensionContext.extensionPath,
    OutputChannel.init(),
    { env: modifiedEnv }
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
    await move(oldPath, newPath);
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
