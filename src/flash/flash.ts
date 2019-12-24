/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 22nd October 2019 8:18:32 pm
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

import { ChildProcess, spawn } from "child_process";
import { constants } from "fs";
import { join } from "path";
import { OutputChannel } from "vscode";
import * as idfConf from "../idfConfiguration";
import { appendIdfAndToolsToPath, canAccessFile } from "../utils";
import { FlashModel } from "./flashModel";

export class FlashManager {
    public static isFlashing: boolean;
    private readonly flashScriptPath: string;
    private readonly buildDir: string;
    private readonly model: FlashModel;
    private readonly outputChannel: OutputChannel;
    private server: ChildProcess;

    constructor(idfPath: string, buildDir: string, model: FlashModel, outputChannel?: OutputChannel) {
        this.flashScriptPath = join(idfPath, "components", "esptool_py", "esptool", "esptool.py");
        this.buildDir = buildDir;
        this.model = model;
        this.outputChannel = outputChannel;
    }

    public async flash() {
        if (FlashManager.isFlashing) {
            throw new Error("ALREADY_FLASHING");
        }
        this.preFlashVerify();
        await this._flash();
    }

    public cancel() {
        if (this.server && !this.server.killed) {
            this.server.kill("SIGKILL");
            this.server = undefined;
            this.outputToOutputChannel("❌ [Flash - ⚡️] : Stopped!");
        }
    }

    private preFlashVerify() {
        if (!canAccessFile(this.flashScriptPath)) {
            throw new Error("SCRIPT_PERMISSION_ERROR");
        }
        for (const flashFile of this.model.flashSections) {
            if (!canAccessFile(join(this.buildDir, flashFile.binFilePath), constants.R_OK)) {
                throw new Error("SECTION_BIN_FILE_NOT_ACCESSIBLE");
            }
        }
    }

    private flashing(flag: boolean) {
        FlashManager.isFlashing = flag;
    }

    private outputToOutputChannel(data: string) {
        if (this.outputChannel) {
            this.outputChannel.appendLine(data);
        }
    }

    private async _flash() {
        return new Promise((resolve, reject) => {
            this.flashing(true);

            appendIdfAndToolsToPath();
            const flasherArgs = [
                this.flashScriptPath,
                "-p", this.model.port,
                "-b", this.model.baudRate,
                "--after", "hard_reset", "write_flash",
                "--flash_mode", this.model.mode,
                "--flash_freq", this.model.frequency,
                "--flash_size", this.model.size,
            ];
            for (const flashFile of this.model.flashSections) {
                flasherArgs.push(flashFile.address, flashFile.binFilePath);
            }

            const pythonBinPath = idfConf.readParameter("idf.pythonBinPath") as string;
            this.server = spawn(pythonBinPath, flasherArgs,
            {
                cwd: this.buildDir,
            });

            this.server.on("close", (code: number, signal: string) => {
                this.flashing(false);
                if (signal === "SIGKILL") {
                    return reject(new Error(`FLASH_TERMINATED`));
                }
                if (code !== 0) {
                    return reject(new Error(`NON_ZERO_EXIT_CODE:${code}`));
                }
                resolve();
            });

            this.server.on("error", (error: Error) => {
                this.flashing(false);

                reject(error);
            });

            this.server.stdout.on("data", (chunk: Buffer) => {
                this.outputToOutputChannel(chunk.toString());
            });

            this.server.stderr.on("data", (chunk: Buffer) => {
                this.outputToOutputChannel(`⚠️\n${chunk.toString()}`);
            });

        });
    }
}
