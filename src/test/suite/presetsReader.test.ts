/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 5th August 2026
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
import { platform, tmpdir } from "os";
import { join, resolve } from "path";
import { mkdtemp, remove, writeJson } from "fs-extra";
import { ExtensionContext, Uri } from "vscode";
import { ESP } from "../../config";
import { Logger } from "../../logger/logger";
import { getProjectConfigurationElements } from "../../project-conf/presetsReader";
import { resolvePresetInheritance } from "../../project-conf/presetInheritance";
import { getESPIDFSettingValue } from "../../project-conf/presetSettings";
import { createMockMemento } from "../mockUtils";

function createMockContext(): ExtensionContext {
  return {
    extensionPath: resolve(__dirname, "..", "..", ".."),
    asAbsolutePath: (filename: string) =>
      resolve(__dirname, "..", "..", "..", filename),
    workspaceState: createMockMemento(),
    globalState: createMockMemento(),
  } as ExtensionContext;
}

const cmakePresets = {
  version: 3,
  cmakeMinimumRequired: { major: 3, minor: 23, patch: 0 },
  configurePresets: [
    {
      name: "common",
      hidden: true,
      generator: "Ninja",
      cacheVariables: { IDF_TARGET: "esp32c6" },
      environment: { QA_SHARED_VALUE: "from-common" },
      vendor: {
        [ESP.CMakePresets.ESP_IDF_VENDOR_KEY]: {
          schemaVersion: 1,
          settings: [{ type: "monitorBaudRate", value: "115200" }],
        },
      },
    },
    {
      name: "esp32c6",
      displayName: "Shared ESP32-C6",
      inherits: "common",
      binaryDir: "build/shared-c6",
    },
  ],
};

const cmakeUserPresets = {
  version: 3,
  configurePresets: [
    {
      name: "esp32c6-local",
      displayName: "Local ESP32-C6",
      inherits: "esp32c6",
      binaryDir: "build/local-c6",
    },
  ],
};

suite("Hidden configure presets", () => {
  let workspaceFolder: string;

  suiteSetup(() => {
    Logger.init(createMockContext());
  });

  setup(async () => {
    workspaceFolder = await mkdtemp(join(tmpdir(), "esp-idf-presets-"));
    await writeJson(
      join(
        workspaceFolder,
        ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME
      ),
      cmakePresets
    );
    await writeJson(
      join(
        workspaceFolder,
        ESP.ProjectConfiguration.USER_CONFIGURATION_FILENAME
      ),
      cmakeUserPresets
    );
  });

  teardown(async () => {
    await remove(workspaceFolder);
  });

  test("hidden presets are not selectable, matching cmake --list-presets", async () => {
    const presets = await getProjectConfigurationElements(
      Uri.file(workspaceFolder)
    );

    assert.deepStrictEqual(Object.keys(presets).sort(), [
      "esp32c6",
      "esp32c6-local",
    ]);
  });

  test("hidden presets still act as inheritance bases", async () => {
    const presets = await getProjectConfigurationElements(
      Uri.file(workspaceFolder)
    );

    assert.strictEqual(presets["esp32c6"].cacheVariables.IDF_TARGET, "esp32c6");
    assert.strictEqual(
      presets["esp32c6"].environment["QA_SHARED_VALUE"],
      "from-common"
    );
    assert.strictEqual(
      getESPIDFSettingValue(presets["esp32c6"], "monitorBaudRate"),
      "115200"
    );
  });

  test("hidden is not propagated to inheriting presets", async () => {
    const presets = await getProjectConfigurationElements(
      Uri.file(workspaceFolder)
    );

    assert.strictEqual(presets["esp32c6"].hidden, undefined);
    assert.strictEqual(presets["esp32c6-local"].hidden, undefined);
  });
});

const multipleInheritancePresets = {
  version: 3,
  cmakeMinimumRequired: { major: 3, minor: 23, patch: 0 },
  configurePresets: [
    {
      name: "first-parent",
      displayName: "First parent",
      description: "Parent listed first",
      hidden: true,
      binaryDir: "build/from-first",
      cacheVariables: {
        IDF_TARGET: "esp32c6",
        SDKCONFIG: "./build/from-first/sdkconfig",
      },
      environment: { QA_PARENT_WINNER: "FIRST" },
      vendor: {
        [ESP.CMakePresets.ESP_IDF_VENDOR_KEY]: {
          schemaVersion: 1,
          settings: [{ type: "monitorBaudRate", value: "115200" }],
        },
      },
    },
    {
      name: "second-parent",
      hidden: true,
      binaryDir: "build/from-second",
      cacheVariables: {
        IDF_TARGET: "esp32",
        SDKCONFIG: "./build/from-second/sdkconfig",
      },
      environment: { QA_PARENT_WINNER: "SECOND" },
      vendor: {
        [ESP.CMakePresets.ESP_IDF_VENDOR_KEY]: {
          schemaVersion: 1,
          settings: [{ type: "monitorBaudRate", value: "74880" }],
        },
      },
    },
    {
      name: "precedence-child",
      inherits: ["first-parent", "second-parent"],
    },
  ],
};

suite("Multiple configure preset inheritance", () => {
  let workspaceFolder: string;

  suiteSetup(() => {
    Logger.init(createMockContext());
  });

  setup(async () => {
    workspaceFolder = await mkdtemp(join(tmpdir(), "esp-idf-presets-"));
    await writeJson(
      join(
        workspaceFolder,
        ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME
      ),
      multipleInheritancePresets
    );
  });

  teardown(async () => {
    await remove(workspaceFolder);
  });

  test("the earlier parent in the inherits array wins", async () => {
    const presets = await getProjectConfigurationElements(
      Uri.file(workspaceFolder)
    );
    const child = presets["precedence-child"];

    assert.strictEqual(child.binaryDir, "build/from-first");
    assert.strictEqual(child.cacheVariables.IDF_TARGET, "esp32c6");
    assert.strictEqual(
      child.cacheVariables.SDKCONFIG,
      "./build/from-first/sdkconfig"
    );
    assert.strictEqual(child.environment["QA_PARENT_WINNER"], "FIRST");
    assert.strictEqual(
      getESPIDFSettingValue(child, "monitorBaudRate"),
      "115200"
    );
  });

  test("displayName and description are not inherited", async () => {
    const presets = await getProjectConfigurationElements(
      Uri.file(workspaceFolder)
    );
    const child = presets["precedence-child"];

    assert.strictEqual(child.displayName, undefined);
    assert.strictEqual(child.description, undefined);
  });
});

/** The spelling CMake uses for ${hostSystemName}, which is `uname -s`. */
const hostSystemName = {
  win32: "Windows",
  darwin: "Darwin",
  linux: "Linux",
}[platform() as string];

const hostPresetNames = {
  Windows: "windows-only",
  Darwin: "macos-only",
  Linux: "linux-only",
};

const equalsHostSystemName = (rhs: string) => ({
  type: "equals",
  lhs: "${hostSystemName}",
  rhs,
});

const conditionPresets = {
  version: 3,
  cmakeMinimumRequired: { major: 3, minor: 23, patch: 0 },
  configurePresets: [
    {
      name: "windows-only",
      condition: equalsHostSystemName("Windows"),
    },
    {
      name: "linux-only",
      condition: equalsHostSystemName("Linux"),
    },
    {
      name: "macos-only",
      condition: equalsHostSystemName("Darwin"),
    },
    { name: "always-disabled", condition: false },
    { name: "always-enabled", condition: true },
    { name: "explicitly-null", condition: null },
    { name: "no-condition", binaryDir: "build/${presetName}" },
    { name: "disabled-base", hidden: true, condition: false },
    { name: "child-of-disabled", inherits: "disabled-base" },
    {
      name: "child-cancelling-condition",
      inherits: "disabled-base",
      condition: null,
    },
    {
      name: "any-of-host",
      condition: {
        type: "anyOf",
        conditions: [
          equalsHostSystemName("Windows"),
          equalsHostSystemName("Darwin"),
          equalsHostSystemName("Linux"),
        ],
      },
    },
    {
      name: "not-a-false-constant",
      condition: { type: "not", condition: { type: "const", value: false } },
    },
    {
      name: "in-list-host",
      condition: {
        type: "inList",
        string: "${hostSystemName}",
        list: ["Windows", "Darwin", "Linux"],
      },
    },
    {
      name: "matches-host",
      condition: {
        type: "matches",
        string: "${hostSystemName}",
        regex: "^(Windows|Darwin|Linux)$",
      },
    },
    {
      name: "missing-rhs",
      condition: { type: "equals", lhs: "${hostSystemName}" },
    },
    { name: "unknown-type", condition: { type: "isTuesday" } },
  ],
};

suite("Configure preset conditions", () => {
  let workspaceFolder: string;
  let presetNames: string[];

  suiteSetup(() => {
    Logger.init(createMockContext());
  });

  setup(async () => {
    workspaceFolder = await mkdtemp(join(tmpdir(), "esp-idf-presets-"));
    await writeJson(
      join(
        workspaceFolder,
        ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME
      ),
      conditionPresets
    );
    presetNames = Object.keys(
      await getProjectConfigurationElements(Uri.file(workspaceFolder))
    );
  });

  teardown(async () => {
    await remove(workspaceFolder);
  });

  test("only the host-specific preset of this platform is selectable", () => {
    const hostSpecificNames = Object.values(hostPresetNames);
    const expected = hostPresetNames[hostSystemName];

    assert.ok(expected, `unexpected host system name ${hostSystemName}`);
    assert.deepStrictEqual(
      presetNames.filter((name) => hostSpecificNames.includes(name)),
      [expected]
    );
  });

  test("a false condition disables a preset, true and null keep it", () => {
    assert.ok(!presetNames.includes("always-disabled"));
    assert.ok(presetNames.includes("always-enabled"));
    assert.ok(presetNames.includes("explicitly-null"));
    assert.ok(presetNames.includes("no-condition"));
  });

  test("conditions are inherited, and a null condition cancels them", () => {
    assert.ok(!presetNames.includes("child-of-disabled"));
    assert.ok(presetNames.includes("child-cancelling-condition"));
  });

  test("a null condition is not passed on to inheriting presets", () => {
    const resolved = resolvePresetInheritance(
      { name: "child", inherits: "base" },
      {
        base: { name: "base", hidden: true, condition: null },
        child: { name: "child", inherits: "base" },
      }
    );

    assert.ok(!("condition" in resolved));
  });

  test("aggregate, list and regex conditions are evaluated", () => {
    assert.ok(presetNames.includes("any-of-host"));
    assert.ok(presetNames.includes("not-a-false-constant"));
    assert.ok(presetNames.includes("in-list-host"));
    assert.ok(presetNames.includes("matches-host"));
  });

  test("a condition that cannot be evaluated leaves the preset selectable", () => {
    assert.ok(presetNames.includes("missing-rhs"));
    assert.ok(presetNames.includes("unknown-type"));
  });

  test("${presetName} expands to the name of the preset", async () => {
    const presets = await getProjectConfigurationElements(
      Uri.file(workspaceFolder)
    );

    assert.strictEqual(presets["no-condition"].binaryDir, "build/no-condition");
  });
});

suite("Duplicate configure preset names", () => {
  let workspaceFolder: string;

  const writePresetsFile = (fileName: string, contents: unknown) =>
    writeJson(join(workspaceFolder, fileName), contents);

  const readPresets = () =>
    getProjectConfigurationElements(Uri.file(workspaceFolder));

  suiteSetup(() => {
    Logger.init(createMockContext());
  });

  setup(async () => {
    workspaceFolder = await mkdtemp(join(tmpdir(), "esp-idf-presets-"));
  });

  teardown(async () => {
    await remove(workspaceFolder);
  });

  test("a name declared in both files is rejected, as cmake does", async () => {
    await writePresetsFile(
      ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME,
      {
        version: 3,
        cmakeMinimumRequired: { major: 3, minor: 23, patch: 0 },
        configurePresets: [
          { name: "debug", binaryDir: "build/debug" },
          { name: "release", binaryDir: "build/release" },
        ],
      }
    );
    await writePresetsFile(
      ESP.ProjectConfiguration.USER_CONFIGURATION_FILENAME,
      {
        version: 3,
        configurePresets: [{ name: "debug", binaryDir: "build/debug-local" }],
      }
    );

    await assert.rejects(
      readPresets,
      (error: Error) =>
        error.message.includes('"debug"') &&
        error.message.includes(
          ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME
        ) &&
        error.message.includes(
          ESP.ProjectConfiguration.USER_CONFIGURATION_FILENAME
        ),
      "the error should name the duplicate and both files"
    );
  });

  test("a name repeated inside one file is rejected", async () => {
    await writePresetsFile(
      ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME,
      {
        version: 3,
        cmakeMinimumRequired: { major: 3, minor: 23, patch: 0 },
        configurePresets: [
          { name: "debug", binaryDir: "build/one" },
          { name: "debug", binaryDir: "build/two" },
        ],
      }
    );

    await assert.rejects(readPresets, (error: Error) =>
      error.message.includes('"debug"')
    );
  });

  test("distinct names let a user preset inherit a project preset", async () => {
    await writePresetsFile(
      ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME,
      {
        version: 3,
        cmakeMinimumRequired: { major: 3, minor: 23, patch: 0 },
        configurePresets: [{ name: "shared", binaryDir: "build/shared" }],
      }
    );
    await writePresetsFile(
      ESP.ProjectConfiguration.USER_CONFIGURATION_FILENAME,
      {
        version: 3,
        configurePresets: [{ name: "local", inherits: "shared" }],
      }
    );

    const presets = await readPresets();

    assert.deepStrictEqual(Object.keys(presets).sort(), ["local", "shared"]);
    assert.strictEqual(presets["local"].binaryDir, "build/shared");
  });
});
