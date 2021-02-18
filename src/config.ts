/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Sunday, 10th May 2020 11:33:22 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { IEspIdfDocVersion } from "./espIdf/documentation/getDocsVersion";
import { RainmakerStore } from "./rainmaker/store";

export namespace ESP {
  export const extensionID = "espressif.esp-idf-extension";
  export const HTTP_USER_AGENT =
    "vscode.extensions.espressif.esp-idf.extension/1.0.0 axios-client";

  export namespace Rainmaker {
    export let store: RainmakerStore;
    export namespace OAuth {
      export const RedirectURL =
        "https://rainmaker-login-ui.s3.amazonaws.com/welcome.html";
      export const ResponseType = "CODE";
      export const ClientID = "60i6kac5f9rjuetqnq5mnmaqv6";
      export const Scope =
        "aws.cognito.signin.user.admin email openid phone profile";
      export const AuthURL =
        "https://auth.rainmaker.espressif.com/oauth2/token";
      export const GrantType = "authorization_code";
    }
  }

  export namespace ChangelogViewer {
    export const FileName = "CHANGELOG.md";
    export const DB_VERSION_KEY = "esp.extension.version";
  }

  export namespace URL {
    export const GithubRepository =
      "https://github.com/espressif/vscode-esp-idf-extension";
    export const ARDUINO_ESP32_URL =
      "https://github.com/espressif/arduino-esp32.git";
    export namespace Docs {
      export const BASE_URL = "https://docs.espressif.com/projects/esp-idf";
      export let IDF_INDEX;
      export const INDEX_CACHE_LIMIT = 86400; // Seconds
      export let IDF_VERSION_OBJ: IEspIdfDocVersion[];
      export const IDF_VERSIONS =
        "https://dl.espressif.com/dl/esp-idf/idf_versions.js";
      export const README = ESP.URL.GithubRepository + "/blob/master/README.md";
    }
  }

  export namespace Webview {
    export namespace PartitionTableEditor {
      export const ViewType = "partition-table-editor";
      export const Title = "ESP-IDF Partition Table Editor";
    }
  }
}
