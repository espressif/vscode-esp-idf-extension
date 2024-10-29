/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 21st October 2024 3:24:53 pm
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

export interface IDFSizeOverviewSectionPart {
  size: number;
}

export interface IDFSizeOverviewSection {
  name: string;
  total: number;
  used: number;
  free: number;
  parts: { [key: string]: IDFSizeOverviewSectionPart };
}

// Archives or files

export interface IDFSizeSection {
  size: number;
  size_diff: number;
  abbrev_name: string;
}

export interface IDFSizeMemoryType {
  size: number;
  size_diff: number;
  sections: { [key: string]: IDFSizeSection };
}

export interface IDFSizeFile {
  abbrev_name: string;
  size: number;
  size_diff: number;
  memory_types: { [key: string]: IDFSizeMemoryType };
}

export interface IDFSizeArchive extends IDFSizeFile {
  files: { [key: string]: IDFSizeFile };
  isFileInfoVisible: boolean;
}

export interface IDFSizeOverview {
  version: string;
  layout: IDFSizeOverviewSection[];
}
