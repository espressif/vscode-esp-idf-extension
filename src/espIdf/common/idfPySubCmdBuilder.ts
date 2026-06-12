/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 1st June 2026 3:11:48 pm
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
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

import { Uri } from "vscode";
import { readParameter } from "../../configuration/idf";
import {
  applySdkconfigDefaultsAndCcacheArgs,
  replaceBuildDirArg,
} from "../../build/buildHelpers";

export function buildIdfPyConfigSubcommandArgs(
  idfPyPath: string,
  subcommand: "reconfigure" | "confserver",
  workspacePath: Uri,
  enableCCache: boolean = readParameter(
    "idf.enableCCache",
    workspacePath
  ) as boolean,
  buildDirPath: string = readParameter(
    "idf.buildPath",
    workspacePath
  ) as string,
  sdkconfigFile: string = readParameter(
    "idf.sdkconfigFilePath",
    workspacePath
  ) as string,
  sdkconfigDefaults: string[] = (readParameter(
    "idf.sdkconfigDefaults",
    workspacePath
  ) as string[]) || []
): string[] {
  const args: string[] = [idfPyPath];
  replaceBuildDirArg(args, buildDirPath);
  applySdkconfigDefaultsAndCcacheArgs(
    args,
    enableCCache,
    sdkconfigFile,
    sdkconfigDefaults
  );
  args.push("-C", workspacePath.fsPath);
  args.push(subcommand);
  return args;
}
