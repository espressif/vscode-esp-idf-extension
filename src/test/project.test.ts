/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 21st July 2021 12:43:10 pm
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
import * as assert from "assert";
import {
  readdir,
  readFile,
  readJson,
  remove,
  stat,
  utimes,
  writeJson,
} from "fs-extra";
import { join, resolve } from "path";
import { ExtensionContext, Uri } from "vscode";
import { getExamplesList } from "../newProject/Example";
import {
  addVscodeFolderToWorkspace,
  copyFromSrcProject,
  createVscodeFolder,
  readProjectCMakeLists,
  setCurrentSettingsInTemplate,
  updateProjectNameInCMakeLists,
} from "../newProject/utils";
import { IdfSetup } from "../eim/types";
import { ProjectConfigStore } from "../project-conf/store";
import { ConfigurePreset } from "../project-conf/projectConfiguration";
import { ESP } from "../config";
import { createMockMemento } from "./mockUtils";
import { validateEspClangExists } from "../clang/index";
import {
  clearCCppPropertiesJsonCompilerPath,
  getIdfBuildPath,
  getSettingsBuildPath,
} from "../configuration/workspace";
import { readParameter, readSettingsParameter } from "../configuration/idf";

suite("Project tests", () => {
  const absPath = (filename: string) =>
    resolve(__dirname, "..", "..", filename);
  const mockUpContext: ExtensionContext = {
    extensionPath: resolve(__dirname, "..", ".."),
    asAbsolutePath: absPath,
    workspaceState: createMockMemento(),
    globalState: createMockMemento(),
  } as ExtensionContext;
  ESP.ProjectConfiguration.store = ProjectConfigStore.resetForTests(
    mockUpContext
  );
  const templateFolder = join(mockUpContext.extensionPath, "templates");
  const wsFolder = process.env.GITHUB_WORKSPACE
    ? join(process.env.GITHUB_WORKSPACE, "project-test")
    : process.env.HOME
    ? join(process.env.HOME, "workspace", "project-test")
    : join(__dirname, "..", "..", "project-test");
  const targetFolder = join(wsFolder, "targetProject");

  test("vscode folder creation", async () => {
    await createVscodeFolder(
      mockUpContext.extensionPath,
      Uri.file(targetFolder)
    );
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
    const templateCCppPropertiesJson = await readFile(
      join(templateFolder, ".vscode", "c_cpp_properties.json"),
      "utf8"
    );
    const targetCCppPropertiesJson = await readFile(
      join(targetFolder, ".vscode", "c_cpp_properties.json"),
      "utf8"
    );
    assert.equal(
      templateCCppPropertiesJson,
      targetCCppPropertiesJson,
      "c_cpp_properties.json content match"
    );
    const cCppPropertiesJson = await readJson(
      join(targetFolder, ".vscode", "c_cpp_properties.json")
    );
    assert.strictEqual(
      cCppPropertiesJson.configurations[0].compilerPath,
      "",
      "compilerPath must stay empty so the C/C++ extension uses compile_commands.json"
    );
  });

  const templateCompileCommands =
    "${config:idf.buildPath}/compile_commands.json";

  const selectPreset = (preset: ConfigurePreset) => {
    ESP.ProjectConfiguration.store.set(
      ESP.ProjectConfiguration.SELECTED_CONFIG,
      preset.name
    );
    ESP.ProjectConfiguration.store.set(preset.name, preset);
  };

  const clearPreset = (preset: ConfigurePreset) => {
    ESP.ProjectConfiguration.store.clear(preset.name);
    ESP.ProjectConfiguration.store.clear(
      ESP.ProjectConfiguration.SELECTED_CONFIG
    );
  };

  const readCompileCommands = async (projectFolder: string) => {
    const cCppPropertiesJson = await readJson(
      join(projectFolder, ".vscode", "c_cpp_properties.json")
    );
    return cCppPropertiesJson.configurations[0].compileCommands;
  };

  test("compileCommands follows the selected preset when adding the folder", async () => {
    const presetFolder = join(wsFolder, "presetProject");
    const preset: ConfigurePreset = {
      name: "test_refresh",
      binaryDir: "builds/test_refresh",
    };
    selectPreset(preset);
    try {
      await createVscodeFolder(
        mockUpContext.extensionPath,
        Uri.file(presetFolder)
      );
      assert.equal(
        await readCompileCommands(presetFolder),
        templateCompileCommands,
        "createVscodeFolder alone must keep the template value"
      );
      await addVscodeFolderToWorkspace(
        mockUpContext.extensionPath,
        Uri.file(presetFolder)
      );
      assert.equal(
        await readCompileCommands(presetFolder),
        join(
          Uri.file(presetFolder).fsPath,
          "builds",
          "test_refresh",
          "compile_commands.json"
        )
      );
    } finally {
      clearPreset(preset);
    }
  });

  test("compileCommands uses the default build path without a preset", async () => {
    const noPresetFolder = join(wsFolder, "noPresetProject");
    await addVscodeFolderToWorkspace(
      mockUpContext.extensionPath,
      Uri.file(noPresetFolder)
    );
    assert.equal(
      await readCompileCommands(noPresetFolder),
      join(Uri.file(noPresetFolder).fsPath, "build", "compile_commands.json")
    );
  });

  test("clangd compile-commands-dir follows the selected preset", async function () {
    const presetFolder = join(wsFolder, "presetClangProject");
    const preset: ConfigurePreset = {
      name: "test_refresh",
      binaryDir: "builds/test_refresh",
    };
    ESP.ProjectConfiguration.store.set(
      ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION,
      process.env
    );
    selectPreset(preset);
    try {
      const espClangPath = await validateEspClangExists();
      if (!espClangPath) {
        this.skip();
      }
      await addVscodeFolderToWorkspace(
        mockUpContext.extensionPath,
        Uri.file(presetFolder)
      );
      const settingsJson = await readJson(
        join(presetFolder, ".vscode", "settings.json")
      );
      const expectedBuildPath = join(
        Uri.file(presetFolder).fsPath,
        "builds",
        "test_refresh"
      );
      assert.equal(settingsJson["clangd.path"], espClangPath);
      assert.ok(
        settingsJson["clangd.arguments"].includes(
          `--compile-commands-dir=${expectedBuildPath}`
        ),
        `clangd.arguments should target the preset build directory: ${JSON.stringify(
          settingsJson["clangd.arguments"]
        )}`
      );
    } finally {
      clearPreset(preset);
      ESP.ProjectConfiguration.store.clear(
        ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION
      );
    }
  });

  const ownerFolder = join(wsFolder, "presetOwnerProject");
  const ownerPreset: ConfigurePreset = {
    name: "test_second",
    binaryDir: join(ownerFolder, "builds", "test_second"),
    environment: { LEAKED_VAR: "from-preset" },
  };

  const withOwnerPreset = async (body: () => Promise<void>) => {
    selectPreset(ownerPreset);
    ESP.ProjectConfiguration.store.set(
      ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION,
      process.env
    );
    try {
      await body();
    } finally {
      clearPreset(ownerPreset);
      ESP.ProjectConfiguration.store.clear(
        ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION
      );
    }
  };

  const createProjectSettings = async (newProjectFolder: string) => {
    await createVscodeFolder(
      mockUpContext.extensionPath,
      Uri.file(newProjectFolder)
    );
    const idfSetup = {
      idfPath: process.env.IDF_PATH,
      toolsPath: process.env.IDF_TOOLS_PATH,
      python: `${process.env.IDF_PYTHON_ENV_PATH}/bin/python`,
    } as IdfSetup;
    return setCurrentSettingsInTemplate(
      join(newProjectFolder, ".vscode", "settings.json"),
      idfSetup,
      "no port",
      "esp32",
      Uri.file(newProjectFolder)
    );
  };

  test("settings reads ignore the selected preset", async () => {
    const targets = [
      join(wsFolder, "freshProject"),
      join(ownerFolder, "projects", "nested"),
    ];
    await withOwnerPreset(async () => {
      for (const folder of targets) {
        const scope = Uri.file(folder);
        assert.strictEqual(
          getIdfBuildPath(scope),
          ownerPreset.binaryDir,
          "readParameter answers with the window's preset for any scope"
        );
        assert.strictEqual(
          getSettingsBuildPath(scope),
          join(scope.fsPath, "build"),
          `settings build path must ignore the preset for ${folder}`
        );
        const presetVars = readParameter("idf.customExtraVars", scope) as {
          [key: string]: string;
        };
        assert.strictEqual(presetVars["LEAKED_VAR"], "from-preset");
        const settingsVars = readSettingsParameter(
          "idf.customExtraVars",
          scope
        ) as { [key: string]: string };
        assert.strictEqual(settingsVars["LEAKED_VAR"], undefined);
      }
    });
  });

  test("new project clangd arguments ignore the selected preset", async function () {
    const espClangPath = await validateEspClangExists();
    if (!espClangPath) {
      this.skip();
    }
    const targets = [
      join(wsFolder, "freshProject"),
      join(ownerFolder, "projects", "nested"),
    ];
    await withOwnerPreset(async () => {
      for (const newProjectFolder of targets) {
        const settingsJson = await createProjectSettings(newProjectFolder);
        const expectedDir = join(Uri.file(newProjectFolder).fsPath, "build");
        assert.ok(
          settingsJson["clangd.arguments"].includes(
            `--compile-commands-dir=${expectedDir}`
          ),
          `clangd must target the new project's build directory: ${JSON.stringify(
            settingsJson["clangd.arguments"]
          )}`
        );
      }
    });
  });

  test("clearCCppPropertiesJsonCompilerPath empties an absolute compilerPath", async () => {
    const projectFolder = join(wsFolder, "staleCompilerPathProject");
    await createVscodeFolder(
      mockUpContext.extensionPath,
      Uri.file(projectFolder)
    );
    const cCppPropertiesJsonPath = join(
      projectFolder,
      ".vscode",
      "c_cpp_properties.json"
    );
    const cCppPropertiesJson = await readJson(cCppPropertiesJsonPath);
    cCppPropertiesJson.configurations[0].compilerPath =
      "/home/user/.espressif/tools/xtensa-esp-elf/bin/xtensa-esp32-elf-gcc";
    await writeJson(cCppPropertiesJsonPath, cCppPropertiesJson, { spaces: 2 });

    await clearCCppPropertiesJsonCompilerPath(Uri.file(projectFolder));

    const updatedJson = await readJson(cCppPropertiesJsonPath);
    assert.strictEqual(updatedJson.configurations[0].compilerPath, "");
    assert.strictEqual(
      updatedJson.configurations[0].compileCommands,
      cCppPropertiesJson.configurations[0].compileCommands,
      "other fields must be preserved"
    );
  });

  test("clearCCppPropertiesJsonCompilerPath leaves an empty compilerPath untouched", async () => {
    const projectFolder = join(wsFolder, "emptyCompilerPathProject");
    await createVscodeFolder(
      mockUpContext.extensionPath,
      Uri.file(projectFolder)
    );
    const cCppPropertiesJsonPath = join(
      projectFolder,
      ".vscode",
      "c_cpp_properties.json"
    );
    const contentBefore = await readFile(cCppPropertiesJsonPath, "utf8");
    const pinnedTime = new Date("2020-01-01T00:00:00Z");
    await utimes(cCppPropertiesJsonPath, pinnedTime, pinnedTime);

    await clearCCppPropertiesJsonCompilerPath(Uri.file(projectFolder));

    const contentAfter = await readFile(cCppPropertiesJsonPath, "utf8");
    assert.strictEqual(contentAfter, contentBefore);
    const statAfter = await stat(cCppPropertiesJsonPath);
    assert.strictEqual(
      statAfter.mtime.getTime(),
      pinnedTime.getTime(),
      "file must not be rewritten when there is nothing to clear"
    );
  });

  test("clearCCppPropertiesJsonCompilerPath ignores a missing file", async () => {
    const projectFolder = join(wsFolder, "noVscodeFolderProject");
    await clearCCppPropertiesJsonCompilerPath(Uri.file(projectFolder));
    assert.strictEqual(
      await readdir(wsFolder).then((files) =>
        files.includes("noVscodeFolderProject")
      ),
      false,
      "nothing should be created"
    );
  });

  test("Test project creation", async () => {
    const templatePath = join(templateFolder, "template-app");
    const projectPath = join(wsFolder, "new-project");
    await copyFromSrcProject(
      mockUpContext.extensionPath,
      templatePath,
      Uri.file(projectPath)
    );
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
    assert.equal(currProjectName, `${prevName}`);
    assert.equal(newProjectName, `${newName}`);
  });

  test("get templates projects", async () => {
    const templatesCategories = getExamplesList(mockUpContext.extensionPath, [
      "templates",
    ]);
    assert.notEqual(templatesCategories, undefined);
    assert.notEqual(templatesCategories.examples, undefined);
    assert.notEqual(templatesCategories.examples.length, 0);
    assert.equal(templatesCategories.examples[0].name, "arduino-as-component");
  });

  test("get examples projects", async () => {
    assert.notEqual(process.env.IDF_PATH, undefined);
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

    const idfSetup = {
      idfPath: process.env.IDF_PATH,
      toolsPath: process.env.IDF_TOOLS_PATH,
      python: `${process.env.IDF_PYTHON_ENV_PATH}/bin/python`,
    } as IdfSetup;
    const newSettingsJson = await setCurrentSettingsInTemplate(
      settingsJsonPath,
      idfSetup,
      "no port",
      "esp32",
      Uri.file(wsFolder),
      openOcdConfigs
    );
    assert.equal(newSettingsJson["idf.openOcdConfigs"], openOcdConfigs);
  });

  suiteTeardown(async () => {
    await remove(wsFolder);
  });
});
