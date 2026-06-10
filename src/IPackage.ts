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
  "linux-amd64": IFileInfo;
  "linux-i686": IFileInfo;
  "macos-arm64": IFileInfo;
  "linux-armel": IFileInfo;
  "linux-armhf": IFileInfo;
  "linux-arm64": IFileInfo;
  any: IFileInfo;
}

export interface IPlatformOverride {
  install: string;
  platforms: string[];
  export_paths: [string[]];
  export_vars: { [key: string]: string };
}

export interface IPackage {
  // Path to binaries
  binaries: string[];

  // Description of the package
  description: string;

  export_paths: [string[]];

  // Exports paths
  export_vars: { [key: string]: string };

  platform_overrides: IPlatformOverride[];

  install: string;

  name: string;

  version_cmd: string[];

  version_regex: string;

  version_regex_replace: string;

  versions: IVersion[];

  strip_container_dirs: number;

  supported_targets: string[];
}
