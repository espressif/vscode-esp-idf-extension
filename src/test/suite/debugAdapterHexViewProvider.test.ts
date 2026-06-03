/*
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import * as assert from "assert";
import { HexViewProvider } from "../../debugAdapter/hexViewProvider";

suite("debugAdapter HexViewProvider", () => {
  test("addElement exposes element via findElement and getChildren", async () => {
    const p = new HexViewProvider();
    p.addElement("foo", 42);
    const found = p.findElement("foo");
    assert.ok(found);
    assert.strictEqual(found!.value, 42);
    const children = await p.getChildren();
    assert.strictEqual(children.length, 1);
    assert.strictEqual(children[0].element.name, "foo");
  });

  test("updateElement changes stored value", () => {
    const p = new HexViewProvider();
    p.addElement("n", 1);
    p.updateElement("n", 99);
    assert.strictEqual(p.findElement("n")!.value, 99);
  });

  test("updateElement is no-op for unknown name", () => {
    const p = new HexViewProvider();
    p.addElement("n", 1);
    p.updateElement("missing", 2);
    assert.strictEqual(p.findElement("n")!.value, 1);
  });

  test("removeElement drops matching element", async () => {
    const p = new HexViewProvider();
    p.addElement("a", 1);
    p.addElement("b", 2);
    const a = p.findElement("a");
    assert.ok(a);
    p.removeElement(a!);
    const children = await p.getChildren();
    assert.strictEqual(children.length, 1);
    assert.strictEqual(children[0].element.name, "b");
  });
});
