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

import { alreadyFlashing } from "../../common/error/knownError";
import { TaskManager } from "../../taskManager/taskManager";

/**
 * Global flash pipeline session. Only the caller that {@link acquire}s a
 * session may {@link end} it, so concurrent rejected flashes cannot tear down
 * an in-flight pipeline.
 */
export class FlashSession {
  private static active: FlashSession | undefined;

  static get isActive(): boolean {
    return FlashSession.active !== undefined;
  }

  static acquire(): FlashSession {
    if (FlashSession.active) {
      throw alreadyFlashing();
    }
    const session = new FlashSession();
    FlashSession.active = session;
    return session;
  }

  /** @internal Test helper to reset global session state. */
  static endActiveForTests(): void {
    FlashSession.active?.end();
    FlashSession.active = undefined;
  }

  end(): void {
    if (FlashSession.active !== this) {
      return;
    }
    TaskManager.disposeListeners();
    FlashSession.active = undefined;
  }
}
