/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * You may not use this file except in compliance with the License.
 */

import * as assert from "assert";
import {
  environmentNotSupported,
  idfVersionTooLow,
  isKnownError,
  noWorkspaceOpen,
  toolchainNotFound,
} from "../../common/error/knownError";
import { resolveKnownErrorUserMessage } from "../../common/error/resolve";
import { ErrorCode } from "../../common/error/types";
import { PreCheck } from "../../common/PreCheck";

suite("PreCheck errors", () => {
  test("perform throws KnownError when workspace check fails", () => {
    assert.throws(
      () =>
        PreCheck.perform([[() => false, noWorkspaceOpen]], () => {
          throw new Error("should not run");
        }),
      (error: unknown) =>
        isKnownError(error) && error.code === ErrorCode.NO_WORKSPACE_OPEN
    );
  });

  test("perform runs proceed when all checks pass", () => {
    const result = PreCheck.perform([[() => true, noWorkspaceOpen]], () => "ok");
    assert.strictEqual(result, "ok");
  });

  suite("resolveKnownErrorUserMessage", () => {
    test("EnvironmentNotSupported interpolates envName", () => {
      assert.ok(
        resolveKnownErrorUserMessage(
          environmentNotSupported("Codespaces")
        )?.includes("Codespaces")
      );
    });

    test("IdfVersionTooLow interpolates versions", () => {
      const message = resolveKnownErrorUserMessage(
        idfVersionTooLow("4.3", "4.2")
      );
      assert.ok(message?.includes("4.3"));
      assert.ok(message?.includes("4.2"));
    });

    test("ToolchainNotFound interpolates toolchain", () => {
      assert.ok(
        resolveKnownErrorUserMessage(
          toolchainNotFound("xtensa-esp32-elf-gcc")
        )?.includes("xtensa-esp32-elf-gcc")
      );
    });
  });
});
