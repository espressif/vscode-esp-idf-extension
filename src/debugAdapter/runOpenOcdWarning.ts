/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 9th September 2026
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
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

import { join } from "path";
import {
  ConfigurationTarget,
  DebugAdapterTracker,
  DebugAdapterTrackerFactory,
  DebugConfiguration,
  DebugSession,
  ProviderResult,
  Uri,
  l10n,
  window,
  workspace,
} from "vscode";
import { readParameter } from "../configuration/idf";
import { TCLClient } from "../espIdf/openOcd/tcl/tclClient";
import { Logger } from "../common/logger";

/** Sessions that never rely on the extension OpenOCD server. */
const SESSIONS_WITHOUT_OPENOCD = [
  "core-dump.debug.session.ws",
  "gdbstub.debug.session.ws",
  "qemu.debug.session",
];

function skipsExtensionOpenOCD(session: DebugSession) {
  return (
    session.configuration.runOpenOCD === false &&
    SESSIONS_WITHOUT_OPENOCD.indexOf(session.configuration.sessionID) === -1
  );
}

async function isExternalOpenOCDRunning(workspaceFolder: Uri | undefined) {
  const host = readParameter("openocd.tcl.host", workspaceFolder) as string;
  const port = readParameter("openocd.tcl.port", workspaceFolder) as number;
  const tclClient = new TCLClient({ host, port });
  return tclClient.isOpenOCDServerRunning();
}

async function setRunOpenOCDInLaunchJson(session: DebugSession) {
  const folderUri = session.workspaceFolder?.uri;
  const launchConfig = workspace.getConfiguration("launch", folderUri);
  const configurations = launchConfig.get<DebugConfiguration[]>(
    "configurations"
  );
  const matchIndex = (configurations ?? []).findIndex(
    (conf) =>
      conf.type === session.configuration.type &&
      conf.name === session.configuration.name
  );
  if (matchIndex === -1) {
    if (folderUri) {
      await window.showTextDocument(
        Uri.file(join(folderUri.fsPath, ".vscode", "launch.json"))
      );
    }
    return;
  }
  const updatedConfigurations = (configurations ?? []).slice();
  updatedConfigurations[matchIndex] = {
    ...updatedConfigurations[matchIndex],
    runOpenOCD: true,
  };
  await launchConfig.update(
    "configurations",
    updatedConfigurations,
    ConfigurationTarget.WorkspaceFolder
  );
  await window.showInformationMessage(
    l10n.t(
      "runOpenOCD is now true for '{0}'. Start the debug session again.",
      session.configuration.name
    )
  );
}

async function warnAboutRunOpenOCD(session: DebugSession) {
  try {
    if (await isExternalOpenOCDRunning(session.workspaceFolder?.uri)) {
      return;
    }
  } catch (error) {
    Logger.error(
      "Failed to check for an external OpenOCD server",
      error as Error,
      "runOpenOcdWarning warnAboutRunOpenOCD"
    );
  }
  const updateLaunchJson = l10n.t("Update launch.json");
  const selected = await window.showWarningMessage(
    l10n.t(
      "The debug session failed and 'runOpenOCD' is false in your launch.json, so the extension did not start OpenOCD and none is listening. Set 'runOpenOCD' to true to let the extension start it, or start OpenOCD yourself before debugging."
    ),
    updateLaunchJson
  );
  if (selected !== updateLaunchJson) {
    return;
  }
  try {
    await setRunOpenOCDInLaunchJson(session);
  } catch (error) {
    Logger.errorNotify(
      l10n.t("Failed to update runOpenOCD in launch.json"),
      error as Error,
      "runOpenOcdWarning setRunOpenOCDInLaunchJson"
    );
  }
}

/**
 * Warns when a session configured with `runOpenOCD: false` fails before it is running,
 * since the most common cause is that no OpenOCD server was started outside the extension.
 */
export class RunOpenOCDWarningTrackerFactory
  implements DebugAdapterTrackerFactory {
  public createDebugAdapterTracker(
    session: DebugSession
  ): ProviderResult<DebugAdapterTracker> {
    if (!skipsExtensionOpenOCD(session)) {
      return undefined;
    }
    let isSessionStarted = false;
    let hasWarned = false;
    const warnOnce = () => {
      if (isSessionStarted || hasWarned) {
        return;
      }
      hasWarned = true;
      void warnAboutRunOpenOCD(session);
    };
    return {
      onDidSendMessage(message) {
        if (
          !message ||
          message.type !== "response" ||
          (message.command !== "attach" && message.command !== "launch")
        ) {
          return;
        }
        if (message.success) {
          isSessionStarted = true;
        } else {
          warnOnce();
        }
      },
      onError() {
        warnOnce();
      },
      onExit(code) {
        if (code) {
          warnOnce();
        }
      },
    };
  }
}
