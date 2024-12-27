/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 21st July 2021 12:43:10 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
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
import * as assert from "assert";
import { readdir, readFile, readJson, remove } from "fs-extra";
import { join, resolve } from "path";
import { ExtensionContext, Uri } from "vscode";
import { getExamplesList } from "../examples/Example";
import { setCurrentSettingsInTemplate } from "../newProject/utils";
import {
  copyFromSrcProject,
  createVscodeFolder,
  isBinInPath,
  readProjectCMakeLists,
  setExtensionContext,
  updateProjectNameInCMakeLists,
} from "../utils";

suite("Project tests", () => {
  const absPath = (filename) => resolve(__dirname, "..", "..", filename);
  const mockUpContext: ExtensionContext = {
    extensionPath: resolve(__dirname, "..", ".."),
    asAbsolutePath: absPath,
  } as ExtensionContext;
  const templateFolder = join(mockUpContext.extensionPath, "templates");
  const wsFolder = process.env.GITHUB_WORKSPACE
    ? join(process.env.GITHUB_WORKSPACE, "project-test")
    : join(process.env.HOME, "workspace", "project-test");
  const targetFolder = join(wsFolder, "targetProject");
  setup(async () => {
    setExtensionContext(mockUpContext);
  });

  test("vscode folder creation", async () => {
    await createVscodeFolder(Uri.file(targetFolder));
    const resultFiles = await readdir(join(targetFolder, ".vscode"));
    assert.equal(resultFiles.includes("c_cpp_properties.json"), true);
    assert.equal(resultFiles.includes("launch.json"), true);
    assert.equal(resultFiles.includes("settings.json"), true);
  });

  test("Launch.json content", async () => {
    const templateLaunchJson = await readFile(
      join(templateFolder, ".vscode", "launch.json"),
      "utf8"
    );
    const targetLaunchJson = await readFile(
      join(targetFolder, ".vscode", "launch.json"),
      "utf8"
    );
    assert.equal(
      templateLaunchJson,
      targetLaunchJson,
      "launch.json content match"
    );
  });

  test("cCppPropertiesJson.json content", async () => {
    const templateCCppPropertiesJsonJson = await readJson(
      join(templateFolder, ".vscode", "c_cpp_properties.json")
    );
    const compilerAbsolutePath = await isBinInPath(
      "xtensa-esp32-elf-gcc",
      targetFolder,
      process.env
    );
    let compilerRelativePath = compilerAbsolutePath.split(
      process.env.IDF_TOOLS_PATH
    )[1];
    templateCCppPropertiesJsonJson.configurations[0].compilerPath =
      "${config:idf.toolsPath}" + compilerRelativePath;
    const targetCCppPropertiesJsonJson = await readJson(
      join(targetFolder, ".vscode", "c_cpp_properties.json")
    );
    assert.equal(
      JSON.stringify(templateCCppPropertiesJsonJson),
      JSON.stringify(targetCCppPropertiesJsonJson)
    );
  });

  test("Test project creation", async () => {
    const templatePath = join(templateFolder, "template-app");
    const projectPath = join(wsFolder, "new-project");
    await copyFromSrcProject(templatePath, Uri.file(projectPath));
    const resultRootFiles = await readdir(projectPath);
    const resultVscodeFiles = await readdir(join(projectPath, ".vscode"));
    const resultMainFiles = await readdir(join(projectPath, "main"));
    assert.equal(resultRootFiles.includes("CMakeLists.txt"), true);
    assert.equal(resultRootFiles.includes(".gitignore"), true);
    assert.equal(resultMainFiles.includes("CMakeLists.txt"), true);
    assert.equal(resultMainFiles.includes("main.c"), true);
    assert.equal(resultVscodeFiles.includes("c_cpp_properties.json"), true);
    assert.equal(resultVscodeFiles.includes("launch.json"), true);
    assert.equal(resultVscodeFiles.includes("settings.json"), true);
  });

  test("Update project name", async () => {
    const projectPath = join(wsFolder, "new-project");
    const prevName = "template-app";
    const currProjectName = readProjectCMakeLists(projectPath);
    const newName = "test-project";
    await updateProjectNameInCMakeLists(projectPath, newName);
    const newProjectName = readProjectCMakeLists(projectPath);
    assert.notEqual(currProjectName, undefined);
    assert.notEqual(newProjectName, undefined);
    assert.equal(currProjectName[0], `project(${prevName})`);
    assert.equal(newProjectName[0], `project(${newName})`);
  });

  test("get templates projects", async () => {
    const templatesCategories = getExamplesList(
      mockUpContext.extensionPath,
      "templates"
    );
    assert.notEqual(templatesCategories, undefined);
    assert.notEqual(templatesCategories.examples, undefined);
    assert.notEqual(templatesCategories.examples.length, 0);
    assert.equal(templatesCategories.examples[0].name, "arduino-as-component");
  });

  test("get examples projects", async () => {
    const examplesCategories = getExamplesList(process.env.IDF_PATH);
    assert.notEqual(examplesCategories, undefined);
    assert.notEqual(examplesCategories.subcategories, undefined);
    assert.notEqual(examplesCategories.subcategories.length, 0);
    assert.equal(examplesCategories.subcategories[0].name, "get-started");
  });

  test("Set current settings in template", async () => {
    const projectPath = join(wsFolder, "new-project");
    const settingsJsonPath = join(projectPath, ".vscode", "settings.json");
    const settingsJson = await readJson(settingsJsonPath);
    const openOcdConfigs =
      "interface/ftdi/esp32_devkitj_v1.cfg,target/esp32.cfg";
    const newSettingsJson = await setCurrentSettingsInTemplate(
      settingsJsonPath,
      process.env.IDF_PATH,
      process.env.IDF_TOOLS_PATH,
      "no port",
      openOcdConfigs,
      Uri.file(projectPath)
    );
    assert.equal(newSettingsJson["idf.espAdfPath"], "/test/esp-adf");
    assert.equal(newSettingsJson["idf.espMdfPath"], "/test/esp-mdf");
    assert.equal(newSettingsJson["idf.openOcdConfigs"], openOcdConfigs);
  });

  suiteTeardown(async () => {
    await remove(wsFolder);
  });
});
