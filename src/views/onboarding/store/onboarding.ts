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

import { StoreOptions } from "vuex";
import { actions } from "./actions";
import { mutations } from "./mutations";
import { IState } from "./types";

const CONF_TARGET_GLOBAL = 1;

export const onboardState: IState = {
  customExtraPaths: "",
  downloadedIdfZipPath: "",
  doesIdfPathExist: false,
  envVars: {},
  gitVersion: "",
  idfDownloadPath: "",
  idfDownloadStatus: null,
  idfDownloadState: "empty",
  isIDFZipExtracted: false,
  idfPath: "",
  idfVersion: "",
  idfVersionList: [],
  idfToolsPath: "",
  isInstallationCompleted: false,
  isPyInstallCompleted: false,
  isToolsCheckCompleted: false,
  pathDelimiter: "",
  pyLog: "",
  pyVersionList: [],
  requiredToolsVersions: [],
  selectedConfTarget: CONF_TARGET_GLOBAL,
  selectedIdfVersion: undefined,
  selectedPythonVersion: "",
  selectedWorkspaceFolder: "",
  showIdfPathCheck: false,
  showIdfToolsChecks: false,
  showOnboardingOnInit: true,
  toolsSelectedSetupMode: "empty",
  toolsCheckResults: [],
  workspaceFolders: [],
};

export const onboarding: StoreOptions<IState> = {
  actions,
  mutations,
  state: onboardState,
};
