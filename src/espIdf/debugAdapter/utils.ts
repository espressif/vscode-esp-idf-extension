/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 1st July 2022 5:06:35 pm
 * Copyright 2022 Espressif Systems (Shanghai) CO LTD
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

export function parseInteger(value: string): number {
  if (/^0b([01]+)$/i.test(value)) {
    return parseInt(value.substring(2), 2);
  } else if (/^0x([0-9a-f]+)$/i.test(value)) {
    return parseInt(value.substring(2), 16);
  } else if (/^[0-9]+/i.test(value)) {
    return parseInt(value, 10);
  } else if (/^#[0-1]+/i.test(value)) {
    return parseInt(value.substring(1), 2);
  }
  return undefined;
}
