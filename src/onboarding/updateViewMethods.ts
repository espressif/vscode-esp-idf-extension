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

import { OnBoardingPanel } from "./OnboardingPanel";

export function sendDownloadPercentage(pkgName, updatedPercentage) {
    OnBoardingPanel.postMessage({
        command: "update_pkgs_download_percentage",
        updatedPkgDownloadStatus : { id: pkgName, progress: updatedPercentage } });
}

export function sendChecksumResult(pkgName, updatedChecksumResult) {
    OnBoardingPanel.postMessage({
        command: "checksum_result",
        isChecksumEqual : { id: pkgName, hashResult: updatedChecksumResult } });
}

export function sendDownloadDetail(pkgName, updatedDetail) {
    OnBoardingPanel.postMessage({
        command: "update_pkg_download_detail",
        updatedPkgDownloadDetail : { id: pkgName, progressDetail: updatedDetail } });
}

export function sendDownloadFailed(pkgName, failedFlag) {
    OnBoardingPanel.postMessage({
        command: "set_pkg_download_failed",
        updatedPkgFailed : { id: pkgName, hasFailed: failedFlag } });
}

export function sendDownloadEspIdfPercentage(version, updatedPercentage) {
    OnBoardingPanel.postMessage({
        command: "update_espidf_download_percentage",
        updatedIdfDownloadStatus : { id: version, progress: updatedPercentage } });
}

export function sendDownloadEspIdfDetail(version, updatedDetail) {
    OnBoardingPanel.postMessage({
        command: "update_espidf_download_detail",
        updatedIdfDownloadDetail : { id: version, progressDetail: updatedDetail } });
}
