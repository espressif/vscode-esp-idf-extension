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

import { pathExists } from "fs-extra";
import * as pythonManager from "../pythonManager";
import { SetupPanel } from "./SetupPanel";
import { OutputChannel } from "../logger/outputChannel";
import { PyReqLog } from "../PyReqLog";
import { CancellationToken, Progress } from "vscode";

export async function installPyReqs(
  espIdfPath: string,
  workingDir: string,
  sysPyBinPath: string,
  progress: Progress<{ message: string; increment?: number }>,
  cancelToken?: CancellationToken
) {
  progress.report({
    message: `Checking Python and pip exists...`,
  });
  const pyExists =
    sysPyBinPath === "python" ? true : await pathExists(sysPyBinPath);
  const doesPythonExists = await pythonManager.checkPythonExists(
    sysPyBinPath,
    workingDir
  );
  if (!(pyExists && doesPythonExists)) {
    const msg = "Python have not been found in your environment.";
    sendPyReqLog(msg);
    OutputChannel.appendLine(msg);
    return;
  }
  const doesPipExists = await pythonManager.checkPipExists(
    sysPyBinPath,
    workingDir
  );
  if (!doesPipExists) {
    const msg = "Pip have not been found in your environment.";
    sendPyReqLog(msg);
    OutputChannel.appendLine(msg);
    return;
  }
  const logTracker = new PyReqLog(sendPyReqLog);
  progress.report({
    message: `Installing python virtualenv and ESP-IDF python requirements...`,
  });
  const virtualEnvPyBin = await pythonManager.installPythonEnvFromIdfTools(
    espIdfPath,
    workingDir,
    logTracker,
    sysPyBinPath,
    OutputChannel.init(),
    cancelToken
  );
  if (virtualEnvPyBin) {
    if (logTracker.Log.indexOf("Exception") < 0) {
      OutputChannel.appendLine("Python requirements has been installed");
      SetupPanel.postMessage({
        command: "load_python_bin_path",
        pythonBinPath: virtualEnvPyBin,
      });
      return virtualEnvPyBin;
    }
  }
  OutputChannel.appendLine("Python requirements has not been installed");
  return;
}

export async function installExtensionPyReqs(
  workingDir: string,
  pythonBinPath: string
) {
  const logTracker = new PyReqLog(sendPyReqLog);
  await pythonManager.installExtensionPyReqs(
    pythonBinPath,
    workingDir,
    logTracker,
    OutputChannel.init()
  );
}

export function sendPyReqLog(log: string) {
  SetupPanel.postMessage({
    command: "updatePyReqsLog",
    pyReqsLog: log,
  });
}

export async function getPythonList(workingDir: string) {
  const pyVersionList = await pythonManager.getPythonBinList(workingDir);
  pyVersionList.push("Provide python executable path");
  return pyVersionList;
}
