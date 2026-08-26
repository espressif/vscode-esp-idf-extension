/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import * as assert from "assert";
import { BuildSession } from "../../build/buildSession";
import {
  applySdkconfigDefaultsAndCcacheArgs,
  replaceBuildDirArg,
} from "../../build/buildHelpers";
import { isKnownError } from "../../common/error/knownError";
import { ErrorCode } from "../../common/error/types";

suite("Build", () => {
  teardown(() => {
    BuildSession.endActiveForTests();
  });

  suite("build slot reservation", () => {
    test("acquire rejects second caller", () => {
      BuildSession.acquire();
      assert.strictEqual(BuildSession.isActive, true);
      assert.throws(
        () => BuildSession.acquire(),
        (e: unknown) => isKnownError(e) && e.code === ErrorCode.AlreadyBuilding
      );
    });

    test("end allows a new acquire", () => {
      const session = BuildSession.acquire();
      session.end();
      assert.strictEqual(BuildSession.isActive, false);
      assert.doesNotThrow(() => BuildSession.acquire());
    });
  });

  suite("buildHelpers", () => {
    suite("replaceBuildDirArg", () => {
      test("appends -B when absent", () => {
        const args = ["-G", "Ninja"];
        replaceBuildDirArg(args, "/tmp/build");
        assert.deepStrictEqual(args, ["-G", "Ninja", "-B", "/tmp/build"]);
      });

      test("replaces existing -B and path", () => {
        const args = ["-G", "Ninja", "-B", "/old", "-S", "."];
        replaceBuildDirArg(args, "/new");
        assert.deepStrictEqual(args, ["-G", "Ninja", "-S", ".", "-B", "/new"]);
      });

      test("second call updates build dir only", () => {
        const args = ["-G", "Ninja"];
        replaceBuildDirArg(args, "/first");
        replaceBuildDirArg(args, "/second");
        assert.deepStrictEqual(args, ["-G", "Ninja", "-B", "/second"]);
      });
    });

    suite("applySdkconfigDefaultsAndCcacheArgs", () => {
      test("appends SDKCONFIG path when not already present", () => {
        const args: string[] = [];
        applySdkconfigDefaultsAndCcacheArgs(args, false, "/ws/sdkconfig", []);
        assert.deepStrictEqual(args, ["-DSDKCONFIG=/ws/sdkconfig"]);
      });

      test("skips SDKCONFIG when args already pass -DSDKCONFIG=...", () => {
        const args = ["-DSDKCONFIG=/existing"];
        applySdkconfigDefaultsAndCcacheArgs(args, false, "/ws/sdkconfig", []);
        assert.deepStrictEqual(args, ["-DSDKCONFIG=/existing"]);
      });

      test("appends SDKCONFIG_DEFAULTS joined with semicolons", () => {
        const args: string[] = [];
        applySdkconfigDefaultsAndCcacheArgs(args, false, "/cfg", ["a", "b"]);
        assert.deepStrictEqual(args, [
          "-DSDKCONFIG=/cfg",
          "-DSDKCONFIG_DEFAULTS=a;b",
        ]);
      });

      test("omits SDKCONFIG_DEFAULTS when list is empty", () => {
        const args: string[] = [];
        applySdkconfigDefaultsAndCcacheArgs(args, false, "/cfg", []);
        assert.deepStrictEqual(args, ["-DSDKCONFIG=/cfg"]);
      });

      test("skips SDKCONFIG_DEFAULTS when args already pass -DSDKCONFIG_DEFAULTS=...", () => {
        const args = ["-DSDKCONFIG_DEFAULTS=/existing"];
        applySdkconfigDefaultsAndCcacheArgs(args, false, "/cfg", ["x"]);
        assert.deepStrictEqual(args, [
          "-DSDKCONFIG_DEFAULTS=/existing",
          "-DSDKCONFIG=/cfg",
        ]);
      });

      test("appends CCACHE flag when enabled and args are non-empty", () => {
        const args = ["-G", "Ninja"];
        applySdkconfigDefaultsAndCcacheArgs(args, true, "/cfg", []);
        assert.ok(args.includes("-DCCACHE_ENABLE=1"));
      });

      test("appends CCACHE after SDKCONFIG when enabled and args started empty", () => {
        const args: string[] = [];
        applySdkconfigDefaultsAndCcacheArgs(args, true, "/cfg", []);
        assert.ok(args.includes("-DCCACHE_ENABLE=1"));
        assert.ok(args.includes("-DSDKCONFIG=/cfg"));
      });

      test("does not append CCACHE when disabled", () => {
        const args = ["-G", "Ninja"];
        applySdkconfigDefaultsAndCcacheArgs(args, false, "/cfg", []);
        assert.strictEqual(args.indexOf("-DCCACHE_ENABLE=1"), -1);
      });

      test("does not duplicate CCACHE flag", () => {
        const args = ["-DCCACHE_ENABLE=1"];
        applySdkconfigDefaultsAndCcacheArgs(args, true, "/cfg", []);
        assert.strictEqual(
          args.filter((a) => a === "-DCCACHE_ENABLE=1").length,
          1
        );
      });
    });
  });
});
