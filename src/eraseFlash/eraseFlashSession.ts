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

import { alreadyErasing } from "../common/error/knownError";
import { TaskManager } from "../taskManager/taskManager";

/**
 * Global erase-flash pipeline session. Only the caller that {@link acquire}s a
 * session may {@link end} it, so concurrent rejected erases cannot tear down
 * an in-flight pipeline.
 */
export class EraseFlashSession {
  private static active: EraseFlashSession | undefined;

  static get isActive(): boolean {
    return EraseFlashSession.active !== undefined;
  }

  static acquire(): EraseFlashSession {
    if (EraseFlashSession.active) {
      throw alreadyErasing();
    }
    const session = new EraseFlashSession();
    EraseFlashSession.active = session;
    return session;
  }

  /** @internal Test helper to reset global session state. */
  static endActiveForTests(): void {
    EraseFlashSession.active?.end();
    EraseFlashSession.active = undefined;
  }

  end(): void {
    if (EraseFlashSession.active !== this) {
      return;
    }
    TaskManager.disposeListeners();
    EraseFlashSession.active = undefined;
  }
}
