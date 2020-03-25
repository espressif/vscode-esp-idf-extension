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

import { exists, readFile, writeFile } from "fs";
import { basename, dirname, join } from "path";

export enum srcOp {
  delete,
  other,
}

export class UpdateCmakeLists {
  public static singletonPromise: Promise<void>;

  public static updateSrcsInCmakeLists(
    srcPath: string,
    operation?: srcOp
  ): Promise<void> {
    const dirName = dirname(srcPath);
    const srcName = basename(srcPath);
    const cmakeListFile = join(dirName, "CMakeLists.txt");

    UpdateCmakeLists.singletonPromise = new Promise((resolve, reject) => {
      exists(cmakeListFile, (doesFileExists) => {
        if (doesFileExists) {
          readFile(cmakeListFile, "utf8", (err, content) => {
            if (err) {
              this.writeFinished();
              reject(err);
              return;
            }
            const isSrcIncluded = content.indexOf(`"${srcName}"`) > 0;
            if (isSrcIncluded && operation !== srcOp.delete) {
              this.writeFinished();
              resolve();
              return;
            }
            const srcsMatch = content.match(/SRCS\s\"/g);
            let newContent: string;
            if (
              operation !== srcOp.delete &&
              srcsMatch &&
              srcsMatch.length > 0
            ) {
              newContent = this.addSrcFromCMakeLists(content, srcName);
            } else if (isSrcIncluded && operation === srcOp.delete) {
              newContent = this.deleteSrcFromCMakeLists(content, srcName);
            }

            if (newContent) {
              writeFile(cmakeListFile, newContent, (error) => {
                if (error) {
                  this.writeFinished();
                  reject(error);
                }
              });
            }
            this.writeFinished();
            resolve();
          });
        }
      });
    });
    return UpdateCmakeLists.singletonPromise;
  }
  private static addSrcFromCMakeLists(content: string, srcName: string) {
    return content.replace('SRCS "', `SRCS "${srcName}" "`);
  }
  private static deleteSrcFromCMakeLists(content: string, srcName: string) {
    return content.replace(` "${srcName}"`, ``);
  }
  private static writeFinished() {
    UpdateCmakeLists.singletonPromise = undefined;
  }
}
