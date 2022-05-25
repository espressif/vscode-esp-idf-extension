/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 22nd October 2019 8:18:43 pm
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
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

// tslint:disable: interface-name
export interface FlashModel {
  after: string;
  app: FlashSection;
  baudRate: string;
  before: string;
  chip: string;
  flashSections: FlashSection[];
  frequency: string;
  mode: string;
  port: string;
  size: string;
  stub: boolean;
}
export interface FlashSection {
  address: string;
  binFilePath: string;
  encrypted: boolean;
}
