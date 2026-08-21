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
  loadValueRequest,
  resetValueRequest,
  saveValueRequest,
  setValueRequest,
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
  suite("setValueRequest", () => {
    test("builds choice payload", () => {
      const menu = createMenu(menuType.choice, { value: "CONFIG_CHOICE_A" });
      assert.deepStrictEqual(parseRequest(setValueRequest(menu)), {
        version: 2,
        set: { CONFIG_CHOICE_A: true },
      });
    });

    test("builds string payload", () => {
      const menu = createMenu(menuType.string, { value: "hello" });
      assert.deepStrictEqual(parseRequest(setValueRequest(menu)), {
        version: 2,
        set: { CFG_ID: "hello" },
      });
    });

    test("uses zero for empty hex value", () => {
      const menu = createMenu(menuType.hex, { value: "" });
      assert.deepStrictEqual(parseRequest(setValueRequest(menu)), {
        version: 2,
        set: { CFG_ID: "0" },
      });
    });

    test("uses first range value for empty int value", () => {
      const menu = createMenu(menuType.int, { value: "", range: [10, 20] });
      assert.deepStrictEqual(parseRequest(setValueRequest(menu)), {
        version: 2,
        set: { CFG_ID: 10 },
      });
    });
  });

  suite("resetValueRequest", () => {
    test("builds reset payload for one element", () => {
      assert.deepStrictEqual(parseRequest(resetValueRequest(["CONFIG_A"])), {
        version: 3,
        reset: ["CONFIG_A"],
      });
    });

    test("builds reset payload for multiple elements", () => {
      assert.deepStrictEqual(
        parseRequest(resetValueRequest(["CONFIG_A", "CONFIG_B"])),
        {
          version: 3,
          reset: ["CONFIG_A", "CONFIG_B"],
        }
      );
    });
  });

  test("saveValueRequest includes version and path", () => {
    assert.deepStrictEqual(parseRequest(saveValueRequest("/tmp/sdkconfig")), {
      version: 2,
      save: "/tmp/sdkconfig",
    });
  });

  test("loadValueRequest includes version and path", () => {
    assert.deepStrictEqual(parseRequest(loadValueRequest("/tmp/sdkconfig")), {
      version: 2,
      load: "/tmp/sdkconfig",
    });
  });
});
