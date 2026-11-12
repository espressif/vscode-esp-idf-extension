import * as assert from "assert";
import { spawn } from "child_process";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { tmpdir, platform } from "os";
import { join } from "path";
import { isKnownError, known } from "../../common/error/knownError";
import { resolveKnownErrorDescriptor } from "../../common/error/resolve";
import { ErrorCode } from "../../common/error/types";
import { waitForProcessExit } from "../../common/processExit";
import { removePath, toLockedPathError } from "../../clean/removePath";

function errnoError(code: string): NodeJS.ErrnoException {
  const error: NodeJS.ErrnoException = new Error(`${code}: test`);
  error.code = code;
  return error;
}

suite("Full clean locked build directory", function () {
  this.timeout(30000);

  test("maps EBUSY, EPERM and ENOTEMPTY to BuildDirLocked with the path", () => {
    for (const code of ["EBUSY", "EPERM", "ENOTEMPTY"]) {
      const mapped = toLockedPathError(errnoError(code), "C:\\proj\\build");
      assert.ok(mapped && isKnownError(mapped), `${code} should map`);
      assert.strictEqual(mapped.code, ErrorCode.BuildDirLocked);
      assert.strictEqual(mapped.metadata?.path, "C:\\proj\\build");
      assert.strictEqual(mapped.metadata?.errnoCode, code);
    }
  });

  test("prefers the locked entry path reported by the error", () => {
    const error = errnoError("EBUSY");
    error.path = "C:\\proj\\build\\app.elf";
    const mapped = toLockedPathError(error, "C:\\proj\\build");
    assert.strictEqual(mapped?.metadata?.path, "C:\\proj\\build\\app.elf");
  });

  test("leaves other errors unmapped", () => {
    assert.strictEqual(toLockedPathError(errnoError("ENOENT"), "x"), undefined);
    assert.strictEqual(toLockedPathError(new Error("plain"), "x"), undefined);
    assert.strictEqual(toLockedPathError(undefined, "x"), undefined);
  });

  test("registry entry names the path and offers to show terminals", () => {
    const descriptor = resolveKnownErrorDescriptor(
      known(ErrorCode.BuildDirLocked, {
        path: "/proj/build",
        errnoCode: "EBUSY",
      })
    );
    assert.ok(descriptor);
    assert.ok(descriptor.userMessage.includes("/proj/build"));
    assert.ok(descriptor.userMessage.includes("ESP-IDF Monitor"));
    assert.ok(descriptor.logMessage.includes("EBUSY"));
    assert.strictEqual(descriptor.outputChannel, "ESP-IDF");
    assert.deepStrictEqual(
      descriptor.actions.map((action) => action.label),
      ["Show Terminals"]
    );
  });

  test("removePath deletes a directory tree and tolerates a missing path", async () => {
    const dir = mkdtempSync(join(tmpdir(), "full-clean-"));
    mkdirSync(join(dir, "nested"));
    writeFileSync(join(dir, "nested", "file.txt"), "x");
    await removePath(dir);
    assert.strictEqual(existsSync(dir), false);
    await removePath(dir);
  });

  test("removePath reports a directory held by another process", async function () {
    if (platform() !== "win32") {
      this.skip();
    }
    const dir = mkdtempSync(join(tmpdir(), "full-clean-locked-"));
    const held = join(dir, "held");
    mkdirSync(held);
    const holder = spawn(
      process.execPath,
      ["-e", "setInterval(() => {}, 1000)"],
      {
        cwd: held,
        stdio: "ignore",
      }
    );
    try {
      const started = Date.now();
      await assert.rejects(
        () => removePath(dir),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.BuildDirLocked &&
          typeof error.metadata?.path === "string" &&
          error.metadata.path.startsWith(dir)
      );
      assert.ok(Date.now() - started < 10000, "retries stay within budget");
    } finally {
      holder.kill();
      await waitForProcessExit(holder, 5000);
      await removePath(dir);
    }
  });
});
