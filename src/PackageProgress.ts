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

export class PackageProgress {
    public name: string;
    public progressListener;
    public checksumListener;
    public progressDetailListener;
    public hasFailedListener;
    private hasFailed: boolean;
    private isFileChecksumMatch: boolean;
    private progress: string;
    private progressDetail: string;
    constructor(
        name: string,
        progressListener,
        checksumListener,
        detailListener,
        hasFailedListener,
    ) {
        this.progress = "0.00%";
        this.progressDetail = "(0/0) KB";
        this.name = name;
        this.isFileChecksumMatch = false;
        this.hasFailed = false;
        this.registerProgressListener(progressListener);
        this.registerChecksumListener(checksumListener);
        this.registerProgressDetailListener(detailListener);
        this.registerProgressHasFailedListener(hasFailedListener);
    }
    set Progress(val) {
        this.progress = val;
        this.progressListener(this.name, val);
    }
    get Progress() {
        return this.progress;
    }
    public registerProgressListener(listener) {
        this.progressListener = listener;
    }
    set FileMatchChecksum(checksumResult) {
        this.isFileChecksumMatch = checksumResult;
        this.checksumListener(this.name, checksumResult);
    }
    get FileMatchChecksum() {
        return this.isFileChecksumMatch;
    }
    public registerChecksumListener(checkListener) {
        this.checksumListener = checkListener;
    }

    get ProgressDetail() {
        return this.progressDetail;
    }
    set ProgressDetail(val) {
        this.progressDetail = val;
        this.progressDetailListener(this.name, val);
    }
    public registerProgressDetailListener(listener) {
        this.progressDetailListener = listener;
    }
    get HasFailed() {
        return this.hasFailed;
    }
    set HasFailed(val) {
        this.hasFailed = val;
        this.hasFailedListener(val);
    }
    public registerProgressHasFailedListener(listener) {
        this.hasFailedListener = listener;
    }
}
