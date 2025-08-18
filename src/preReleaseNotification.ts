/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 7th August 2025
 * Copyright 2024 Espressif Systems (Shanghai) CO LTD
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

import { ExtensionContext, window, env, Uri, l10n } from "vscode";
import { ESP } from "./config";
import { Logger } from "./logger/logger";
import { packageJson } from "./utils";
import { NotificationMode, readParameter } from "./idfConfiguration";
import { Telemetry } from "./telemetry";

export namespace PreReleaseNotification {
  export async function showPreReleaseNotification(context: ExtensionContext) {
    // Check if this specific campaign was already shown
    const campaignKey = ESP.PreReleaseNotification.EIM_SETUP_CAMPAIGN;
    const shownCampaigns = context.globalState.get<string[]>(
      ESP.PreReleaseNotification.SHOWN_KEY,
      []
    );

    // Check notification settings
    const notificationMode = readParameter("idf.notificationMode") as string;
    const enableNotification =
      notificationMode === NotificationMode.All ||
      notificationMode === NotificationMode.Notifications;

    // Only show if this campaign hasn't been shown and notifications are enabled
    if (!shownCampaigns.includes(campaignKey) && enableNotification) {
      // Track that the notification was shown
      Telemetry.sendEvent("preReleaseNotification", {
        campaign: campaignKey,
        action: "shown",
        extensionVersion: packageJson.version,
      });

      const message = l10n.t(
        "🎉 New ESP-IDF Extension setup available! We've completely redesigned the installation process with the ESP-IDF Installer Manager (EIM) for a smoother, more reliable setup experience. Help us improve by trying the pre-release!"
      );

      const tryPreRelease = l10n.t("Try New Pre-Release");
      const learnMore = l10n.t("Learn More");
      const notNow = l10n.t("Not Now");

      const response = await window.showInformationMessage(
        message,
        { modal: false },
        tryPreRelease,
        learnMore,
        notNow
      );

      if (response === tryPreRelease) {
        // Track user clicked to try pre-release
        Telemetry.sendEvent("preReleaseNotification", {
          campaign: campaignKey,
          action: "tryPreRelease",
          extensionVersion: packageJson.version,
        });

        // Open the extension in Extensions view
        const extensionUri = Uri.parse(
          "vscode:extension/espressif.esp-idf-extension"
        );
        await env.openExternal(extensionUri);

        // Show additional guidance for enabling pre-release
        const preReleaseInfo = await window.showInformationMessage(
          l10n.t(
            "To install the pre-release version, click the 'Switch to Pre-Release Version' button."
          ),
          { modal: false },
          l10n.t("Got it")
        );

        Logger.info("User clicked to try pre-release from notification");

        // Mark this campaign as shown when user tries pre-release
        const updatedCampaigns = [...shownCampaigns, campaignKey];
        await context.globalState.update(
          ESP.PreReleaseNotification.SHOWN_KEY,
          updatedCampaigns
        );
      } else if (response === learnMore) {
        // Track user clicked to learn more
        Telemetry.sendEvent("preReleaseNotification", {
          campaign: campaignKey,
          action: "learnMore",
          extensionVersion: packageJson.version,
        });

        // Open documentation about the new setup experience
        const docsUri = Uri.parse(
          "https://docs.espressif.com/projects/idf-im-ui/en/latest/"
        );
        await env.openExternal(docsUri);
        Logger.info("User clicked to learn more from pre-release notification");

        // Re-show the notification after viewing docs
        setTimeout(() => {
          showPreReleaseNotification(context);
        }, 2000); // Small delay to let the external browser open
      } else {
        // Track user dismissed the notification (clicked "Not Now" or dismissed)
        Telemetry.sendEvent("preReleaseNotification", {
          campaign: campaignKey,
          action: response ? "notNow" : "dismissed",
          extensionVersion: packageJson.version,
        });
        Logger.info("User dismissed pre-release notification");

        // Mark this campaign as shown only when dismissed or "Not Now"
        const updatedCampaigns = [...shownCampaigns, campaignKey];
        await context.globalState.update(
          ESP.PreReleaseNotification.SHOWN_KEY,
          updatedCampaigns
        );
      }
    }
  }
}
