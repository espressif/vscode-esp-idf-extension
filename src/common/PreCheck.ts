/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 26th November 2025 10:51:20 am
 * Copyright 2025 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { l10n } from "vscode";
import { PreCheck, PreCheckInput } from "../utils";

const openFolderFirstMsg = l10n.t("Open a folder first.");
const cmdNotForWebIdeMsg = l10n.t(
  "Selected command is not available in {envName}",
  { envName: "Codespaces" }
);
const cmdNotDockerContainerMsg = l10n.t(
  "Selected command is not available in {envName}",
  { envName: "Docker container" }
);
export const openFolderCheck = [
  PreCheck.isWorkspaceFolderOpen,
  openFolderFirstMsg,
] as PreCheckInput;

export const webIdeCheck = [
  PreCheck.notUsingWebIde,
  cmdNotForWebIdeMsg,
] as PreCheckInput;

export const isNotDockerContainerCheck = [
  PreCheck.isNotDockerContainer,
  cmdNotDockerContainerMsg,
] as PreCheckInput;