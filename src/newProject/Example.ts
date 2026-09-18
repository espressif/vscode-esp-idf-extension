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

import { basename, join, sep } from "path";
import { readdir } from "fs/promises";
import { checkIsProjectCmakeLists } from "./utils";

export interface IExample {
  name: string;
  path: string;
}

export interface IExampleCategory {
  name: string;
  examples: IExample[];
  subcategories: IExampleCategory[];
}

export async function getExamplesList(
  targetFrameworkFolder: string,
  examplesContainer: string[] = ["examples"],
  name?: string
): Promise<IExampleCategory> {
  const rootName = basename(targetFrameworkFolder);
  const examplesRoot = join(targetFrameworkFolder, ...examplesContainer);
  const examplesPathList = await getSubProjects(examplesRoot);
  const rootFolder: IExampleCategory = {
    name: name || rootName.toUpperCase(),
    examples: [],
    subcategories: [],
  };
  for (const examplePath of examplesPathList) {
    const pathSegments = examplePath
      .replace(examplesRoot + sep, "")
      .split(sep);
    addSubCategory(rootFolder, examplePath, pathSegments);
  }
  const getStartedIndex = rootFolder.subcategories.findIndex(
    (subCat) => subCat.name === "get-started"
  );
  if (getStartedIndex !== -1) {
    rootFolder.subcategories.splice(
      0,
      0,
      rootFolder.subcategories.splice(getStartedIndex, 1)[0]
    );
  }
  return rootFolder;
}

export function addSubCategory(
  parent: IExampleCategory,
  path: string,
  pathSegments: string[]
) {
  if (pathSegments.length === 1) {
    const example: IExample = {
      name: pathSegments[0],
      path,
    };
    parent.examples.push(example);
    return;
  }
  let nodeIndex = parent.subcategories.findIndex(
    (subCat) => subCat.name === pathSegments[0]
  );
  if (nodeIndex !== -1) {
    addSubCategory(
      parent.subcategories[nodeIndex],
      path,
      pathSegments.slice(1)
    );
  } else {
    parent.subcategories.push({
      name: pathSegments[0],
      subcategories: [],
      examples: [],
    } as IExampleCategory);
    addSubCategory(
      parent.subcategories[parent.subcategories.length - 1],
      path,
      pathSegments.slice(1)
    );
  }
}

export async function getSubProjects(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const subDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  if (checkIsProjectCmakeLists(dir)) {
    return [dir];
  }
  const nested = await Promise.all(
    subDirs.map((subDir) => getSubProjects(join(dir, subDir)))
  );
  return nested.flat();
}
