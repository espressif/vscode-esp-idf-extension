import * as assert from "assert";
import {
  COMMANDS_WITHOUT_USAGE_TELEMETRY,
  shouldSendCommandUsageEvent,
} from "../../common/registerCommand";
import { userTroubleshootReportProperties } from "../../support/troubleshootPanel";

suite("command usage telemetry", () => {
  test("skips getter helper commands", () => {
    for (const name of COMMANDS_WITHOUT_USAGE_TELEMETRY) {
      assert.strictEqual(shouldSendCommandUsageEvent(name), false, name);
    }
  });

  test("sends usage events for user-facing commands", () => {
    assert.strictEqual(shouldSendCommandUsageEvent("espIdf.buildDevice"), true);
    assert.strictEqual(shouldSendCommandUsageEvent("espIdf.flashDevice"), true);
    assert.strictEqual(
      shouldSendCommandUsageEvent("espIdf.doctorCommand"),
      true
    );
  });

  test("UserTroubleshootReport payload has no doctor text", () => {
    const properties = userTroubleshootReportProperties();
    assert.strictEqual(properties.submitted, "true");
    assert.strictEqual(properties.os, process.platform);
    assert.ok(!("report" in properties));
    assert.ok(!("title" in properties));
    assert.ok(!("description" in properties));
    assert.ok(!("stepsToReproduce" in properties));
  });
});
