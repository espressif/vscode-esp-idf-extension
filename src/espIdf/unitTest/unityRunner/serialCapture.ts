/**
 * Serial Port Capture for Unity Test Output
 * Handles serial communication with ESP32 devices
 */

import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { UnityParserOptions, SerialPortConfig } from "./types"
import { EventEmitter } from 'events';
import { promises } from 'fs';
import { Logger } from '../../../logger/logger';

export class UnitySerialCapture extends EventEmitter {
  private port: SerialPort | null = null;
  private parser: ReadlineParser | null = null;
  private config: SerialPortConfig;
  private isCapturing = false;
  private capturedLines: string[] = [];

  constructor(config: SerialPortConfig) {
    super();
    this.config = config;
  }

  /**
   * Connect to serial port
   */
  async connect(): Promise<boolean> {
    try {
      this.port = new SerialPort({
        path: this.config.port,
        baudRate: this.config.baudRate,
        autoOpen: false
      });

      this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }));

      // Set up event handlers
      this.port.on('open', () => {
        Logger.info(`Connected to ${this.config.port} at ${this.config.baudRate} baud`);
        this.emit('connected');
      });

      this.port.on('error', (err) => {
        Logger.error(`Serial port error: ${err.message}`, err, "UnitySerialCapture port error");
        this.emit('error', err);
      });

      this.parser.on('data', (line: string) => {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          this.capturedLines.push(trimmedLine);
          this.emit('data', trimmedLine);
          Logger.info(`[${new Date().toISOString()}] ${trimmedLine}`);
        }
      });

      // Open the port
      await new Promise<void>((resolve, reject) => {
        if (!this.port) {
          reject(new Error('Port not initialized'));
          return;
        }

        this.port.open((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Perform hard reset after successful connection
      await this.hardReset();

      return true;
    } catch (error) {
      Logger.error(`Failed to connect to ${this.config.port}:`, error, "UnitySerialCapture connect");
      return false;
    }
  }

  /**
   * Disconnect from serial port
   */
  async disconnect(): Promise<void> {
    if (this.port && this.port.isOpen) {
      await new Promise<void>((resolve) => {
        this.port!.close(() => {
          Logger.info('Disconnected from serial port');
          this.emit('disconnected');
          resolve();
        });
      });
    }
    this.port = null;
    this.parser = null;
    this.isCapturing = false;
  }

  /**
   * Hard reset the serial port
   * This method performs a hardware reset by toggling DTR and RTS lines
   */
  async hardReset(): Promise<void> {
    if (!this.port || !this.port.isOpen) {
      throw new Error('Port not connected');
    }

    try {
      Logger.info('Performing hard reset...');
      
      // Set DTR and RTS to false (reset state)
      this.port.set({ dtr: false, rts: false });
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
      
      // Set DTR and RTS to true (normal state)
      this.port.set({ dtr: true, rts: true });
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
      
      // Set DTR to false and RTS to true (boot mode for ESP32)
      this.port.set({ dtr: false, rts: true });
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
      
      // Set both to true (normal operation)
      this.port.set({ dtr: true, rts: true });
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms

      Logger.info('Hard reset completed');
      this.emit('hardResetCompleted');
    } catch (error) {
      Logger.error('Hard reset failed:', error, "UnitySerialCapture hardReset");
      this.emit('hardResetFailed', error);
      throw error;
    }
  }

  /**
   * Start capturing output
   */
  startCapture(): void {
    this.isCapturing = true;
    this.capturedLines = [];
    this.emit('captureStarted');
  }

  /**
   * Stop capturing output
   */
  stopCapture(): void {
    this.isCapturing = false;
    this.emit('captureStopped');
  }

  /**
   * Capture output for a specified duration
   */
  async captureForDuration(durationMs: number): Promise<string[]> {
    this.startCapture();
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.stopCapture();
        resolve([...this.capturedLines]);
      }, durationMs);

      // Allow manual stopping
      this.once('captureStopped', () => {
        clearTimeout(timeout);
        resolve([...this.capturedLines]);
      });
    });
  }

  /**
   * Get captured lines
   */
  getCapturedLines(): string[] {
    return [...this.capturedLines];
  }

  /**
   * Clear captured lines
   */
  clearCapturedLines(): void {
    this.capturedLines = [];
  }

  /**
   * Save captured output to file
   */
  async saveToFile(filePath: string): Promise<void> {
    const content = this.capturedLines.join('\n');
    await promises.writeFile(filePath, content, 'utf-8');
    Logger.info(`Output saved to ${filePath}`);
  }

  /**
   * Check if port is connected
   */
  isConnected(): boolean {
    return this.port !== null && this.port.isOpen;
  }

  /**
   * Get port information
   */
  getPortInfo(): { port: string; baudRate: number; isOpen: boolean } {
    return {
      port: this.config.port,
      baudRate: this.config.baudRate,
      isOpen: this.isConnected()
    };
  }

  /**
   * List available serial ports
   */
  static async listPorts(): Promise<Array<{ path: string; manufacturer?: string; serialNumber?: string; pnpId?: string; locationId?: string; vendorId?: string; productId?: string }>> {
    try {
      const ports = await SerialPort.list();
      return ports.map(port => ({
        path: port.path,
        manufacturer: port.manufacturer,
        serialNumber: port.serialNumber,
        pnpId: port.pnpId,
        locationId: port.locationId,
        vendorId: port.vendorId,
        productId: port.productId
      }));
    } catch (error) {
      Logger.error('Failed to list serial ports:', error, "UnitySerialCapture listPorts");
      return [];
    }
  }

  /**
   * Wait for specific pattern in output
   */
  async waitForPattern(pattern: RegExp, timeoutMs: number = 10000): Promise<string | null> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.parser?.removeListener('data', onData);
        resolve(null);
      }, timeoutMs);

      const onData = (line: string) => {
        if (pattern.test(line)) {
          clearTimeout(timeout);
          this.parser?.removeListener('data', onData);
          resolve(line);
        }
      };

      this.parser?.on('data', onData);
    });
  }

  /**
   * Send command to serial port
   */
  async sendCommand(command: string): Promise<void> {
    if (!this.port || !this.port.isOpen) {
      throw new Error('Port not connected');
    }

    return new Promise((resolve, reject) => {
      this.port!.write(command + '\n', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

