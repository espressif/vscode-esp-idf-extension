/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 30th June 2022 5:22:24 pm
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

import { DebugSession } from "vscode";
import { parseString } from "xml2js";
import { readFile } from "fs-extra";
import { parseInteger } from "./utils";
import {
  AccessType,
  AccessTypeMap,
  EspIdfPeripheralTreeItem,
  PeripheralOptions,
} from "./peripheral";
import { EspIdfPeripheralRegisterTreeItem } from "./register";

export class SVDParser {
  public peripheralMap = {};

  public static async parse(
    session: DebugSession,
    svdFilePath: string,
    gapThreshold: string
  ) {
    const svdData = await readFile(svdFilePath, "utf-8");

    return new Promise((resolve, reject) => {
      parseString(svdData, (err, result) => {
        if (err) {
          return reject(err);
        }

        const peripheralMap = {};
        const defaultOptions = {
          accessType: AccessType.ReadWrite,
          size: 32,
          resetValue: 0x0,
        } as PeripheralOptions;

        if (result.device.resetValue) {
          defaultOptions.resetValue = result.device.resetValue;
        }

        if (result.device.size) {
          defaultOptions.size = result.device.size;
        }

        if (result.device.access) {
          defaultOptions.accessType = result.device.access;
        }

        for (const peripheral of result.device.peripherals) {
          peripheralMap[peripheral.name] = peripheral;
        }

        for (const key in peripheralMap) {
          if (peripheralMap[key].$ && peripheralMap[key].$.derivedFrom) {
            peripheralMap[key] = {
              ...peripheralMap[key].$.derivedFrom,
              ...peripheralMap[key],
            };
          }
        }

        const peripherals = [];
        for (const key in peripheralMap) {
          try {
            peripherals.push(
              SVDParser.parsePeripheral(
                session,
                peripheralMap[key],
                defaultOptions
              )
            );
          } catch (error) {
            reject(error);
          }
        }
        return resolve(peripherals);
      });
    });
  }

  public static async parsePeripheral(
    session: DebugSession,
    p: any,
    defOptions: PeripheralOptions
  ) {
    let length = 0;

    if (p.addressBlock) {
      for (const addrBlock of p.addressBlock) {
        const offset = parseInteger(addrBlock.offset);
        const size = parseInteger(addrBlock.size);
        length = Math.max(length, offset + size);
      }
    }

    const options = {
      name: p.name,
      baseAddress: parseInteger(p.baseAddress ? p.baseAddress : 0),
      description: p.description ? p.description : "",
      totalLength: length,
    } as PeripheralOptions;

    if (p.access) {
      options.accessType = AccessTypeMap[p.access];
    }
    if (p.size) {
      options.size = parseInteger(p.size);
    }
    if (p.resetValue) {
      options.resetValue = p.resetValue;
    }
    if (p.groupName) {
      options.groupName = p.groupName;
    }

    const peripheral = new EspIdfPeripheralTreeItem(session, options);

    if (p.registers) {
      if (p.registers[0].register) {
        SVDParser.parseRegisters(p.registers, peripheral);
      }
      if (p.registers[0].register) {
        SVDParser.parseClusters(p.registers, peripheral);
      }
    }
    return peripheral;
  }

  parseRegisters(
    registersInfo: any[],
    parent: EspIdfPeripheralTreeItem | EspIdfPeripheralClusterTreeItem
  ): EspIdfPeripheralRegisterTreeItem[] {
    const info = [...registersInfo];
    const registers: EspIdfPeripheralRegisterTreeItem[] = [];

    const registerMap = {};
    for (const reg of registersInfo) {
      registerMap[reg.name] = reg;
      this.peripheralMap[`${parent.name}.${reg.name}`] = reg;
    }

    let index = 0;
    for (const reg of registersInfo) {
      const derivedFrom = reg.$ ? reg.$.derivedFrom : "";
      if (derivedFrom) {
        const from =
          registerMap[derivedFrom] || this.peripheralMap[derivedFrom];
        if (!from) {
          throw new Error(
            `Invalid 'derivedFrom' key "${derivedFrom}" in register ${reg.name}`
          );
        }
        const combined = { ...from, ...reg };
        delete combined.$.derivedFrom;
        combined.$._derivedFrom = derivedFrom;
        registerMap[reg.name] = combined;
        this.peripheralMap[`${parent.name}.${reg.name}`] = combined;
        registersInfo[index] = combined;
      }
      index++;
    }

    for (const reg of registersInfo) {
      const baseOptions = {} as PeripheralOptions;
      if (reg.access) {
        baseOptions.accessType = AccessTypeMap[reg.access];
      }
      if (reg.size) {
        baseOptions.size = parseInteger(reg.size);
      }
      if (reg.resetValue) {
        baseOptions.resetValue = parseInteger(reg.resetValue);
      }
      if (reg.dim) {
        if (!reg.dimIncrement) {
          throw new Error("Register has dim element without dimIncrement");
        }
        const count = parseInteger(reg.dim);
        const increment = parseInteger(reg.dimIncrement);
        let dimIndex = [];
        if (reg.dimIndex) {
          dimIndex = parseDimIndex(reg.dimIndex, count);
        } else {
          for (let i = 0; i < count; i++) {
            dimIndex.push(`${i}`);
          }
        }

        const nameBase: string = reg.name;
        const descBase: string = reg.description ? reg.description : "";
        const offsetBase = parseInteger(reg.addressOffset);

        for (let i = 0; i < count; i++) {
          const name = nameBase.replace("%s", dimIndex[i]);
          const description = descBase.replace("%s", dimIndex[i]);

          const register = new EspIdfPeripheralRegisterTreeItem(parent, {
            ...baseOptions,
            name,
            description,
            addressOffset: offsetBase + increment * i,
          });
          if (reg.fields && reg.fields.length === 1) {
            this.parseFields(reg.fields[0], register);
          }
          registers.push(register);
          
        }
      } else {
        const description = reg.description ? reg.description : "";
        const register = new EspIdfPeripheralRegisterTreeItem(parent, {
          ...baseOptions,
          name: reg.name,
          description: description,
          addressOffset: parseInteger(reg.addressOffset)
        });
        if (reg.fields && reg.fields.length === 1) {
          this.parseFields(reg.fields[0], register);
        }
        registers.push(register);
      }
    }
    registers.sort((a, b) => {
      if (a.offset < b.offset) {
        return -1;
      } else if (a.offset > b.offset) {
        return 1;
      } else {
        return 0;
      }
    });

    return registers;
  }
}
