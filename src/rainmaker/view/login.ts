/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 12th May 2020 7:51:26 pm
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

import { window, QuickPickItem } from "vscode";
import { RainmakerOAuthProvider } from "../oauth";

export async function PromptUserToLogin(): Promise<LoginDetails> {
  const choice = await showLoginChoices([
    {
      label: "Rainmaker Login",
      description: "(username and password)",
      detail: "Use username and password from Rainmaker to login",
      type: LoginType.Basic,
    },
    {
      label: "OAuth Apps",
      description: "(external url will be opened in default browser)",
      detail: "Use OAuth App providers from Rainmaker to login",
      type: LoginType.OAuth,
    },
  ]);
  if (!choice) {
    return;
  }
  if (choice.type === LoginType.Basic) {
    return await showBasicLoginForm();
  } else if (choice.type === LoginType.OAuth) {
    const oAuthProviderChoice = await window.showQuickPick(
      [
        {
          label: RainmakerOAuthProvider.Github,
          type: RainmakerOAuthProvider.Github,
        },
        {
          label: RainmakerOAuthProvider.Google,
          type: RainmakerOAuthProvider.Google,
        },
        {
          label: RainmakerOAuthProvider.SignInWithApple,
          type: RainmakerOAuthProvider.SignInWithApple,
        },
      ],
      {
        placeHolder: "Select OAuth Provider for ESP Rainmaker Login",
        ignoreFocusOut: true,
      }
    );
    if (!oAuthProviderChoice) {
      return;
    }
    return { provider: oAuthProviderChoice.type };
  }
}

enum LoginType {
  OAuth,
  Basic,
}

interface RainmakerLoginItem extends QuickPickItem {
  type: LoginType;
  label: string;
  description: string;
  detail: string;
}

interface LoginDetails {
  username?: string;
  password?: string;
  provider?: RainmakerOAuthProvider;
}

async function showLoginChoices(
  choices: RainmakerLoginItem[]
): Promise<RainmakerLoginItem> {
  return await window.showQuickPick<RainmakerLoginItem>(choices, {
    placeHolder: "Select a login option to connect with ESP Rainmaker Cloud",
    ignoreFocusOut: true,
  });
}

async function showBasicLoginForm(): Promise<LoginDetails> {
  const validateInput = (value: string): string => {
    if (value && value !== "") {
      return;
    }
    return "Please enter a valid value";
  };

  const username = await window.showInputBox({
    ignoreFocusOut: true,
    prompt: "Enter your Rainmaker Cloud Username",
    validateInput,
  });

  const password = await window.showInputBox({
    ignoreFocusOut: true,
    prompt: "Enter your password (username & password will not be stored)",
    password: true,
    validateInput,
  });

  return { username, password };
}
