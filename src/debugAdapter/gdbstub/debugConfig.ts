import { ESP } from "../../config";

const { CORE_DUMP_SESSION_ID, PANIC_GDBSTUB_SESSION_ID } = ESP.DebugSession;

export const GDBSTUB_UART_CONNECTION_MODE = "Gdbstub-UART";
export const OPENOCD_JTAG_CONNECTION_MODE = "OpenOCD-JTAG";
export const ESP_IDF_LAUNCH_NAME = "ESP-IDF";
/** Legacy launch entry written before connectionMode. Configure removes it. */
export const RUNTIME_GDBSTUB_LAUNCH_NAME = "ESP-IDF Runtime GDB Stub";

export function isGdbstubUartConnection(config: {
  connectionMode?: string;
  gdbStubUart?: unknown;
}): boolean {
  return (
    config.connectionMode === GDBSTUB_UART_CONNECTION_MODE ||
    config.gdbStubUart !== undefined
  );
}

/** Status-bar label for the mode Launch Debug will start. Unset means JTAG. */
export function debugConnectionModePresentation(config?: {
  connectionMode?: string;
  gdbStubUart?: unknown;
}): { shortLabel: "JTAG" | "UART"; mode: string } {
  if (config && isGdbstubUartConnection(config)) {
    return { shortLabel: "UART", mode: GDBSTUB_UART_CONNECTION_MODE };
  }
  return { shortLabel: "JTAG", mode: OPENOCD_JTAG_CONNECTION_MODE };
}

export function isRuntimeGdbStubFirmwareMissing(
  config: { connectionMode?: string; gdbStubUart?: unknown } | undefined,
  runtimeEnabled: boolean
): boolean {
  return !!config && isGdbstubUartConnection(config) && !runtimeEnabled;
}

export interface RuntimeGdbStubLaunchConfig {
  type?: string;
  name?: string;
  request?: string;
  sessionID?: string;
  connectionMode?: string;
  target?: { connectCommands?: string[] };
  runOpenOCD?: boolean;
  initCommands?: string[];
  gdbStubUart?: { port: string; baudRate: number };
  hardwareBreakpoint?: boolean;
}

function isDedicatedRuntimeStubConfig(
  config: RuntimeGdbStubLaunchConfig
): boolean {
  return config.name === RUNTIME_GDBSTUB_LAUNCH_NAME;
}

function isPrimaryGdbtargetConfig(config: RuntimeGdbStubLaunchConfig): boolean {
  return config.type === "gdbtarget" && !isDedicatedRuntimeStubConfig(config);
}

/** The gdbtarget entry Launch Debug starts, and the one Configure updates. */
export function selectDebugLaunchConfiguration(
  configurations: RuntimeGdbStubLaunchConfig[] | undefined
): RuntimeGdbStubLaunchConfig | undefined {
  const configs = configurations ?? [];
  return (
    configs.find(isPrimaryGdbtargetConfig) ??
    configs.find((config) => config.type === "gdbtarget")
  );
}

/**
 * Sets connectionMode on the existing gdbtarget entry and drops the legacy
 * "ESP-IDF Runtime GDB Stub" entry. runOpenOCD stays unset so switching the
 * field back to OpenOCD-JTAG starts OpenOCD again.
 */
export function applyGdbstubUartLaunchConfiguration(
  configurations: RuntimeGdbStubLaunchConfig[]
): { configurations: RuntimeGdbStubLaunchConfig[]; changed: boolean } {
  const removedStub = configurations.some(isDedicatedRuntimeStubConfig);
  const remaining = configurations.filter(
    (config) => !isDedicatedRuntimeStubConfig(config)
  );
  const primaryIndex = remaining.findIndex(isPrimaryGdbtargetConfig);

  if (primaryIndex === -1) {
    const converted = configurations.find(isDedicatedRuntimeStubConfig);
    const { sessionID: _sessionID, runOpenOCD: _runOpenOCD, ...rest } =
      converted ?? {};
    const config: RuntimeGdbStubLaunchConfig = {
      ...rest,
      name: ESP_IDF_LAUNCH_NAME,
      type: "gdbtarget",
      request: "attach",
      connectionMode: GDBSTUB_UART_CONNECTION_MODE,
    };
    return { configurations: [config, ...remaining], changed: true };
  }

  const current = remaining[primaryIndex];
  if (!removedStub && current.connectionMode === GDBSTUB_UART_CONNECTION_MODE) {
    return { configurations, changed: false };
  }

  const updated = remaining.slice();
  updated[primaryIndex] = {
    ...current,
    connectionMode: GDBSTUB_UART_CONNECTION_MODE,
  };
  return { configurations: updated, changed: true };
}

/** Writes connectionMode onto the gdbtarget entry Launch Debug starts. */
export function applyDebugConnectionMode(
  configurations: RuntimeGdbStubLaunchConfig[],
  connectionMode: string
): { configurations: RuntimeGdbStubLaunchConfig[]; changed: boolean } {
  if (connectionMode === GDBSTUB_UART_CONNECTION_MODE) {
    return applyGdbstubUartLaunchConfiguration(configurations);
  }

  const primaryIndex = configurations.findIndex(isPrimaryGdbtargetConfig);
  if (primaryIndex === -1) {
    return {
      configurations: [
        {
          name: ESP_IDF_LAUNCH_NAME,
          type: "gdbtarget",
          request: "attach",
          connectionMode: OPENOCD_JTAG_CONNECTION_MODE,
        },
        ...configurations,
      ],
      changed: true,
    };
  }

  const current = configurations[primaryIndex];
  if (current.connectionMode === OPENOCD_JTAG_CONNECTION_MODE) {
    return { configurations, changed: false };
  }
  const updated = configurations.slice();
  updated[primaryIndex] = {
    ...current,
    connectionMode: OPENOCD_JTAG_CONNECTION_MODE,
  };
  return { configurations: updated, changed: true };
}

export function isNonJtagDebugSession(config?: object): boolean {
  if (!config) {
    return false;
  }
  const record = config as {
    sessionID?: string;
    connectionMode?: string;
    gdbStubUart?: unknown;
  };
  return (
    isGdbstubUartConnection(record) ||
    record.sessionID === PANIC_GDBSTUB_SESSION_ID ||
    record.sessionID === CORE_DUMP_SESSION_ID
  );
}

export function isSdkconfigOptionEnabled(value: string | undefined): boolean {
  return (value ?? "").trim() === "y";
}

export function shouldUseRuntimeGdbStub(
  config: RuntimeGdbStubLaunchConfig
): boolean {
  return isGdbstubUartConnection(config);
}

export function parseMonitorBaudRate(value: string | undefined): number {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 115200;
}

export function toGdbSerialPort(
  port: string,
  platform: NodeJS.Platform = process.platform
): string {
  if (platform === "darwin" && port.startsWith("/dev/tty.")) {
    return port.replace("/dev/tty.", "/dev/cu.");
  }
  if (platform === "win32" && /^COM\d+$/i.test(port)) {
    return `\\\\.\\${port}`;
  }
  return port;
}

const windowsDevicePrefix = "\\\\.\\";

// node-serialport prepends \\.\ on Windows and keeps only the first 10
// characters of the supplied path, so the GDB form must be stripped first.
export function toNodeSerialPortPath(port: string): string {
  if (!port.startsWith(windowsDevicePrefix)) {
    return port;
  }
  return port.slice(windowsDevicePrefix.length);
}

export function parseHardwareDebugLimit(
  value: string | undefined
): number | undefined {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function applyRuntimeGdbStubDebugConfig(
  config: RuntimeGdbStubLaunchConfig,
  options: {
    port: string;
    baudRate: number;
    hardwareWatchpointLimit?: number;
    platform?: NodeJS.Platform;
  }
): void {
  const gdbPort = toGdbSerialPort(options.port, options.platform);
  config.runOpenOCD = false;
  config.initCommands = [];
  if (options.hardwareWatchpointLimit !== undefined) {
    config.initCommands.push(
      `set remote hardware-watchpoint-limit ${options.hardwareWatchpointLimit}`
    );
  }
  config.initCommands.push("set backtrace limit 16");
  // The stub handles Z0 and programs the CPU breakpoint registers itself.
  // hardwareBreakpoint makes GDB send Z1, which the stub does not implement.
  config.hardwareBreakpoint = false;
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
