/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 2nd June 2020 10:57:18 am
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { checkGitExists, getEspIdfFromCMake } from "../../utils";
import { spawn, ChildProcess } from "child_process";
import * as idfConf from "../../idfConfiguration";
import * as treeKill from "tree-kill";
import { join } from "path";
import { ensureDir } from "fs-extra";
import { Logger } from "../../logger/logger";
import { OutputChannel } from "../../logger/outputChannel";
import { ESP } from "../../config";

export class ArduinoComponentInstaller {
  private cloneProcess: ChildProcess;
  private espIdfPath: string;
  private readonly projectDir: string;
  private gitBinPath: string;

  constructor(
    espIdfPath: string,
    projectDir: string,
    gitBinPath: string = "git"
  ) {
    this.espIdfPath = espIdfPath;
    this.projectDir = projectDir;
    this.gitBinPath = gitBinPath;
  }

  public cancel() {
    if (this.cloneProcess && !this.cloneProcess.killed) {
      treeKill(this.cloneProcess.pid, "SIGKILL");
      this.cloneProcess = undefined;
      const stoppedMsg = "\n❌ [Arduino ESP32 Cloning] : Stopped!\n";
      OutputChannel.appendLine(stoppedMsg);
      Logger.info(stoppedMsg);
    }
  }

  public async cloneArduinoInComponentsFolder(branchToUse: string) {
    const gitVersion = await checkGitExists(this.projectDir, this.gitBinPath);
    if (!gitVersion || gitVersion === "Not found") {
      return;
    }
    const componentsDir = join(this.projectDir, "components");
    await ensureDir(componentsDir);
    return new Promise<void>((resolve, reject) => {
      this.cloneProcess = spawn(
        this.gitBinPath,
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
        Logger.info(data.toString());
      });

      this.cloneProcess.stdout.on("data", (data) => {
        OutputChannel.appendLine(data.toString());
        Logger.info(data.toString());
      });
      this.cloneProcess.on("exit", (code, signal) => {
        if (!signal && code !== 0) {
          const errorMsg = `Arduino ESP32 cloning has exit with ${code}`;
          OutputChannel.appendLine(errorMsg);
          Logger.errorNotify(errorMsg, new Error(errorMsg));
          reject(new Error(errorMsg));
        }
        resolve();
      });
    });
  }

  private async checkIdfVersion(espIdfPath?: string) {
    if (typeof espIdfPath === "undefined" || espIdfPath === "") {
      espIdfPath = this.espIdfPath || process.env.IDF_PATH;
    }
    const idfVersion = await getEspIdfFromCMake(espIdfPath);
    const majorMinorMatches = idfVersion.match(/([0-9]+\.[0-9]+).*/);
    const espIdfVersion =
      majorMinorMatches && majorMinorMatches.length > 0
        ? majorMinorMatches[1]
        : "x.x";
    const results: { [key: string]: string } = {
      "3.3": "idf-release/v3.3",
    };
    return results[espIdfVersion] || "master";
  }

  public async addArduinoAsComponent(espIdfPath?: string) {
    const branchToUse = await this.checkIdfVersion(espIdfPath);
    await ensureDir(this.projectDir);
    await this.cloneArduinoInComponentsFolder(branchToUse);
  }
}
