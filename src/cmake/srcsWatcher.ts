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

import { pathExists, readFile, writeFile } from "fs-extra";
import { basename, dirname, join } from "path";
import { Logger } from "../logger/logger";
import { readParameter } from "../idfConfiguration";

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

    const isSrcUpdateEnabled = readParameter(
      "idf.enableUpdateSrcsToCMakeListsFile"
    ) as boolean;

    if (!isSrcUpdateEnabled) {
      return Promise.resolve();
    }

    UpdateCmakeLists.singletonPromise = new Promise<void>(
      async (resolve, reject) => {
        try {
          const doesFileExists = await pathExists(cmakeListFile);
          if (doesFileExists) {
            const cmakeListFileContent = await readFile(cmakeListFile, "utf8");
            const isSrcIncluded =
              cmakeListFileContent.indexOf(`"${srcName}"`) > 0;
            if (isSrcIncluded && operation !== srcOp.delete) {
              this.writeFinished();
              return resolve();
            }
            const srcsMatch = cmakeListFileContent.match(/SRCS\s\"/g);
            let newContent: string;
            if (
              operation !== srcOp.delete &&
              srcsMatch &&
              srcsMatch.length > 0
            ) {
              newContent = this.addSrcFromCMakeLists(
                cmakeListFileContent,
                srcName
              );
            } else if (isSrcIncluded && operation === srcOp.delete) {
              newContent = this.deleteSrcFromCMakeLists(
                cmakeListFileContent,
                srcName
              );
            }

            if (newContent) {
              await writeFile(cmakeListFile, newContent);
            }

            this.writeFinished();
            return resolve();
          }
        } catch (error) {
          const msg = error.message
            ? error.message
            : "Error updating srcs in CMakeLists.txt";
          this.writeFinished();
          Logger.error(msg, error);
        }
      }
    );
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
