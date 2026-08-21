/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import * as assert from "assert";
import { initializeReportObject } from "../support/initReportObj";
import {
  analyzeReport,
  isBuildToolAvailable,
} from "../support/reportAnalysis";

suite("Report analysis tests", () => {
  test("cmake passes when available in system PATH only", () => {
    const availability = isBuildToolAvailable("cmake", true, [
      { name: "cmake", doesToolExist: false, expected: "3.30", actual: "" },
    ]);
    assert.equal(availability.available, true);
    assert.equal(availability.source, "env");
  });

  test("cmake passes when available in ESP-IDF tools only", () => {
    const availability = isBuildToolAvailable("cmake", false, [
      { name: "cmake", doesToolExist: true, expected: "3.30", actual: "3.30.2" },
    ]);
    assert.equal(availability.available, true);
    assert.equal(availability.source, "idf-tools");
    assert.equal(availability.actual, "3.30.2");
  });

  test("cmake fails when missing from PATH and ESP-IDF tools", () => {
    const availability = isBuildToolAvailable("cmake", false, [
      { name: "cmake", doesToolExist: false, expected: "3.30", actual: "" },
    ]);
    assert.equal(availability.available, false);
    assert.equal(availability.source, "none");
  });

  test("ninja passes with OR logic via idf tools", () => {
    const availability = isBuildToolAvailable("ninja", false, [
      { name: "ninja", doesToolExist: true, expected: "1.12", actual: "1.12.1" },
    ]);
    assert.equal(availability.available, true);
    assert.equal(availability.source, "idf-tools");
  });

  test("analyzeReport fails for inaccessible ESP-IDF path", () => {
    const report = initializeReportObject();
    report.configurationSettings.espIdfPath = "/bad/path";
    report.configurationAccess.espIdfPath = false;

    const summary = analyzeReport(report);
    assert.equal(summary.overall, "FAIL");
    assert.ok(
      summary.findings.some(
        (f) =>
          f.status === "fail" &&
          f.label.includes("ESP-IDF Path") &&
          f.message.includes("not accessible")
      )
    );
  });

  test("analyzeReport warns for paths with spaces", () => {
    const report = initializeReportObject();
    report.configurationSettings.espIdfPath = "/home/user/my esp-idf";
    report.configurationSettings.toolsPath = "/home/user/.espressif";
    report.configurationSettings.pythonBinPath = "/home/user/.espressif/python/bin/python";
    report.configurationAccess.espIdfPath = true;
    report.configurationAccess.toolsPath = true;
    report.configurationAccess.pythonBinPath = true;
    report.configurationAccess.cmakeInEnv = true;
    report.configurationAccess.ninjaInEnv = true;
    report.configurationSpacesValidation.espIdfPath = true;
    report.espIdfVersion.result = "5.4.1";
    report.pythonVersion.result = "3.11.2";
    report.pipVersion.result = "24.0";
    report.idfCheckRequirements.result = "Python requirements are satisfied.";

    const summary = analyzeReport(report);
    assert.ok(summary.findings.some((f) => f.status === "warn"));
    assert.equal(summary.overall, "WARN");
  });

  test("analyzeReport fails for requirements error", () => {
    const report = initializeReportObject();
    report.configurationSettings.espIdfPath = "/idf";
    report.configurationAccess.espIdfPath = true;
    report.configurationSettings.toolsPath = "/tools";
    report.configurationAccess.toolsPath = true;
    report.configurationSettings.pythonBinPath = "/venv/bin/python";
    report.configurationAccess.pythonBinPath = true;
    report.espIdfVersion.result = "5.4.1";
    report.pythonVersion.result = "3.11.2";
    report.pipVersion.result = "24.0";
    report.idfCheckRequirements.result =
      "Error: /idf/requirements.txt doesn't exist.";

    const summary = analyzeReport(report);
    assert.equal(summary.overall, "FAIL");
    assert.ok(
      summary.findings.some(
        (f) => f.label === "ESP-IDF Python requirements" && f.status === "fail"
      )
    );
  });

  test("analyzeReport skips optional unset ADF path", () => {
    const report = initializeReportObject();
    report.configurationSettings.espAdfPath = "";
    report.configurationAccess.espAdfPath = false;

    const summary = analyzeReport(report);
    assert.ok(
      summary.findings.some(
        (f) => f.label.includes("ESP-ADF Path") && f.status === "skip"
      )
    );
  });
});
