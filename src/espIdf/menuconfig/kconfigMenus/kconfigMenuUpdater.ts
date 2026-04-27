/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import { KconfigMenuLoader } from "./loader";
import { Menu } from "../Menu";

export interface ConfserverValuesResponse {
  values: { [key: string]: any };
  visible: { [key: string]: boolean };
  ranges: { [key: string]: number[] };
  defaults?: { [key: string]: any };
  version?: number;
  error?: string;
}

export function parseConfserverValues(values: string): ConfserverValuesResponse {
  return JSON.parse(values) as ConfserverValuesResponse;
}

export function updateMenusWithValues(
  menus: Menu[],
  values: ConfserverValuesResponse
): Menu[] {
  return menus.map((menu) => KconfigMenuLoader.updateValues(menu, values));
}
