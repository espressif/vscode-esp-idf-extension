/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Saturday, 9th May 2020 7:56:03 pm
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
import axios from "axios";
import { stringify } from "querystring";
import { ESP } from "../../config";
import { Logger } from "../../logger/logger";
import {
  RainmakerLoginResponseModel,
  RainmakerNodeWithDetails,
  RainmakerDeviceParams,
  RainmakerUserInfo,
} from "./model";
import { readParameter } from "../../idfConfiguration";
import { commands } from "vscode";

const USER_TOKEN_CACHE_KEY = "esp.rainmaker.login.tokens";
const USER_ASSOCIATED_NODES_CACHE_KEY = "esp.rainmaker.login.nodes";
const USER_ALREADY_LOGGED_IN_CACHE_KEY = "rainmaker_logged_in";

export enum RainmakerAPIClientErrors {
  LoginRequired = "Login is required",
}

export class RainmakerAPIClient {
  public static async exchangeCodeForTokens(
    code: string
  ): Promise<RainmakerLoginResponseModel> {
    const resp = await axios.post(
      ESP.Rainmaker.OAuth.AuthURL,
      stringify({
        grant_type: ESP.Rainmaker.OAuth.GrantType,
        client_id: ESP.Rainmaker.OAuth.ClientID,
        redirect_uri: ESP.Rainmaker.OAuth.RedirectURL,
        code,
      }),
      { headers: this.generateUserAgentHeader() }
    );
    if (resp.status === 200 && resp.data.access_token) {
      const token: RainmakerLoginResponseModel = {
        idtoken: resp.data.id_token,
        accesstoken: resp.data.access_token,
        refreshtoken: resp.data.refresh_token,
        status: "success",
        description: "Login successful",
      };
      this.updateUserTokens(token);
      this.setUserLoggedInContext(true);
      return token;
    }
    return;
  }
  public static async login(
    username: string,
    password: string
  ): Promise<RainmakerLoginResponseModel> {
    const resp = await axios.post<RainmakerLoginResponseModel>(
      this.generateURLFor("login"),
      { user_name: username, password },
      { headers: this.generateUserAgentHeader() }
    );

    if (resp.status === 200 && resp.data.status === "success") {
      this.updateUserTokens(resp.data);
      this.setUserLoggedInContext(true);
      return resp.data;
    }
    this.throwUnknownError(resp);
  }

  public static logout() {
    this.updateUserTokens(undefined);
    this.updateNodeCache(undefined);
    this.setUserLoggedInContext(false);
  }

  public static isLoggedIn(): boolean {
    const v = !!this.getUserTokens();
    this.setUserLoggedInContext(v);
    return v;
  }

  public static async refreshAccessToken() {
    if (!this.isLoggedIn()) {
      throw new Error(RainmakerAPIClientErrors.LoginRequired);
    }
    const tokens = this.getUserTokens();
    const resp = await axios.post<RainmakerLoginResponseModel>(
      this.generateURLFor("login"),
      { refreshtoken: tokens.refreshtoken },
      { headers: RainmakerAPIClient.generateUserAgentHeader() }
    );
    if (resp.status === 200 && resp.data.status === "success") {
      return this.updateUserTokens(Object.assign(tokens, resp.data));
    }
    this.throwUnknownError(resp);
  }

  public static async getAllUserAssociatedNodes(): Promise<
    RainmakerNodeWithDetails
  > {
    const nodes = this.getNodesFromCache();
    if (nodes) {
      return nodes;
    }
    const resp = await axios.get<RainmakerNodeWithDetails>(
      this.generateURLFor("user/nodes?node_details=true"),
      { headers: this.getAuthHeader() }
    );

    if (resp.status === 200 && resp.data.nodes) {
      this.updateNodeCache(resp.data);
      return resp.data;
    }

    this.throwUnknownError(resp);
  }

  public static clearNodesCache() {
    this.updateNodeCache(undefined);
  }

  public static async deleteNode(node_id: string) {
    await this.refreshAccessToken();
    const resp = await axios.put(
      this.generateURLFor("user/nodes/mapping"),
      { node_id, operation: "remove" },
      { headers: this.getAuthHeader() }
    );
    if (resp.status === 200 && resp.data) {
      return resp.data;
    }
    this.throwUnknownError(resp);
  }

  public static async getNodeParams(
    nodeID: string
  ): Promise<RainmakerDeviceParams> {
    const resp = await axios.get<RainmakerDeviceParams>(
      this.generateURLFor(`user/nodes/params?nodeid=${nodeID}`),
      { headers: this.getAuthHeader() }
    );

    if (resp.status === 200 && resp.data) {
      return resp.data;
    }
    this.throwUnknownError(resp);
  }

  public static async updateNodeParam(
    nodeID: string,
    deviceName: string,
    paramName: string,
    value: any
  ) {
    const payload = {};
    payload[deviceName] = {};
    payload[deviceName][paramName] = value;

    const resp = await axios.put(
      this.generateURLFor(`user/nodes/params?nodeid=${nodeID}`),
      payload,
      { headers: this.getAuthHeader() }
    );
    if (resp.status === 200 && resp.data.status === "success") {
      return resp.data;
    }
    this.throwUnknownError(resp);
  }

  public static async getUserInfo(): Promise<RainmakerUserInfo> {
    const resp = await axios.get<RainmakerUserInfo>(
      this.generateURLFor(`user`),
      {
        headers: this.getAuthHeader(),
      }
    );
    if (resp.status === 200 && resp.data.user_id) {
      return resp.data;
    }
    this.throwUnknownError(resp);
  }

  private static getAuthHeader(): any {
    if (!this.isLoggedIn()) {
      throw new Error(RainmakerAPIClientErrors.LoginRequired);
    }
    const tokens = this.getUserTokens();
    const headers = {
      Authorization: tokens.accesstoken,
    };
    Object.assign(headers, RainmakerAPIClient.generateUserAgentHeader());
    return headers;
  }

  private static generateURLFor(path: string): string {
    let apiServerURL = readParameter("esp.rainmaker.api.server_url") as string;
    if (!apiServerURL) {
      apiServerURL = "https://api.rainmaker.espressif.com/v1";
    }
    if (apiServerURL.endsWith("/")) {
      apiServerURL = apiServerURL.substr(0, apiServerURL.length - 1);
    }
    return `${apiServerURL}/${path}`;
  }
  private static getUserTokens(): RainmakerLoginResponseModel {
    return ESP.Rainmaker.store.get<RainmakerLoginResponseModel>(
      USER_TOKEN_CACHE_KEY,
      undefined
    );
  }
  private static updateUserTokens(tokens: RainmakerLoginResponseModel) {
    return ESP.Rainmaker.store.set(USER_TOKEN_CACHE_KEY, tokens);
  }
  private static getNodesFromCache(): RainmakerNodeWithDetails {
    return ESP.Rainmaker.store.get<RainmakerNodeWithDetails>(
      USER_ASSOCIATED_NODES_CACHE_KEY,
      undefined
    );
  }
  private static updateNodeCache(nodes: RainmakerNodeWithDetails) {
    return ESP.Rainmaker.store.set(USER_ASSOCIATED_NODES_CACHE_KEY, nodes);
  }

  private static generateUserAgentHeader(): any {
    return { "User-Agent": ESP.HTTP_USER_AGENT };
  }
  private static throwUnknownError(meta?: any) {
    const UnknownError = new Error(
      "Unknown Error while trying to login with rainmaker server"
    );
    Logger.error(UnknownError.message, UnknownError, { meta });
    throw UnknownError;
  }
  private static setUserLoggedInContext(v: boolean) {
    return commands.executeCommand<any>(
      "setContext",
      USER_ALREADY_LOGGED_IN_CACHE_KEY,
      v
    );
  }
}
