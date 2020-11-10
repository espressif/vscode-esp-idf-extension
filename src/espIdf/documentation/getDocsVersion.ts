// Copyright 2020 Espressif Systems (Shanghai) CO LTD
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

import { ESP } from "../../config";
import { readFile } from "fs-extra";
import { tmpdir } from "os";
import { basename, join } from "path";
import { DownloadManager } from "../../downloadManager";
import jsonic from "jsonic";
import { Logger } from "../../logger/logger";

export interface IEspIdfDocVersion {
  name: string;
  supportedTargets: string[];
}

export async function getDocsVersion() {
  const docsIdfVersionObj = await readObjectFromUrlFile(
    ESP.URL.Docs.IDF_VERSIONS
  );
  try {
    const docsVersions: IEspIdfDocVersion[] = docsIdfVersionObj.VERSIONS.map(
      (v) => {
        return {
          name: v.name,
          supportedTargets: v.supported_targets,
        } as IEspIdfDocVersion;
      }
    );
    return docsVersions;
  } catch (error) {
    Logger.error(
      `Error parsing object from ${ESP.URL.Docs.IDF_VERSIONS}`,
      error
    );
  }
}

export function getDocsBaseUrl(docVersion: string, idfTarget?: string) {
  let localeLang: string = "en";
  try {
    const localeConf = JSON.parse(process.env.VSCODE_NLS_CONFIG);
    localeLang = localeConf.locale === "zh-CN" ? "zh_CN" : "en";
  } catch (error) {
    Logger.error("Error getting current vscode language", error);
  }
  return `${ESP.URL.Docs.BASE_URL}/${localeLang}/${docVersion}${
    idfTarget ? "/" + idfTarget : ""
  }`;
}

export async function getDocsIndex(baseUrl: string) {
  const indexUrl = `${baseUrl}/searchindex.js`;
  const indexObj = await readObjectFromUrlFile(indexUrl);
  return indexObj;
}

export async function readObjectFromUrlFile(objectUrl: string) {
  const downloadManager = new DownloadManager(tmpdir());
  await downloadManager.downloadFile(objectUrl, 0, tmpdir());
  const fileName = join(tmpdir(), basename(objectUrl));
  const objectStr = await readFile(fileName, "utf-8");
  const objectMatches = objectStr.match(/{[\s\S]+}/g);
  if (objectMatches && objectMatches.length > 0) {
    return jsonic(objectMatches[0]);
  }
}
