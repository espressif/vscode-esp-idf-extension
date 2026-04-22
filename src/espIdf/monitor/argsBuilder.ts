/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import { join } from "path";

export type MonitorShellKind = "powershell" | "pwsh" | "cmd" | "posix";

export function monitorShellKindFromUserShell(
  shellType: string | null | undefined
): MonitorShellKind {
  if (!shellType) {
    return "posix";
  }
  if (shellType.includes("powershell")) {
    return "powershell";
  }
  if (shellType.includes("pwsh")) {
    return "pwsh";
  }
  if (shellType.includes("cmd")) {
    return "cmd";
  }
  return "posix";
}

export function quotePathForShell(
  path: string,
  kind: MonitorShellKind
): string {
  if (kind === "powershell" || kind === "pwsh") {
    return `'${path.replace(/'/g, "''")}'`;
  }
  if (kind === "cmd") {
    return `"${path}"`;
  }
  return `'${path}'`;
}

export function resolveMonitorBaudRate(
  configBaud: string,
  idfMonitorBaudEnv?: string,
  monitorBaudEnv?: string
): string {
  return configBaud || idfMonitorBaudEnv || monitorBaudEnv || "115200";
}

export function buildIdfMonitorMakeArgUnquoted(
  pythonBinPath: string,
  idfPath: string
): string {
  const idfPy = join(idfPath, "tools", "idf.py");
  return `${pythonBinPath} ${idfPy}`;
}

export interface IdfMonitorUnquotedArgvInput {
  port: string;
  baudRate: string;
  pythonBinPath: string;
  idfMonitorToolPath: string;
  idfTarget: string;
  idfVersion: string;
  noReset: boolean;
  enableTimestamps: boolean;
  customTimestampFormat: string;
  toolchainPrefix: string;
  elfFilePath: string;
  wsPort?: number;
  idfPath: string;
  isDebugSessionActive: boolean;
}

function buildIdfMonitorArgvTokens(
  input: IdfMonitorUnquotedArgvInput,
  opts: { mapPath: (path: string) => string; makeToken: string }
): string[] {
  const { mapPath, makeToken } = opts;
  const argv: string[] = [
    mapPath(input.pythonBinPath),
    mapPath(input.idfMonitorToolPath),
    "-p",
    input.port,
    "-b",
    input.baudRate,
    "--toolchain-prefix",
    input.toolchainPrefix,
    "--make",
    makeToken,
  ];
  if (
    input.isDebugSessionActive ||
    (input.noReset && input.idfVersion >= "5.0")
  ) {
    argv.splice(2, 0, "--no-reset");
  }
  if (input.enableTimestamps && input.idfVersion >= "4.4") {
    argv.push("--timestamps");
  }
  if (
    input.customTimestampFormat.length > 0 &&
    input.idfVersion >= "4.4"
  ) {
    argv.push(
      "--timestamp-format",
      JSON.stringify(input.customTimestampFormat)
    );
  }
  if (input.idfVersion >= "4.3") {
    argv.push("--target", input.idfTarget);
  }
  if (input.wsPort) {
    argv.push("--ws", `ws://localhost:${input.wsPort}`);
  }
  argv.push(mapPath(input.elfFilePath));
  return argv;
}

/**
 * Logical argv tokens (paths unquoted) for idf_monitor.py, in order.
 */
export function buildIdfMonitorUnquotedArgv(
  input: IdfMonitorUnquotedArgvInput
): string[] {
  return buildIdfMonitorArgvTokens(input, {
    mapPath: (p) => p,
    makeToken: buildIdfMonitorMakeArgUnquoted(
      input.pythonBinPath,
      input.idfPath
    ),
  });
}

export interface IdfMonitorQuotedInvokeInput extends IdfMonitorUnquotedArgvInput {
  shellKind: MonitorShellKind;
}

/**
 * Tokens to join with spaces for the shell (paths quoted per shell), matching legacy IDFMonitor.start.
 */
export function buildIdfMonitorQuotedInvokeTokens(
  input: IdfMonitorQuotedInvokeInput
): string[] {
  const q = (p: string) => quotePathForShell(p, input.shellKind);
  const idfPy = join(input.idfPath, "tools", "idf.py");
  const makeInner = `${q(input.pythonBinPath)} ${q(idfPy)}`;
  return buildIdfMonitorArgvTokens(input, {
    mapPath: q,
    makeToken: q(makeInner),
  });
}

export interface MonitorTerminalSendSequence {
  /** Lines to pass to `terminal.sendText` in order */
  texts: string[];
  /** When true, wait this long after the first line before sending the rest (PowerShell) */
  delayMsAfterFirstLine?: number;
}

/**
 * Shell-specific IDF_PATH export + monitor command lines for VS Code terminal.
 */
export function buildIdfMonitorTerminalSendSequence(opts: {
  shellKind: MonitorShellKind;
  modifiedEnvIdfPath: string;
  quotedInvokeJoined: string;
}): MonitorTerminalSendSequence {
  const { shellKind, modifiedEnvIdfPath, quotedInvokeJoined } = opts;
  const quotedIdfPath = quotePathForShell(
    modifiedEnvIdfPath,
    shellKind
  );
  const envSetCmd = process.platform === "win32" ? "set" : "export";

  if (shellKind === "powershell" || shellKind === "pwsh") {
    return {
      texts: [
        `$env:IDF_PATH = ${quotedIdfPath};`,
        ` & ${quotedInvokeJoined}\r`,
      ],
      delayMsAfterFirstLine: 1000,
    };
  }
  if (shellKind === "cmd") {
    return {
      texts: [
        `${envSetCmd} IDF_PATH=${modifiedEnvIdfPath}`,
        quotedInvokeJoined,
      ],
    };
  }
  return {
    texts: [
      `${envSetCmd} IDF_PATH=${quotedIdfPath}`,
      quotedInvokeJoined,
    ],
  };
}
