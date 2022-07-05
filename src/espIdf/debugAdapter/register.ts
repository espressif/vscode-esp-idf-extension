/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 4th July 2022 9:07:44 pm
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

import { TreeItem } from "vscode";
import { PeripheralBaseNode } from "./nodes/base";
import { AccessType, EspIdfPeripheralTreeItem } from "./peripheral";

export interface PeripheralRegisterOptions {
  name: string;
  description?: string;
  addressOffset: number;
  accessType?: AccessType;
  size?: number;
  resetValue?: number;
}

export class EspIdfPeripheralRegisterTreeItem extends PeripheralBaseNode {
  public children: PeripheralFieldNode[];
  public readonly name: string;
  public readonly description?: string;
  public readonly offset: number;
  public readonly accessType: AccessType;
  public readonly size: number;
  public readonly resetValue: number;
  
  private maxValue: number;
  private hexLength: number;
  private hexRegex: RegExp;
  private binaryRegex: RegExp;
  private currentValue: number;
  private prevValue: string = '';

  constructor(parent: EspIdfPeripheralTreeItem, options: PeripheralRegisterOptions) {
    super(parent);
    this.name = options.name;
    this.description = options.description;
    this.offset = options.addressOffset;
    this.accessType = options.accessType || parent.accessType;
  }
}

export class EspIdfPeripheralClusterTreeItem extends PeripheralBaseNode {

}