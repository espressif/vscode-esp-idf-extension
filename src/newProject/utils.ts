/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 27th July 2021 4:35:42 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
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
import {
  copy,
  ensureDir,
  mkdirp,
  pathExists,
  readFile,
  readJSON,
  writeFile,
} from "fs-extra";
import { configureClangSettings, setClangSettings } from "../clang/index";
import { IdfSetup } from "../eim/types";
import { Uri } from "vscode";
import { readParameter } from "../configuration/idf";
import { join } from "path";
import { readdir } from "fs/promises";
import { setCCppPropertiesJsonCompilerPath } from "../configuration/workspace";
import { robustMove } from "../utils";
import { existsSync, readFileSync } from "fs";

export async function setCurrentSettingsInTemplate(
  settingsJsonPath: string,
  idfSetup: IdfSetup,
  port: string,
  selectedIdfTarget: string,
  workspace: Uri,
  openOcdConfigs?: string
) {
  const settingsJson = await readJSON(settingsJsonPath);
  const isWin = process.platform === "win32" ? "Win" : "";
  if (openOcdConfigs) {
    settingsJson["idf.openOcdConfigs"] =
      openOcdConfigs.indexOf(",") !== -1
        ? openOcdConfigs.split(",")
        : [openOcdConfigs];
  }
  if (port.indexOf("no port") === -1) {
    settingsJson["idf.port" + isWin] = port;
  }
  if (idfSetup.idfPath) {
    settingsJson["idf.currentSetup"] = idfSetup.idfPath;
  }
  settingsJson["idf.customExtraVars"] =
    settingsJson["idf.customExtraVars"] || {};
  if (selectedIdfTarget) {
    settingsJson["idf.customExtraVars"]["IDF_TARGET"] = selectedIdfTarget;
  }
  const customExtraVars = readParameter("idf.customExtraVars", workspace) as {
    [key: string]: string;
  };
  if (customExtraVars) {
    if (customExtraVars["IDF_PATH"] === idfSetup.idfPath) {
      settingsJson["idf.customExtraVars"]["IDF_PATH"] = idfSetup.idfPath;
    }
    if (customExtraVars["IDF_TOOLS_PATH"] === idfSetup.toolsPath) {
      settingsJson["idf.customExtraVars"]["IDF_TOOLS_PATH"] =
        idfSetup.toolsPath;
    }
    if (
      customExtraVars["IDF_PYTHON_ENV_PATH"] &&
      idfSetup.python &&
      idfSetup.python.indexOf(customExtraVars["IDF_PYTHON_ENV_PATH"]) !== -1
    ) {
      settingsJson["idf.customExtraVars"]["IDF_PYTHON_ENV_PATH"] =
        customExtraVars["IDF_PYTHON_ENV_PATH"];
    }
  }

  await setClangSettings(settingsJson, workspace);
  return settingsJson;
}

export async function copyFromSrcProject(
  extensionPath: string,
  srcDirPath: string,
  destinationDir: Uri
) {
  await copy(srcDirPath, destinationDir.fsPath);
  await createVscodeFolder(extensionPath, destinationDir);
  await createDevContainer(extensionPath, destinationDir.fsPath);
  await createGitignoreFile(extensionPath, destinationDir);
}

export async function createVscodeFolder(
  extensionPath: string,
  curWorkspaceFsPath: Uri
) {
  const settingsDir = join(curWorkspaceFsPath.fsPath, ".vscode");
  const vscodeTemplateFolder = join(extensionPath, "templates", ".vscode");
  await ensureDir(settingsDir);

  const files = await readdir(vscodeTemplateFolder);

  for (const f of files) {
    const fPath = join(settingsDir, f);
    const fSrcPath = join(vscodeTemplateFolder, f);
    const fExists = await pathExists(fPath);
    if (!fExists) {
      await copy(fSrcPath, fPath);
    }
  }
  await setCCppPropertiesJsonCompilerPath(curWorkspaceFsPath);
}

export async function createGitignoreFile(
  extensionPath: string,
  destinationDir: Uri
) {
  const gitignoreSrcPath = join(extensionPath, "templates", ".gitignore");
  const gitignoreDestPath = join(destinationDir.fsPath, ".gitignore");
  const gitignoreExists = await pathExists(gitignoreSrcPath);
  if (gitignoreExists) {
    await copy(gitignoreSrcPath, gitignoreDestPath);
  }
}

export async function createDevContainer(
  extensionPath: string,
  curWorkspaceFsPath: string
) {
  const containerDir = join(curWorkspaceFsPath, ".devcontainer");
  const vscodeTemplateFolder = join(
    extensionPath,
    "templates",
    ".devcontainer"
  );
  await ensureDir(containerDir);
  await copy(vscodeTemplateFolder, containerDir);
}

/**
 * Create a new ESP-IDF project in the current workspace.
 * @param {string} name - Name of the new project to create.
 * @param {string} targetDirectory - The directory where the project will be created.
 * @returns {Promise<Uri>} - The URI of the created project directory.
 */
export async function createNewProject(
  extensionPath: string,
  name: string,
  targetDirectory: Uri
) {
  const destinationDir = Uri.joinPath(targetDirectory, name);
  await mkdirp(destinationDir.fsPath);
  await copyFromSrcProject(
    extensionPath,
    join(extensionPath, "templates", "template-app"),
    destinationDir
  );
  await updateProjectNameInCMakeLists(destinationDir.fsPath, name);
  await configureClangSettings(destinationDir, false);
  return destinationDir;
}

/**
 * Create a new ESP-IDF component in the current workspace.
 * @param {string} name - Name of the new component to create.
 * @param {string} currentDirectory - The current directory where the component will be created.
 */
export async function createNewComponent(
  extensionPath: string,
  name: string,
  currentDirectory: string
) {
  const componentDirPath = join(currentDirectory, "components", name);
  await mkdirp(componentDirPath);
  const newComponentTemplatePath = join(
    extensionPath,
    "templates",
    "new_component"
  );
  await copy(newComponentTemplatePath, componentDirPath);
  const rename = async function (
    oldName: string,
    newName: string,
    ...containerPath: string[]
  ) {
    const oldPath = join(...containerPath, oldName);
    const newPath = join(...containerPath, newName);
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
  await replaceContentInFile(name, join(componentDirPath, `${name}.c`));
  await replaceContentInFile(name, join(componentDirPath, "CMakeLists.txt"));
}

export async function updateProjectNameInCMakeLists(
  dirPath: string,
  newProjectName: string
) {
  const cmakeListFile = join(dirPath, "CMakeLists.txt");
  if (existsSync(cmakeListFile)) {
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

export function checkIsProjectCmakeLists(dir: string) {
  // Check if folder contain CMakeLists.txt with project(name) call.
  const cmakeListFile = join(dir, "CMakeLists.txt");
  if (existsSync(cmakeListFile)) {
    const content = readFileSync(cmakeListFile, "utf-8");
    const projectMatches = content.match(/(project\(.*?\))/g);
    if (projectMatches && projectMatches.length > 0) {
      return true;
    }
  }
  return false;
}
