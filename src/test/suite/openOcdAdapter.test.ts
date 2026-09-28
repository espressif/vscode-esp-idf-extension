/*
 * Project: ESP-IDF VSCode Extension
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
import { resolve } from "path";
import * as vscode from "vscode";
import { Logger } from "../../common/logger";
import { ESP } from "../../config";
import {
  resetIdfConfigurationSource,
  setIdfConfigurationSource,
} from "../../configuration/idfConfigurationSource";
import {
  resolveAdapterBindingForLaunch,
  setAdapterBindingTestHooks,
} from "../../espIdf/openOcd/adapterBinding";
import {
  AdapterCommandQuickPickItem,
  runOpenOcdAdapterCommand,
  setAdapterCommandTestHooks,
} from "../../espIdf/openOcd/adapterCommand";
import {
  clearAdapterSerial,
  getStoredAdapterSerial,
  outputIndicatesAdapterSerialNotFound,
  parseAdapterSerialFromLog,
  storeAdapterSerial,
} from "../../espIdf/openOcd/adapterSerial";
import { ConnectedBoard } from "../../espIdf/openOcd/detectConnectedBoards";
import { ProjectConfigStore } from "../../project-conf/store";
import { createMockMemento } from "../mockUtils";

const fakeWorkspaceFolder = {
  uri: vscode.Uri.file("/test/workspace"),
  name: "test",
  index: 0,
} as vscode.WorkspaceFolder;

function board(overrides: Partial<ConnectedBoard>): ConnectedBoard {
  return {
    name: "ESP32-S3-DevKitC-1",
    description: "",
    target: "esp32s3",
    location: "usb://1-2",
    config_files: ["board/esp32s3-builtin.cfg"],
    ...overrides,
  };
}

function createFakeIdfSource(getValues: Record<string, unknown> = {}) {
  const writes: { key: string; value: unknown }[] = [];
  const source = {
    writes,
    getScoped(_section: string, _scope: unknown, key: string) {
      return Object.prototype.hasOwnProperty.call(getValues, key)
        ? getValues[key]
        : undefined;
    },
    inspectGlobal() {
      return undefined;
    },
    updateScoped: async (
      _section: string,
      _scope: unknown,
      key: string,
      value: unknown
    ) => {
      writes.push({ key, value });
    },
    updateGlobal: async (key: string, value: unknown) => {
      writes.push({ key, value });
    },
    refreshConfiguration: () => undefined,
  };
  return source;
}

suite("OpenOCD adapter binding", () => {
  suiteSetup(() => {
    const absPath = (filename: string) =>
      resolve(__dirname, "..", "..", "..", filename);
    const mockUpContext = {
      extensionPath: resolve(__dirname, "..", "..", ".."),
      asAbsolutePath: absPath,
      workspaceState: createMockMemento(),
      globalState: createMockMemento(),
    } as vscode.ExtensionContext;
    Logger.init(mockUpContext);
    ESP.ProjectConfiguration.store = ProjectConfigStore.resetForTests(
      mockUpContext
    );
  });

  teardown(() => {
    setAdapterBindingTestHooks();
    setAdapterCommandTestHooks();
    resetIdfConfigurationSource();
    clearAdapterSerial(fakeWorkspaceFolder.uri);
  });

  suite("adapterSerial", () => {
    test("outputIndicatesAdapterSerialNotFound matches the OpenOCD line", () => {
      assert.ok(
        outputIndicatesAdapterSerialNotFound(
          "Info : esp_usb_jtag: VID set to 0x303a and PID to 0x1001\nInfo : No device matches the serial string\nError: esp_usb_jtag: could not find or open device!"
        )
      );
    });

    test("outputIndicatesAdapterSerialNotFound ignores other failures", () => {
      assert.strictEqual(
        outputIndicatesAdapterSerialNotFound(
          "Error: esp_usb_jtag: could not find or open device!"
        ),
        false
      );
    });

    test("parseAdapterSerialFromLog extracts the usb-jtag serial", () => {
      assert.strictEqual(
        parseAdapterSerialFromLog(
          Buffer.from("Info : esp_usb_jtag: serial (30:ED:A0:E4:22:94)")
        ),
        "30:ED:A0:E4:22:94"
      );
      assert.strictEqual(
        parseAdapterSerialFromLog("Info : Listening on port 4444"),
        undefined
      );
    });

    test("store, read and clear round trip through the project store", () => {
      storeAdapterSerial(fakeWorkspaceFolder.uri, "88:56:A6:FE:35:C8");
      assert.strictEqual(
        getStoredAdapterSerial(fakeWorkspaceFolder.uri),
        "88:56:A6:FE:35:C8"
      );
      clearAdapterSerial(fakeWorkspaceFolder.uri);
      assert.strictEqual(
        getStoredAdapterSerial(fakeWorkspaceFolder.uri),
        undefined
      );
    });
  });

  suite("resolveAdapterBindingForLaunch", () => {
    const workspaceUri =
      vscode.workspace.workspaceFolders?.[0].uri || fakeWorkspaceFolder.uri;

    function stubDetection(boards: ConnectedBoard[]) {
      let calls = 0;
      setAdapterBindingTestHooks({
        detectConnectedBoards: async () => {
          calls += 1;
          return { boards };
        },
      });
      return () => calls;
    }

    test("skips detection when no serial is stored", async () => {
      const calls = stubDetection([board({ serial_number: "AA:BB" })]);
      const binding = await resolveAdapterBindingForLaunch(workspaceUri, {
        location: "1-2",
      });
      assert.deepStrictEqual(binding, { location: "1-2", stale: false });
      assert.strictEqual(calls(), 0);
    });

    test("keeps the binding when the uri is not a workspace folder", async () => {
      const calls = stubDetection([]);
      const binding = await resolveAdapterBindingForLaunch(
        vscode.Uri.file("/not/a/workspace/folder"),
        { serial: "AA:BB", location: "1-2" }
      );
      assert.deepStrictEqual(binding, {
        serial: "AA:BB",
        location: "1-2",
        stale: false,
      });
      assert.strictEqual(calls(), 0);
    });

    test("keeps the binding when detection finds no boards", async () => {
      stubDetection([]);
      const binding = await resolveAdapterBindingForLaunch(workspaceUri, {
        serial: "AA:BB",
        location: "1-2",
      });
      assert.deepStrictEqual(binding, {
        serial: "AA:BB",
        location: "1-2",
        stale: false,
      });
    });

    test("keeps the binding when the stored serial is connected", async () => {
      stubDetection([
        board({ serial_number: "11:22", location: "usb://1-1" }),
        board({ serial_number: "aa:bb", location: "usb://1-2" }),
      ]);
      const binding = await resolveAdapterBindingForLaunch(workspaceUri, {
        serial: "AA:BB",
        location: "1-2",
      });
      assert.deepStrictEqual(binding, {
        serial: "AA:BB",
        location: "1-2",
        stale: false,
      });
    });

    test("drops the serial and keeps a location another board occupies", async () => {
      stubDetection([board({ serial_number: "11:22", location: "usb://1-2" })]);
      const binding = await resolveAdapterBindingForLaunch(workspaceUri, {
        serial: "AA:BB",
        location: "1-2",
      });
      assert.deepStrictEqual(binding, {
        serial: undefined,
        location: "1-2",
        stale: true,
      });
    });

    test("drops both when neither serial nor location is connected", async () => {
      stubDetection([board({ serial_number: "11:22", location: "usb://1-5" })]);
      const binding = await resolveAdapterBindingForLaunch(workspaceUri, {
        serial: "AA:BB",
        location: "1-2",
      });
      assert.deepStrictEqual(binding, {
        serial: undefined,
        location: undefined,
        stale: true,
      });
    });
  });

  suite("runOpenOcdAdapterCommand", () => {
    function stubQuickPick(
      pick: (
        items: AdapterCommandQuickPickItem[]
      ) => AdapterCommandQuickPickItem | undefined,
      serverRunning = false
    ) {
      const seen: {
        items: AdapterCommandQuickPickItem[];
        placeHolder?: string;
      } = { items: [] };
      let selectCalls = 0;
      let stopCalls = 0;
      setAdapterCommandTestHooks({
        showQuickPick: async (items, options) => {
          seen.items = items;
          seen.placeHolder = options.placeHolder;
          return pick(items);
        },
        selectConnectedBoard: async () => {
          selectCalls += 1;
        },
        openOcdServer: {
          isRunning: () => serverRunning,
          stop: () => {
            stopCalls += 1;
          },
        },
      });
      return {
        seen,
        selectCalls: () => selectCalls,
        stopCalls: () => stopCalls,
      };
    }

    test("shows the stored serial and location in the placeholder", async () => {
      storeAdapterSerial(fakeWorkspaceFolder.uri, "AA:BB");
      setIdfConfigurationSource(
        createFakeIdfSource({
          "idf.customExtraVars": { OPENOCD_USB_ADAPTER_LOCATION: "1-2" },
        })
      );
      const { seen } = stubQuickPick(() => undefined);

      await runOpenOcdAdapterCommand(fakeWorkspaceFolder);

      assert.ok(seen.placeHolder?.includes("AA:BB"));
      assert.ok(seen.placeHolder?.includes("1-2"));
      assert.deepStrictEqual(
        seen.items.map((i) => i.action),
        ["select", "clear"]
      );
    });

    test("does nothing when the quick pick is dismissed", async () => {
      storeAdapterSerial(fakeWorkspaceFolder.uri, "AA:BB");
      const source = createFakeIdfSource({
        "idf.customExtraVars": { OPENOCD_USB_ADAPTER_LOCATION: "1-2" },
      });
      setIdfConfigurationSource(source);
      const { selectCalls } = stubQuickPick(() => undefined);

      await runOpenOcdAdapterCommand(fakeWorkspaceFolder);

      assert.strictEqual(
        getStoredAdapterSerial(fakeWorkspaceFolder.uri),
        "AA:BB"
      );
      assert.deepStrictEqual(source.writes, []);
      assert.strictEqual(selectCalls(), 0);
    });

    test("select runs the connected board flow and keeps the binding", async () => {
      storeAdapterSerial(fakeWorkspaceFolder.uri, "AA:BB");
      const source = createFakeIdfSource({
        "idf.customExtraVars": { OPENOCD_USB_ADAPTER_LOCATION: "1-2" },
      });
      setIdfConfigurationSource(source);
      const { selectCalls } = stubQuickPick((items) =>
        items.find((i) => i.action === "select")
      );

      await runOpenOcdAdapterCommand(fakeWorkspaceFolder);

      assert.strictEqual(selectCalls(), 1);
      assert.strictEqual(
        getStoredAdapterSerial(fakeWorkspaceFolder.uri),
        "AA:BB"
      );
      assert.deepStrictEqual(source.writes, []);
    });

    test("clear removes the serial and the location", async () => {
      storeAdapterSerial(fakeWorkspaceFolder.uri, "AA:BB");
      const source = createFakeIdfSource({
        "idf.customExtraVars": {
          OPENOCD_USB_ADAPTER_LOCATION: "1-2",
          OPENOCD_SCRIPTS: "/opt/openocd/scripts",
        },
      });
      setIdfConfigurationSource(source);
      stubQuickPick((items) => items.find((i) => i.action === "clear"));

      await runOpenOcdAdapterCommand(fakeWorkspaceFolder);

      assert.strictEqual(
        getStoredAdapterSerial(fakeWorkspaceFolder.uri),
        undefined
      );
      assert.deepStrictEqual(source.writes, [
        {
          key: "idf.customExtraVars",
          value: { OPENOCD_SCRIPTS: "/opt/openocd/scripts" },
        },
      ]);
    });

    test("clear stops a running OpenOCD server", async () => {
      storeAdapterSerial(fakeWorkspaceFolder.uri, "AA:BB");
      setIdfConfigurationSource(createFakeIdfSource({}));
      const { stopCalls } = stubQuickPick(
        (items) => items.find((i) => i.action === "clear"),
        true
      );

      await runOpenOcdAdapterCommand(fakeWorkspaceFolder);

      assert.strictEqual(stopCalls(), 1);
      assert.strictEqual(
        getStoredAdapterSerial(fakeWorkspaceFolder.uri),
        undefined
      );
    });

    test("clear does not touch settings when no location is stored", async () => {
      storeAdapterSerial(fakeWorkspaceFolder.uri, "AA:BB");
      const source = createFakeIdfSource({
        "idf.customExtraVars": { OPENOCD_SCRIPTS: "/opt/openocd/scripts" },
      });
      setIdfConfigurationSource(source);
      stubQuickPick((items) => items.find((i) => i.action === "clear"));

      await runOpenOcdAdapterCommand(fakeWorkspaceFolder);

      assert.strictEqual(
        getStoredAdapterSerial(fakeWorkspaceFolder.uri),
        undefined
      );
      assert.deepStrictEqual(source.writes, []);
    });
  });
});
