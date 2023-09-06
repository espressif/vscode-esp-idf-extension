/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 31st August 2023 8:11:39 pm
 * Copyright 2023 Espressif Systems (Shanghai) CO LTD
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
export interface IEspIdfLink {
  filename: string;
  name: string;
  mirror: string;
  url: string;
}

export interface IdfSetup {
  id: string;
  version: string;
  python: string;
  toolsPath: string;
  idfPath: string;
  gitPath: string;
  isValid: boolean;
}

export enum IdfMirror {
  Espressif,
  Github,
}

export interface IDownload {
  id: string;
  progress: string;
  progressDetail: string;
}

export interface IEspIdfTool extends IDownload {
  actual: string;
  description: string;
  doesToolExist: boolean;
  env: {};
  expected: string;
  hashResult: boolean;
  hasFailed: boolean;
  name: string;
  path: string;
}

export enum StatusType {
  failed,
  installed,
  pending,
  started,
}

export enum SetupMode {
  advanced,
  express,
  existing,
}
