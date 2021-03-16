/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 16th March 2021 11:52:51 am
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
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
import { OpenOCDManager } from "../espIdf/openOcd/openOcdManager";
import { TCLClient, TCLConnection } from "../espIdf/openOcd/tcl/tclClient";
import * as idfConf from "../idfConfiguration";
import { Logger } from "../logger/logger";

export class CoverageManager extends EventEmitter {
  private tclConnectionParams: TCLConnection;
  private tclClient: TCLClient;
  public isRunning: boolean = false;

  constructor() {
    super();
    const host = idfConf.readParameter("openocd.tcl.host");
    const port = idfConf.readParameter("openocd.tcl.port");
    this.tclConnectionParams = { host, port };
  }

  public async start() {
    try {
      if (await OpenOCDManager.init().promptUserToLaunchOpenOCDServer()) {
        this.isRunning = true;
        this.tclClient = this.sendCommandToTCLSession("esp gcov dump");
        this.tclClient.on("response", (resp: Buffer) => {
          const respStr = resp.toString();
          if (respStr.includes("GCOV data have been dumped.")) {
            this.stop();
          }
        });
        this.tclClient.on("error", (error: Error) => {
          Logger.error(
            `Some error prevailed while dumping data with gcov`,
            error
          );
          this.stop();
        });
      }
    } catch (error) {
      Logger.errorNotify(error.message, error);
    }
  }

  public async stop() {
    this.isRunning = false;
    this.tclClient.stop();
  }

  private sendCommandToTCLSession(command: string) {
    const tclHandler = new TCLClient(this.tclConnectionParams);
    tclHandler.sendCommandWithCapture(command);
    return tclHandler;
  }
}
