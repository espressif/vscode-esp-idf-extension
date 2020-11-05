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

import { Uri } from "vscode";

export function createOnboardingHtml(scriptPath: Uri, fontsUri: Uri): string {
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Onboarding Setup</title>
        </head>
        <body>
            <style>
              @font-face {
                  font-family: "codicon";
                  src: url('${fontsUri}') format('truetype');
              }
              </style>
            <div id="app"></div>
        </body>
        <script src="${scriptPath}"></script>
    </html>`;
}
