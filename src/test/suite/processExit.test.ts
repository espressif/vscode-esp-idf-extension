import * as assert from "assert";
import { spawn } from "child_process";
import { hasProcessExited, waitForProcessExit } from "../../common/processExit";

function spawnIdleNode() {
  return spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
    stdio: "ignore",
  });
}

suite("processExit", function () {
  this.timeout(15000);

  test("resolves true once a killed process has exited", async () => {
    const proc = spawnIdleNode();
    proc.kill();
    assert.strictEqual(await waitForProcessExit(proc, 5000), true);
    assert.strictEqual(hasProcessExited(proc), true);
  });

  test("resolves true immediately for a process that already exited", async () => {
    const proc = spawn(process.execPath, ["-e", "process.exit(0)"], {
      stdio: "ignore",
    });
    await new Promise<void>((resolve) => proc.once("exit", () => resolve()));
    assert.strictEqual(hasProcessExited(proc), true);
    assert.strictEqual(await waitForProcessExit(proc, 5000), true);
  });

  test("resolves false when the process outlives the timeout", async () => {
    const proc = spawnIdleNode();
    try {
      assert.strictEqual(await waitForProcessExit(proc, 200), false);
      assert.strictEqual(hasProcessExited(proc), false);
    } finally {
      proc.kill();
      await waitForProcessExit(proc, 5000);
    }
  });
});
