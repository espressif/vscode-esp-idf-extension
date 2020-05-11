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
import axios, { AxiosResponse } from "axios";
import {
  RainmakerLoginResponseModel,
  RainmakerNodeWithDetails,
} from "./client_model";
import { ESP } from "../config";
import { Logger } from "../logger/logger";

export class RainmakerAPIClient {
  private accessToken: string;
  private refreshToken: string;

  public static async login(
    username: string,
    password: string
  ): Promise<RainmakerLoginResponseModel> {
    const resp = await axios.post<RainmakerLoginResponseModel>(
      this.generateURLFor("login"),
      { user_name: username, password },
      { headers: this.generateUserAgentHeader() }
    );

    if (resp.status === 200) {
      return resp.data;
    }
    RainmakerAPIClient.throwUnknownError(resp);
  }
  public static isLoggedIn(): boolean {
    return false;
  }

  private static generateURLFor(path: string): string {
    return `https://api.rainmaker.espressif.com/v1/${path}`;
  }

  private static generateUserAgentHeader(): any {
    return { "User-Agent": ESP.HTTP_USER_AGENT };
  }

  private static throwUnknownError(meta?: any) {
    const UnknownError = new Error(
      "Unknown Error while trying to login with rainmaker server"
    );
    Logger.error(UnknownError.message, UnknownError, { meta });
  }

  constructor(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  public async refreshAccessToken(): Promise<string> {
    const resp = await axios.post<RainmakerLoginResponseModel>(
      RainmakerAPIClient.generateURLFor("login"),
      { refreshtoken: this.refreshToken },
      { headers: RainmakerAPIClient.generateUserAgentHeader() }
    );
    if (resp.status === 200 && resp.data.status === "success") {
      this.accessToken = resp.data.accesstoken;
      return resp.data.accesstoken;
    }
    RainmakerAPIClient.throwUnknownError(resp);
  }

  //nodes
  public async getAllUserAssociatedNodes(): Promise<RainmakerNodeWithDetails> {
    const headers = {
      Authorization: this.accessToken,
    };
    Object.assign(headers, RainmakerAPIClient.generateUserAgentHeader());

    const resp = await axios.get<RainmakerNodeWithDetails>(
      RainmakerAPIClient.generateURLFor("user/nodes?node_details=true"),
      { headers }
    );

    if (resp.status === 200 && resp.data.nodes) {
      return resp.data;
    }

    RainmakerAPIClient.throwUnknownError(resp);
  }

  //nodes operations
  public updateNodeState() {}
  public getNodeState() {}
}
