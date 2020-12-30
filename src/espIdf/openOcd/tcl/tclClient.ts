/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 31st July 2019 2:59:47 pm
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { EventEmitter } from "events";
import { Socket } from "net";

// tslint:disable-next-line: interface-name
export interface TCLConnection {
  host: string;
  port: number;
}

export declare interface TCLClient {
  on(event: "connect", listener: () => void): this;
  on(event: "error", listener: (error: Error) => void): this;
  on(event: "response", listener: (data: Buffer) => void): this;
}

export class TCLClient extends EventEmitter {
  public static readonly DELIMITER = "\x1a";

  private readonly host: string;
  private readonly port: number;
  private isRunning: boolean;
  private sock: Socket;

  constructor(conn: TCLConnection) {
    super();
    this.host = conn.host;
    this.port = conn.port;
    this.sock = new Socket();
  }

  public async isOpenOCDServerRunning(): Promise<boolean> {
    return new Promise<boolean>((resolve, _) => {
      setTimeout(() => {
        const sock = new Socket();
        sock.connect(this.port, this.host, () => {
          sock.destroy();
          resolve(true);
        });
        sock.on("error", (error) => {
          sock.destroy();
          resolve(false);
        });
      }, 1000);
    });
  }

  public sendCommandWithCapture(command: string) {
    setTimeout(() => {
      return this.sendCommand(`capture "${command}"`);
    }, 2000);
  }

  public sendCommand(command: string) {
    if (this.isRunning && !this.sock.destroyed) {
      this.sendCommandToSocket(command);
      return;
    }

    let flushBuffer = Buffer.alloc(0);
    this.sock = new Socket();
    this.sock.connect(this.port, this.host, () => {
      this.emit("connect");
      this.isRunning = true;
      this.sendCommandToSocket(command);
    });
    this.sock.on("data", (data) => {
      flushBuffer = Buffer.concat([flushBuffer, data]);
      if (data.includes(TCLClient.DELIMITER)) {
        this.emit("response", flushBuffer);
        flushBuffer = Buffer.alloc(0);
      }
    });
    this.sock.on("error", (error) => {
      this.emit("error", error);
    });
  }

  public stop() {
    if (this.isRunning && !this.sock.destroyed) {
      this.isRunning = false;
      this.sock.destroy();
      this.sock.removeAllListeners();
    }
  }

  private sendCommandToSocket(command: string) {
    if (this.sock.writable) {
      this.sock.write(`${command}${TCLClient.DELIMITER}`);
    }
  }
}
