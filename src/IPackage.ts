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

import * as tmp from "tmp";

export interface IFileInfo {
  sha256: string;
  size: number;
  url: string;
}

export interface IVersion {
  name: string;
  status: string;
  win32: IFileInfo;
  win64: IFileInfo;
  macos: IFileInfo;
  linux_am64: IFileInfo;
  linux_i686: IFileInfo;
}

export interface IPlatformOverride {
  install: string;
  platforms: string[];
  export_paths: [string[]];
}

export interface IPackage {
  // Path to binaries
  binaries: string[];

  // Description of the package
  description: string;

  export_paths: [string[]];

  // Exports paths
  export_vars: {};

  platform_overrides: IPlatformOverride[];

  install: string;

  name: string;

  version_cmd: string[];

  version_regex: string;

  version_regex_replace: string;

  versions: IVersion[];

  strip_container_dirs: number;
}
