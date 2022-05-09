import * as assert from "assert";
import * as vscode from "vscode";
import { join } from "path";
import {
  getGcovExecutable,
  buildJson,
  getGcovFilterPaths,
  buildHtml,
  generateCoverageForEditors,
  previewReport
} from "../../coverage/coverageService";

suite("Test Coverage Unit Tests", () => {
  const workspace = vscode.Uri.file(join(__dirname, "../../../testFiles/gcov"));
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
    const example = ["--filter", `${process.env.IDF_PATH}/components`];
    assert.equal(JSON.stringify(example), JSON.stringify(pathsToFilter))
  })

  // Tests if buildJson returns a double stringified object that has the following properties: "files", "gcovr/format_version"
  test("buildJson", async () => {
    const result = await buildJson(workspace);
    const parsedResult = JSON.parse(JSON.parse(result));
    assert.ok(parsedResult.files);
    assert.ok(parsedResult["gcovr/format_version"]);
  })

  // Tests if buildHtml returns a string cointanting html content.
  test("buildHtml", async () => {
    const result = await buildHtml(workspace);
    assert.equal(result.slice(result.length - 8), "</html>\n");
    assert.equal(result.slice(0,15), "<!DOCTYPE html>");
  })

  test("generateCoverageForEditors", async () => {
    const editors = vscode.window.visibleTextEditors;
    const gcovObj = await buildJson(workspace);
    const result = await generateCoverageForEditors(
      workspace,
      editors,
      gcovObj
    );

    assert.ok(editors);
    assert.ok(gcovObj);
    assert.ok(result);
  })
});
