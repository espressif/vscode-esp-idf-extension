/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 22nd August 2019 6:10:06 pm
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

import * as vscode from "vscode";

import { constants } from "fs";
import { canAccessFile } from "../../../../utils";
import { XtensaTools } from "./abstractXtensaTools";

export class Addr2Line extends XtensaTools {
  private readonly elfFilePath: string;
  private readonly address: string;

  constructor(workspaceRoot: vscode.Uri, elfFilePath: string, address: string) {
    super(workspaceRoot, "addr2line");
    this.elfFilePath = elfFilePath;
    this.address = address;
  }

  public async run() {
    if (!canAccessFile(this.elfFilePath, constants.R_OK)) {
      throw new Error("Elf file not present or not accessible");
    }
    return await this.call(["-e", this.elfFilePath, this.address]);
  }
}
