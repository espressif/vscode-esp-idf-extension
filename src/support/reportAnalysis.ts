import {
  BuildToolAvailability,
  CheckStatus,
  ConfigCheckLine,
  DiagnosticFinding,
  idfToolResult,
  ReportSummary,
  reportObj,
} from "./types";

const BUILD_TOOLS = new Set(["cmake", "ninja"]);

export function isBuildToolAvailable(
  toolName: "cmake" | "ninja",
  inEnv: boolean,
  tools: idfToolResult[]
): BuildToolAvailability {
  if (inEnv) {
    return { available: true, source: "env" };
  }
  const tool = tools.find((t) => t.name === toolName);
  if (tool?.doesToolExist) {
    return { available: true, source: "idf-tools", actual: tool.actual };
  }
  return { available: false, source: "none" };
}

function buildToolMessage(availability: BuildToolAvailability): string {
  if (availability.source === "env") {
    return "found in system PATH";
  }
  if (availability.source === "idf-tools") {
    const version = availability.actual ? ` (actual: ${availability.actual})` : "";
    return `found in ESP-IDF tools${version}`;
  }
  return "not found in system PATH or ESP-IDF tools";
}

function isUnsetPath(value: string | undefined): boolean {
  return !value || value.trim() === "";
}

function addPathFinding(
  findings: DiagnosticFinding[],
  label: string,
  value: string,
  accessible: boolean,
  settingKey: string,
  required: boolean
): CheckStatus {
  if (isUnsetPath(value)) {
    if (required) {
      findings.push({
        status: "fail",
        category: "Paths",
        label,
        settingKey,
        value: "(not set)",
        message: "path is not configured",
      });
      return "fail";
    }
    findings.push({
      status: "skip",
      category: "Paths",
      label,
      settingKey,
      value: "(not set)",
      message: "not configured",
    });
    return "skip";
  }
  if (!accessible) {
    findings.push({
      status: "fail",
      category: "Paths",
      label,
      settingKey,
      value,
      message: "path does not exist or is not accessible",
    });
    return "fail";
  }
  findings.push({
    status: "ok",
    category: "Paths",
    label,
    settingKey,
    value,
    message: "accessible",
  });
  return "ok";
}

function addSpacesWarning(
  findings: DiagnosticFinding[],
  label: string,
  hasSpaces: boolean,
  value: string
): void {
  if (hasSpaces && !isUnsetPath(value)) {
    findings.push({
      status: "warn",
      category: "Paths",
      label,
      value,
      message: "path contains spaces; may cause build issues",
    });
  }
}

function isVersionMissing(result: string): boolean {
  return !result || result === "Not found" || result === "x.x";
}

export function getConfigurationCheckLines(report: reportObj): ConfigCheckLine[] {
  const { configurationSettings: settings, configurationAccess: access } =
    report;
  const lines: ConfigCheckLine[] = [];

  const addLine = (
    label: string,
    value: string,
    status: CheckStatus,
    message: string
  ) => {
    lines.push({
      label,
      value: isUnsetPath(value) ? "(not set)" : value,
      status,
      message,
    });
  };

  const requiredPath = (
    label: string,
    value: string,
    accessible: boolean
  ): CheckStatus => {
    if (isUnsetPath(value)) {
      addLine(label, value, "fail", "not configured");
      return "fail";
    }
    if (!accessible) {
      addLine(label, value, "fail", "not accessible");
      return "fail";
    }
    addLine(label, value, "ok", "accessible");
    return "ok";
  };

  const optionalPath = (
    label: string,
    value: string,
    accessible: boolean
  ): CheckStatus => {
    if (isUnsetPath(value)) {
      addLine(label, value, "skip", "not configured");
      return "skip";
    }
    if (!accessible) {
      addLine(label, value, "fail", "not accessible");
      return "fail";
    }
    addLine(label, value, "ok", "accessible");
    return "ok";
  };

  requiredPath(
    "ESP-IDF Path (IDF_PATH)",
    settings.espIdfPath,
    access.espIdfPath
  );
  requiredPath(
    "ESP-IDF Tools Path (IDF_TOOLS_PATH)",
    settings.toolsPath,
    access.toolsPath
  );
  requiredPath(
    "Virtual environment Python",
    settings.pythonBinPath,
    access.pythonBinPath
  );
  optionalPath(
    'ESP-ADF Path (idf.customExtraVars["ADF_PATH"])',
    settings.espAdfPath,
    access.espAdfPath
  );
  optionalPath(
    "Custom OpenOCD path (idf.customOpenOCDPath)",
    settings.customOpenOcdPath,
    access.customOpenOcdPath
  );

  for (const [toolPath, toolAccessible] of Object.entries(
    access.espIdfToolsPaths
  )) {
    addLine(
      `Custom extra path (${toolPath})`,
      toolPath,
      toolAccessible ? "ok" : "fail",
      toolAccessible ? "accessible" : "not accessible"
    );
  }

  const cmake = isBuildToolAvailable(
    "cmake",
    access.cmakeInEnv,
    report.espIdfToolsVersions
  );
  addLine(
    "CMake",
    cmake.source === "idf-tools" && cmake.actual ? cmake.actual : "",
    cmake.available ? "ok" : "fail",
    buildToolMessage(cmake)
  );

  const ninja = isBuildToolAvailable(
    "ninja",
    access.ninjaInEnv,
    report.espIdfToolsVersions
  );
  addLine(
    "Ninja",
    ninja.source === "idf-tools" && ninja.actual ? ninja.actual : "",
    ninja.available ? "ok" : "fail",
    buildToolMessage(ninja)
  );

  const spacesEntries: Array<[string, boolean, string]> = [
    ["ESP-IDF Path", report.configurationSpacesValidation.espIdfPath, settings.espIdfPath],
    ["ESP-IDF Tools Path", report.configurationSpacesValidation.toolsPath, settings.toolsPath],
    [
      "Virtual environment Python",
      report.configurationSpacesValidation.pythonBinPath,
      settings.pythonBinPath,
    ],
    ["ESP-ADF Path", report.configurationSpacesValidation.espAdfPath, settings.espAdfPath],
    [
      "System environment PATH",
      report.configurationSpacesValidation.systemEnvPath,
      settings.systemEnvPath,
    ],
  ];
  for (const [label, hasSpaces, value] of spacesEntries) {
    if (hasSpaces && !isUnsetPath(value)) {
      addLine(label, value, "warn", "path contains spaces");
    }
  }
  for (const [toolPath, hasSpaces] of Object.entries(
    report.configurationSpacesValidation.customExtraPaths
  )) {
    if (hasSpaces) {
      addLine(`Custom extra path (${toolPath})`, toolPath, "warn", "path contains spaces");
    }
  }

  return lines;
}

export function analyzeReport(report: reportObj): ReportSummary {
  const findings: DiagnosticFinding[] = [];
  const { configurationSettings: settings, configurationAccess: access } =
    report;

  addPathFinding(
    findings,
    "ESP-IDF Path (IDF_PATH)",
    settings.espIdfPath,
    access.espIdfPath,
    "idf.customExtraVars.IDF_PATH",
    true
  );
  addPathFinding(
    findings,
    "ESP-IDF Tools Path (IDF_TOOLS_PATH)",
    settings.toolsPath,
    access.toolsPath,
    "idf.customExtraVars.IDF_TOOLS_PATH",
    true
  );
  addPathFinding(
    findings,
    "Virtual environment Python",
    settings.pythonBinPath,
    access.pythonBinPath,
    "idf.customExtraVars.IDF_PYTHON_ENV_PATH",
    true
  );
  addPathFinding(
    findings,
    'ESP-ADF Path (idf.customExtraVars["ADF_PATH"])',
    settings.espAdfPath,
    access.espAdfPath,
    'idf.customExtraVars["ADF_PATH"]',
    false
  );
  addPathFinding(
    findings,
    "Custom OpenOCD path (idf.customOpenOCDPath)",
    settings.customOpenOcdPath,
    access.customOpenOcdPath,
    "idf.customOpenOCDPath",
    false
  );

  for (const [toolPath, toolAccessible] of Object.entries(
    access.espIdfToolsPaths
  )) {
    if (!toolAccessible) {
      findings.push({
        status: "fail",
        category: "Paths",
        label: `Custom extra path (${toolPath})`,
        value: toolPath,
        message: "path does not exist or is not accessible",
      });
    }
  }

  addSpacesWarning(
    findings,
    "ESP-IDF Path",
    report.configurationSpacesValidation.espIdfPath,
    settings.espIdfPath
  );
  addSpacesWarning(
    findings,
    "ESP-IDF Tools Path",
    report.configurationSpacesValidation.toolsPath,
    settings.toolsPath
  );
  addSpacesWarning(
    findings,
    "Virtual environment Python",
    report.configurationSpacesValidation.pythonBinPath,
    settings.pythonBinPath
  );
  addSpacesWarning(
    findings,
    "ESP-ADF Path",
    report.configurationSpacesValidation.espAdfPath,
    settings.espAdfPath
  );
  addSpacesWarning(
    findings,
    "System environment PATH",
    report.configurationSpacesValidation.systemEnvPath,
    settings.systemEnvPath
  );
  for (const [toolPath, hasSpaces] of Object.entries(
    report.configurationSpacesValidation.customExtraPaths
  )) {
    addSpacesWarning(findings, `Custom extra path (${toolPath})`, hasSpaces, toolPath);
  }

  const espIdfVersion = report.espIdfVersion.result || report.espIdfVersion.output;
  if (isVersionMissing(espIdfVersion)) {
    findings.push({
      status: "fail",
      category: "Versions",
      label: "ESP-IDF version",
      value: espIdfVersion || "(unknown)",
      message: "verify IDF_PATH points to a valid ESP-IDF checkout",
    });
  } else {
    findings.push({
      status: "ok",
      category: "Versions",
      label: "ESP-IDF version",
      value: espIdfVersion,
      message: "detected",
    });
  }

  const pythonVersion =
    report.pythonVersion.result || report.pythonVersion.output;
  if (isVersionMissing(pythonVersion)) {
    findings.push({
      status: "fail",
      category: "Python",
      label: "Python version",
      value: pythonVersion || "(unknown)",
      message: "Python virtual environment is missing or not executable",
    });
  } else {
    findings.push({
      status: "ok",
      category: "Python",
      label: "Python version",
      value: pythonVersion,
      message: "detected",
    });
  }

  const pipVersion = report.pipVersion.result || report.pipVersion.output;
  if (isVersionMissing(pipVersion)) {
    findings.push({
      status: "fail",
      category: "Python",
      label: "pip version",
      value: pipVersion || "(unknown)",
      message: "pip is missing or not executable in the virtual environment",
    });
  } else {
    findings.push({
      status: "ok",
      category: "Python",
      label: "pip version",
      value: pipVersion,
      message: "detected",
    });
  }

  const requirementsResult =
    report.idfCheckRequirements.result || report.idfCheckRequirements.output;
  if (requirementsResult.startsWith("Error:")) {
    findings.push({
      status: "fail",
      category: "Python",
      label: "ESP-IDF Python requirements",
      value: requirementsResult,
      message: "Python requirements check failed",
    });
  } else if (requirementsResult) {
    findings.push({
      status: "ok",
      category: "Python",
      label: "ESP-IDF Python requirements",
      value: requirementsResult,
      message: "requirements satisfied",
    });
  }

  for (const toolName of ["cmake", "ninja"] as const) {
    const inEnv =
      toolName === "cmake" ? access.cmakeInEnv : access.ninjaInEnv;
    const availability = isBuildToolAvailable(
      toolName,
      inEnv,
      report.espIdfToolsVersions
    );
    const label = toolName === "cmake" ? "CMake" : "Ninja";
    findings.push({
      status: availability.available ? "ok" : "fail",
      category: "Tools",
      label,
      message: buildToolMessage(availability),
      value:
        availability.source === "idf-tools" && availability.actual
          ? availability.actual
          : undefined,
    });
  }

  for (const tool of report.espIdfToolsVersions) {
    if (BUILD_TOOLS.has(tool.name)) {
      continue;
    }
    if (!tool.doesToolExist) {
      findings.push({
        status: "fail",
        category: "Tools",
        label: tool.name,
        value: tool.actual || "(missing)",
        message: `expected ${tool.expected}, got ${tool.actual || "(missing)"}`,
      });
    }
  }

  for (const idfSetup of report.espIdfSetups) {
    if (!idfSetup.isValid) {
      findings.push({
        status: "fail",
        category: "Setups",
        label: `ESP-IDF setup (${idfSetup.idfPath})`,
        value: idfSetup.version,
        message: idfSetup.reason || "setup is invalid",
      });
    }
  }

  if (report.latestError?.message) {
    findings.push({
      status: "fail",
      category: "Errors",
      label: "Latest error",
      message: report.latestError.message,
    });
  }

  const errorCount = findings.filter((f) => f.status === "fail").length;
  const warningCount = findings.filter((f) => f.status === "warn").length;
  let overall: ReportSummary["overall"] = "PASS";
  if (errorCount > 0) {
    overall = "FAIL";
  } else if (warningCount > 0) {
    overall = "WARN";
  }

  return { overall, findings, errorCount, warningCount };
}

export function formatStatusTag(status: CheckStatus): string {
  switch (status) {
    case "ok":
      return "[OK]";
    case "fail":
      return "[FAIL]";
    case "warn":
      return "[WARN]";
    case "skip":
      return "[SKIP]";
  }
}

export function formatFindingLine(finding: DiagnosticFinding): string {
  const tag = formatStatusTag(finding.status);
  const valuePart = finding.value ? `: ${finding.value}` : "";
  return `${tag} ${finding.label}${valuePart} — ${finding.message}`;
}

export function formatConfigCheckLine(line: ConfigCheckLine): string {
  const displayValue = line.value ? line.value : "";
  return `${line.label.padEnd(42)} ${displayValue.padEnd(30)} ${formatStatusTag(line.status)} ${line.message}`;
}
