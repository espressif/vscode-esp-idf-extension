import * as assert from "assert";
import { getGcovExecutable } from "../../coverage/coverageService";
import { getGcovArgs } from "../../coverage/gcdaPaths";

suite("Test Coverage Unit Tests", () => {
  test("gcov executables based on idfTarget", () => {
    const esp32c3 = getGcovExecutable("esp32c3")
    const esp32c6 = getGcovExecutable("esp32c6")
    const esp32s2 = getGcovExecutable("esp32s2")
    const esp32s3 = getGcovExecutable("esp32s3")
    const esp32 = getGcovExecutable("esp32")

    assert.equal(esp32c3, "riscv32-esp-elf-gcov");
    assert.equal(esp32c6, "riscv32-esp-elf-gcov");
    assert.equal(esp32s2, "xtensa-esp32s2-elf-gcov");
    assert.equal(esp32s3, "xtensa-esp32s3-elf-gcov");
    assert.equal(esp32, "xtensa-esp32-elf-gcov");
  });

  test("gcov invocation uses argv instead of a shell command string", () => {
    const gcdaPaths = ["/tmp/project dir/app.gcda", "/tmp/other.gcda"];
    assert.deepStrictEqual(getGcovArgs(gcdaPaths), [
      "-b",
      "--stdout",
      "--json-format",
      "/tmp/project dir/app.gcda",
      "/tmp/other.gcda",
    ]);
  });
});
