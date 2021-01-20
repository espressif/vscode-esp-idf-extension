/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 29th September 2020 11:05:15 pm
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

import { TCLClient } from "../espIdf/openOcd/tcl/tclClient";

export class JTAGFlash {
  constructor(private readonly client: TCLClient) {}
  async flash(command: string) {
    return new Promise((resolve, reject) => {
      this.client
        .on("response", (data) => {
          const response = data.toString().replace("\x1a", "").trim();
          if (response !== "0") {
            return reject(
              `Failed to flash the device (JTag), please try again [got response: '${response}', expecting: '0']`
            );
          }

          //Flash successful when response is 0
          resolve(response);
        })
        .on("error", (err) => {
          reject(
            "Failed to flash (via JTag), due to some unknown error in tcl, please try to relaunch open-ocd"
          );
        })
        .sendCommand(command);
    });
  }
}
