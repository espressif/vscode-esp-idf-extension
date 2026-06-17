/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 15th June 2026 5:57:24 pm
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

import {
  ConfigurationTarget,
  env,
  ExtensionContext,
  l10n,
  Uri,
  window,
} from "vscode";
import { registerIDFCommand } from "../common/registerCommand";
import { withProgressWrapper } from "../common/withProgressWrapper";
import {
  checkEimExists,
  downloadAndInstallEIM,
  isEimGuiCapable,
  isVSCodeInstalledViaSnap,
  launchEimInTerminal,
  shouldForceCliMode,
} from "./downloadInstall";
import { ESP } from "../config";
import { Logger } from "../common/logger";
import { readParameter, writeParameter } from "../configuration/idf";
import { showSnapEimNotification } from "./showSnapEimNotification";
import { openFolderCheck, PreCheck } from "../common/PreCheck";
import { selectIdfSetup } from "./selectIdfSetup";
import { statusBarItems } from "../statusBar";

export function installManagerCommand(context: ExtensionContext) {
  registerIDFCommand(context, "espIdf.selectCurrentIdfVersion", () => {
    PreCheck.perform([openFolderCheck], async () => {
      const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      await selectIdfSetup(wsFolder, statusBarItems["currentIdfVersion"]);
    });
  });
  registerIDFCommand(context, "espIdf.installManager", async () => {
    await withProgressWrapper(
      [],
      l10n.t("ESP-IDF Install Manager"),
      async (_progress, cancelToken) => {
        const forceCliMode = shouldForceCliMode();
        const isSnapInstall = isVSCodeInstalledViaSnap();
        const shouldUseCliMode = forceCliMode || isSnapInstall;
        let eimPath = await checkEimExists(_progress, cancelToken);
        let canLaunchGui = false;

        if (!eimPath) {
          _progress.report({
            message: l10n.t(
              "EIM executable not found. Please choose a download mirror."
            ),
            increment: 0,
          });
          const mirrorToUse = await window.showQuickPick(
            ["Github", "Espressif (faster in China)", "Open Releases URL"],
            {
              placeHolder: l10n.t("Select mirror to use"),
            }
          );
          if (!mirrorToUse) {
            return;
          }
          if (mirrorToUse === "Open Releases URL") {
            env.openExternal(Uri.parse(ESP.URL.InstallManager.Releases));
            return;
          }
          const useMirror = mirrorToUse === "Espressif (faster in China)";
          eimPath = await downloadAndInstallEIM(
            _progress,
            cancelToken,
            useMirror,
            shouldUseCliMode
          );
          if (!eimPath) {
            return;
          }
          canLaunchGui = !shouldUseCliMode;
        } else {
          const eimSupportsGui =
            !forceCliMode && (await isEimGuiCapable(eimPath));

          if (isSnapInstall && eimSupportsGui) {
            await showSnapEimNotification(eimPath);
            return;
          }

          canLaunchGui = !shouldUseCliMode && eimSupportsGui;
          Logger.info(
            `EIM launch mode: ${
              canLaunchGui ? "gui" : "cli wizard"
            } (forceCliMode=${forceCliMode}, isSnapInstall=${isSnapInstall}, eimSupportsGui=${eimSupportsGui})`,
            "openEIM"
          );
        }

        const mode = canLaunchGui ? "gui" : "wizard";
        const raw = readParameter("idf.eimExecutableArgs");
        const existing = Array.isArray(raw) ? raw : [];
        const merged = [
          mode,
          "--idf-features ide",
          ...existing.filter(
            (arg) =>
              arg !== "gui" && arg !== "wizard" && arg !== "--idf-features ide"
          ),
        ];
        await writeParameter(
          "idf.eimExecutableArgs",
          merged,
          ConfigurationTarget.Global
        );
        await launchEimInTerminal(eimPath);
      }
    );
  });
}
