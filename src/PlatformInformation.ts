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

import * as os from "os";

export class PlatformInformation {
  public static GetPlatformInformation(): PlatformInformation {
    const platform: string = os.platform();
    const arch = os.arch();

    // Map os.arch() values to expected architecture strings
    let architecture: string;
    switch (platform) {
      case "win32":
        if (arch === "x64") {
          architecture = "x86_x64";
        } else if (arch === "ia32") {
          architecture = "x86";
        } else {
          architecture = "Unknown";
        }
        break;
      case "linux":
      case "darwin":
        if (arch === "x64") {
          architecture = "x64";
        } else if (arch === "ia32") {
          architecture = "x86";
        } else if (arch === "arm64") {
          architecture = "arm64";
        } else if (arch === "arm") {
          architecture = "armhf";
        } else {
          architecture = arch;
        }
        break;
      default:
        architecture = "Unknown";
        break;
    }

    return new PlatformInformation(platform, architecture);
  }

  public get platformToUse(): string {
    switch (this.platform) {
      case "darwin":
        return this.architecture === "arm64" ? "macos-arm64" : "macos";
      case "win32":
        return this.architecture === "x86" ? "win32" : "win64";
      case "linux":
        switch (this.architecture) {
          case "arm64":
          case "armv8l":
          case "aarch64":
            return "linux-arm64";
          case "armel":
          case "armv7l":
            return "linux-armel";
          case "armhf":
            return "linux-armhf";
          case "x86":
            return "linux-i686";
          default:
            return "linux-amd64";
        }
      default:
        break;
    }
  }

  public get fallbackPlatform(): string {
    switch (this.platform) {
      case "darwin":
        return "macos";
      case "win32":
        return this.architecture === "x86" ? "win32" : "win64";
      default:
        return "linux-amd64";
    }
  }

  constructor(public platform: string, public architecture: string) {}
}
