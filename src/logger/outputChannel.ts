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

import * as vscode from "vscode";

export class OutputChannel {
  public static init(): vscode.OutputChannel {
    if (OutputChannel.instance === undefined) {
      OutputChannel.instance = vscode.window.createOutputChannel("ESP-IDF");
    }
    return OutputChannel.instance;
  }

  public static appendLine(message: string, name?: string) {
    OutputChannel.checkInitialized();
    if(name) {
      OutputChannel.instance.appendLine(`[${name}]`);
      OutputChannel.instance.appendLine(message);
    } else {
      OutputChannel.instance.appendLine(message);
    }
  }

  public static append(message: string, name?: string) {
    OutputChannel.checkInitialized();
    if(name) {
      OutputChannel.instance.appendLine(`[${name}]`);
      OutputChannel.instance.append(message);
    } else {
      OutputChannel.instance.append(message);
    }
  }

  public static end() {
    OutputChannel.checkInitialized();
    OutputChannel.instance.dispose();
  }
  public static show() {
    OutputChannel.checkInitialized();
    OutputChannel.instance.show();
  }
  public static hide() {
    OutputChannel.checkInitialized();
    OutputChannel.instance.hide();
  }

  private static instance: vscode.OutputChannel;

  private static checkInitialized() {
    if (!OutputChannel.instance) {
      throw new Error(
        "need to initialize the output channel first use:: OutputChannel.init()"
      );
    }
  }
}
