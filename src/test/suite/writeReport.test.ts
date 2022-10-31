import * as assert from "assert";
import { replaceUserPath } from "../../support/writeReport";
import { reportObj } from "../../support/types";

suite("Write Report Suite", () => {
  test("replaceUserPath", () => {
    const mockData = new reportObj();
    mockData.workspaceFolder = `/Users/${process.env.HOME}/esp/blink`;
    if (process.env.windir) {
      mockData.workspaceFolder = `C:\\\\${process.env.HOMEPATH}\\esp\\blink`;
    }
    let result = replaceUserPath(mockData);
    let mockResult = new reportObj();
    mockResult.workspaceFolder = "/Users/<HOMEPATH>/esp/blink";
    assert.equal(JSON.stringify(result), JSON.stringify(mockResult));
  });
});
