import * as assert from "assert";
import { homedir } from "os";
import {
  PROCESS_TELEMETRY_ARGS_MAX_LENGTH,
  REDACTED_PROCESS_ARG,
  capTelemetryText,
  firstPythonScript,
  processInvocationMetadata,
  redactHomeDir,
  sanitizeArgToken,
  sanitizeProcessInvocation,
  sanitizeTelemetryText,
} from "../../common/processTelemetry";

suite("processTelemetry", () => {
  test("replaces path tokens with basename", () => {
    const result = sanitizeProcessInvocation(
      "/home/user/.espressif/python_env/bin/python",
      [
        "/opt/esp/idf/tools/idf.py",
        "set-target",
        "esp32",
        "-DSDKCONFIG=/tmp/project/sdkconfig",
      ]
    );
    assert.strictEqual(result.processCommand, "python");
    assert.strictEqual(
      result.args,
      "idf.py set-target esp32 -DSDKCONFIG=sdkconfig"
    );
    assert.strictEqual(result.script, "idf.py");
  });

  test("redacts serial ports after -p and --port", () => {
    const uart = sanitizeProcessInvocation("python.exe", [
      "C:\\\\tools\\\\esptool.py",
      "-p",
      "COM3",
      "write_flash",
    ]);
    assert.strictEqual(uart.processCommand, "python.exe");
    assert.strictEqual(
      uart.args,
      `esptool.py -p ${REDACTED_PROCESS_ARG} write_flash`
    );
    assert.strictEqual(uart.script, "esptool.py");

    const unix = sanitizeProcessInvocation("python", [
      "esptool.py",
      "--port",
      "/dev/ttyUSB0",
      "chip_id",
    ]);
    assert.strictEqual(
      unix.args,
      `esptool.py --port ${REDACTED_PROCESS_ARG} chip_id`
    );

    assert.strictEqual(
      sanitizeArgToken("COM5", "--port"),
      REDACTED_PROCESS_ARG
    );
    assert.strictEqual(
      sanitizeArgToken("--port=/dev/cu.usbserial"),
      `--port=${REDACTED_PROCESS_ARG}`
    );
  });

  test("truncates long argument strings", () => {
    const longFlag = "x".repeat(PROCESS_TELEMETRY_ARGS_MAX_LENGTH + 50);
    const result = sanitizeProcessInvocation("ninja", [longFlag]);
    assert.strictEqual(
      result.args.length,
      PROCESS_TELEMETRY_ARGS_MAX_LENGTH + 1
    );
    assert.ok(result.args.endsWith("…"));
  });

  test("firstPythonScript skips non-script args", () => {
    assert.strictEqual(
      firstPythonScript(["-B", "build", "/idf/tools/idf_size.py", "app.map"]),
      "idf_size.py"
    );
    assert.strictEqual(firstPythonScript(["build", "flash"]), undefined);
  });

  test("tokenizes a shell command string when args are empty", () => {
    const result = sanitizeProcessInvocation(
      "python /home/user/esp/esp-idf/tools/idf.py build",
      []
    );
    assert.strictEqual(result.processCommand, "python");
    assert.strictEqual(result.args, "idf.py build");
    assert.strictEqual(result.script, "idf.py");
  });

  test("processInvocationMetadata sets command to sanitized executable", () => {
    const metadata = processInvocationMetadata(
      "/usr/bin/python3",
      ["/idf/tools/idf.py", "reconfigure"]
    );
    assert.strictEqual(metadata.command, "python3");
    assert.strictEqual(metadata.processCommand, "python3");
    assert.strictEqual(metadata.args, "idf.py reconfigure");
    assert.strictEqual(metadata.script, "idf.py");
  });

  test("capTelemetryText keeps short text and marks truncation", () => {
    assert.strictEqual(capTelemetryText("short", 100), "short");

    const capped = capTelemetryText("y".repeat(150), 100);
    assert.ok(capped.startsWith("y".repeat(100)));
    assert.ok(capped.includes("truncated 50 chars"));
  });

  test("redactHomeDir removes the user home path", () => {
    const home = homedir();
    const text = `ninja failed in ${home}/esp/project/build`;

    const redacted = redactHomeDir(text);
    assert.strictEqual(redacted, "ninja failed in ~/esp/project/build");
    assert.ok(!redacted.includes(home));
  });

  test("sanitizeTelemetryText redacts before capping", () => {
    const home = homedir();
    const text = `${home}/esp/project ${"z".repeat(200)}`;

    const sanitized = sanitizeTelemetryText(text, 50);
    assert.ok(sanitized.startsWith("~/esp/project"));
    assert.ok(!sanitized.includes(home));
    assert.ok(sanitized.includes("truncated"));
  });
});
