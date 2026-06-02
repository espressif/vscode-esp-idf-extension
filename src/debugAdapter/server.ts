/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 4th March 2024 12:12:14 pm
 * Copyright 2024 Espressif Systems (Shanghai) CO LTD
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
import {
  DebugAdapterDescriptor,
  DebugAdapterDescriptorFactory,
  DebugAdapterExecutable,
  DebugAdapterInlineImplementation,
  DebugSession,
  ProviderResult,
} from "vscode";
import { GDBTargetDebugSession } from "./adapter";

export class CDTDebugAdapterDescriptorFactory
  implements DebugAdapterDescriptorFactory {
  createDebugAdapterDescriptor(
    session: DebugSession,
    executable: DebugAdapterExecutable | undefined
  ): ProviderResult<DebugAdapterDescriptor> {
    return new DebugAdapterInlineImplementation(
      new GDBTargetDebugSession()
    );
  }
}
