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
import { Menu, menuType } from "../../espIdf/menuconfig/Menu";
import {
  findMenuPath,
  nearestMenuAncestorId,
} from "../../espIdf/menuconfig/findMenuPath";

function menu(
  id: string,
  type: menuType,
  children: Menu[] = []
): Menu {
  return {
    id,
    name: id,
    help: "",
    range: [],
    title: id,
    type,
    isVisible: true,
    isCollapsed: false,
    value: true,
    dependsOn: "",
    isMenuconfig: false,
    default: null,
    children,
  };
}

suite("findMenuPath", () => {
  const tree = [
    menu("ROOT", menuType.menu, [
      menu("CHILD_INT", menuType.int),
      menu("NESTED_MENU", menuType.menu, [menu("LEAF", menuType.string)]),
    ]),
  ];

  test("returns path from root to leaf", () => {
    const path = findMenuPath(tree, "LEAF");
    assert.deepStrictEqual(
      path?.map((node) => node.id),
      ["ROOT", "NESTED_MENU", "LEAF"]
    );
    assert.strictEqual(nearestMenuAncestorId(path ?? []), "NESTED_MENU");
  });

  test("returns undefined when id is missing", () => {
    assert.strictEqual(findMenuPath(tree, "MISSING"), undefined);
  });
});
