/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 2nd June 2020 10:57:18 am
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
import { checkGitExists, getEspIdfVersion } from "../../utils";
import { spawn, ChildProcess } from "child_process";
import * as idfConf from "../../idfConfiguration";
import * as treeKill from "tree-kill";
import { join } from "path";
import { ensureDir } from "fs-extra";
import { OutputChannel } from "../../logger/outputChannel";
import { Logger } from "../../logger/logger";
import { ESP } from "../../config";

export class ArduinoComponentInstaller {
  private readonly projectDir: string;
  private cloneProcess: ChildProcess;
  constructor(projectDir: string) {
    this.projectDir = projectDir;
  }

  public cancel() {
    if (this.cloneProcess && !this.cloneProcess.killed) {
      treeKill(this.cloneProcess.pid, "SIGKILL");
      this.cloneProcess = undefined;
      OutputChannel.appendLine("\n❌ [Arduino ESP32 Cloning] : Stopped!\n");
    }
  }

  public async cloneArduinoInComponentsFolder(branchToUse: string) {
    const gitVersion = await checkGitExists(this.projectDir);
    if (!gitVersion || gitVersion === "Not found") {
      return;
    }
    const componentsDir = join(this.projectDir, "components");
    await ensureDir(componentsDir);
    return new Promise<void>((resolve, reject) => {
      this.cloneProcess = spawn(
        `git`,
        [
          "clone",
          "--recursive",
          "--progress",
          "-b",
          branchToUse,
          ESP.URL.ARDUINO_ESP32_URL,
          "arduino",
        ],
        { cwd: componentsDir }
      );
      this.cloneProcess.stderr.on("data", (data) => {
        OutputChannel.appendLine(data.toString());
      });

      this.cloneProcess.stdout.on("data", (data) => {
        OutputChannel.appendLine(data.toString());
      });
      this.cloneProcess.on("exit", (code, signal) => {
        if (!signal && code !== 0) {
          OutputChannel.appendLine(
            `Arduino ESP32 cloning has exit with ${code}`
          );
          reject(new Error(`Arduino ESP32 cloning has exit with ${code}`));
        }
        resolve();
      });
    });
  }

  private async checkIdfVersion(espIdfPath?: string) {
    if (typeof espIdfPath === "undefined" || espIdfPath === "") {
      espIdfPath =
        idfConf.readParameter("idf.espIdfPath") || process.env.IDF_PATH;
    }
    const idfVersion = await getEspIdfVersion(espIdfPath);
    const majorMinorMatches = idfVersion.match(/([0-9]+\.[0-9]+).*/);
    const espIdfVersion =
      majorMinorMatches && majorMinorMatches.length > 0
        ? majorMinorMatches[1]
        : "x.x";
    const results: { [key: string]: string } = {
      "4.0": "idf-release/v4.0",
      "4.2": "idf-release/v4.2",
    };
    return results[espIdfVersion] || "master";
  }

  public async addArduinoAsComponent(espIdfPath?: string) {
    const branchToUse = await this.checkIdfVersion(espIdfPath);
    await ensureDir(this.projectDir);
    await this.cloneArduinoInComponentsFolder(branchToUse);
  }
}
