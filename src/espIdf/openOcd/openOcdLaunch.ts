/*
 * Project: ESP-IDF VSCode Extension
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

import { Uri, window } from "vscode";
import { readParameter } from "../../configuration/idf";
import {
  openOcdLaunchDeclined,
  openOcdNotRunning,
} from "../../common/error/knownError";
import { ErrorPresentation } from "../../common/error/types";
import { OpenOCDManager } from "./openOcdManager";
import { TCLClient } from "./tcl/tclClient";

export type EnsureOpenOcdServerRunningPresentation = {
  launchDeclined?: ErrorPresentation;
  notRunning?: ErrorPresentation;
};

export async function ensureOpenOcdServerRunning(
  workspace: Uri,
  presentation?: EnsureOpenOcdServerRunningPresentation
): Promise<void> {
  const host = readParameter("openocd.tcl.host", workspace) as string;
  const port = readParameter("openocd.tcl.port", workspace) as number;
  const probeClient = new TCLClient({ host, port });

  if (await probeClient.isOpenOCDServerRunning()) {
    return;
  }

  const resp = await window.showInformationMessage(
    "OpenOCD is not running, do you want to launch it?",
    { modal: true },
    { title: "Yes" },
    { title: "Cancel", isCloseAffordance: true }
  );
  if (!resp || resp.title !== "Yes") {
    throw openOcdLaunchDeclined(presentation?.launchDeclined);
  }

  await OpenOCDManager.init().start();
  if (!(await probeClient.isOpenOCDServerRunning())) {
    throw openOcdNotRunning(presentation?.notRunning);
  }
}
