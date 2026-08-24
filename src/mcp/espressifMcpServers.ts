// Copyright 2026 Espressif Systems (Shanghai) CO LTD
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

import * as vscode from "vscode";
import { Logger } from "../logger/logger";

export const ESPRESSIF_MCP_PROVIDER_ID = "espIdf.mcpServers";

type EspressifHttpMcpServer = {
  label: string;
  uri: string;
  version: string;
};

export const ESPRESSIF_HTTP_MCP_SERVERS: readonly EspressifHttpMcpServer[] = [
  {
    label: "Espressif Documentation",
    uri: "https://mcp.espressif.com/docs",
    version: "1.0.0",
  },
  {
    label: "ESP Component Registry",
    uri: "https://components.espressif.com/mcp",
    version: "1.0.0",
  },
];

function toHttpServerDefinition(
  server: EspressifHttpMcpServer
): vscode.McpHttpServerDefinition {
  return new vscode.McpHttpServerDefinition(
    server.label,
    vscode.Uri.parse(server.uri),
    undefined,
    server.version
  );
}

export function registerEspressifMcpServers(
  context: vscode.ExtensionContext
): void {
  try {
    const disposable = vscode.lm.registerMcpServerDefinitionProvider(
      ESPRESSIF_MCP_PROVIDER_ID,
      {
        provideMcpServerDefinitions: () =>
          ESPRESSIF_HTTP_MCP_SERVERS.map(toHttpServerDefinition),
        resolveMcpServerDefinition: (server) => server,
      }
    );
    context.subscriptions.push(disposable);
  } catch (error) {
    Logger.error(
      "Failed to register Espressif MCP servers",
      error as Error,
      "espIdf mcp register"
    );
  }
}
