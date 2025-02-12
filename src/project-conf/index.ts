/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 15th February 2023 8:19:37 pm
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

import * as path from "path";
import { ExtensionContext, Uri } from "vscode";
import { ESP } from "../config";
import { pathExists, readJson, writeJson, ensureDir } from "fs-extra";
import { ProjectConfElement } from "./projectConfiguration";

export class ProjectConfigStore {
  private static self: ProjectConfigStore;
  private ctx: ExtensionContext;

  public static init(context: ExtensionContext): ProjectConfigStore {
    if (!this.self) {
      return new ProjectConfigStore(context);
    }
    return this.self;
  }
  private constructor(context: ExtensionContext) {
    this.ctx = context;
  }
  public get<T>(key: string, defaultValue?: T): T {
    return this.ctx.workspaceState.get<T>(key, defaultValue);
  }
  public set(key: string, value: any) {
    this.ctx.workspaceState.update(key, value);
  }
  public clear(key: string) {
    return this.set(key, undefined);
  }
}

export async function getProjectConfigurationElements(workspaceFolder: Uri) {
  const projectConfFilePath = Uri.joinPath(
    workspaceFolder,
    ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME
  );
  const doesPathExists = await pathExists(projectConfFilePath.fsPath);
  if (!doesPathExists) {
    return {};
  }
  const projectConfJson = await readJson(projectConfFilePath.fsPath);

  const projectConfElements: { [key: string]: ProjectConfElement } = {};

  await Promise.all(
    Object.keys(projectConfJson).map(async (elem) => {
      const buildConfig = projectConfJson[elem].build;
      let buildDirPath: string;

      const userBuildDir = buildConfig?.buildDirectoryPath;
      if (userBuildDir) {
        // Check if the path is absolute
        if (path.isAbsolute(userBuildDir)) {
          buildDirPath = userBuildDir;
        } else {
          // Resolve relative path against workspace
          buildDirPath = Uri.joinPath(workspaceFolder, userBuildDir).fsPath;
        }
      }

      // Ensure directory is created for the resolved path
      if (buildDirPath) {
        await ensureDir(buildDirPath);
      }

      projectConfElements[elem] = {
        build: {
          compileArgs: buildConfig?.compileArgs,
          ninjaArgs: buildConfig?.ninjaArgs,
          buildDirectoryPath: buildDirPath,
          sdkconfigDefaults: (await pathExists(buildConfig?.sdkconfigDefaults))
            ? buildConfig?.sdkconfigDefaults
            : Uri.joinPath(workspaceFolder, buildConfig?.sdkconfigDefaults)
                .fsPath,
          sdkconfigFilePath: (await pathExists(buildConfig?.sdkconfigFilePath))
            ? buildConfig?.sdkconfigFilePath
            : Uri.joinPath(workspaceFolder, buildConfig.sdkconfigFilePath)
                .fsPath,
        },
        env: projectConfJson[elem].env,
        flashBaudRate: projectConfJson[elem].flashBaudRate,
        monitorBaudRate: projectConfJson[elem].monitorBaudRate,
        openOCD: {
          debugLevel: projectConfJson[elem].openOCD?.debugLevel,
          configs: projectConfJson[elem].openOCD?.configs,
          args: projectConfJson[elem].openOCD?.args,
        },
        tasks: {
          preBuild: projectConfJson[elem].tasks?.preBuild,
          preFlash: projectConfJson[elem].tasks?.preFlash,
          postBuild: projectConfJson[elem].tasks?.postBuild,
          postFlash: projectConfJson[elem].tasks?.postFlash,
        },
      } as ProjectConfElement;
    })
  );
  return projectConfElements;
}

export async function saveProjectConfFile(
  workspaceFolder: Uri,
  projectConfElements: { [key: string]: ProjectConfElement }
) {
  const projectConfFilePath = Uri.joinPath(
    workspaceFolder,
    ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME
  );
  await writeJson(projectConfFilePath.fsPath, projectConfElements, {
    spaces: 2,
  });
}
