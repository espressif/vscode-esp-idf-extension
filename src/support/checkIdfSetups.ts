/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 1st April 2025 4:57:08 pm
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

import { getIdfSetups } from "../eim/getExistingSetups";
import { reportObj } from "./types";


export async function checkIDFSetups(reportedResult: reportObj) {
  reportedResult.espIdfSetups = await getIdfSetups();
}