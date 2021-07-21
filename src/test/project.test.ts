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
import { ExtensionContext } from "vscode";
import { createVscodeFolder, setExtensionContext } from "../utils";

suite("Project tests", () => {
  const absPath = (filename) => resolve(__dirname, "..", "..", filename);
  const mockUpContext: ExtensionContext = {
    extensionPath: resolve(__dirname, "..", ".."),
    asAbsolutePath: absPath,
  } as ExtensionContext;
  const templateFolder = join(
    mockUpContext.extensionPath,
    "templates",
    ".vscode"
  );
  const wsFolder = process.env.GITHUB_WORKSPACE
    ? join(process.env.GITHUB_WORKSPACE, "project-test")
    : join(process.env.HOME, "workspace", "project-test");
  const targetFolder = join(wsFolder, "targetProject");
  setup(async () => {
    setExtensionContext(mockUpContext);
  });

  test("vscode folder creation", async () => {
    await createVscodeFolder(targetFolder);
    const resultFiles = await readdir(join(targetFolder, ".vscode"));
    assert.equal(resultFiles.includes("c_cpp_properties.json"), true);
    assert.equal(resultFiles.includes("launch.json"), true);
    assert.equal(resultFiles.includes("settings.json"), true);
    assert.equal(resultFiles.includes("tasks.json"), true);
  });

  test("Launch.json content", async () => {
    const templateLaunchJson = await readFile(
      join(templateFolder, "launch.json"),
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
      join(templateFolder, "c_cpp_properties.json")
    );
    templateCCppPropertiesJsonJson.configurations[0].compilerPath = "";
    const targetCCppPropertiesJsonJson = await readJson(
      join(targetFolder, ".vscode", "c_cpp_properties.json")
    );
    assert.equal(
      JSON.stringify(templateCCppPropertiesJsonJson),
      JSON.stringify(targetCCppPropertiesJsonJson)
    );
  });

  suiteTeardown(async () => {
    await remove(wsFolder);
  });
});
