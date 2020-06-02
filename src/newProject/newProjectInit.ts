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

import { Progress } from "vscode";
import { IMetadataFile, MetadataJson } from "../Metadata";
import { IdfComponent } from "../idfComponent";

export interface INewProjectArgs {
  metadata: IMetadataFile;
  components: IdfComponent[];
}

export async function getNewProjectArgs(
  progress: Progress<{ message: string; increment: number }>
) {
  progress.report({ increment: 10, message: "Loading settings..." });
  const metadata = await MetadataJson.read();
  progress.report({ increment: 80, message: "Initializing wizard..." });
  return { metadata } as INewProjectArgs;
}
