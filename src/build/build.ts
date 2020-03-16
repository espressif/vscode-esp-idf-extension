/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 27th September 2019 9:59:57 pm
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
import { mkdirSync } from "fs";
import { join } from "path";
import * as treeKill from "tree-kill";
import { OutputChannel } from "vscode";
import { appendIdfAndToolsToPath, canAccessFile } from "../utils";

export class BuildManager {
  public static isBuilding: boolean;
  private readonly buildProjectDir: string;
  private readonly outputChannel: OutputChannel;
  private server: ChildProcess;
  constructor(buildProjectDir: string, outputChannel?: OutputChannel) {
    this.buildProjectDir = buildProjectDir;
    this.outputChannel = outputChannel;
  }
  public async build() {
    await this._build("cmake", ["-G", "Ninja", `..`]);
    await this._build("cmake", ["--build", "."]);
  }
  public cancel() {
    if (this.server && !this.server.killed) {
      // this.server.kill("SIGKILL");
      treeKill(this.server.pid, "SIGKILL");
      this.server = undefined;
      this.outputToOutputChannel("\n❌ [Build] : Stopped!\n");
    }
  }
  private async _build(command: string, args?: string[]) {
    return new Promise((resolve, reject) => {
      if (BuildManager.isBuilding) {
        return reject(new Error("ALREADY_BUILDING"));
      }

      this.buildStarted();

      const buildPath = this.createBuildDirIfNotExists();

      appendIdfAndToolsToPath();

      this.server = spawn(command, args, {
        cwd: buildPath
      });

      this.server.on("close", (code: number, signal: string) => {
        this.buildDone();

        if (signal === "SIGKILL") {
          return reject(new Error(`BUILD_TERMINATED`));
        }
        if (code !== 0) {
          return reject(new Error(`NON_ZERO_EXIT_CODE:${code}`));
        }
        resolve();
      });

      this.server.on("error", (error: Error) => {
        this.buildDone();

        reject(error);
      });

      this.server.stdout.on("data", (chunk: Buffer) => {
        this.outputToOutputChannel(chunk.toString());
      });

      this.server.stderr.on("data", (chunk: Buffer) => {
        this.outputToOutputChannel(`⚠️ ${chunk.toString()}`);
      });
    });
  }
  private createBuildDirIfNotExists(): string {
    const buildPath = join(this.buildProjectDir, "build");
    if (!canAccessFile(buildPath)) {
      mkdirSync(buildPath);
    }
    return buildPath;
  }
  private outputToOutputChannel(data: string) {
    if (this.outputChannel) {
      this.outputChannel.append(data);
    }
  }
  private buildStarted() {
    BuildManager.isBuilding = true;
  }
  private buildDone() {
    BuildManager.isBuilding = false;
  }
}
