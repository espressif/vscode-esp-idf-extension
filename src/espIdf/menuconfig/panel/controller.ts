/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import { Menu } from "../Menu";

interface MenuconfigIncomingMessage {
  command?: string;
  id?: string;
  children?: string[];
  updated_value?: string;
}

export interface MenuconfigPanelControllerDeps {
  setUpdatedValue: (menu: Menu) => void;
  resetElementById: (id: string) => void;
  resetElementChildren: (children: string[]) => void;
  setDefault: () => Promise<void>;
  saveChanges: () => void;
  discardChanges: () => void;
  requestInitValues: () => void;
  onUnknownCommand?: (command?: string) => void;
}

function parseUpdatedMenu(updatedValue?: string): Menu | undefined {
  if (!updatedValue) {
    return undefined;
  }
  try {
    return JSON.parse(updatedValue) as Menu;
  } catch {
    return undefined;
  }
}

export function createMenuconfigPanelController(
  deps: MenuconfigPanelControllerDeps
) {
  return async (message: MenuconfigIncomingMessage) => {
    switch (message.command) {
      case "updateValue": {
        const updatedMenu = parseUpdatedMenu(message.updated_value);
        if (updatedMenu) {
          deps.setUpdatedValue(updatedMenu);
        }
        return;
      }
      case "resetElement":
        if (message.id) {
          deps.resetElementById(message.id);
        }
        return;
      case "resetElementChildren":
        deps.resetElementChildren(message.children || []);
        return;
      case "setDefault":
        await deps.setDefault();
        return;
      case "saveChanges":
        deps.saveChanges();
        return;
      case "discardChanges":
        deps.discardChanges();
        return;
      case "requestInitValues":
        deps.requestInitValues();
        return;
      default:
        deps.onUnknownCommand?.(message.command);
    }
  };
}
