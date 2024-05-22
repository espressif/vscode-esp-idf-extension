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
import { IEspIdfLink, IdfMirror } from "../views/setup/types";
import { ESP } from "../config";
import axios from "axios";

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
  return [manualVersion, ...versionList];
}

export async function downloadEspIdfVersionList(
  downloadManager: DownloadManager,
  extensionPath: string
) {
  try {
    await downloadManager.downloadWithRetries(
      ESP.URL.IDF_VERSIONS,
      tmpdir(),
      undefined
    );
    const idfVersionList = path.join(tmpdir(), "idf_versions.txt");
    const fileContent = await readFile(idfVersionList);
    const versionList = fileContent.toString().trim().split("\n");
    return createEspIdfLinkList(versionList);
  } catch (error) {
    const errorMsg = `Error opening esp-idf version list file. ${error.message}`;
    OutputChannel.appendLine(errorMsg);
    Logger.errorNotify(errorMsg, error);
    try {
      const idfVersionListFallBack = path.join(
        extensionPath,
        "idf_versions.txt"
      );
      const fallbackContent = await readFile(idfVersionListFallBack);
      const versionList = fallbackContent.toString().trim().split(EOL);
      return createEspIdfLinkList(versionList);
    } catch (fallbackError) {
      const fallBackErrMsg = `Error opening esp-idf fallback version list file. ${fallbackError.message}`;
      OutputChannel.appendLine(fallBackErrMsg);
      Logger.errorNotify(fallBackErrMsg, fallbackError);
    }
  }
}

export async function getEspIdfTags() {
  try {
    const urlToUse = "https://api.github.com/repos/espressif/esp-idf/tags?per_page=100";
    const idfTagsResponse = await axios.get<{ name: string }[]>(urlToUse);
    const tagsStrList = idfTagsResponse.data.map((idfTag) => idfTag.name);
    return createEspIdfLinkList(tagsStrList);
  } catch (error) {
    OutputChannel.appendLine(`Error getting ESP-IDF Tags. Error: ${error}`);
    try {
      const idfTagsResponse = await axios.get<{ name: string }[]>(
        "https://gitee.com/api/v5/repos/EspressifSystems/esp-idf/tags"
      );
      const tagsStrList = idfTagsResponse.data.map((idfTag) => idfTag.name);
      return createEspIdfLinkList(tagsStrList);
    } catch (fallbackError) {
      OutputChannel.appendLine(
        `Error getting Gitee ESP-IDF Tags. Error: ${fallbackError}`
      );
    }
  }
}

export function createEspIdfLinkList(versionList: string[]) {
  const versionZip =
    "https://github.com/espressif/esp-idf/releases/download/IDFZIPFileVersion/esp-idf-IDFZIPFileVersion.zip";
  const mirrorZip = `${ESP.URL.IDF_GITHUB_ASSETS}/espressif/esp-idf/releases/download/IDFZIPFileVersion/esp-idf-IDFZIPFileVersion.zip`;
  const versionRegex = /\b(IDFZIPFileVersion)\b/g;
  const espIdfMasterZip =
    "https://github.com/espressif/esp-idf/archive/master.zip";
  const preReleaseRegex = /v.+-rc/g;
  const betaRegex = /v.+-beta/g;
  const downloadList: IEspIdfLink[] = versionList.map((version) => {
    if (version.startsWith("release/")) {
      return {
        filename: `${version}`,
        name: version + " (release branch)",
        url: `https://github.com/espressif/esp-idf/archive/refs/heads/${version}.zip`,
        mirror: "",
        version,
      };
    } else if (version.startsWith("v")) {
      return {
        filename: `esp-idf-${version}.zip`,
        name: version + " (release version)",
        url: versionZip.replace(versionRegex, version),
        mirror: mirrorZip.replace(versionRegex, version),
        version,
      };
    } else if (preReleaseRegex.test(version)) {
      return {
        filename: `esp-idf-${version}.zip`,
        name: version + " (pre-release version)",
        url: versionZip.replace(versionRegex, version),
        mirror: mirrorZip.replace(versionRegex, version),
        version,
      };
    } else if (version === "master") {
      return {
        filename: `master`,
        name: version + " (development branch)",
        url: `https://github.com/espressif/esp-idf/archive/refs/heads/${version}.zip`,
        mirror: espIdfMasterZip,
        version,
      };
    } else if (betaRegex.test(version)) {
      return {
        filename: `esp-idf-${version}.zip`,
        name: version + " (beta version)",
        url: versionZip.replace(versionRegex, version),
        mirror: mirrorZip.replace(versionRegex, version),
        version,
      };
    }
  });
  return downloadList;
}
