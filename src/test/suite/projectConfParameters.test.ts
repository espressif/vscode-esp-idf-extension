/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 9th July 2026
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
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
import { tmpdir } from "os";
import { join, resolve } from "path";
import {
  mkdtemp,
  readFile,
  readJson,
  remove,
  writeFile,
  writeJson,
} from "fs-extra";
import { ExtensionContext, Uri } from "vscode";
import { ESP } from "../../config";
import { ProjectConfigStore } from "../../project-conf";
import { ConfigurePreset } from "../../project-conf/projectConfiguration";
import {
  legacyConfigToConfigurePreset,
  migrateLegacyConfiguration,
} from "../../project-conf/legacy";
import { createStarterPresetsFile } from "../../project-conf/presetsWriter";
import { createMockMemento } from "../mockUtils";
import { parameterToProjectConfigMap } from "../../configuration/idf";
import { Logger } from "../../common/logger";

const fullPreset: ConfigurePreset = {
  name: "full",
  binaryDir: "/tmp/project/build_full",
  cacheVariables: {
    IDF_TARGET: "esp32c3",
    SDKCONFIG: "/tmp/project/mysdkconfig",
    SDKCONFIG_DEFAULTS: "sdkconfig.defaults;sdkconfig.defaults.esp32c3",
  },
  environment: { MY_VAR: "my-value" },
  vendor: {
    [ESP.CMakePresets.ESP_IDF_VENDOR_KEY]: {
      schemaVersion: 1,
      settings: [
        { type: "compileArgs", value: ["-DFOO=1"] },
        { type: "ninjaArgs", value: ["-j4"] },
        { type: "flashBaudRate", value: "921600" },
        { type: "monitorBaudRate", value: "115200" },
        {
          type: "openOCD",
          value: {
            debugLevel: 3,
            configs: ["board/esp32c3-builtin.cfg"],
            args: ["-c", "init"],
          },
        },
        {
          type: "tasks",
          value: {
            preBuild: "echo pre-build",
            postBuild: "echo post-build",
            preFlash: "echo pre-flash",
            postFlash: "echo post-flash",
          },
        },
      ],
    },
  },
};

/**
 * A preset that only names itself. Every parameter must come back falsy so that
 * readParameter keeps falling back to the workspace settings.
 */
const emptyPreset: ConfigurePreset = { name: "empty" };

const presetParameters = [
  "idf.cmakeCompilerArgs",
  "idf.ninjaArgs",
  "idf.buildPath",
  "idf.sdkconfigDefaults",
  "idf.sdkconfigFilePath",
  "idf.flashBaudRate",
  "idf.monitorBaudRate",
  "idf.openOcdDebugLevel",
  "idf.openOcdConfigs",
  "idf.openOcdLaunchArgs",
  "idf.preBuildTask",
  "idf.postBuildTask",
  "idf.preFlashTask",
  "idf.postFlashTask",
];

function createMockContext(): ExtensionContext {
  return {
    extensionPath: resolve(__dirname, "..", "..", ".."),
    asAbsolutePath: (filename: string) =>
      resolve(__dirname, "..", "..", "..", filename),
    workspaceState: createMockMemento(),
    globalState: createMockMemento(),
  } as ExtensionContext;
}

suite("Project configuration preset parameters", () => {
  const selectPreset = (preset: ConfigurePreset) => {
    ESP.ProjectConfiguration.store.set(
      ESP.ProjectConfiguration.SELECTED_CONFIG,
      preset.name
    );
    ESP.ProjectConfiguration.store.set(preset.name, preset);
  };

  setup(() => {
    ESP.ProjectConfiguration.store = ProjectConfigStore.init(
      createMockContext()
    );
  });

  test("no store returns empty so settings are used", () => {
    const store = ESP.ProjectConfiguration.store;
    ESP.ProjectConfiguration.store = undefined;
    try {
      for (const param of presetParameters) {
        assert.strictEqual(parameterToProjectConfigMap(param), "", param);
      }
    } finally {
      ESP.ProjectConfiguration.store = store;
    }
  });

  test("no selected preset returns empty so settings are used", () => {
    for (const param of presetParameters) {
      assert.strictEqual(parameterToProjectConfigMap(param), "", param);
    }
  });

  test("preset without values returns falsy for every parameter", () => {
    selectPreset(emptyPreset);
    for (const param of presetParameters) {
      assert.ok(
        !parameterToProjectConfigMap(param),
        `${param} must be falsy so the workspace setting wins`
      );
    }
  });

  test("empty vendor settings do not shadow the workspace setting", () => {
    selectPreset({
      name: "blank",
      cacheVariables: { SDKCONFIG_DEFAULTS: "" },
      vendor: {
        [ESP.CMakePresets.ESP_IDF_VENDOR_KEY]: {
          schemaVersion: 1,
          settings: [
            { type: "compileArgs", value: [] },
            { type: "ninjaArgs", value: [] },
            {
              type: "openOCD",
              value: { debugLevel: -1, configs: [], args: [] },
            },
            { type: "tasks", value: { preBuild: "", postBuild: "" } },
          ],
        },
      },
    });

    // An empty array is truthy, so this is the case that silently breaks the fallback.
    assert.strictEqual(
      parameterToProjectConfigMap("idf.cmakeCompilerArgs"),
      ""
    );
    assert.strictEqual(parameterToProjectConfigMap("idf.ninjaArgs"), "");
    assert.strictEqual(
      parameterToProjectConfigMap("idf.sdkconfigDefaults"),
      ""
    );
    assert.strictEqual(parameterToProjectConfigMap("idf.openOcdConfigs"), "");
    assert.strictEqual(
      parameterToProjectConfigMap("idf.openOcdLaunchArgs"),
      ""
    );
    assert.strictEqual(
      parameterToProjectConfigMap("idf.openOcdDebugLevel"),
      ""
    );
    assert.strictEqual(parameterToProjectConfigMap("idf.preBuildTask"), "");
  });

  test("populated preset resolves every parameter", () => {
    selectPreset(fullPreset);

    assert.deepStrictEqual(
      parameterToProjectConfigMap("idf.cmakeCompilerArgs"),
      ["-DFOO=1"]
    );
    assert.deepStrictEqual(parameterToProjectConfigMap("idf.ninjaArgs"), [
      "-j4",
    ]);
    assert.strictEqual(
      parameterToProjectConfigMap("idf.buildPath"),
      "/tmp/project/build_full"
    );
    assert.deepStrictEqual(
      parameterToProjectConfigMap("idf.sdkconfigDefaults"),
      ["sdkconfig.defaults", "sdkconfig.defaults.esp32c3"]
    );
    assert.strictEqual(
      parameterToProjectConfigMap("idf.sdkconfigFilePath"),
      "/tmp/project/mysdkconfig"
    );
    assert.strictEqual(
      parameterToProjectConfigMap("idf.flashBaudRate"),
      "921600"
    );
    assert.strictEqual(
      parameterToProjectConfigMap("idf.monitorBaudRate"),
      "115200"
    );
    assert.deepStrictEqual(parameterToProjectConfigMap("idf.openOcdConfigs"), [
      "board/esp32c3-builtin.cfg",
    ]);
    assert.deepStrictEqual(
      parameterToProjectConfigMap("idf.openOcdLaunchArgs"),
      ["-c", "init"]
    );
    assert.strictEqual(
      parameterToProjectConfigMap("idf.preBuildTask"),
      "echo pre-build"
    );
    assert.strictEqual(
      parameterToProjectConfigMap("idf.postBuildTask"),
      "echo post-build"
    );
    assert.strictEqual(
      parameterToProjectConfigMap("idf.preFlashTask"),
      "echo pre-flash"
    );
    assert.strictEqual(
      parameterToProjectConfigMap("idf.postFlashTask"),
      "echo post-flash"
    );
  });

  test("openOcdDebugLevel stays a number", () => {
    selectPreset(fullPreset);
    assert.strictEqual(parameterToProjectConfigMap("idf.openOcdDebugLevel"), 3);
  });

  test("customExtraVars merges preset environment and IDF_TARGET", () => {
    selectPreset(fullPreset);
    const extraVars = parameterToProjectConfigMap("idf.customExtraVars");
    assert.strictEqual(extraVars["MY_VAR"], "my-value");
    assert.strictEqual(extraVars["IDF_TARGET"], "esp32c3");
  });
});

suite("Legacy project configuration migration", () => {
  let workspaceFolder: string;

  suiteSetup(() => {
    Logger.init(createMockContext());
  });

  setup(async () => {
    workspaceFolder = await mkdtemp(join(tmpdir(), "esp-idf-migration-"));
  });

  teardown(async () => {
    await remove(workspaceFolder);
  });

  test("empty legacy values are not copied into the preset", () => {
    const preset = legacyConfigToConfigurePreset("proj1", {
      build: {
        compileArgs: [],
        ninjaArgs: [],
        buildDirectoryPath: "${workspaceFolder}/build1",
        sdkconfigDefaults: [],
        sdkconfigFilePath: "",
      },
      env: {},
      idfTarget: "",
      flashBaudRate: "",
      monitorBaudRate: "",
      openOCD: { debugLevel: -1, configs: [], args: [] },
      tasks: { preBuild: "", preFlash: "", postBuild: "", postFlash: "" },
    });

    assert.deepStrictEqual(preset, {
      name: "proj1",
      binaryDir: "${workspaceFolder}/build1",
    });
  });

  test("legacy values are copied verbatim into the preset", () => {
    const preset = legacyConfigToConfigurePreset("proj2", {
      build: {
        compileArgs: ["-DFOO=1"],
        ninjaArgs: [],
        buildDirectoryPath: "",
        sdkconfigDefaults: ["sdkconfig.defaults", "sdkconfig.prod"],
        sdkconfigFilePath: "mycustomsdkconfig",
      },
      env: { OPENOCD_USB_ADAPTER_LOCATION: "0-1.3.5" },
      idfTarget: "esp32",
      flashBaudRate: "921600",
      monitorBaudRate: "",
      openOCD: {
        debugLevel: -1,
        configs: ["board/esp32-wrover-kit-3.3v.cfg"],
        args: [],
      },
      tasks: {
        preBuild: "echo hi",
        preFlash: "",
        postBuild: "",
        postFlash: "",
      },
    });

    assert.strictEqual(preset.binaryDir, undefined);
    assert.deepStrictEqual(preset.cacheVariables, {
      IDF_TARGET: "esp32",
      SDKCONFIG_DEFAULTS: "sdkconfig.defaults;sdkconfig.prod",
      SDKCONFIG: "mycustomsdkconfig",
    });
    assert.deepStrictEqual(preset.environment, {
      OPENOCD_USB_ADAPTER_LOCATION: "0-1.3.5",
    });

    const settings =
      preset.vendor[ESP.CMakePresets.ESP_IDF_VENDOR_KEY].settings;
    assert.deepStrictEqual(
      settings.map((s) => s.type),
      ["compileArgs", "flashBaudRate", "openOCD", "tasks"]
    );
    assert.deepStrictEqual(settings.find((s) => s.type === "openOCD").value, {
      configs: ["board/esp32-wrover-kit-3.3v.cfg"],
    });
    assert.deepStrictEqual(settings.find((s) => s.type === "tasks").value, {
      preBuild: "echo hi",
    });
  });

  test("migration writes CMake macros CMake can expand", async () => {
    const legacyFilePath = Uri.file(
      join(workspaceFolder, "esp_idf_project_configuration.json")
    );
    await writeJson(legacyFilePath.fsPath, {
      proj1: { build: { buildDirectoryPath: "${workspaceFolder}/build1" } },
      proj2: {
        build: {
          buildDirectoryPath: "${workspaceRoot}/build2",
          sdkconfigFilePath: "${workspaceFolder}/mycustomsdkconfig",
        },
      },
    });

    await migrateLegacyConfiguration(Uri.file(workspaceFolder), legacyFilePath);

    const cmakePresets = await readJson(
      join(
        workspaceFolder,
        ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME
      )
    );

    assert.strictEqual(
      cmakePresets.version,
      ESP.CMakePresets.CMAKE_PRESET_VERSION
    );
    // ${workspaceFolder} is not a CMake macro; leaving it in fails the whole
    // presets file with "Invalid macro expansion".
    assert.strictEqual(
      cmakePresets.configurePresets[0].binaryDir,
      "${sourceDir}/build1"
    );
    assert.strictEqual(
      cmakePresets.configurePresets[1].binaryDir,
      "${sourceDir}/build2"
    );
    assert.strictEqual(
      cmakePresets.configurePresets[1].cacheVariables.SDKCONFIG,
      "${sourceDir}/mycustomsdkconfig"
    );
  });
});

suite("Starter CMakePresets file", () => {
  let workspaceFolder: string;
  let presetsPath: string;

  suiteSetup(() => {
    Logger.init(createMockContext());
  });

  setup(async () => {
    workspaceFolder = await mkdtemp(join(tmpdir(), "esp-idf-starter-"));
    presetsPath = join(
      workspaceFolder,
      ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME
    );
  });

  teardown(async () => {
    await remove(workspaceFolder);
  });

  test("creates presets CMake can read when no file exists", async () => {
    const { outcome } = await createStarterPresetsFile(
      Uri.file(workspaceFolder)
    );
    assert.strictEqual(outcome, "created");

    const document = await readJson(presetsPath);
    assert.strictEqual(document.version, ESP.CMakePresets.CMAKE_PRESET_VERSION);
    assert.deepStrictEqual(
      document.cmakeMinimumRequired,
      ESP.CMakePresets.CMAKE_PRESET_MINIMUM_REQUIRED
    );
    // CMake refuses the whole file over a $schema key below presets version 8.
    assert.ok(!("$schema" in document));

    assert.deepStrictEqual(
      document.configurePresets.map((p) => p.name),
      ["default", "production"]
    );
    for (const preset of document.configurePresets) {
      assert.ok(preset.displayName, `${preset.name} needs a displayName`);
      assert.ok(
        preset.binaryDir.startsWith("${sourceDir}/"),
        `${preset.name} must build inside the project`
      );
      // Naming absent sdkconfig defaults would fail the build from the start.
      assert.ok(!preset.cacheVariables.SDKCONFIG_DEFAULTS);
    }

    const binaryDirs = document.configurePresets.map((p) => p.binaryDir);
    assert.strictEqual(
      new Set(binaryDirs).size,
      binaryDirs.length,
      "each preset needs its own build directory"
    );
  });

  test("fills in presets while keeping the rest of an existing file", async () => {
    await writeJson(presetsPath, {
      version: 3,
      cmakeMinimumRequired: { major: 3, minor: 21, patch: 0 },
      configurePresets: [],
      buildPresets: [{ name: "keep-me", configurePreset: "default" }],
    });

    const { outcome } = await createStarterPresetsFile(
      Uri.file(workspaceFolder)
    );
    assert.strictEqual(outcome, "presetsAdded");

    const document = await readJson(presetsPath);
    assert.strictEqual(document.configurePresets.length, 2);
    assert.deepStrictEqual(document.buildPresets, [
      { name: "keep-me", configurePreset: "default" },
    ]);
  });

  test("leaves presets the user already defined alone", async () => {
    const existing = {
      version: 3,
      configurePresets: [{ name: "mine", binaryDir: "${sourceDir}/build" }],
    };
    await writeJson(presetsPath, existing);

    const { outcome } = await createStarterPresetsFile(
      Uri.file(workspaceFolder)
    );
    assert.strictEqual(outcome, "alreadyDefined");
    assert.deepStrictEqual(await readJson(presetsPath), existing);
  });

  test("does not overwrite a file it cannot parse", async () => {
    const malformed = '{ "version": 3, "configurePresets": [ }';
    await writeFile(presetsPath, malformed);

    const { outcome } = await createStarterPresetsFile(
      Uri.file(workspaceFolder)
    );
    assert.strictEqual(outcome, "unreadable");
    assert.strictEqual(await readFile(presetsPath, "utf8"), malformed);
  });
});
