/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
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

import * as assert from "assert";
import {
  isForceProjectActivationPending,
  requestProjectActivation,
  runValidations,
} from "../../activation/validate";
import { Logger } from "../../common/logger";
import {
  IdfConfigurationSource,
  resetIdfConfigurationSource,
  setIdfConfigurationSource,
} from "../../configuration/idfConfigurationSource";
import { createMockMemento } from "../mockUtils";

suite("runValidations forceProjectActivation", () => {
  const extensionPath = __dirname;

  suiteSetup(() => {
    Logger.init({
      subscriptions: [],
      extensionPath,
      globalState: createMockMemento(),
      workspaceState: createMockMemento(),
    } as never);
  });

  teardown(() => {
    resetIdfConfigurationSource();
  });

  test("a global never suppresses activation and discards a pending force opt-in", async () => {
    requestProjectActivation();
    assert.strictEqual(isForceProjectActivationPending(), true);

    setIdfConfigurationSource(
      stubConfigurationSource({
        inspectGlobal: () => ({ globalValue: "never" }),
      })
    );

    const decision = await runValidations(extensionPath);

    assert.deepStrictEqual(decision, { kind: "skipped" });
    assert.strictEqual(isForceProjectActivationPending(), false);
  });

  test("consumes force activation once at the start of each run", async () => {
    requestProjectActivation();
    setIdfConfigurationSource(stubConfigurationSource());

    await runValidations(extensionPath);

    assert.strictEqual(isForceProjectActivationPending(), false);
  });
});

function stubConfigurationSource(
  overrides?: Partial<IdfConfigurationSource>
): IdfConfigurationSource {
  return {
    getScoped: () => undefined,
    inspectGlobal: () => undefined,
    updateScoped: () => Promise.resolve(),
    updateGlobal: () => Promise.resolve(),
    refreshConfiguration: () => undefined,
  ...overrides,
  };
}
