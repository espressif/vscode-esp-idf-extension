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
import { getCurrentIdfConfiguration } from "../../configuration/env";
import {
  createWriteStream,
  pathExists,
  readFile,
  readJSON,
  stat,
  writeJSON,
} from "fs-extra";
import { tmpdir } from "os";
import { basename, join } from "path";
import jsonic from "jsonic";
import { Logger } from "../../common/logger";
import { extensionContext, getEspIdfFromCMake } from "../../utils";
import { Uri } from "vscode";
import { getIdfTargetFromSdkconfig } from "../../configuration/workspace";
import axios from "axios";

export interface IEspIdfDocVersion {
  name: string;
  supportedTargets: string[];
}

export async function getDocsVersion() {
  if (ESP.URL.Docs.IDF_VERSION_OBJ) {
    return ESP.URL.Docs.IDF_VERSION_OBJ;
  }
  const docsIdfVersionObj = await readObjectFromUrlFile(
    ESP.URL.Docs.IDF_VERSIONS
  );
  try {
    const docsVersions: IEspIdfDocVersion[] = docsIdfVersionObj.VERSIONS.map(
      (v: any) => {
        return {
          name: v.name,
          supportedTargets: v.supported_targets,
        } as IEspIdfDocVersion;
      }
    );
    ESP.URL.Docs.IDF_VERSION_OBJ = docsVersions;
    return docsVersions;
  } catch (error) {
    Logger.error(
      `Error parsing object from ${ESP.URL.Docs.IDF_VERSIONS}`,
      error as Error,
      "getDocsVersion"
    );
  }
}

export function getDocsBaseUrl(docVersion: string, idfTarget?: string) {
  let localeLang: string = getDocsLocaleLang();
  return `${ESP.URL.Docs.BASE_URL}/${localeLang}/${docVersion}${
    idfTarget ? "/" + idfTarget : ""
  }`;
}

export function getDocsLocaleLang() {
  let localeLang: string = "en";
  try {
    const localeConf = process.env.VSCODE_NLS_CONFIG ? JSON.parse(process.env.VSCODE_NLS_CONFIG) : null;
    localeLang = localeConf && localeConf.locale === "zh-CN" ? "zh_CN" : "en";
  } catch (error) {
    Logger.error(
      "Error getting current vscode language",
      error as Error,
      "getDocsVersion getDocsLocaleLang"
    );
  }
  return localeLang;
}

export async function getDocsIndex(
  baseUrl: string,
  idfVersion: string,
  idfTarget: string
) {
  if (ESP.URL.Docs.IDF_INDEX) {
    return ESP.URL.Docs.IDF_INDEX;
  }
  const docLang = getDocsLocaleLang();
  const indexName = `esp_idf_docs_index_lang_${docLang}_espIdfVersion_${idfVersion}${
    idfTarget ? `_target_${idfTarget}` : ""
  }.json`;
  const indexPath = join(extensionContext.extensionPath, indexName);
  const indexExists = await pathExists(indexPath);

  if (indexExists) {
    const indexFileStats = await stat(indexPath);
    const todayTime = new Date();
    const timeDiff =
      (todayTime.getTime() - indexFileStats.mtime.getTime()) / 1000;
    if (timeDiff < ESP.URL.Docs.INDEX_CACHE_LIMIT) {
      return readJSON(indexPath);
    }
  }
  const indexUrl = `${baseUrl}/searchindex.js`;
  const indexObj = await readObjectFromUrlFile(indexUrl);
  ESP.URL.Docs.IDF_INDEX = indexObj;
  await writeJSON(indexPath, indexObj);
  return indexObj;
}

export async function readObjectFromUrlFile(objectUrl: string) {
  const fileName = join(tmpdir(), basename(objectUrl));
  await downloadFile(objectUrl, fileName);
  const objectStr = await readFile(fileName, "utf-8");
  const objectMatches = objectStr.match(/{[\s\S]+}/g);
  if (objectMatches && objectMatches.length > 0) {
    return jsonic(objectMatches[0]);
  }
}

async function downloadFile(url: string, outputLocationPath: string) {
  const writer = createWriteStream(outputLocationPath);
  try {
    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
    });
    response.data.pipe(writer);
    return new Promise<void>((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  } catch (error) {
    Logger.error(
      `Error downloading ${basename(url)}: ${error}`,
      error as Error,
      "getDocsVersion downloadFile"
    );
    throw error;
  }
}

/**
 * Retrieves the URL for the specified documentation part based on the ESP-IDF version and workspace.
 * @param documentationPart - The documentation part to retrieve the URL for.
 * @param workspace - The workspace URI.
 * @returns The URL for the ESP-IDF specified documentation part.
 */
export async function getDocsUrl(
  documentationPart: string,
  workspace: Uri
) {
  const currentEnvVars = getCurrentIdfConfiguration();
  const espIdfPath = currentEnvVars["IDF_PATH"];

  const adapterTargetName = await getIdfTargetFromSdkconfig(workspace);
  const idfVersion = await getEspIdfFromCMake(espIdfPath);
  const docVersions = await getDocsVersion();
  if (!docVersions) {
    Logger.error(
      "No documentation versions found",
      new Error("No documentation versions found"),
      "getDocsVersion getDocsUrl"
    );
    return;
  }
  let docVersion = docVersions.find((docVer) => docVer.name === idfVersion);
  if (!docVersion) {
    docVersion = docVersions.find((docVer) => docVer.name === "latest");
  }
  if (!docVersion) {
    return;
  }
  const baseUrl = getDocsBaseUrl(docVersion.name, adapterTargetName);
  const url = `${baseUrl}/${documentationPart}`;

  return url;
}
