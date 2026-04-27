/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import * as assert from "assert";
import { Menu, menuType } from "../../espIdf/menuconfig/Menu";
import {
  buildLoadRequest,
  buildResetRequest,
  buildSaveRequest,
  buildSetRequest,
} from "../../espIdf/menuconfig/confserver/protocol";

function createMenu(
  type: menuType,
  overrides: Partial<Menu> = {}
): Menu {
  return {
    id: "CFG_ID",
    name: "CFG_NAME",
    help: "",
    range: [],
    title: "Title",
    type,
    isVisible: true,
    isCollapsed: false,
    value: true,
    dependsOn: "",
    isMenuconfig: false,
    default: null,
    children: [],
    ...overrides,
  };
}

function parseRequest(request: string): any {
  assert.ok(request.endsWith("\n"));
  return JSON.parse(request.trim());
}

suite("menuconfig protocol", () => {
  suite("buildSetRequest", () => {
    test("builds choice payload", () => {
      const menu = createMenu(menuType.choice, { value: "CONFIG_CHOICE_A" });
      assert.deepStrictEqual(parseRequest(buildSetRequest(menu)), {
        version: 2,
        set: { CONFIG_CHOICE_A: true },
      });
    });

    test("builds string payload", () => {
      const menu = createMenu(menuType.string, { value: "hello" });
      assert.deepStrictEqual(parseRequest(buildSetRequest(menu)), {
        version: 2,
        set: { CFG_ID: "hello" },
      });
    });

    test("uses zero for empty hex value", () => {
      const menu = createMenu(menuType.hex, { value: "" });
      assert.deepStrictEqual(parseRequest(buildSetRequest(menu)), {
        version: 2,
        set: { CFG_ID: "0" },
      });
    });

    test("uses first range value for empty int value", () => {
      const menu = createMenu(menuType.int, { value: "", range: [10, 20] });
      assert.deepStrictEqual(parseRequest(buildSetRequest(menu)), {
        version: 2,
        set: { CFG_ID: 10 },
      });
    });
  });

  suite("buildResetRequest", () => {
    test("builds reset payload for one element", () => {
      assert.deepStrictEqual(parseRequest(buildResetRequest(["CONFIG_A"])), {
        version: 3,
        reset: ["CONFIG_A"],
      });
    });

    test("builds reset payload for multiple elements", () => {
      assert.deepStrictEqual(
        parseRequest(buildResetRequest(["CONFIG_A", "CONFIG_B"])),
        {
          version: 3,
          reset: ["CONFIG_A", "CONFIG_B"],
        }
      );
    });
  });

  test("buildSaveRequest includes version and path", () => {
    assert.deepStrictEqual(parseRequest(buildSaveRequest("/tmp/sdkconfig")), {
      version: 2,
      save: "/tmp/sdkconfig",
    });
  });

  test("buildLoadRequest includes version and path", () => {
    assert.deepStrictEqual(parseRequest(buildLoadRequest("/tmp/sdkconfig")), {
      version: 2,
      load: "/tmp/sdkconfig",
    });
  });
});
