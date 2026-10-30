import { SerialPort } from "serialport";
import { toNodeSerialPortPath } from "./debugConfig";

const interruptByte = Buffer.from([0x03]);
const resetHoldMs = 100;
const bootDelayMs = 800;
const stubReplyTimeoutMs = 1000;
const stubInterruptAttempts = 3;
const serialOperationTimeoutMs = 3000;

const gdbStubDidNotEnterMessage =
  "The target did not enter the GDB stub. Enable CONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME, then build and flash the project.";

export interface GdbStubByteSource {
  on(event: "data", listener: (chunk: Buffer) => void): void;
  off(event: "data", listener: (chunk: Buffer) => void): void;
}

// IDF Monitor only hands the port to GDB after a checksum-valid $Txx#cc stop packet.
export function bufferHasGdbStubStopPacket(buffer: Buffer): boolean {
  const text = buffer.toString("latin1");
  const pattern = /\$(T[0-9a-fA-F]{2})#([0-9a-fA-F]{2})/g;
  for (const match of text.matchAll(pattern)) {
    const payload = match[1];
    let sum = 0;
    for (let index = 0; index < payload.length; index++) {
      sum = (sum + payload.charCodeAt(index)) & 0xff;
    }
    if (sum === Number.parseInt(match[2], 16)) {
      return true;
    }
  }
  return false;
}

export async function readGdbStubStopPacket(
  source: GdbStubByteSource,
  options: {
    timeoutMs: number;
    attempts: number;
    sendInterrupt: () => Promise<void>;
  }
): Promise<boolean> {
  const chunks: Buffer[] = [];
  let found = false;
  let wake: (() => void) | undefined;
  const onData = (chunk: Buffer) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    if (bufferHasGdbStubStopPacket(Buffer.concat(chunks))) {
      found = true;
      wake?.();
    }
  };
  source.on("data", onData);
  try {
    for (let attempt = 0; attempt < options.attempts; attempt++) {
      await options.sendInterrupt();
      if (found) {
        return true;
      }
      await waitForStopPacket(options.timeoutMs, (resume) => {
        wake = () => {
          wake = undefined;
          resume();
        };
        if (found) {
          wake();
        }
      });
      if (found) {
        return true;
      }
    }
    return false;
  } finally {
    wake = undefined;
    source.off("data", onData);
  }
}

function waitForStopPacket(
  timeoutMs: number,
  arm: (resume: () => void) => void
): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    arm(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(
  operation: Promise<T>,
  ms: number,
  message: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    operation.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(message));
      }
    );
  });
}

function openSerialPort(path: string, baudRate: number): Promise<SerialPort> {
  const serialPort = new SerialPort({
    path,
    baudRate,
    autoOpen: false,
    hupcl: false,
    rtscts: false,
  });
  let settled = false;
  serialPort.on("error", () => {
    // serialport emits "error" for an open failure in addition to the
    // callback. Without a listener that becomes an unhandled extension error.
  });
  const opened = new Promise<SerialPort>((resolve, reject) => {
    serialPort.open((error) => {
      if (settled) {
        void closeSerialPort(serialPort);
        return;
      }
      if (error) {
        reject(error);
        return;
      }
      resolve(serialPort);
    });
  });
  return withTimeout(
    opened,
    serialOperationTimeoutMs,
    `Unable to open ${path}`
  ).catch(async (error) => {
    settled = true;
    await closeSerialPort(serialPort);
    throw error;
  });
}

function setControlLines(serialPort: SerialPort, rts: boolean): Promise<void> {
  return withTimeout(
    new Promise<void>((resolve, reject) => {
      serialPort.set({ dtr: false, rts }, (error) =>
        error ? reject(error) : resolve()
      );
    }),
    serialOperationTimeoutMs,
    "Unable to reset the target"
  );
}

function writeBuffer(serialPort: SerialPort, data: Buffer): Promise<void> {
  return withTimeout(
    new Promise<void>((resolve, reject) => {
      serialPort.write(data, (error) => (error ? reject(error) : resolve()));
    }),
    serialOperationTimeoutMs,
    "Unable to send the GDB Stub interrupt"
  );
}

function closeSerialPort(serialPort: SerialPort): Promise<void> {
  return withTimeout(
    new Promise<void>((resolve) => {
      if (!serialPort.isOpen) {
        resolve();
        return;
      }
      // Ensure lines remain in non-reset state before closing
      serialPort.set({ dtr: false, rts: false }, () => {
        serialPort.close(() => resolve());
      });
    }),
    1000,
    "Unable to close the serial port"
  ).catch(() => undefined);
}

async function resetTarget(serialPort: SerialPort): Promise<void> {
  await setControlLines(serialPort, true);
  await delay(resetHoldMs);
  await setControlLines(serialPort, false);
}

export async function enterRuntimeGdbStub(
  port: string,
  baudRate: number,
  onProgress?: (message: string) => void
): Promise<void> {
  const serialPath = toNodeSerialPortPath(port);
  const serialPort = await openSerialPort(serialPath, baudRate);
  try {
    onProgress?.(`Resetting target on ${serialPath}`);
    await resetTarget(serialPort);
    onProgress?.(`Waiting for the target to boot on ${serialPath}`);
    await delay(bootDelayMs);
    const entered = await readGdbStubStopPacket(serialPort, {
      timeoutMs: stubReplyTimeoutMs,
      attempts: stubInterruptAttempts,
      sendInterrupt: async () => {
        onProgress?.(`Sending GDB Stub interrupt on ${serialPath}`);
        await writeBuffer(serialPort, interruptByte);
      },
    });
    if (!entered) {
      throw new Error(gdbStubDidNotEnterMessage);
    }
  } finally {
    await closeSerialPort(serialPort);
    // Brief delay to allow the operating system driver to fully release the port
    await delay(100);
  }
}
