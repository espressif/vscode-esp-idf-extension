/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Sunday, 16th June 2019 12:29:20 am
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import "./espSize.scss";

import Vue from "vue";

const SEC = 1000;
declare var acquireVsCodeApi: any;
let vscode: any;
try {
  vscode = acquireVsCodeApi();
  // eslint-disable-next-line no-empty
} catch (error) {
  // tslint:disable-next-line: no-console
  console.error(error);
}

// Vue App
const app = new Vue({
  el: "#app",
  data: {
    archives: {},
    files: {},
    isFlashing: false,
    isOverviewEnabled: true,
    overviewData: {},
    searchText: "",
    subtitle: "Size analysis will provide users with in-depth analysis of the binary file generated from the project.",
    title: "<strong>ESP-IDF</strong>&nbsp;Size Analysis",
  },
  methods: {
    retryClicked() {
      if (vscode) {
        vscode.postMessage({
          command: "retry",
        });
      }
    },
    flashClicked() {
      if (vscode) {
        this.isFlashing = true;
        setTimeout(() => {
          this.isFlashing = false;
        }, 10 * SEC);
        vscode.postMessage({
          command: "flash",
        });
      }
    },
    progressBarColorClass(ratio: number) {
      if (ratio <= 0.3) {
        return { "is-success": true };
      }
      if (ratio <= 0.7) {
        return { "is-warning": true };
      }
      return { "is-danger": true };
    },
    toggleOverviewAndDetails() {
      this.isOverviewEnabled = !this.isOverviewEnabled;
    },
    toggleArchiveFileInfoTable(archiveName: string) {
      Object.keys(this.archives).forEach((archive) => {
        let toggleVisibility = false;
        if (archive === archiveName) {
          toggleVisibility = !this.archives[archive].isFileInfoVisible;
        }
        this.$set(this.archives[archive], "isFileInfoVisible", toggleVisibility);
      });
    },
    convertToKB(byte: number) {
      return Math.round(byte / 1024);
    },
    convertToSpacedString(byte: number) {
      return byte.toLocaleString("en-US").replace(/,/g, " ");
    },
  },
  computed: {
    filteredArchives() {
      const { searchText } = this;
      let filteredObj = this.archives;
      if (searchText !== "") {
        filteredObj = {};
        Object.keys(this.archives).forEach((archive) => {
          // tslint:disable-next-line: max-line-length
          if (archive.toLowerCase().match(searchText.toLowerCase()) || (this.archives[archive].files && Object.keys(this.archives[archive].files).filter((file) => file.toLowerCase().match(this.searchText.toLowerCase())).length > 0)) {
            filteredObj[archive] = this.archives[archive];
          }
        });
      }
      return filteredObj;
    },
    filteredFiles() {
      Object.keys(this.files).forEach((file) => {
        const archiveFileName = file.split(":");
        const archiveName = archiveFileName[0];
        const fileName = archiveFileName[1];
        if (this.archives[archiveName] && !this.archives[archiveName].files) {
          this.$set(this.archives[archiveName], "files", {});
        }
        this.$set(this.archives[archiveName].files, fileName, this.files[file]);
      });
      Object.keys(this.archives).forEach((archive) => {
        this.$set(this.archives[archive], "isFileInfoVisible", false);
      });
      return {};
    },
  },
});

// Message Receiver
declare var window: any;
window.addEventListener("message", (m: any) => {
  const msg = m.data;
  app.overviewData = msg.overview || {};
  app.archives = msg.archives || {};
  app.files = msg.files || {};
});
