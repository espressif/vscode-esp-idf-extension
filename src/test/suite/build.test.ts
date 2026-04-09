/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import * as assert from "assert";
import { BuildTask } from "../../build/buildTask";
import {
  applySdkconfigDefaultsAndCcacheArgs,
  replaceBuildDirArg,
} from "../../build/buildHelpers";
import { reserveBuildSlotOrThrow } from "../../build/validation";

suite("Build", () => {
  teardown(() => {
    BuildTask.releaseBuildReservation();
  });

  suite("build slot reservation", () => {
    test("tryReserveBuild acquires then rejects second caller", () => {
      assert.strictEqual(BuildTask.tryReserveBuild(), true);
      assert.strictEqual(BuildTask.isBuilding, true);
      assert.strictEqual(BuildTask.tryReserveBuild(), false);
    });

    test("releaseBuildReservation allows a new acquire", () => {
      assert.strictEqual(BuildTask.tryReserveBuild(), true);
      BuildTask.releaseBuildReservation();
      assert.strictEqual(BuildTask.isBuilding, false);
      assert.strictEqual(BuildTask.tryReserveBuild(), true);
    });

    test("reserveBuildSlotOrThrow throws when slot is held", () => {
      assert.strictEqual(BuildTask.tryReserveBuild(), true);
      assert.throws(
        () => reserveBuildSlotOrThrow(),
        (e: Error) => e.message === "ALREADY_BUILDING"
      );
    });

    test("reserveBuildSlotOrThrow succeeds when slot is free", () => {
      reserveBuildSlotOrThrow();
      assert.strictEqual(BuildTask.isBuilding, true);
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
        applySdkconfigDefaultsAndCcacheArgs(args, "/ws/sdkconfig", [], false);
        assert.deepStrictEqual(args, ["-DSDKCONFIG='/ws/sdkconfig'"]);
      });

      test("skips SDKCONFIG when args already pass -DSDKCONFIG=...", () => {
        const args = ["-DSDKCONFIG=/existing"];
        applySdkconfigDefaultsAndCcacheArgs(args, "/ws/sdkconfig", [], false);
        assert.deepStrictEqual(args, ["-DSDKCONFIG=/existing"]);
      });

      test("appends SDKCONFIG_DEFAULTS joined with semicolons", () => {
        const args: string[] = [];
        applySdkconfigDefaultsAndCcacheArgs(args, "/cfg", ["a", "b"], false);
        assert.deepStrictEqual(args, [
          "-DSDKCONFIG='/cfg'",
          "-DSDKCONFIG_DEFAULTS='a;b'",
        ]);
      });

      test("omits SDKCONFIG_DEFAULTS when list is empty", () => {
        const args: string[] = [];
        applySdkconfigDefaultsAndCcacheArgs(args, "/cfg", [], false);
        assert.deepStrictEqual(args, ["-DSDKCONFIG='/cfg'"]);
      });

      test("skips SDKCONFIG_DEFAULTS when args already pass -DSDKCONFIG_DEFAULTS=...", () => {
        const args = ["-DSDKCONFIG_DEFAULTS=/existing"];
        applySdkconfigDefaultsAndCcacheArgs(args, "/cfg", ["x"], false);
        assert.deepStrictEqual(args, [
          "-DSDKCONFIG_DEFAULTS=/existing",
          "-DSDKCONFIG='/cfg'",
        ]);
      });

      test("appends CCACHE flag when enabled and args are non-empty", () => {
        const args = ["-G", "Ninja"];
        applySdkconfigDefaultsAndCcacheArgs(args, "/cfg", [], true);
        assert.ok(args.includes("-DCCACHE_ENABLE=1"));
      });

      test("appends CCACHE after SDKCONFIG when enabled and args started empty", () => {
        const args: string[] = [];
        applySdkconfigDefaultsAndCcacheArgs(args, "/cfg", [], true);
        assert.ok(args.includes("-DCCACHE_ENABLE=1"));
        assert.ok(args.includes("-DSDKCONFIG='/cfg'"));
      });

      test("does not append CCACHE when disabled", () => {
        const args = ["-G", "Ninja"];
        applySdkconfigDefaultsAndCcacheArgs(args, "/cfg", [], false);
        assert.strictEqual(args.indexOf("-DCCACHE_ENABLE=1"), -1);
      });

      test("does not duplicate CCACHE flag", () => {
        const args = ["-DCCACHE_ENABLE=1"];
        applySdkconfigDefaultsAndCcacheArgs(args, "/cfg", [], true);
        assert.strictEqual(
          args.filter((a) => a === "-DCCACHE_ENABLE=1").length,
          1
        );
      });
    });
  });
});
