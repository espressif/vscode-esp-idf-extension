/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 9th November 2026 12:00:00 pm
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
import { buildOpenOcdLaunch } from "../../espIdf/openOcd/openOcdArgs";

suite("OpenOCD launch arguments", () => {
  const generated = {
    launchArgs: [] as string[],
    configFiles: ["board/esp32s3-builtin.cfg"],
    debugLevel: 2,
    useLocationCommand: true,
    useDetectConfigSerial: true,
  };

  test("generated arguments carry the serial, the location and the config files", () => {
    const plan = buildOpenOcdLaunch({
      ...generated,
      configFiles: ["interface/esp_usb_jtag.cfg", "target/esp32s3.cfg"],
      storedSerial: "AA:BB",
      adapterLocation: "1-7",
    });
    assert.deepStrictEqual(plan, {
      args: [
        "-d2",
        "-c",
        "adapter serial AA:BB",
        "-c",
        "adapter usb location 1-7",
        "-f",
        "interface/esp_usb_jtag.cfg",
        "-f",
        "target/esp32s3.cfg",
      ],
      envAdapterLocation: undefined,
    });
  });

  test("generated arguments skip a config file that is already present", () => {
    const plan = buildOpenOcdLaunch({
      ...generated,
      configFiles: ["board/esp32s3-builtin.cfg", "board/esp32s3-builtin.cfg"],
    });
    assert.deepStrictEqual(plan.args, [
      "-d2",
      "-f",
      "board/esp32s3-builtin.cfg",
    ]);
  });

  test("older OpenOCD gets the location through the environment instead of a command", () => {
    const plan = buildOpenOcdLaunch({
      ...generated,
      useLocationCommand: false,
      storedSerial: "AA:BB",
      adapterLocation: "1-7",
    });
    assert.deepStrictEqual(plan, {
      args: [
        "-d2",
        "-c",
        "adapter serial AA:BB",
        "-f",
        "board/esp32s3-builtin.cfg",
      ],
      envAdapterLocation: "1-7",
    });
  });

  test("a dropped location reaches neither the arguments nor the environment", () => {
    const plan = buildOpenOcdLaunch({
      ...generated,
      useLocationCommand: false,
      adapterLocation: undefined,
    });
    assert.deepStrictEqual(plan, {
      args: ["-d2", "-f", "board/esp32s3-builtin.cfg"],
      envAdapterLocation: undefined,
    });
  });

  test("serial discovery on older OpenOCD raises the debug level to 2", () => {
    const low = buildOpenOcdLaunch({
      ...generated,
      debugLevel: "0",
      useDetectConfigSerial: false,
    });
    assert.strictEqual(low.args[0], "-d2");

    const high = buildOpenOcdLaunch({
      ...generated,
      debugLevel: 3,
      useDetectConfigSerial: false,
    });
    assert.strictEqual(high.args[0], "-d3");

    const pinned = buildOpenOcdLaunch({
      ...generated,
      debugLevel: 0,
      useDetectConfigSerial: false,
      storedSerial: "AA:BB",
    });
    assert.strictEqual(pinned.args[0], "-d0");
  });

  test("an unreadable debug level falls back to 0", () => {
    const plan = buildOpenOcdLaunch({ ...generated, debugLevel: "" });
    assert.strictEqual(plan.args[0], "-d0");
  });

  test("custom launch arguments replace the generated ones and never carry the serial", () => {
    const plan = buildOpenOcdLaunch({
      ...generated,
      launchArgs: ["-d3", "-f", "custom.cfg"],
      storedSerial: "AA:BB",
    });
    assert.deepStrictEqual(plan, {
      args: ["-d3", "-f", "custom.cfg"],
      envAdapterLocation: undefined,
    });
  });

  test("custom launch arguments get the resolved location prepended once", () => {
    const first = buildOpenOcdLaunch({
      ...generated,
      launchArgs: ["-f", "custom.cfg"],
      storedSerial: "AA:BB",
      adapterLocation: "1-7",
    });
    assert.deepStrictEqual(first.args, [
      "-c",
      "adapter usb location 1-7",
      "-f",
      "custom.cfg",
    ]);

    const own = buildOpenOcdLaunch({
      ...generated,
      launchArgs: ["-c", "adapter usb location 1-2", "-f", "custom.cfg"],
      storedSerial: "AA:BB",
      adapterLocation: "1-7",
    });
    assert.deepStrictEqual(own.args, [
      "-c",
      "adapter usb location 1-2",
      "-f",
      "custom.cfg",
    ]);
  });

  test("custom launch arguments pass a dropped location nowhere", () => {
    const plan = buildOpenOcdLaunch({
      ...generated,
      launchArgs: ["-f", "custom.cfg"],
      useLocationCommand: false,
      adapterLocation: undefined,
    });
    assert.deepStrictEqual(plan, {
      args: ["-f", "custom.cfg"],
      envAdapterLocation: undefined,
    });
  });

  test("custom launch arguments get -d2 only when the serial must be read from the log", () => {
    const discovery = buildOpenOcdLaunch({
      ...generated,
      launchArgs: ["-f", "custom.cfg"],
      useDetectConfigSerial: false,
    });
    assert.deepStrictEqual(discovery.args, ["-d2", "-f", "custom.cfg"]);

    const ownLevel = buildOpenOcdLaunch({
      ...generated,
      launchArgs: ["-d3", "-f", "custom.cfg"],
      useDetectConfigSerial: false,
    });
    assert.deepStrictEqual(ownLevel.args, ["-d3", "-f", "custom.cfg"]);

    const detectConfig = buildOpenOcdLaunch({
      ...generated,
      launchArgs: ["-f", "custom.cfg"],
    });
    assert.deepStrictEqual(detectConfig.args, ["-f", "custom.cfg"]);
  });

  test("non-array settings are treated as empty", () => {
    const plan = buildOpenOcdLaunch({
      ...generated,
      launchArgs: "",
      configFiles: "",
    });
    assert.deepStrictEqual(plan.args, ["-d2"]);
  });
});
