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

import { AddressInfo, Server, createServer } from "net";
import {
  DebugAdapterDescriptor,
  DebugAdapterDescriptorFactory,
  DebugAdapterExecutable,
  DebugAdapterServer,
  DebugSession,
  ProviderResult,
} from "vscode";
import { GDBTargetDebugSession } from "./adapter";

const DEBUG_DEFAULT_PORT = 43476;

export class CDTDebugAdapterDescriptorFactory
  implements DebugAdapterDescriptorFactory {
  private server?: Server;
  createDebugAdapterDescriptor(
    session: DebugSession,
    executable: DebugAdapterExecutable | undefined
  ): ProviderResult<DebugAdapterDescriptor> {
    if (!this.server) {
      const portToUse = session.configuration.debugPort || DEBUG_DEFAULT_PORT;
      this.server = createServer((socket) => {
        const gdbTargetDebugSession = new GDBTargetDebugSession();
        gdbTargetDebugSession.setRunAsServer(true);
        gdbTargetDebugSession.start(<NodeJS.ReadableStream>socket, socket);
      }).listen(portToUse);
    }

    const address = this.server.address();
    if (address && typeof address === "object" && address.port) {
      return new DebugAdapterServer((<AddressInfo>address).port);
    } else {
      this.dispose();
      throw new Error("Failed to get CDT Debug Adapter server address or port.");
    }
  }

  dispose() {
    if (this.server) {
      this.server.close();
    }
  }
}
