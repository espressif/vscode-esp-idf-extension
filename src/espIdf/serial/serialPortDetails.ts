/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 5th June 2019 2:03:34 pm
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export class SerialPortDetails {
  public comName: string;
  public manufacturer: string;
  public vendorId: string;
  public productId: string;
  public chipType: string;

  constructor(
    comName: string,
    manufacturer?: string,
    vendorId?: string,
    product?: string,
    chipType?: string
  ) {
    this.comName = comName;
    this.manufacturer = manufacturer;
    this.vendorId = vendorId;
    this.productId = product;
    this.chipType = chipType;
  }
}
