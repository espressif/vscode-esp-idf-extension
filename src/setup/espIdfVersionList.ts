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
import { readFile, writeFile, pathExists } from "fs-extra";
import * as del from "del";
import { OutputChannel } from "../logger/outputChannel";
import { IEspIdfLink, IdfMirror } from "../views/setup/types";
import { ESP } from "../config";
import axios, { AxiosRequestConfig } from "axios";



// Cache configuration
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const CACHE_FILE = "esp_idf_versions_cache.json";

const axiosConfig: AxiosRequestConfig = {
  timeout: 30000, // 30 seconds timeout
  headers: {
    'User-Agent': ESP.HTTP_USER_AGENT
  },
  validateStatus: (status) => status === 200,
  maxRedirects: 5
};

interface VersionCache {
  content: string;
  timestamp: number;
  source: string;
}

function isCacheValid(cache: VersionCache): boolean {
  return Date.now() - cache.timestamp < CACHE_DURATION;
}

function getCacheFilePath(extensionPath: string): string {
  return path.join(extensionPath, CACHE_FILE);
}

async function loadCache(extensionPath: string): Promise<VersionCache | null> {
  try {
    const cachePath = getCacheFilePath(extensionPath);
    if (await pathExists(cachePath)) {
      const cacheData = await readFile(cachePath, 'utf8');
      const cache: VersionCache = JSON.parse(cacheData);
      if (isCacheValid(cache)) {
        OutputChannel.appendLine(`Using cached version list from ${cache.source} (cached ${Math.round((Date.now() - cache.timestamp) / 60000)} minutes ago)`);
        return cache;
      }
    }
  } catch (error) {
    OutputChannel.appendLine(`Cache load error: ${error.message}`);
  }
  return null;
}

async function saveCache(extensionPath: string, content: string, source: string): Promise<void> {
  try {
    const cache: VersionCache = {
      content,
      timestamp: Date.now(),
      source
    };
    const cachePath = getCacheFilePath(extensionPath);
    await writeFile(cachePath, JSON.stringify(cache, null, 2));
    OutputChannel.appendLine(`Cached version list from ${source}`);
  } catch (error) {
    OutputChannel.appendLine(`Cache save error: ${error.message}`);
  }
}

async function checkNetworkConnectivity(): Promise<boolean> {
  try {
    await axios.get('https://httpbin.org/get', { timeout: 5000 });
    return true;
  } catch (error) {
    OutputChannel.appendLine(`Network connectivity check failed: ${error.message}`);
    return false;
  }
}

export async function clearVersionCache(extensionPath: string): Promise<void> {
  try {
    const cachePath = getCacheFilePath(extensionPath);
    if (await pathExists(cachePath)) {
      await writeFile(cachePath, '');
      OutputChannel.appendLine('Version cache cleared');
    }
  } catch (error) {
    OutputChannel.appendLine(`Error clearing cache: ${error.message}`);
  }
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
  return [manualVersion, ...versionList];
}

export async function downloadEspIdfVersionList(
  downloadManager: DownloadManager,
  extensionPath: string
) {
  // First, try to load from cache
  const cachedData = await loadCache(extensionPath);
  if (cachedData) {
    const versionList = cachedData.content.trim().split("\n");
    return createEspIdfLinkList(versionList);
  }

  // Check network connectivity before attempting downloads
  const isNetworkAvailable = await checkNetworkConnectivity();
  if (!isNetworkAvailable) {
    OutputChannel.appendLine("Network connectivity check failed, using fallback methods");
  }

  // Try primary URL using the enhanced DownloadManager
  try {
    OutputChannel.appendLine(`Attempting to download ESP-IDF versions from ${ESP.URL.IDF_VERSIONS} using enhanced DownloadManager...`);
    
    // Create a temporary file path for the version list
    const tempDir = tmpdir();
    const tempFilePath = path.join(tempDir, "idf_versions.txt");
    
    await downloadManager.downloadWithResume(
      ESP.URL.IDF_VERSIONS,
      tempDir,
      undefined,
      undefined,
      undefined
    );
    
    // Read the downloaded content
    const fileContent = await readFile(tempFilePath);
    const content = fileContent.toString();
    const versionList = content.trim().split("\n");
    
    // Save to cache for future use
    await saveCache(extensionPath, content, ESP.URL.IDF_VERSIONS);
    
    // Clean up temporary file
    try {
      await del(tempFilePath, { force: true });
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    OutputChannel.appendLine(`Successfully downloaded ESP-IDF versions from ${ESP.URL.IDF_VERSIONS} using enhanced DownloadManager`);
    return createEspIdfLinkList(versionList);
  } catch (error) {
    const errorMsg = `Failed to download ESP-IDF versions from ${ESP.URL.IDF_VERSIONS}: ${error.message}`;
    OutputChannel.appendLine(errorMsg);
    Logger.errorNotify(errorMsg, error, "espIdfVersionList downloadEspIdfVersionList");
  }

  // If primary URL fails, try GitHub releases API as fallback
  try {
    OutputChannel.appendLine("Primary URL failed, trying GitHub releases API as fallback...");
    const githubReleases = await getEspIdfTags("releases");
    if (githubReleases.length > 0) {
      OutputChannel.appendLine(`Successfully retrieved ${githubReleases.length} versions from GitHub releases API`);
      return githubReleases;
    }
  } catch (error) {
    const errorMsg = `GitHub releases API fallback failed: ${error.message}`;
    OutputChannel.appendLine(errorMsg);
    Logger.error(errorMsg, error, "espIdfVersionList downloadEspIdfVersionList github fallback");
  }

    // Try local fallback file
    try {
      const idfVersionListFallBack = path.join(
        extensionPath,
        "idf_versions.txt"
      );
      const fallbackContent = await readFile(idfVersionListFallBack);
      const versionList = fallbackContent.toString().trim().split(EOL);
      OutputChannel.appendLine("Using local fallback version list file");
      return createEspIdfLinkList(versionList);
    } catch (fallbackError) {
      const fallBackErrMsg = `Error opening esp-idf fallback version list file. ${fallbackError.message}`;
      OutputChannel.appendLine(fallBackErrMsg);
      Logger.errorNotify(fallBackErrMsg, fallbackError, "espIdfVersionList downloadEspIdfVersionList fallback");
      
      // Return a minimal version list as last resort
      OutputChannel.appendLine("All download methods failed, returning minimal version list");
      return createEspIdfLinkList([
        "v5.5-rc1",
        "v5.4.2",
        "v5.3.3",
        "v5.2.5",
        "v5.1.6",
        "release/v5.5",
        "release/v5.4",
        "release/v5.3",
        "release/v5.2",
        "release/v5.1",
        "master"
      ]);
    }
}

export async function getEspIdfTags(type: 'releases' | 'tags' = 'releases') {
  // Define sources based on the requested type
  const sources = type === 'releases' 
    ? [
        {
          url: "https://api.github.com/repos/espressif/esp-idf/releases?per_page=100",
          name: "GitHub Releases API"
        }
      ]
    : [
        {
          url: "https://api.github.com/repos/espressif/esp-idf/tags?per_page=100",
          name: "GitHub Tags API"
        }
      ];

  for (const source of sources) {
    try {
      OutputChannel.appendLine(`Attempting to get ESP-IDF ${type} from ${source.name}...`);
      const response = await axios.get<any[]>(source.url, axiosConfig);
      
      let versionsList: string[] = [];
      if (type === 'releases') {
        // Handle releases
        versionsList = response.data.map((item) => item.tag_name);
      } else {
        // Handle tags
        versionsList = response.data.map((item) => item.name);
      }
      
      OutputChannel.appendLine(`Successfully retrieved ${versionsList.length} ${type} from ${source.name}`);
      return createEspIdfLinkList(versionsList);
    } catch (error) {
      const errorMsg = `Error getting ESP-IDF ${type} from ${source.name}: ${error.message}`;
      OutputChannel.appendLine(errorMsg);
      Logger.error(errorMsg, error, "espIdfVersionList getEspIdfTags");
      continue; // Try next source
    }
  }

  // If all sources fail, return empty list
  OutputChannel.appendLine(`All ${type} sources failed, returning empty ${type} list`);
  return [];
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
