import * as assert from "assert";
import { listAvailableDfuDevices } from "../../utils";
import * as vscode from "vscode";
import * as fse from "fs-extra";
import { resolve } from "path";

suite("DFU Flashing Suite", () => {
  test("listAvailableDfuDevices mockdata test", async () => {
    const urlText = resolve(
      __dirname,
      "..",
      "..",
      "..",
      "testFiles",
      "dfu-list.json"
    );
    let data = await fse.readFile(urlText, "utf-8");
    let result = await listAvailableDfuDevices(data);
    let mockResult = [
      '[303a:0002] ver=0723, devnum=1, cfg=1, intf=2, path="0-1", alt=0, name="UNKNOWN", serial="0"',
      '[303a:0002] ver=0723, devnum=2, cfg=1, intf=2, path="1-10", alt=0, name="Test", serial="0123"',
    ];
    assert.equal(JSON.stringify(result), JSON.stringify(mockResult));
  });
});
