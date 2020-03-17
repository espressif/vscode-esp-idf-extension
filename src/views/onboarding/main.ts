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

import { library } from "@fortawesome/fontawesome-svg-core";
import {
  faArrowCircleDown,
  faArrowLeft,
  faCheck,
  faFolder,
  faFolderOpen,
  faTimes
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import Vue from "vue";
import VueRouter from "vue-router";
import App from "./App.vue";
import Download from "./Download.vue";
import GitPyCheck from "./GitPyCheck.vue";
import { store } from "./store";
import ToolSetup from "./ToolsSetup.vue";

const routes = [
  { path: "/", component: App },
  { path: "/download", component: Download },
  { path: "/toolsetup", component: ToolSetup },
  { path: "/gitpycheck", component: GitPyCheck }
];

Vue.use(VueRouter);

const router = new VueRouter({
  routes,
  base: __dirname
});

library.add(
  faArrowLeft,
  faArrowCircleDown,
  faCheck,
  faFolder,
  faFolderOpen,
  faTimes
);
Vue.component("font-awesome-icon", FontAwesomeIcon);

// tslint:disable-next-line: no-unused-expression
new Vue({
  el: "#app",
  components: { App },
  store,
  data: {
    versions: []
  },
  router,
  template: "<App />"
});

window.addEventListener("message", event => {
  const message = event.data;
  switch (message.command) {
    case "load_idf_path":
      if (message.idf_path) {
        store.commit("setIdfPath", message.idf_path);
      }
      break;
    case "load_idf_tools_path":
      if (message.idf_tools_path) {
        store.commit("setIdfToolsPath", message.idf_tools_path);
      }
      break;
    case "load_custom_paths":
      if (message.custom_paths) {
        store.commit("setCustomExtraPaths", message.custom_paths);
      }
      if (message.custom_vars) {
        store.commit("setEnvVars", message.custom_vars);
      }
      break;
    case "load_env_vars_def":
      if (message.env_vars) {
        store.commit("setEnvVars", message.env_vars);
      }
      break;
    case "load_idf_download_path":
      if (message.idf_path) {
        store.commit("setIdfDownloadPath", message.idf_path);
      }
      break;
    case "load_idf_versions":
      if (message.versions) {
        store.commit("setEspIdfVersionList", message.versions);
      }
      break;
    case "load_git_version":
      if (message.gitVersion) {
        store.commit("setGitVersion", message.gitVersion);
      }
      break;
    case "load_py_version_list":
      if (message.pyVersionList) {
        store.commit("setPyVersionList", message.pyVersionList);
      }
      break;
    case "notify_idf_downloaded":
      if (message.downloadedPath) {
        store.commit("setDownloadedZipPath", message.downloadedPath);
      }
      break;
    case "notify_idf_extracted":
      store.commit("setIsIDFZipExtracted", true);
      break;
    case "response_check_idf_path":
      store.commit("showIdfPathCheck", true);
      store.commit("updateDoesIdfPathExist", message.doesIdfExists);
      break;
    case "response_check_idf_version":
      store.commit("updateIdfVersion", message.version);
      break;
    case "respond_check_idf_tools_path":
      if (message.dictToolsExist) {
        store.commit("setShowIdfToolsChecks", true);
        store.commit("setToolsCheckResults", message.dictToolsExist);
      }
      break;
    case "load_path_delimiter":
      store.commit("setPathDelimiter", message.pathDelimiter);
      break;
    case "reply_required_tools_versions":
      if (message.requiredToolsVersions) {
        store.commit("setRequiredToolsVersion", message.requiredToolsVersions);
      }
      break;
    case "update_pkgs_download_percentage":
      if (message.updatedPkgDownloadStatus) {
        store.commit(
          "updatePkgDownloadPercentage",
          message.updatedPkgDownloadStatus
        );
      }
      break;
    case "update_espidf_download_percentage":
      if (message.updatedIdfDownloadStatus) {
        store.commit(
          "updateIdfDownloadProgress",
          message.updatedIdfDownloadStatus
        );
      }
      break;
    case "set_selected_download_state":
      if (message.state) {
        store.commit("setSelectedIdfDownloadState", message.state);
      }
      break;
    case "set_tools_check_finish":
      store.commit("setToolCheckFinish", true);
      break;
    case "set_tools_setup_finish":
      store.commit("setToolSetupFinish");
      break;
    case "checksum_result":
      if (message.isChecksumEqual) {
        store.commit("updatePkgHashResult", message.isChecksumEqual);
      }
      break;
    case "response_py_req_check":
    case "response_py_req_install":
      if (message.py_req_log) {
        store.commit("setPyLog", message.py_req_log);
      }
      break;
    case "set_py_setup_finish":
      store.commit("setPySetupFinish", true);
      break;
    case "update_pkg_download_detail":
      if (message.updatedPkgDownloadDetail) {
        store.commit("updateDownloadDetail", message.updatedPkgDownloadDetail);
      }
      break;
    case "update_espidf_download_detail":
      if (message.updatedIdfDownloadDetail) {
        store.commit(
          "updateIdfDownloadDetail",
          message.updatedIdfDownloadDetail
        );
      }
      break;
    case "set_pkg_download_failed":
      if (message.updatedPkgFailed) {
        store.commit("updatePkgFailed", message.updatePkgFailed);
      }
      break;
    case "response_selected_tools_folder":
      if (message.selected_folder) {
        store.commit("setIdfToolsPath", message.selected_folder);
      }
      break;
    case "response_selected_espidf_folder":
      if (message.selected_folder) {
        store.commit("setIdfPath", message.selected_folder);
        store.commit("setIdfDownloadPath", message.selected_folder);
      }
      break;
    case "load_show_onboarding":
      if (message.show_onboarding_on_init !== undefined) {
        store.commit(
          "setShowOnboardingOnInit",
          message.show_onboarding_on_init
        );
      }
      break;
    default:
      break;
  }
});
