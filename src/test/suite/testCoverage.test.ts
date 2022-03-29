import * as assert from "assert";
import * as vscode from "vscode";
import { join } from "path";
import {
  getGcovExecutable,
  buildJson,
  getGcovFilterPaths
} from "../../coverage/coverageService";
import { readParameter } from "../../idfConfiguration";

suite("Test Coverage Unit Tests", () => {
  const workspace = vscode.Uri.file(join(__dirname, "../../testFiles/gcov"));
  const idfPath = join(process.env.HOME, "esp", "esp-idf") || readParameter("idf.espIdfPath", workspace);
  process.env.IDF_PATH = idfPath;
  test("gcov executables based on idfTarget", () => {
    const esp32c3 = getGcovExecutable("esp32c3")
    const esp32s2 = getGcovExecutable("esp32s2")
    const esp32s3 = getGcovExecutable("esp32s3")
    const esp32 = getGcovExecutable("esp32")

    assert.equal(esp32c3, "riscv32-esp-elf-gcov");
    assert.equal(esp32s2, "xtensa-esp32s2-elf-gcov");
    assert.equal(esp32s3, "xtensa-esp32s3-elf-gcov");
    assert.equal(esp32, "xtensa-esp32-elf-gcov");
  });

  test("getGcovFilterPaths", async () => {
    const pathsToFilter = await getGcovFilterPaths(workspace);
    const example = ["--filter", `${idfPath}/components`];
    assert.equal(JSON.stringify(test), JSON.stringify(pathsToFilter))
  })
});
