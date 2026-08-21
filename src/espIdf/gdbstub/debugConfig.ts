import { ESP } from "../../config";

export const RUNTIME_GDBSTUB_SESSION_ID = "gdbstub.debug.session.runtime";
export const PANIC_GDBSTUB_SESSION_ID = "gdbstub.debug.session.ws";
export const CORE_DUMP_SESSION_ID = "core-dump.debug.session.ws";

const defaultJtagConnectCommands = [
  "set remotetimeout 20",
  "-target-select extended-remote localhost:3333",
];

export const RUNTIME_GDBSTUB_LAUNCH_NAME = "ESP-IDF Runtime GDB Stub";

export interface RuntimeGdbStubLaunchConfig {
  type?: string;
  name?: string;
  request?: string;
  sessionID?: string;
  target?: { connectCommands?: string[] };
  runOpenOCD?: boolean;
  initCommands?: string[];
  gdbStubUart?: { port: string; baudRate: number };
  hardwareBreakpoint?: boolean;
}

export function getRuntimeGdbStubLaunchConfiguration(): RuntimeGdbStubLaunchConfig {
  return {
    name: RUNTIME_GDBSTUB_LAUNCH_NAME,
    type: "gdbtarget",
    request: "attach",
    sessionID: RUNTIME_GDBSTUB_SESSION_ID,
    runOpenOCD: false,
    initCommands: [],
  };
}

export function mergeRuntimeGdbStubLaunchConfigurations(
  configurations: RuntimeGdbStubLaunchConfig[]
): { configurations: RuntimeGdbStubLaunchConfig[]; changed: boolean } {
  const stub = getRuntimeGdbStubLaunchConfiguration();
  const index = configurations.findIndex(
    (config) =>
      config.sessionID === RUNTIME_GDBSTUB_SESSION_ID ||
      config.name === RUNTIME_GDBSTUB_LAUNCH_NAME
  );
  if (index === -1) {
    return { configurations: [stub, ...configurations], changed: true };
  }
  const current = configurations[index];
  const merged: RuntimeGdbStubLaunchConfig = {
    ...current,
    ...stub,
    name: current.name || stub.name,
  };
  if (
    index === 0 &&
    current.sessionID === stub.sessionID &&
    current.type === stub.type &&
    current.request === stub.request &&
    current.runOpenOCD === false
  ) {
    return { configurations, changed: false };
  }
  const rest = configurations.filter((_, itemIndex) => itemIndex !== index);
  return { configurations: [merged, ...rest], changed: true };
}

export function isNonJtagDebugSession(sessionID?: string): boolean {
  return (
    sessionID === RUNTIME_GDBSTUB_SESSION_ID ||
    sessionID === PANIC_GDBSTUB_SESSION_ID ||
    sessionID === CORE_DUMP_SESSION_ID
  );
}

export function isSdkconfigOptionEnabled(value: string | undefined): boolean {
  return (value ?? "").trim() === "y";
}

export function isDefaultJtagTarget(target: unknown): boolean {
  if (target == null) {
    return true;
  }
  if (typeof target !== "object") {
    return false;
  }
  const connectCommands = (target as { connectCommands?: unknown })
    .connectCommands;
  if (!Array.isArray(connectCommands) || connectCommands.length === 0) {
    return true;
  }
  return (
    connectCommands.length === defaultJtagConnectCommands.length &&
    defaultJtagConnectCommands.every(
      (command, index) => connectCommands[index] === command
    )
  );
}

export function shouldUseRuntimeGdbStub(
  config: RuntimeGdbStubLaunchConfig,
  options: { flashType?: string; runtimeEnabled: boolean }
): boolean {
  if (config.sessionID === RUNTIME_GDBSTUB_SESSION_ID) {
    return true;
  }
  if (config.sessionID) {
    return false;
  }
  if (!isDefaultJtagTarget(config.target)) {
    return false;
  }
  if (!options.runtimeEnabled) {
    return false;
  }
  const flashType = (options.flashType || "").trim();
  return flashType !== ESP.FlashType.JTAG && flashType !== ESP.FlashType.DFU;
}

export function parseMonitorBaudRate(value: string | undefined): number {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 115200;
}

export function toGdbSerialPort(
  port: string,
  platform: NodeJS.Platform = process.platform
): string {
  if (platform !== "win32" || !/^COM\d+$/i.test(port)) {
    return port;
  }
  return `\\\\.\\${port}`;
}

export function applyRuntimeGdbStubDebugConfig(
  config: RuntimeGdbStubLaunchConfig,
  options: {
    port: string;
    baudRate: number;
    platform?: NodeJS.Platform;
  }
): void {
  const gdbPort = toGdbSerialPort(options.port, options.platform);
  config.sessionID = RUNTIME_GDBSTUB_SESSION_ID;
  config.runOpenOCD = false;
  config.initCommands = [
    "set remote hardware-breakpoint-limit {IDF_TARGET_CPU_WATCHPOINT_NUM}",
    "set remote hardware-watchpoint-limit {IDF_TARGET_CPU_WATCHPOINT_NUM}",
    "set backtrace limit 16",
  ];
  config.hardwareBreakpoint = true;
  config.gdbStubUart = {
    port: gdbPort,
    baudRate: options.baudRate,
  };
  config.target = {
    connectCommands: [
      "set remotetimeout 20",
      `set serial baud ${options.baudRate}`,
      `target remote ${gdbPort}`,
    ],
  };
}
