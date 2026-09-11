/*
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import * as assert from "assert";
import {
  errorMessageFromUnknown,
  isImageVariableCommandContextReady,
  isVariableCommandContextReady,
} from "../../debugAdapter/commands/variableCommandContext";

function minimalContext(
  overrides: Partial<{
    evaluateName: string;
    type: string | undefined;
  }> = {}
) {
  return {
    container: {
      expensive: false,
      name: "Locals",
      variablesReference: 1,
    },
    sessionId: "s1",
    variable: {
      evaluateName: overrides.evaluateName ?? "x",
      memoryReference: "",
      name: "x",
      value: "1",
      variablesReference: 2,
      ...(overrides.type !== undefined ? { type: overrides.type } : {}),
    },
  };
}

suite("debugAdapter variableCommandContext errorMessageFromUnknown", () => {
  test("returns Error message when present", () => {
    assert.strictEqual(
      errorMessageFromUnknown(new Error("boom")),
      "boom"
    );
  });

  test("falls back to String when Error has empty message", () => {
    const s = errorMessageFromUnknown(new Error(""));
    assert.strictEqual(typeof s, "string");
    assert.ok(s.length > 0);
  });

  test("stringifies non-Error values", () => {
    assert.strictEqual(errorMessageFromUnknown(42), "42");
  });
});

suite("debugAdapter variableCommandContext readiness guards", () => {
  test("isVariableCommandContextReady is false for undefined", () => {
    assert.strictEqual(isVariableCommandContextReady(undefined), false);
  });

  test("isVariableCommandContextReady is false when evaluateName missing", () => {
    const ctx = minimalContext({ evaluateName: "" });
    assert.strictEqual(isVariableCommandContextReady(ctx), false);
  });

  test("isImageVariableCommandContextReady is false when base guard fails", () => {
    assert.strictEqual(isImageVariableCommandContextReady(undefined), false);
  });

  test("isImageVariableCommandContextReady is false when type is not a string", () => {
    const ctx = minimalContext() as {
      variable: { type?: unknown; evaluateName: string };
    };
    ctx.variable.type = 123;
    assert.strictEqual(isImageVariableCommandContextReady(ctx as never), false);
  });
});
