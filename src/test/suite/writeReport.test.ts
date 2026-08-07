import * as assert from "assert";
import { replaceUserPath } from "../../support/writeReport";
import { initializeReportObject } from "../../support/initReportObj";

suite("Write Report Suite", () => {
  test("replaceUserPath", () => {
    const mockData = initializeReportObject();
    mockData.workspaceFolder = `/Users/${process.env.HOME}/esp/blink`;
    if(process.env.windir) {
        mockData.workspaceFolder =`C:\\\\${process.env.HOMEPATH}\\esp\\blink`;
    }
    let result = replaceUserPath(mockData);
    let mockResult = initializeReportObject();
    mockResult.workspaceFolder = '/Users/<HOMEPATH>/esp/blink';
    assert.equal(JSON.stringify(result), JSON.stringify(mockResult));
  });
});
