/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import * as assert from "assert";
import { Menu, menuType } from "../../espIdf/menuconfig/Menu";
import { createMenuconfigPanelController } from "../../espIdf/menuconfig/panel/controller";

function createMenuForMessage(): Menu {
  return {
    id: "CFG_ID",
    name: "CFG_NAME",
    help: "",
    range: [],
    title: "Title",
    type: menuType.bool,
    isVisible: true,
    isCollapsed: false,
    value: true,
    dependsOn: "",
    isMenuconfig: false,
    default: null,
    children: [],
  };
}

suite("menuconfigPanelController", () => {
  test("routes updateValue to setUpdatedValue", async () => {
    let receivedMenu: Menu | undefined;
    const controller = createMenuconfigPanelController({
      setUpdatedValue: (menu) => {
        receivedMenu = menu;
      },
      resetElementById: () => {},
      resetElementChildren: () => {},
      setDefault: async () => {},
      saveChanges: () => {},
      discardChanges: () => {},
      requestInitValues: () => {},
    });

    const menu = createMenuForMessage();
    await controller({
      command: "updateValue",
      updated_value: JSON.stringify(menu),
    });

    assert.deepStrictEqual(receivedMenu, menu);
  });

  test("routes reset and init commands", async () => {
    const calls: string[] = [];
    const controller = createMenuconfigPanelController({
      setUpdatedValue: () => {},
      resetElementById: (id) => calls.push(`reset:${id}`),
      resetElementChildren: (children) =>
        calls.push(`resetChildren:${children.join(",")}`),
      setDefault: async () => {},
      saveChanges: () => {},
      discardChanges: () => {},
      requestInitValues: () => calls.push("init"),
    });

    await controller({ command: "resetElement", id: "CONFIG_A" });
    await controller({
      command: "resetElementChildren",
      children: ["CONFIG_A", "CONFIG_B"],
    });
    await controller({ command: "requestInitValues" });

    assert.deepStrictEqual(calls, [
      "reset:CONFIG_A",
      "resetChildren:CONFIG_A,CONFIG_B",
      "init",
    ]);
  });

  test("routes save, discard and default commands", async () => {
    const calls: string[] = [];
    const controller = createMenuconfigPanelController({
      setUpdatedValue: () => {},
      resetElementById: () => {},
      resetElementChildren: () => {},
      setDefault: async () => {
        calls.push("default");
      },
      saveChanges: () => calls.push("save"),
      discardChanges: () => calls.push("discard"),
      requestInitValues: () => {},
    });

    await controller({ command: "saveChanges" });
    await controller({ command: "discardChanges" });
    await controller({ command: "setDefault" });

    assert.deepStrictEqual(calls, ["save", "discard", "default"]);
  });

  test("routes unknown command to fallback callback", async () => {
    let unknownCommand: string | undefined;
    const controller = createMenuconfigPanelController({
      setUpdatedValue: () => {},
      resetElementById: () => {},
      resetElementChildren: () => {},
      setDefault: async () => {},
      saveChanges: () => {},
      discardChanges: () => {},
      requestInitValues: () => {},
      onUnknownCommand: (command) => {
        unknownCommand = command;
      },
    });

    await controller({ command: "not-supported-command" });
    assert.strictEqual(unknownCommand, "not-supported-command");
  });
});
