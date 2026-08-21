import { SerialPort } from "serialport";

const interruptByte = Buffer.from([0x03]);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function openSerialPort(
  path: string,
  baudRate: number
): Promise<SerialPort | undefined> {
  return new Promise((resolve) => {
    const serialPort = new SerialPort({
      path,
      baudRate,
      autoOpen: true,
    });
    serialPort.on("open", () => resolve(serialPort));
    serialPort.on("error", () => {
      closeSerialPort(serialPort).finally(() => resolve(undefined));
    });
  });
}

function setEnable(serialPort: SerialPort, enable: boolean): Promise<boolean> {
  return new Promise((resolve) => {
    serialPort.set({ dtr: false, rts: !enable }, (error) =>
      resolve(error ? false : true)
    );
  });
}

function writeBuffer(serialPort: SerialPort, data: Buffer): Promise<boolean> {
  return new Promise((resolve) => {
    serialPort.write(data, (error) => resolve(error ? false : true));
  });
}

function closeSerialPort(serialPort: SerialPort): Promise<void> {
  return new Promise((resolve) => {
    serialPort.removeAllListeners();
    if (!serialPort.isOpen) {
      resolve();
      return;
    }
    serialPort.close(() => resolve());
  });
}

async function targetReset(port: string): Promise<void> {
  const serialPort = await openSerialPort(port, 115200);
  if (!serialPort) {
    throw new Error(`Unable to reset target on ${port}`);
  }
  try {
    if (!(await setEnable(serialPort, false))) {
      throw new Error(`Unable to reset target on ${port}`);
    }
    await delay(20);
    if (!(await setEnable(serialPort, true))) {
      throw new Error(`Unable to reset target on ${port}`);
    }
  } finally {
    await closeSerialPort(serialPort);
  }
  await delay(500);
}

async function interruptRequest(port: string, baudRate: number): Promise<void> {
  const serialPort = await openSerialPort(port, baudRate);
  if (!serialPort) {
    throw new Error(`Sending interrupt request to ${port} failed`);
  }
  try {
    if (!(await writeBuffer(serialPort, interruptByte))) {
      throw new Error(`Sending interrupt request to ${port} failed`);
    }
  } finally {
    await closeSerialPort(serialPort);
  }
}

export async function enterRuntimeGdbStub(
  port: string,
  baudRate: number
): Promise<void> {
  await targetReset(port);
  await interruptRequest(port, baudRate);
}
