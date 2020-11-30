// Copyright 2020 Espressif Systems (Shanghai) CO LTD
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

import { WebviewPanel } from "vscode";

export default class CMakeListsWebviewCollection {
  private readonly _webviews = new Set<{
    readonly document: string;
    readonly webview: WebviewPanel;
  }>();

  public add(filePath: string, webviewPanel: WebviewPanel) {
    const entry = { document: filePath, webview: webviewPanel };
    this._webviews.add(entry);

    webviewPanel.onDidDispose(() => {
      this._webviews.delete(entry);
    });
  }

  public delete(filePath: string) {
    for (const entry of this._webviews) {
      if (entry.document === filePath) {
        this._webviews.delete(entry);
      }
    }
  }

  public *get(filePath: string): Iterable<WebviewPanel> {
    for (const entry of this._webviews) {
      if (entry.document === filePath) {
        yield entry.webview;
      }
    }
  }
}
