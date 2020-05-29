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
import * as path from "path";
import { ConfigurationTarget, WorkspaceFolder } from "vscode";
import * as idfConf from "../idfConfiguration";
import { MetadataJson } from "../Metadata";
import { Logger } from "../logger/logger";
import { OutputChannel } from "../logger/outputChannel";
import * as pythonManager from "../pythonManager";
import * as utils from "../utils";
import { OnBoardingPanel } from "./OnboardingPanel";
import { PyReqLog } from "./PyReqLog";

export async function checkPythonRequirements(
  workingDir: string,
  selectedWorkspaceFolder: WorkspaceFolder,
  pythonBinPath: string
) {
  const canCheck = await checkPythonPipExists(pythonBinPath, workingDir);
  if (!canCheck) {
    OnBoardingPanel.postMessage({
      command: "response_py_req_check",
      py_req_log: "Python or pip have not been found in your environment.",
    });
    return;
  }
  const espIdfPath = idfConf.readParameter(
    "idf.espIdfPath",
    selectedWorkspaceFolder
  ) as string;
  const idfToolsPath = idfConf.readParameter(
    "idf.toolsPath",
    selectedWorkspaceFolder
  ) as string;
  const requirements = path.join(espIdfPath, "requirements.txt");
  const debugAdapterRequirements = path.join(
    utils.extensionContext.extensionPath,
    "esp_debug_adapter",
    "requirements.txt"
  );
  const pythonBin = await pythonManager.getPythonBinToUse(
    espIdfPath,
    idfToolsPath,
    pythonBinPath
  );
  await utils
    .startPythonReqsProcess(pythonBin, espIdfPath, requirements)
    .then(async (pyReqLog) => {
      const resultLog = `Checking ESP-IDF Python requirements using ${pythonBinPath}\n${pyReqLog}`;
      OutputChannel.appendLine(resultLog);
      Logger.info(resultLog);
      OnBoardingPanel.postMessage({
        command: "response_py_req_check",
        py_req_log: resultLog,
      });

      await utils
        .startPythonReqsProcess(pythonBin, espIdfPath, debugAdapterRequirements)
        .then(async (adapterReqLog) => {
          const adapterResultLog = `Checking Debug Adapter requirements using ${pythonBin}\n${adapterReqLog}`;
          OutputChannel.appendLine(adapterResultLog);
          Logger.info(adapterResultLog);
          OnBoardingPanel.postMessage({
            command: "response_py_req_check",
            py_req_log: resultLog + adapterResultLog,
          });
          if (
            pyReqLog.indexOf("are not satisfied") < 0 &&
            adapterReqLog.indexOf("are not satisfied") < 0
          ) {
            OnBoardingPanel.postMessage({ command: "set_py_setup_finish" });
            await MetadataJson.addPythonVenvPath(pythonBinPath);
          }
        });
    })
    .catch((reason) => {
      if (reason.message) {
        Logger.error(reason.message, reason);
        OnBoardingPanel.postMessage({
          command: "response_py_req_check",
          py_req_log: reason.message,
        });
      } else {
        OnBoardingPanel.postMessage({
          command: "response_py_req_check",
          py_req_log: reason,
        });
      }
    });
}

export async function installPythonRequirements(
  espIdfPath: string,
  workingDir: string,
  confTarget: ConfigurationTarget,
  selectedWorkspaceFolder: WorkspaceFolder,
  systemPythonPath: string
) {
  const canCheck = await checkPythonPipExists(systemPythonPath, workingDir);
  if (!canCheck) {
    sendPyReqLog("Python or pip have not been found in your environment.");
    OutputChannel.appendLine(
      "Python or pip have not been found in your environment."
    );
    return;
  }
  const logTracker = new PyReqLog(sendPyReqLog);
  return await pythonManager
    .installPythonEnv(
      espIdfPath,
      workingDir,
      logTracker,
      systemPythonPath,
      OutputChannel.init()
    )
    .then(async (virtualEnvPythonBin) => {
      if (virtualEnvPythonBin) {
        await idfConf.writeParameter(
          "idf.pythonBinPath",
          virtualEnvPythonBin,
          confTarget,
          selectedWorkspaceFolder
        );
        OutputChannel.appendLine("Python requirements has been installed.");
        if (logTracker.Log.indexOf("Exception") < 0) {
          OnBoardingPanel.postMessage({ command: "set_py_setup_finish" });
          OnBoardingPanel.postMessage({
            command: "load_python_bin_path",
            pythonBinPath: virtualEnvPythonBin,
          });
          await MetadataJson.addPythonVenvPath(virtualEnvPythonBin);
        }
        return virtualEnvPythonBin;
      } else {
        OutputChannel.appendLine("Python requirements has not been installed.");
      }
    })
    .catch((reason) => {
      if (reason.message) {
        OutputChannel.appendLine(reason.message);
        sendPyReqLog(reason.message);
      } else {
        OutputChannel.appendLine(reason);
        sendPyReqLog(reason);
      }
    });
}

export async function checkPythonPipExists(
  pythonBinPath: string,
  workingDir: string
) {
  const pyExists =
    pythonBinPath === "python" ? true : await pathExists(pythonBinPath);
  const doestPythonExists = await pythonManager.checkPythonExists(
    pythonBinPath,
    workingDir
  );
  const doesPipExists = await pythonManager.checkPipExists(
    pythonBinPath,
    workingDir
  );
  return pyExists && doestPythonExists && doesPipExists;
}

export async function getPythonList(workingDir: string) {
  const pyVersionList = await pythonManager.getPythonBinList(workingDir);
  pyVersionList.push("Provide python executable path");
  return pyVersionList;
}

export function sendPyReqLog(log: string) {
  OnBoardingPanel.postMessage({
    command: "response_py_req_install",
    py_req_log: log,
  });
}
