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
import * as utils from "./utils";

export class PlatformInformation {
  public static GetPlatformInformation(): Promise<PlatformInformation> {
    const platform: string = os.platform();
    let architecturePromise: Promise<string>;

    switch (platform) {
      case "win32":
        architecturePromise = PlatformInformation.GetWindowsArchitecture();
        break;
      case "linux":
        architecturePromise = PlatformInformation.GetUnixArchitecture();
        break;
      case "darwin":
        architecturePromise = PlatformInformation.GetUnixArchitecture();
      default:
        break;
    }
    return Promise.all<string>([architecturePromise]).then(([architecture]) => {
      return new PlatformInformation(platform, architecture);
    });
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

  public static GetUnknownArchitecture(): string {
    return "Unknown";
  }

  public static GetUnixArchitecture(): Promise<string> {
    const command = "uname";
    const args = ["-m"];
    return utils
      .execChildProcess(command, args, utils.extensionContext.extensionPath)
      .then((architecture) => {
        if (architecture) {
          return architecture.trim();
        }
      });
  }

  private static GetWindowsArchitecture(): Promise<string> {
    const command = "wmic";
    const args = ["os", "get", "osarchitecture"];
    return utils
      .execChildProcess(command, args, utils.extensionContext.extensionPath)
      .then((architecture) => {
        if (architecture) {
          const archArray: string[] = architecture.split(os.EOL);
          if (archArray.length > 2) {
            const arch: string = archArray[1].trim();
            if (arch.indexOf("64") >= 0) {
              return "x86_x64";
            } else if (arch.indexOf("32") >= 0) {
              return "x86";
            }
          }
        }
        return PlatformInformation.GetUnknownArchitecture();
      })
      .catch((err) => {
        return PlatformInformation.GetUnknownArchitecture();
      });
  }
  constructor(public platform: string, public architecture: string) {}
}
