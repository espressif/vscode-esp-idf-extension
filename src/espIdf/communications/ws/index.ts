/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 15th June 2020 6:36:02 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
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
import WebSocket, { Server } from "ws";
import { Logger } from "../../../logger/logger";

const fileTag:string = "ESP-IDF Communication";

interface GDBStubResponse {
  event: "gdb_stub";
  port: string;
  prog: string;
}

interface CoreDumpResponse {
  event: "coredump";
  file: string;
  prog: string;
}

export declare interface WSServer {
  on(event: "started", listener: (ws: WebSocket) => void): this;
  on(
    event: "gdb-stub-detected",
    listener: (resp: GDBStubResponse) => void
  ): this;
  on(
    event: "core-dump-detected",
    listener: (resp: CoreDumpResponse) => void
  ): this;
  on(event: "unknown-message", listener: () => void): this;
  on(event: "error", listener: (error: Error) => void): this;
  on(
    event: "close",
    listener: (resp: { code: number; reason: string }) => void
  ): this;
  close(): void;
  start(): void;
}

export class WSServer extends EventEmitter {
  private _port: number;
  private _wsServer: Server;
  private _client?: WebSocket;
  private _host: string;
  constructor(port: number) {
    super();
    this._host = "localhost";
    this._port = port;
  }
  start() {
    this._wsServer = new Server({ host: this._host, port: this._port });
    this._wsServer
      .on("error", (err) => this.emit("error", err))
      .on("listening", () => this.emit("started"))
      .on("connection", (socket, request) => {
        //check if one client already connected kill the new connection request
        if (this._client && this._client.OPEN) {
          return socket.close(1001, "Only one client allowed to connect");
        }
        this._client = socket;
        this._client
          .on("close", (code, reason) => this.emit("close", { code, reason }))
          .on("error", (err) => this.emit("error", err))
          .on("message", (data) => {
            try {
              data = data.toString();
              const jsonResp = JSON.parse(data);
              if (jsonResp.event && jsonResp.event === "coredump") {
                //{'event': 'coredump', 'file': '/tmp/xy', 'prog': 'build/elf_file'}
                this.emit("core-dump-detected", jsonResp);
              } else if (jsonResp.event === "gdb_stub") {
                //{'event': 'gdb_stub', 'port': '/dev/ttyUSB1', 'prog': 'build/elf_file'}
                this.emit("gdb-stub-detected", jsonResp);
              } else {
                this.emit("unknown-message", data);
              }
            } catch (error) {
              Logger.errorNotify(
                `Failed to parse the websocket message`,
                error,
                [fileTag]
              );
              this.emit("unknown-message", data, error);
            }
          });
      });
  }
  done() {
    this._client?.send(JSON.stringify({ event: "debug_finished" }));
  }
  close() {
    this._wsServer.close();
  }
}
