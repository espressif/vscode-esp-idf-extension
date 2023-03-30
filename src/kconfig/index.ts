/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 7th May 2021 4:48:58 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
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

import { ExtensionContext, workspace } from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";
import { join } from "path";

export class KconfigLangClient {
  public static kconfigLangClient: LanguageClient;

  public static startKconfigLangServer(context: ExtensionContext) {
    const serverModule = context.asAbsolutePath(
      join("dist", "kconfigServer.js")
    );

    const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

    const serverOptions: ServerOptions = {
      debug: {
        module: serverModule,
        options: debugOptions,
        transport: TransportKind.ipc,
      },
      run: { module: serverModule, transport: TransportKind.ipc },
    };

    const clientOptions: LanguageClientOptions = {
      documentSelector: [
        { scheme: "file", pattern: "**/Kconfig" },
        { scheme: "file", pattern: "**/Kconfig.projbuild" },
        { scheme: "file", pattern: "**/Kconfig.in" },
      ],
      synchronize: {
        fileEvents: workspace.createFileSystemWatcher("**/.clientrc"),
      },
    };

    KconfigLangClient.kconfigLangClient = new LanguageClient(
      "kconfigServer",
      "Kconfig Language Server",
      serverOptions,
      clientOptions
    );
    KconfigLangClient.kconfigLangClient.start();
  }

  public static stopKconfigLangServer() {
    if (!!KconfigLangClient.kconfigLangClient) {
      KconfigLangClient.kconfigLangClient.stop();
    }
  }
}
