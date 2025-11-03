/**
 * Unity Test Runner
 * Main class that orchestrates serial capture, parsing, and XML generation
 */

import { UnityParser } from "./unityParser";
import { UnitySerialCapture } from "./serialCapture";
import { UnityParserOptions, UnityParseResult, IndividualTestResult } from "./types";
import { EventEmitter } from "events";
import { OutputChannel } from "../../../logger/outputChannel";
import { EOL } from "os";

export class UnityTestRunner extends EventEmitter {
  private parser: UnityParser;
  private serialCapture: UnitySerialCapture | null = null;
  private menuLines: string[] = [];
  private currentStartIndex: number = -1;
  private receivedLines: string[] = [];

  constructor() {
    super();
    this.parser = new UnityParser();
  }

  /**
   * Run Unity tests from serial port
   */
  async runFromSerial(options: UnityParserOptions) {
    const {
      port,
      baudRate = 115200,
      timeout = 10000,
      showOutput = true,
    } = options;

    try {
      // Create serial capture instance
      this.serialCapture = new UnitySerialCapture({ port, baudRate, timeout });

      // Set up event handlers
      this.serialCapture.on("connected", () => {
        this.emit("connected");
        OutputChannel.appendLine(
          `Connected to ${port} at ${baudRate} baud.`,
          "Unity Test Runner"
        );
      });

      this.serialCapture.on("disconnected", () => {
        this.emit("disconnected");
        OutputChannel.appendLine(
          `Disconnected from ${port}.`,
          "Unity Test Runner"
        );
      });

      this.serialCapture.on("error", (error) => {
        this.emit("error", error);
        OutputChannel.appendLine(
          `Error: ${error.message}`,
          "Unity Test Runner"
        );
      });

      if (showOutput) {
        this.serialCapture.on("data", (line) => {
          this.emit("data", line);
          OutputChannel.appendLine(`Received: ${line}`, "Unity Test Runner");
          this.receivedLines.push(line);
        });
      }

      // Connect to serial port
      const connected = await this.serialCapture.connect();
      if (!connected) {
        throw new Error(`Failed to connect to ${port}`);
      }

      this.emit("captureStarted");

      // Wait a moment for connection to stabilize
      await this.delay(1000);

      this.serialCapture.sendCommand("\n"); // Send newline to wake up device
      await this.delay(500);

      const readyIndex = this.receivedLines.findIndex((line) =>
        line.includes("Press ENTER to see the list of tests.")
      );
      if (readyIndex === -1) {
        throw new Error("Did not receive readiness prompt from device.");
      }
      this.menuLines = this.receivedLines.slice(readyIndex + 1);
      this.currentStartIndex = this.receivedLines.length - 1;

    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }

  async runTestFromSerialByName(testName: string): Promise<IndividualTestResult> {
    const testIndex = this.menuLines.findIndex((line) =>
      line.includes(testName)
    );
    if (testIndex === -1) {
      OutputChannel.appendLine(
        `Test "${testName}" not found in menu. Skipping.`,
        "Unity Test Runner"
      );
      return {
        filePath: '',
        lineNumber: 0,
        testName: testName,
        status: 'FAIL',
        duration: 0,
        message: `Test "${testName}" not found in menu`,
        output: this.menuLines.join(EOL)
      };
    }
    this.currentStartIndex = this.receivedLines.length - 1;
    this.serialCapture.sendCommand(`${testIndex}\n`);
    await this.delay(50);
    const testExecutionLines = this.receivedLines.slice(
      this.currentStartIndex + 1
    );

    if (testExecutionLines.length === 0) {
      OutputChannel.appendLine(
        `No test execution output received.`,
        "Unity Test Runner"
      );
      return {
        filePath: '',
        lineNumber: 0,
        testName: testName,
        status: 'FAIL',
        duration: 0,
        message: 'No test execution output received',
        output: testExecutionLines.join(EOL)
      };
    }

    const executionOutput = this.parser.parseIndividualTest(testExecutionLines);
    if (!executionOutput) {
      return {
        filePath: '',
        lineNumber: 0,
        testName: testName,
        status: 'FAIL',
        duration: 0,
        message: 'Failed to parse test output',
        output: testExecutionLines.join(EOL)
      };
    }
    return executionOutput;
  }

  async stop(): Promise<void> {
    if (this.serialCapture) {
      await this.serialCapture.disconnect();
      this.serialCapture = null;
    }
  }

  /**
   * List available serial ports
   */
  static async listPorts(): Promise<
    Array<{
      path: string;
      manufacturer?: string;
      serialNumber?: string;
      pnpId?: string;
      locationId?: string;
      vendorId?: string;
      productId?: string;
    }>
  > {
    return UnitySerialCapture.listPorts();
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
