/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 27th February 2025 12:28:08 pm
 * Copyright 2025 Espressif Systems (Shanghai) CO LTD
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

import { Memento } from "vscode";

export function createMockMemento(): Memento {
  const storage = new Map<string, any>();

  return {
    get: <T>(key: string, defaultValue?: T): T | undefined => {
      return storage.has(key) ? (storage.get(key) as T) : defaultValue;
    },
    update: (key: string, value: any): Thenable<void> => {
      if (value === undefined) {
        storage.delete(key);
      } else {
        storage.set(key, value);
      }
      return Promise.resolve();
    },
    keys: (): readonly string[] => {
      return Array.from(storage.keys());
    },
  };
}