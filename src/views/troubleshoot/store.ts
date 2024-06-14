/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 14th June 2024 4:44:36 pm
 * Copyright 2024 Espressif Systems (Shanghai) CO LTD
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
import { defineStore } from "pinia";
import { ref, Ref } from "vue";

declare var acquireVsCodeApi: any;
let vscode: any;
try {
  vscode = acquireVsCodeApi();
} catch (error) {
  // tslint:disable-next-line: no-console
  console.error(error);
}

export const useTroubleShootingStore = defineStore("troubleshoot", () => {
  const title: Ref<string> = ref("");
  const stepsToReproduce: Ref<string> = ref("");
  const description: Ref<string> = ref("");

  function sendForm() {
    vscode.postMessage({
      command: "sendForm",
      title: title.value,
      stepsToReproduce: stepsToReproduce.value,
      description: description.value,
    });
  }

  return {
    title,
    stepsToReproduce,
    description,
    sendForm,
  };
});
