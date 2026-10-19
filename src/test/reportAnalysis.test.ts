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
  summarizeLogTail,
} from "../support/reportAnalysis";
import { ExtendedIdfSetup, reportObj } from "../support/types";

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
      {
        name: "cmake",
        doesToolExist: true,
        expected: "3.30",
        actual: "3.30.2",
      },
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
      {
        name: "ninja",
        doesToolExist: true,
        expected: "1.12",
        actual: "1.12.1",
      },
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
    report.configurationSettings.pythonBinPath =
      "/home/user/.espressif/python/bin/python";
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

  test("analyzeReport warns for stale custom extra vars", () => {
    const report = initializeReportObject();
    report.configurationSettings.staleUserExtraVars = {
      OPENOCD_SCRIPTS: "/tools/openocd-esp32/v0.12.0-esp32-20240318/scripts",
    };

    const summary = analyzeReport(report);
    const finding = summary.findings.find(
      (f) => f.settingKey === "idf.customExtraVars.OPENOCD_SCRIPTS"
    );
    assert.ok(finding);
    assert.equal(finding.status, "warn");
    assert.equal(
      finding.value,
      "/tools/openocd-esp32/v0.12.0-esp32-20240318/scripts"
    );
  });

  test("analyzeReport ignores an invalid setup that is not active", () => {
    const report = healthyReport();
    report.espIdfSetups = [
      idfSetup({ idfPath: "/idf/v6.1/", isValid: true, version: "6.1.0" }),
      idfSetup({
        idfPath: "/idf/v5.2.7",
        isValid: false,
        version: "5.2.7",
        reason: "Missing required tools: riscv32-esp-elf",
      }),
    ];

    const summary = analyzeReport(report);
    assert.equal(summary.overall, "PASS");
    assert.equal(summary.errorCount, 0);
    assert.ok(
      summary.setups.some(
        (setup) =>
          setup.idfPath === "/idf/v5.2.7" &&
          !setup.isActive &&
          !setup.isValid &&
          setup.reason.includes("riscv32-esp-elf")
      )
    );
    assert.ok(summary.setups.some((setup) => setup.isActive && setup.isValid));
    assert.ok(
      !summary.findings.some(
        (finding) => finding.status === "fail" && finding.category === "Setups"
      )
    );
  });

  test("analyzeReport fails when the active setup is invalid", () => {
    const report = healthyReport();
    report.configurationSettings.espIdfPath = "/idf/v6.1";
    report.espIdfSetups = [
      idfSetup({
        idfPath: "/idf/v6.1/",
        isValid: false,
        version: "6.1.0",
        reason: "Missing required tools: riscv32-esp-elf",
      }),
    ];

    const summary = analyzeReport(report);
    assert.equal(summary.overall, "FAIL");
    assert.ok(
      summary.findings.some(
        (finding) =>
          finding.status === "fail" &&
          finding.message.includes("riscv32-esp-elf")
      )
    );
    assert.equal(summary.setups[0].isActive, true);
  });

  test("analyzeReport warns with only the PATH segment that contains a space", () => {
    const report = healthyReport();
    report.configurationSettings.systemEnvPath =
      "/usr/bin:/Applications/VMware Fusion.app/Contents/Public:/usr/sbin";
    report.configurationSpacesValidation.systemEnvPath = true;

    const summary = analyzeReport(report);
    const finding = summary.findings.find(
      (item) => item.label === "System PATH"
    );
    assert.ok(finding);
    assert.equal(finding.status, "warn");
    assert.equal(
      finding.value,
      "/Applications/VMware Fusion.app/Contents/Public"
    );
    assert.equal(summary.overall, "WARN");
  });

  test("summarizeLogTail groups repeated errors and drops serial ports", () => {
    const log = [
      logLine("/dev/tty.usbserial-13500", "2026-10-19T08:26:26.128Z"),
      logLine("/dev/tty.wlan-debug", "2026-10-19T08:26:26.151Z"),
      JSON.stringify({
        command: "xtensa-esp32-elf-gdb",
        args: "--batch-silent --ex python import os",
        message:
          '[ChildProcessFailed] {"stderr":"Python scripting is not supported in this copy of GDB.\\n"}',
        knownErrorCode: "ChildProcessFailed",
        level: "error",
        timestamp: "2026-10-16T07:58:40.856Z",
      }),
      JSON.stringify({
        message: "informational",
        level: "info",
        timestamp: "2026-10-19T09:00:00.000Z",
      }),
    ].join("\n");

    const groups = summarizeLogTail(log);
    assert.equal(groups.length, 2);
    const esptool = groups.find((group) => group.label.includes("esptool.py"));
    assert.ok(esptool);
    assert.equal(esptool.count, 2);
    assert.equal(esptool.lastTimestamp, "2026-10-19T08:26:26.151Z");
    assert.ok(!esptool.label.includes("/dev/tty"));
    assert.ok(
      groups.some((group) =>
        group.label.includes("Python scripting is not supported")
      )
    );
  });
});

function healthyReport(): reportObj {
  const report = initializeReportObject();
  report.configurationSettings.espIdfPath = "/idf/v6.1";
  report.configurationSettings.toolsPath = "/tools";
  report.configurationSettings.pythonBinPath = "/venv/bin/python";
  report.configurationAccess.espIdfPath = true;
  report.configurationAccess.toolsPath = true;
  report.configurationAccess.pythonBinPath = true;
  report.configurationAccess.cmakeInEnv = true;
  report.configurationAccess.ninjaInEnv = true;
  report.espIdfVersion.result = "6.1.0";
  report.pythonVersion.result = "3.13.15";
  report.pipVersion.result = "26.2";
  report.idfCheckRequirements.result = "Python requirements are satisfied.";
  return report;
}

function idfSetup(partial: Partial<ExtendedIdfSetup>): ExtendedIdfSetup {
  return {
    id: "test",
    version: "6.1.0",
    toolsPath: "/tools",
    idfPath: "/idf/v6.1",
    gitPath: "/usr/bin/git",
    isValid: true,
    activationScript: "",
    python: "/venv/bin/python",
    sysPythonPath: "",
    reason: "",
    ...partial,
  };
}

function logLine(port: string, timestamp: string): string {
  return JSON.stringify({
    command: "python3",
    args: `esptool.py --port ${port} chip_id`,
    message:
      '[ChildProcessFailed] {"stderr":"Warning: DEPRECATED: \'esptool.py\' wrapper is deprecated.\\n"}',
    knownErrorCode: "ChildProcessFailed",
    level: "error",
    timestamp,
  });
}
