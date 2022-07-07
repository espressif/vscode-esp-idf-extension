/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 6th July 2022 10:40:29 pm
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

export enum NumberFormat {
  Auto = 0,
  Hexadecimal,
  Decimal,
  Binary
}

export interface NodeSetting {
  node: string;
  expanded?: boolean;
  format?: NumberFormat;
  pinned?: boolean;
}

export interface EnumerationMap {
  [value: number]: EnumeratedValue;
}

export class EnumeratedValue {
  constructor(public name: string, public description: string, public value: number) {}
}

export class AddrRange {
  constructor(public base: number, public length: number) {
  }

  /** return next address after this addr. range */
  public nxtAddr() {
      return this.base + this.length;
  }

  /** return last address in this range */
  public endAddr() {
      return this.nxtAddr() - 1;
  }
}