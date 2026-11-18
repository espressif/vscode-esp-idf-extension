import * as assert from "assert";
import { CancellationTokenSource, Uri, workspace } from "vscode";
import { buildMain } from "../../build/buildMain";
import { BuildSession } from "../../build/buildSession";
import { CleanSession } from "../../clean/cleanSession";
import { isKnownError, KnownError } from "../../common/error/knownError";
import { resolveKnownErrorUserMessage } from "../../common/error/resolve";
import { ErrorCode } from "../../common/error/types";
import { ESP } from "../../config";
import { loadMonitorLaunchConfig } from "../../espIdf/monitor/launchConfig";
import { FlashSession } from "../../flash/shared/flashSession";
import { verifyCanFlash } from "../../flash/verify/canFlash";

function isFullCleanInProgress(error: unknown): error is KnownError {
  return (
    isKnownError(error) &&
    error.code === ErrorCode.IdfTaskInProgress &&
    error.metadata?.taskName === "full clean"
  );
}

suite("CleanSession", () => {
  const workspaceUri = Uri.file("/tmp/clean-session-test");

  teardown(() => {
    CleanSession.endActiveForTests();
    BuildSession.endActiveForTests();
    FlashSession.endActiveForTests();
  });

  test("acquire rejects a second full clean", () => {
    CleanSession.acquire();
    assert.strictEqual(CleanSession.isActive, true);
    assert.throws(() => CleanSession.acquire(), isFullCleanInProgress);
  });

  test("end allows a new acquire", () => {
    const session = CleanSession.acquire();
    session.end();
    assert.strictEqual(CleanSession.isActive, false);
    assert.doesNotThrow(() => CleanSession.acquire());
  });

  test("end from a non-owner does not release the session", () => {
    CleanSession.acquire();
    const foreign = Object.create(CleanSession.prototype) as CleanSession;
    foreign.end();
    assert.strictEqual(CleanSession.isActive, true);
  });

  test("build is refused while a full clean holds the session", async () => {
    CleanSession.acquire();
    const tokenSource = new CancellationTokenSource();
    try {
      await assert.rejects(
        () => buildMain(workspaceUri, tokenSource.token, ESP.FlashType.UART),
        (error: unknown) =>
          isFullCleanInProgress(error) &&
          resolveKnownErrorUserMessage(error) ===
            "Wait for ESP-IDF full clean to finish before building."
      );
      assert.strictEqual(BuildSession.isActive, false);
    } finally {
      tokenSource.dispose();
    }
  });

  test("flash is refused while a full clean holds the session", async () => {
    CleanSession.acquire();
    await assert.rejects(
      () =>
        verifyCanFlash(
          "115200",
          "COM1",
          ESP.FlashType.UART,
          {},
          "/tmp/clean-session-test/build",
          workspaceUri
        ),
      isFullCleanInProgress
    );
    assert.strictEqual(FlashSession.isActive, false);
  });

  test("monitor is refused while a full clean holds the session", async () => {
    CleanSession.acquire();
    const workspaceFolder = workspace.workspaceFolders?.[0] ?? {
      uri: workspaceUri,
      name: "clean-session-test",
      index: 0,
    };
    await assert.rejects(
      () => loadMonitorLaunchConfig(workspaceFolder, false),
      (error: unknown) =>
        isFullCleanInProgress(error) &&
        resolveKnownErrorUserMessage(error) ===
          "Wait for ESP-IDF full clean to finish before starting the monitor."
    );
  });
});
