/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 14th May 2020 6:31:38 pm
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

import { readParameter } from "../../idfConfiguration";
import { ESP } from "../../config";
import { env, Uri } from "vscode";
import { Logger } from "../../logger/logger";

export enum RainmakerOAuthProvider {
  Google = "Google",
  Github = "Github",
  SignInWithApple = "SignInWithApple",
}

export class RainmakerOAuthManager {
  public static openExternalOAuthURL(provider: RainmakerOAuthProvider) {
    const oAuthURL = readParameter("esp.rainmaker.oauth.url");
    let url: URL;

    try {
      url = new URL(oAuthURL);
    } catch (error) {
      const err = new Error(`Invalid OAuth Server URL, ${oAuthURL}`);
      Logger.errorNotify(err.message, err);
      throw err;
    }

    const params = new URLSearchParams(this.getDefaultURLParams());
    params.set("identity_provider", provider);
    params.set("state", `uri:vscode://espressif.esp-idf-extension/rainmaker`);
    url.search = params.toString();

    env.openExternal(Uri.parse(url.toString()));
  }

  private static getDefaultURLParams(): URLSearchParams {
    const params = new URLSearchParams();
    params.set("redirect_uri", ESP.Rainmaker.OAuth.RedirectURL);
    params.set("response_type", ESP.Rainmaker.OAuth.ResponseType);
    params.set("client_id", ESP.Rainmaker.OAuth.ClientID);
    params.set("scope", ESP.Rainmaker.OAuth.Scope);
    return params;
  }
}
