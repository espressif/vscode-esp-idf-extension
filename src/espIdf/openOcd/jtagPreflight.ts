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
  openOcdNotReady,
  openOcdNotRunning,
} from "../../common/error/knownError";
import { OpenOCDManager } from "./openOcdManager";
import { TCLClient } from "./tcl/tclClient";
import {
  assertOpenOcdVersionMeetsJtagMinimum,
  MIN_OPENOCD_VERSION_FOR_JTAG,
} from "./jtagPreflightVersion";

export {
  MIN_OPENOCD_VERSION_FOR_JTAG,
  assertOpenOcdVersionMeetsJtagMinimum,
} from "./jtagPreflightVersion";

const OPENOCD_READY_MAX_ATTEMPTS = 3;
const OPENOCD_READY_RETRY_DELAY_MS = 1000;

export async function assertMinimumOpenOcdVersionForJtag(): Promise<void> {
  const currentVersion = await OpenOCDManager.init().version();
  assertOpenOcdVersionMeetsJtagMinimum(currentVersion);
}

async function ensureOpenOcdServerRunning(workspace: Uri): Promise<void> {
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
    throw openOcdLaunchDeclined();
  }

  await OpenOCDManager.init().start();
  if (!(await probeClient.isOpenOCDServerRunning())) {
    throw openOcdNotRunning();
  }
}

async function waitForOpenOcdReady(client: TCLClient): Promise<void> {
  for (let attempt = 0; attempt < OPENOCD_READY_MAX_ATTEMPTS; attempt++) {
    if (await client.verifyOpenOCDReady()) {
      return;
    }
    if (attempt < OPENOCD_READY_MAX_ATTEMPTS - 1) {
      await new Promise((resolve) => setTimeout(resolve, OPENOCD_READY_RETRY_DELAY_MS));
    }
  }
  throw openOcdNotReady();
}

export async function connectOpenOcdForJtag(workspace: Uri): Promise<TCLClient> {
  await ensureOpenOcdServerRunning(workspace);
  const host = readParameter("openocd.tcl.host", workspace) as string;
  const port = readParameter("openocd.tcl.port", workspace) as number;
  const client = new TCLClient({ host, port });
  await waitForOpenOcdReady(client);
  return client;
}
