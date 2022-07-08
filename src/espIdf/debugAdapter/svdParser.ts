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
import { cleanupDescription, parseDimIndex, parseInteger } from "./utils";
import {
  AccessType,
  AccessTypeMap,
  Peripheral,
  PeripheralOptions,
} from "./nodes/peripheral";
import { Register } from "./nodes/register";
import { Cluster } from "./nodes/cluster";
import { EnumeratedValue, EnumerationMap } from "./common";
import { Field } from "./nodes/field";

export class SVDParser {
  private static peripheralMap = {};
  private static enumTypeValuesMap = {};
  private static gapThreshold: number = 16;

  public static async parse(
    session: DebugSession,
    svdFilePath: string,
    gapThreshold: number
  ) {
    SVDParser.gapThreshold = gapThreshold;
    SVDParser.enumTypeValuesMap = {};
    SVDParser.peripheralMap = {};
    const svdData = await readFile(svdFilePath, "utf-8");

    return new Promise<Peripheral[]>((resolve, reject) => {
      parseString(svdData, async (err, result) => {
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

        const peripherals: Peripheral[] = [];
        for (const key in peripheralMap) {
          try {
            const p = await SVDParser.parsePeripheral(
              session,
              peripheralMap[key],
              defaultOptions
            );
            peripherals.push(p);
          } catch (error) {
            reject(error);
          }
        }
        return resolve(peripherals);
      });
    });
  }

  private static parseFields(fieldInfo: any[], parent: Register): Field[] {
    const fields: Field[] = [];

    if (fieldInfo == null) {
      return fields;
    }

    fieldInfo.map((f) => {
      let offset;
      let width;
      const description = cleanupDescription(
        f.description ? f.description[0] : ""
      );

      if (f.bitOffset && f.bitWidth) {
        offset = parseInteger(f.bitOffset[0]);
        width = parseInteger(f.bitWidth[0]);
      } else if (f.bitRange) {
        let range = f.bitRange[0];
        range = range.substring(1, range.length - 1);
        range = range.split(":");
        const end = parseInteger(range[0]);
        const start = parseInteger(range[1]);

        width = end - start + 1;
        offset = start;
      } else if (f.msb && f.lsb) {
        const msb = parseInteger(f.msb[0]);
        const lsb = parseInteger(f.lsb[0]);

        width = msb - lsb + 1;
        offset = lsb;
      } else {
        // tslint:disable-next-line:max-line-length
        throw new Error(
          `Unable to parse SVD file: field ${f.name[0]} must have either bitOffset and bitWidth elements, bitRange Element, or msb and lsb elements.`
        );
      }

      let valueMap: EnumerationMap = null;
      if (f.enumeratedValues) {
        valueMap = {};
        const eValues = f.enumeratedValues[0];
        if (eValues.$ && eValues.$.derivedFrom) {
          const found = SVDParser.enumTypeValuesMap[eValues.$.derivedFrom];
          if (!found) {
            throw new Error(
              `Invalid derivedFrom=${eValues.$.derivedFrom} for enumeratedValues of field ${f.name[0]}`
            );
          }
          valueMap = found;
        } else {
          eValues.enumeratedValue.map((ev) => {
            if (ev.value && ev.value.length > 0) {
              const evname = ev.name[0];
              const evdesc = cleanupDescription(
                ev.description ? ev.description[0] : ""
              );
              const val = ev.value[0].toLowerCase();
              const evvalue = parseInteger(val);

              valueMap[evvalue] = new EnumeratedValue(evname, evdesc, evvalue);
            }
          });
          if (eValues.name && eValues.name[0]) {
            let evName = eValues.name[0];
            for (const prefix of [
              null,
              f.name[0],
              parent.name,
              parent.parent.name,
            ]) {
              evName = prefix ? prefix + "." + evName : evName;
              SVDParser.enumTypeValuesMap[evName] = valueMap;
            }
          }
        }
      }

      const baseOptions: any = {
        name: f.name[0],
        description: description,
        offset: offset,
        width: width,
        enumeration: valueMap,
      };

      if (f.access) {
        baseOptions.accessType = AccessTypeMap[f.access[0]];
      }

      if (f.dim) {
        if (!f.dimIncrement) {
          throw new Error(
            `Unable to parse SVD file: field ${f.name[0]} has dim element, with no dimIncrement element.`
          );
        }

        const count = parseInteger(f.dim[0]);
        const increment = parseInteger(f.dimIncrement[0]);
        let index = [];
        if (f.dimIndex) {
          index = parseDimIndex(f.dimIndex[0], count);
        } else {
          for (let i = 0; i < count; i++) {
            index.push(`${i}`);
          }
        }

        const namebase: string = f.name[0];
        const offsetbase = offset;

        for (let i = 0; i < count; i++) {
          const name = namebase.replace("%s", index[i]);
          fields.push(
            new Field(parent, {
              ...baseOptions,
              name: name,
              offset: offsetbase + increment * i,
            })
          );
        }
      } else {
        fields.push(new Field(parent, { ...baseOptions }));
      }
    });

    return fields;
  }

  private static parseClusters(
    clusterInfo: any,
    parent: Peripheral
  ): Cluster[] {
    const clusters: Cluster[] = [];

    if (!clusterInfo) {
      return [];
    }

    clusterInfo.forEach((c) => {
      const baseOptions: any = {};
      if (c.access) {
        baseOptions.accessType = AccessType[c.access[0]];
      }
      if (c.size) {
        baseOptions.size = parseInteger(c.size[0]);
      }
      if (c.resetValue) {
        baseOptions.resetValue = parseInteger(c.resetValue);
      }

      if (c.dim) {
        if (!c.dimIncrement) {
          throw new Error(
            `Unable to parse SVD file: cluster ${c.name[0]} has dim element, with no dimIncrement element.`
          );
        }

        const count = parseInteger(c.dim[0]);
        const increment = parseInteger(c.dimIncrement[0]);

        let index = [];
        if (c.dimIndex) {
          index = parseDimIndex(c.dimIndex[0], count);
        } else {
          for (let i = 0; i < count; i++) {
            index.push(`${i}`);
          }
        }

        const namebase: string = c.name[0];
        const descbase: string = cleanupDescription(
          c.description ? c.description[0] : ""
        );
        const offsetbase = parseInteger(c.addressOffset[0]);

        for (let i = 0; i < count; i++) {
          const name = namebase.replace("%s", index[i]);
          const description = descbase.replace("%s", index[i]);
          const cluster = new Cluster(parent, {
            ...baseOptions,
            name: name,
            description: description,
            addressOffset: offsetbase + increment * i,
          });
          if (c.register) {
            SVDParser.parseRegisters(c.register, cluster);
          }
          clusters.push(cluster);
        }
      } else {
        const description = cleanupDescription(
          c.description ? c.description[0] : ""
        );
        const cluster = new Cluster(parent, {
          ...baseOptions,
          name: c.name[0],
          description: description,
          addressOffset: parseInteger(c.addressOffset[0]),
        });
        if (c.register) {
          SVDParser.parseRegisters(c.register, cluster);
          clusters.push(cluster);
        }
      }
    });

    return clusters;
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
      description: cleanupDescription(p.description ? p.description : ""),
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

    const peripheral = new Peripheral(session, SVDParser.gapThreshold, options);

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

  public static parseRegisters(
    registersInfo: any[],
    parent: Peripheral | Cluster
  ): Register[] {
    const info = [...registersInfo];
    const registers: Register[] = [];

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

          const register = new Register(parent, {
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
        const register = new Register(parent, {
          ...baseOptions,
          name: reg.name,
          description: description,
          addressOffset: parseInteger(reg.addressOffset),
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
