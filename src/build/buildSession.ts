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

import { alreadyBuilding } from "../common/error/knownError";
import { TaskManager } from "../taskManager/taskManager";

/**
 * Global build pipeline session. Only the caller that {@link acquire}s a
 * session may {@link end} it, so concurrent rejected builds cannot tear down
 * an in-flight pipeline.
 */
export class BuildSession {
  private static active: BuildSession | undefined;

  static get isActive(): boolean {
    return BuildSession.active !== undefined;
  }

  static acquire(): BuildSession {
    if (BuildSession.active) {
      throw alreadyBuilding();
    }
    const session = new BuildSession();
    BuildSession.active = session;
    return session;
  }

  /** @internal Test helper to reset global session state. */
  static endActiveForTests(): void {
    BuildSession.active?.end();
    BuildSession.active = undefined;
  }

  end(): void {
    if (BuildSession.active !== this) {
      return;
    }
    TaskManager.disposeListeners();
    BuildSession.active = undefined;
  }
}
