import { SerialPort } from "serialport";
import { toNodeSerialPortPath } from "./debugConfig";

const interruptByte = Buffer.from([0x03]);
const resetHoldMs = 100;
const bootDelayMs = 800;
const stubSwitchDelayMs = 200;
const serialOperationTimeoutMs = 3000;

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
    onProgress?.(`Sending GDB Stub interrupt on ${serialPath}`);
    await writeBuffer(serialPort, interruptByte);
    // Allow the 0x03 byte to be transmitted by the host USB-to-UART bridge
    await delay(stubSwitchDelayMs);
  } finally {
    await closeSerialPort(serialPort);
    // Brief delay to allow the operating system driver to fully release the port
    await delay(100);
  }
}
