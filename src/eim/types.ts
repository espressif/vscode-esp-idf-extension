/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 11th December 2024 2:32:14 pm
 * Copyright 2024 Espressif Systems (Shanghai) CO LTD
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

export interface IdfSetup {
  id: string;
  version: string;
  toolsPath: string;
  idfPath: string;
  gitPath: string;
  isValid: boolean;
  activationScript: string;
  venvPython: string;
}

export interface EspIdfJson {
  $schema: string;
  $id: string;
  _comment: string;
  _warning: string;
  gitPath: string;
  idfToolsPath: string;
  idfSelectedId: string;
  idfInstalled: IdfInstalled[];
}

export interface IdfInstalled {
  activationScript: string;
  id: string;
  idfToolsPath: string;
  name: string;
  path: string;
  python: string;
}