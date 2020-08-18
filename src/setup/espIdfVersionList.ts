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
import { DownloadManager } from "../downloadManager";
import path from "path";
import { EOL, tmpdir } from "os";
import { Logger } from "../logger/logger";
import { readFile } from "fs-extra";
import { OutputChannel } from "../logger/outputChannel";

export interface IEspIdfLink {
  filename: string;
  name: string;
  url: string;
  mirror: string;
}

export async function getEspIdfVersions(extensionPath: string) {
  const downloadManager = new DownloadManager(extensionPath);
  const versionList = await downloadEspIdfVersionList(
    downloadManager,
    extensionPath
  );
  const manualVersion = {
    name: "Find ESP-IDF in your system",
    filename: "manual",
  } as IEspIdfLink;
  versionList.push(manualVersion);
  return versionList;
}

export async function downloadEspIdfVersionList(
  downloadManager: DownloadManager,
  extensionPath: string
) {
  try {
    const idfVersionList = path.join(tmpdir(), "idf_versions.txt");
    const versionsUrl = "https://dl.espressif.com/dl/esp-idf/idf_versions.txt";
    const downloadMessage = await downloadManager.downloadFile(
      versionsUrl,
      0,
      tmpdir()
    );
    Logger.info(downloadMessage.statusMessage);
    const fileContent = await readFile(idfVersionList);
    const downloadList: IEspIdfLink[] = createEspIdfLinkList(fileContent, "\n");
    return downloadList;
  } catch (error) {
    OutputChannel.appendLine(
      `Error opening esp-idf version list file. ${error.message}`
    );
    try {
      const idfVersionListFallBack = path.join(
        extensionPath,
        "idf_versions.txt"
      );
      const fallbackContent = await readFile(idfVersionListFallBack);
      const downloadList: IEspIdfLink[] = createEspIdfLinkList(
        fallbackContent,
        EOL
      );
      return downloadList;
    } catch (fallbackError) {
      OutputChannel.appendLine(
        `Error opening esp-idf fallback version list file. ${fallbackError.message}`
      );
    }
  }
}

export function createEspIdfLinkList(data: Buffer, splitString: string) {
  const versionZip =
    "https://github.com/espressif/esp-idf/releases/download/IDFZIPFileVersion/esp-idf-IDFZIPFileVersion.zip";
  const mirrorZip =
    "https://dl.espressif.com/dl/esp-idf/releases/esp-idf-IDFZIPFileVersion.zip";
  const versionRegex = /\b(IDFZIPFileVersion)\b/g;
  const espIdfMasterZip =
    "https://github.com/espressif/esp-idf/archive/master.zip";
  const preReleaseRegex = /v.+-rc/g;
  const betaRegex = /v.+-beta/g;

  const versionList = data.toString().trim().split(splitString);
  const downloadList: IEspIdfLink[] = versionList.map((version) => {
    if (version.startsWith("release/")) {
      const versionRoot = version.replace("release/", "");
      const versionForRelease = versionList.find((ver) =>
        ver.startsWith(versionRoot)
      );
      if (versionForRelease) {
        return {
          filename: `esp-idf-${versionForRelease}.zip`,
          name: version + " (release branch)",
          url: versionZip.replace(
            versionRegex,
            version.replace("release/", "")
          ),
          mirror: mirrorZip.replace(
            versionRegex,
            version.replace("release/", "")
          ),
        };
      } else {
        return {
          filename: `${version}`,
          name: version + " (release branch)",
          url: "",
          mirror: "",
        };
      }
    } else if (version.startsWith("v")) {
      return {
        filename: `esp-idf-${version}.zip`,
        name: version + " (release version)",
        url: versionZip.replace(versionRegex, version),
        mirror: mirrorZip.replace(versionRegex, version),
      };
    } else if (preReleaseRegex.test(version)) {
      return {
        filename: `esp-idf-${version}.zip`,
        name: version + " (pre-release version)",
        url: versionZip.replace(versionRegex, version),
        mirror: mirrorZip.replace(versionRegex, version),
      };
    } else if (version === "master") {
      return {
        filename: `master`,
        name: version + " (development branch)",
        url: espIdfMasterZip,
        mirror: espIdfMasterZip,
      };
    } else if (betaRegex.test(version)) {
      return {
        filename: `esp-idf-${version}.zip`,
        name: version + " (beta version)",
        url: versionZip.replace(versionRegex, version),
        mirror: mirrorZip.replace(versionRegex, version),
      };
    }
  });
  return downloadList;
}
