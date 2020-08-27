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

import { SetupPanel } from "./SetupPanel";

export function sendEspIdfDownloadProgress(updatedPercentage: string) {
  SetupPanel.postMessage({
    command: "updateIdfDownloadStatusPercentage",
    percentage: updatedPercentage,
  });
}

export function sendEspIdfDownloadDetail(updatedDetail: string) {
  SetupPanel.postMessage({
    command: "updateIdfDownloadStatusDetail",
    detail: updatedDetail,
  });
}

export function sendDownloadedZip(downloadedPath: string) {
  SetupPanel.postMessage({
    command: "notify_downloaded",
    downloadedPath,
  });
}

export function sendExtractedZip(extractedPath: string) {
  SetupPanel.postMessage({
    command: "notify_extracted",
    extractedPath,
  });
}

export function sendPkgDownloadPercentage(
  pkgName: string,
  updatedPercentage: string
) {
  SetupPanel.postMessage({
    command: "update_pkgs_download_percentage",
    updatedPkgDownloadStatus: { id: pkgName, progress: updatedPercentage },
  });
}

export function sendPkgChecksumResult(
  pkgName: string,
  updatedChecksumResult: boolean
) {
  SetupPanel.postMessage({
    command: "checksum_result",
    isChecksumEqual: { id: pkgName, hashResult: updatedChecksumResult },
  });
}

export function sendPkgDownloadDetail(pkgName: string, updatedDetail: string) {
  SetupPanel.postMessage({
    command: "update_pkg_download_detail",
    updatedPkgDownloadDetail: { id: pkgName, progressDetail: updatedDetail },
  });
}

export function sendPkgDownloadFailed(pkgName: string, failedFlag: boolean) {
  SetupPanel.postMessage({
    command: "set_pkg_download_failed",
    updatedPkgFailed: { id: pkgName, hasFailed: failedFlag },
  });
}
