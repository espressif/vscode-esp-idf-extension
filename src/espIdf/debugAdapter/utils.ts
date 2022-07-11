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

import { DebugSession } from "vscode";
import { AddrRange } from "./common";

export function binaryFormat(
  value: number,
  padding: number = 0,
  includePrefix: boolean = true,
  group: boolean = false
): string {
  let base = (value >>> 0).toString(2);
  while (base.length < padding) {
    base = "0" + base;
  }

  if (group) {
    const nibRem = 4 - (base.length % 4);
    for (let i = 0; i < nibRem; i++) {
      base = "0" + base;
    }
    const groups = base.match(/[01]{4}/g);
    base = groups.join(" ");

    base = base.substring(nibRem);
  }

  return includePrefix ? "0b" + base : base;
}

export function cleanupDescription(input: string): string {
  return input.replace(/\r/g, "").replace(/\n\s*/g, " ");
}

export function createMask(offset: number, width: number) {
  let r = 0;
  const a = offset;
  const b = offset + width - 1;
  for (let i = a; i <= b; i++) {
    r = (r | (1 << i)) >>> 0;
  }
  return r;
}

export function extractBits(value: number, offset: number, width: number) {
  const mask = createMask(offset, width);
  const bvalue = ((value & mask) >>> offset) >>> 0;
  return bvalue;
}

export function hexFormat(
  value: number,
  padding: number = 8,
  includePrefix: boolean = true
): string {
  let base = (value >>> 0).toString(16);
  base = base.padStart(padding, "0");
  return includePrefix ? "0x" + base : base;
}

export function parseDimIndex(spec: string, count: number): string[] {
  if (spec.indexOf(",") !== -1) {
    const components = spec.split(",").map((c) => c.trim());
    if (components.length !== count) {
      throw new Error("dimIndex Element has invalid specification.");
    }
    return components;
  }

  if (/^([0-9]+)\-([0-9]+)$/i.test(spec)) {
    const parts = spec.split("-").map((p) => parseInteger(p));
    const start = parts[0];
    const end = parts[1];

    const numElements = end - start + 1;
    if (numElements < count) {
      throw new Error("dimIndex Element has invalid specification.");
    }

    const components = [];
    for (let i = 0; i < count; i++) {
      components.push(`${start + i}`);
    }

    return components;
  }

  if (/^[a-zA-Z]\-[a-zA-Z]$/.test(spec)) {
    const start = spec.charCodeAt(0);
    const end = spec.charCodeAt(2);

    const numElements = end - start + 1;
    if (numElements < count) {
      throw new Error("dimIndex Element has invalid specification.");
    }

    const components = [];
    for (let i = 0; i < count; i++) {
      components.push(String.fromCharCode(start + i));
    }

    return components;
  }

  return [];
}

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

export function readMemoryChunks(
  session: DebugSession,
  startAddr: number,
  specs: AddrRange[],
  storeTo: number[]
): Promise<boolean> {
  const promises = specs.map((r) => {
    return new Promise((resolve, reject) => {
      const addr = "0x" + r.base.toString(16);
      session
        .customRequest("read-memory", { address: addr, length: r.length })
        .then(
          (data) => {
            let dst = r.base - startAddr;
            const bytes: number[] = data.bytes;
            for (const byte of bytes) {
              storeTo[dst++] = byte;
            }
            resolve(true);
          },
          (e) => {
            let dst = r.base - startAddr;
            for (let ix = 0; ix < r.length; ix++) {
              storeTo[dst++] = 0xff;
            }
            reject(e);
          }
        );
    });
  });

  return new Promise(async (resolve, reject) => {
    const results = await Promise.all(promises.map((p) => p.catch((e) => e)));
    const errs: string[] = [];
    results.map((e) => {
      if (e instanceof Error) {
        errs.push(e.message);
      }
    });
    if (errs.length !== 0) {
      reject(new Error(errs.join("\n")));
    } else {
      resolve(true);
    }
  });
}

export function readMemory(
  session: DebugSession,
  startAddr: number,
  length: number,
  storeTo: number[]
): Promise<boolean> {
  const maxChunk = 4 * 1024;
  const ranges = splitIntoChunks([new AddrRange(startAddr, length)], maxChunk);
  return readMemoryChunks(session, startAddr, ranges, storeTo);
}

export function splitIntoChunks(
  ranges: AddrRange[],
  maxBytes: number,
  dbgMsg: string = "",
  dbgLen: number = 0
): AddrRange[] {
  const newRanges = new Array<AddrRange>();
  for (const r of ranges) {
    while (r.length > maxBytes) {
      newRanges.push(new AddrRange(r.base, maxBytes));
      r.base += maxBytes;
      r.length -= maxBytes;
    }
    if (r.length > 0) {
      // Watch out, can be negative
      newRanges.push(r);
    }
  }
  const logIt = false;
  if (newRanges.length && logIt) {
    consoleLog(dbgMsg, newRanges[0].base, dbgLen, newRanges);
  }
  return newRanges;
}

export function consoleLog(
  prefix: string,
  base: number,
  len: number,
  ranges: AddrRange[]
): void {
  console.log(
    prefix +
      ` base=0x${base.toString(16)}, totalLen=${len}, #ranges=${
        ranges.length
      }\n`
  );
  let bc = 0;
  for (const range of ranges) {
    bc += range.length;
    console.log(
      `**** 0x${range.base.toString(16)}, len=${
        range.length
      }, cum-bytes=${bc}\n`
    );
  }
  const diff = len - bc;
  if (bc > 0 && len > 0) {
    const percent = (diff / len) * 100;
    console.log(
      prefix + ` totalLen=${len}, savings=${diff} ${percent.toFixed(2)}%`
    );
  }
}
