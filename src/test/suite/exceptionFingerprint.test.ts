import * as assert from "assert";
import { exceptionFingerprint } from "../../common/exceptionFingerprint";

suite("exceptionFingerprint Tests", () => {
  test("same error and category produce same fingerprint", () => {
    const error = new Error(
      "OpenOCD server failed to start because of Error: missing data from bitq interface"
    );
    const properties = { category: "OpenOCDManager stderr" };

    assert.equal(
      exceptionFingerprint(error, properties),
      exceptionFingerprint(error, properties)
    );
  });

  test("different categories produce different fingerprints", () => {
    const error = new Error("same message");

    assert.notEqual(
      exceptionFingerprint(error, { category: "OpenOCDManager stderr" }),
      exceptionFingerprint(error, { category: "OpenOCDManager close" })
    );
  });

  test("different messages produce different fingerprints", () => {
    const properties = { category: "OpenOCDManager stderr" };

    assert.notEqual(
      exceptionFingerprint(new Error("first"), properties),
      exceptionFingerprint(new Error("second"), properties)
    );
  });

  test("different process args produce different fingerprints", () => {
    const error = new Error("non zero exit code 1");
    const category = { category: "src utils spawn", command: "python" };

    assert.notEqual(
      exceptionFingerprint(error, { ...category, args: "idf.py set-target" }),
      exceptionFingerprint(error, { ...category, args: "idf.py build" })
    );
  });

  test("different task names produce different fingerprints", () => {
    const error = new Error("[TASK_FAILED_WITH_OUTPUT]");
    const properties = {
      category: "handleError espIdf.buildDevice",
      processCommand: "ninja",
    };

    assert.notEqual(
      exceptionFingerprint(error, { ...properties, taskName: "ESP-IDF Build" }),
      exceptionFingerprint(error, { ...properties, taskName: "ESP-IDF Size" })
    );
  });

  test("different knownErrorCodes produce different fingerprints", () => {
    const error = new Error("[TASK_FAILED_WITH_OUTPUT]");
    const properties = { category: "handleError espIdf.buildDevice" };

    assert.notEqual(
      exceptionFingerprint(error, {
        ...properties,
        knownErrorCode: "TaskFailedWithOutput",
      }),
      exceptionFingerprint(error, {
        ...properties,
        knownErrorCode: "ConfserverProcessFailed",
      })
    );
  });

  test("null and undefined errors produce stable fingerprints", () => {
    const properties = { category: "test" };

    assert.equal(
      exceptionFingerprint(null, properties),
      exceptionFingerprint(undefined, properties)
    );
    assert.equal(
      exceptionFingerprint(null, properties),
      "Error\0\0test\0\0\0\0\0"
    );
  });
});
