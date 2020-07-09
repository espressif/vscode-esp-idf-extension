// Copyright 2019 Espressif Systems (Shanghai) CO LTD
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { spawn, ChildProcess } from "child_process";
import treeKill from "tree-kill";
import { OutputChannel } from "../logger/outputChannel";
import { Progress } from "vscode";

export class EspAdfCloning {
  private readonly ESP_ADF_GITHUB_REPO =
    "https://github.com/espressif/esp-adf.git";
  private cloneProcess: ChildProcess;
  constructor(private installDir: string) {}

  public cancel() {
    if (this.cloneProcess && !this.cloneProcess.killed) {
      treeKill(this.cloneProcess.pid, "SIGKILL");
      this.cloneProcess = undefined;
      OutputChannel.appendLine("\n❌ [ESP-ADF Cloning] : Stopped!\n");
    }
  }

  public downloadEspAdfByClone(
    progress: Progress<{ message?: string; increment?: number }>
  ) {
    return new Promise((resolve, reject) => {
      this.cloneProcess = spawn(
        "git",
        [
          "clone",
          "--recursive",
          "--progress",
          "-b",
          "master",
          this.ESP_ADF_GITHUB_REPO,
        ],
        { cwd: this.installDir }
      );

      this.cloneProcess.stderr.on("data", (data) => {
        OutputChannel.appendLine(data.toString());
        const errRegex = /\b(Error)\b/g;
        if (errRegex.test(data.toString())) {
          reject(data.toString());
        }
        const progressRegex = /(\d+)(\.\d+)?%/g;
        const matches = data.toString().match(progressRegex);
        if (progress && matches) {
          progress.report({
            message: `Downloading ${matches[matches.length - 1]}`,
          });
        } else if (data.toString().indexOf("Cloning into") !== -1) {
          progress.report({
            message: ` ${data.toString()}`,
          });
        }
      });

      this.cloneProcess.stdout.on("data", (data) => {
        OutputChannel.appendLine(data.toString());
        const progressRegex = /(\d+)(\.\d+)?%/g;
        const matches = data.toString().match(progressRegex);
        if (progress && matches) {
          progress.report({
            message: `Downloading ${matches[matches.length - 1]}`,
          });
        } else if (data.toString().indexOf("Cloning into") !== -1) {
          progress.report({
            message: ` ${data.toString()}`,
          });
        }
      });

      this.cloneProcess.on("exit", (code, signal) => {
        if (!signal && code !== 0) {
          const msg = `ESP-IDF clone has exit with ${code}`;
          OutputChannel.appendLine(msg);
          return reject(msg);
        }
        return resolve();
      });
    });
  }
}
