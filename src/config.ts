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

export namespace ESP {
  export const HTTP_USER_AGENT =
    "vscode.extensions.espressif.esp-idf.extension/1.0.0 axios-client";
  export namespace Rainmaker {
    export const USER_ALREADY_LOGGED_IN_CACHE_KEY = "rainmaker_logged_in";
    export const USER_TOKEN_CACHE_KEY = "esp.rainmaker.login.tokens";
    export const USER_ASSOCIATED_NODES_CACHE_KEY = "esp.rainmaker.login.nodes";
  }
}
