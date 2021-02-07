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
  readFile,
  writeFile,
} from "fs-extra";
import * as HttpsProxyAgent from "https-proxy-agent";
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

const extensionName = __dirname.replace(path.sep + "dist", "");
const templateDir = path.join(extensionName, "templates");
const locDic = new LocDictionary(__filename);
const currentFolderMsg = locDic.localize(
  "utils.currentFolder",
  "ESP-IDF Current Project"
);

export let extensionContext: vscode.ExtensionContext;
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

    child.on("error", (error) => reject({ error }));

    child.on("exit", (code) => {
      if (code === 0) {
        resolve(buff);
      } else {
        const msg = "non zero exit code " + code + EOL + EOL + buff;
        Logger.error(msg, new Error(msg));
        reject({
          error: new Error("non zero exit code " + code + "\n\n" + buff),
        });
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

export async function createVscodeFolder(curWorkspaceFsPath: string) {
  const settingsDir = path.join(curWorkspaceFsPath, ".vscode");
  const vscodeTemplateFolder = path.join(templateDir, ".vscode");
  await ensureDir(settingsDir);

  return new Promise<void>((resolve, reject) => {
    fs.readdir(vscodeTemplateFolder, async (err, files) => {
      if (err) {
        return reject(err);
      }
      for (const f of files) {
        const fPath = path.join(settingsDir, f);
        const fSrcPath = path.join(vscodeTemplateFolder, f);
        const fExists = await pathExists(fPath);
        if (!fExists) {
          await copy(fSrcPath, fPath);
        }
      }
      return resolve();
    });
  });
}

export function chooseTemplateDir() {
  const templatesAvailable = fs.readdirSync(templateDir).filter((file) => {
    return (
      fs.statSync(path.join(templateDir, file)).isDirectory() &&
      file !== ".vscode"
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
  curWorkspacePath: string,
  chosenTemplateDir: string
) {
  const templateDirToUse = path.join(templateDir, chosenTemplateDir);
  await copyFromSrcProject(templateDirToUse, curWorkspacePath);
}

export async function copyFromSrcProject(
  srcDirPath: string,
  destinationDir: string
) {
  await createVscodeFolder(destinationDir);
  await copy(srcDirPath, destinationDir);
}

export function getConfigValueFromSDKConfig(
  key: string,
  workspacePath: string
): string {
  const sdkconfigFilePath = path.join(workspacePath, "sdkconfig");
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

export function getToolPackagesPath(toolPackage: string[]) {
  const idfToolsPath = idfConf.readParameter("idf.toolsPath");
  return path.resolve(idfToolsPath, ...toolPackage);
}

export async function getToolsJsonPath(newIdfPath: string) {
  const espIdfVersion = await getEspIdfVersion(newIdfPath);
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
    fs.stat(dirPath, (err, stats) => {
      if (err) {
        resolve(false);
      } else {
        if (stats.isDirectory()) {
          resolve(true);
        }
        resolve(false);
      }
    });
  });
}

export function isStringNotEmpty(str: string) {
  // Check if there is at least 1 alphanumeric character in the string.
  return !!str.trim();
}

export async function getElfFilePath(
  workspaceURI: vscode.Uri
): Promise<string> {
  let projectName = "";
  if (!workspaceURI) {
    throw new Error("No Workspace open");
  }

  try {
    projectName = await getProjectName(workspaceURI.fsPath);
  } catch (error) {
    Logger.errorNotify(
      "Failed to read project name while fetching elf file",
      error
    );
    return;
  }

  const buildDir = path.join(workspaceURI.fsPath, "build");
  if (!canAccessFile(buildDir, fs.constants.R_OK)) {
    throw new Error("Build is required once to generate the ELF File");
  }

  const elfFilePath = path.join(buildDir, `${projectName}.elf`);
  if (!canAccessFile(elfFilePath, fs.constants.R_OK)) {
    throw new Error(`Failed to access .elf file at ${elfFilePath}`);
  }
  return elfFilePath;
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

export async function getEspIdfVersion(workingDir: string) {
  try {
    const canCheck = await checkGitExists(extensionContext.extensionPath);
    if (canCheck === "Not found") {
      Logger.errorNotify(
        "Git is not found in current environment",
        Error("git is not found")
      );
      return "x.x";
    }
    const rawEspIdfVersion = await execChildProcess(
      "git describe --tags",
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
    Logger.info(error);
    return "x.x";
  }
}

export async function checkGitExists(workingDir: string) {
  return await execChildProcess("git --version", workingDir)
    .then((result) => {
      if (result) {
        const match = result.match(
          /(?:git\sversion\s)(\d+)(.\d+)?(.\d+)?(?:.windows.\d+)?/g
        );
        if (match && match.length > 0) {
          return match[0].replace("git version ", "");
        } else {
          Logger.errorNotify(
            "Git is not found in current environment",
            Error("")
          );
          return "Not found";
        }
      }
    })
    .catch((err) => {
      Logger.errorNotify("Git is not found in current environment", err);
      return "Not found";
    });
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

export function appendIdfAndToolsToPath() {
  const modifiedEnv: { [key: string]: string } = <{ [key: string]: string }>(
    Object.assign({}, process.env)
  );
  const extraPaths = idfConf.readParameter("idf.customExtraPaths");

  const customVarsString = idfConf.readParameter(
    "idf.customExtraVars"
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

  const idfPathDir = idfConf.readParameter("idf.espIdfPath");
  modifiedEnv.IDF_PATH =
    idfPathDir || process.env.IDF_PATH || defaultEspIdfPath;

  const adfPathDir = idfConf.readParameter("idf.espAdfPath");
  modifiedEnv.ADF_PATH = adfPathDir || process.env.ADF_PATH;

  const mdfPathDir = idfConf.readParameter("idf.espMdfPath");
  modifiedEnv.MDF_PATH = mdfPathDir || process.env.MDF_PATH;

  modifiedEnv.PYTHON =
    `${idfConf.readParameter("idf.pythonBinPath")}` || `${process.env.PYTHON}`;

  modifiedEnv.IDF_PYTHON_ENV_PATH = path.dirname(
    path.dirname(modifiedEnv.PYTHON)
  );

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

  const idfTarget = idfConf.readParameter("idf.adapterTargetName");
  modifiedEnv.IDF_TARGET = idfTarget || process.env.IDF_TARGET;

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
  const modifiedEnv = appendIdfAndToolsToPath();
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
