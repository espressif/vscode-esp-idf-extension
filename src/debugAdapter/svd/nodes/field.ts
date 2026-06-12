/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 7th July 2022 6:43:32 pm
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

import {
  MarkdownString,
  TreeItem,
  TreeItemCollapsibleState,
  TreeItemLabel,
  window,
} from "vscode";
import {
  AddrRange,
  EnumerationMap,
  NodeSetting,
  NumberFormat,
} from "../common";
import { AccessType } from "./peripheral";
import { Register } from "./register";
import { binaryFormat, hexFormat, parseInteger } from "../utils";
import { PeripheralBaseNode } from "./base";

export interface FieldOptions {
  name: string;
  description: string;
  offset: number;
  width: number;
  enumeration?: EnumerationMap;
  accessType?: AccessType;
}

export class Field extends PeripheralBaseNode {
  public readonly name: string;
  public readonly description: string;
  public readonly offset: number;
  public readonly width: number;
  public readonly accessType: AccessType;

  private enumeration: EnumerationMap;
  private enumerationValues: string[];
  private enumerationMap: any;
  private prevValue: string = "";

  constructor(public parent: Register, options: FieldOptions) {
    super(parent);

    this.name = options.name;
    this.description = options.description;
    this.offset = options.offset;
    this.width = options.width;

    if (!options.accessType) {
      this.accessType = parent.accessType;
    } else {
      if (
        parent.accessType === AccessType.ReadOnly &&
        options.accessType !== AccessType.ReadOnly
      ) {
        this.accessType = AccessType.ReadOnly;
      } else if (
        parent.accessType === AccessType.WriteOnly &&
        options.accessType !== AccessType.WriteOnly
      ) {
        this.accessType = AccessType.WriteOnly;
      } else {
        this.accessType = options.accessType;
      }
    }

    if (options.enumeration) {
      this.enumeration = options.enumeration;
      this.enumerationMap = {};
      this.enumerationValues = [];

      // tslint:disable-next-line:forin
      for (const key in options.enumeration) {
        const val = key;
        const name = options.enumeration[key].name;

        this.enumerationValues.push(name);
        this.enumerationMap[name] = key;
      }
    }

    this.parent.addChild(this);
  }

  public getTreeItem(): TreeItem | Promise<TreeItem> {
    const isReserved = this.name.toLowerCase() === "reserved";

    const context = isReserved
      ? "field-res"
      : this.parent.accessType === AccessType.ReadOnly
      ? "field-ro"
      : "field";

    const rangestart = this.offset;
    const rangeend = this.offset + this.width - 1;
    const label = `${this.name} [${rangeend}:${rangestart}]`;
    const displayValue = this.getFormattedValue(this.getFormat());
    const labelItem: TreeItemLabel = {
      label: label + " " + displayValue,
    };
    if (displayValue !== this.prevValue) {
      labelItem.highlights = [[label.length + 1, labelItem.label.length]];
      this.prevValue = displayValue;
    }
    const item = new TreeItem(labelItem, TreeItemCollapsibleState.None);

    item.contextValue = context;
    item.tooltip = this.generateTooltipMarkdown(isReserved);

    return item;
  }

  private generateTooltipMarkdown(isReserved: boolean): MarkdownString | null {
    const mds = new MarkdownString("", true);
    mds.isTrusted = true;

    const address = `${hexFormat(
      this.parent.getAddress()
    )}${this.getFormattedRange()}`;

    if (isReserved) {
      mds.appendMarkdown(
        `| ${this.name}@${address} | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | *Reserved* |\n`
      );
      mds.appendMarkdown("|:---|:---:|---:|");
      return mds;
    }

    const formattedValue = this.getFormattedValue(this.getFormat(), true);

    const roLabel =
      this.accessType === AccessType.ReadOnly
        ? "(Read Only)"
        : "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";

    mds.appendMarkdown(
      `| ${this.name}@${address} | ${roLabel} | *${formattedValue}* |\n`
    );
    mds.appendMarkdown("|:---|:---:|---:|\n\n");

    if (this.accessType !== AccessType.WriteOnly) {
      mds.appendMarkdown(
        `**Reset Value:** ${this.formatValue(
          this.getResetValue(),
          this.getFormat()
        )}\n`
      );
    }

    mds.appendMarkdown("\n____\n\n");
    mds.appendMarkdown(this.description);

    mds.appendMarkdown("\n_____\n\n");

    // Don't try to display current value table for write only fields
    if (this.accessType === AccessType.WriteOnly) {
      return mds;
    }

    const value = this.parent.extractBits(this.offset, this.width);
    const hex = hexFormat(value, Math.ceil(this.width / 4), true);
    const decimal = value.toString();
    const binary = binaryFormat(value, this.width);

    if (this.enumeration) {
      mds.appendMarkdown(
        "| Enumeration Value &nbsp;&nbsp; | Hex &nbsp;&nbsp; | Decimal &nbsp;&nbsp; | Binary &nbsp;&nbsp; |\n"
      );
      mds.appendMarkdown("|:---|:---|:---|:---|\n");
      let ev = "Unknown";
      if (this.enumeration[value]) {
        ev = this.enumeration[value].name;
      }

      mds.appendMarkdown(
        `| ${ev} &nbsp;&nbsp; | ${hex} &nbsp;&nbsp; | ${decimal} &nbsp;&nbsp; | ${binary} &nbsp;&nbsp; |\n\n`
      );
      if (this.enumeration[value] && this.enumeration[value].description) {
        mds.appendMarkdown(this.enumeration[value].description);
      }
    } else {
      mds.appendMarkdown(
        "| Hex &nbsp;&nbsp; | Decimal &nbsp;&nbsp; | Binary &nbsp;&nbsp; |\n"
      );
      mds.appendMarkdown("|:---|:---|:---|\n");
      mds.appendMarkdown(
        `| ${hex} &nbsp;&nbsp; | ${decimal} &nbsp;&nbsp; | ${binary} &nbsp;&nbsp; |\n`
      );
    }

    return mds;
  }

  public getFormattedRange(): string {
    const rangestart = this.offset;
    const rangeend = this.offset + this.width - 1;
    return `[${rangeend}:${rangestart}]`;
  }

  private getCurrentValue(): number {
    return this.parent.extractBits(this.offset, this.width);
  }

  private getResetValue(): number {
    return this.parent.extractBitsFromReset(this.offset, this.width);
  }

  public getFormattedValue(
    format: NumberFormat,
    includeEnumeration: boolean = true
  ): string {
    return this.formatValue(this.getCurrentValue(), format, includeEnumeration);
  }

  private formatValue(
    value: number,
    format: NumberFormat,
    includeEnumeration: boolean = true
  ): string {
    if (this.accessType === AccessType.WriteOnly) {
      return "(Write Only)";
    }

    let formatted = "";

    switch (format) {
      case NumberFormat.Decimal:
        formatted = value.toString();
        break;
      case NumberFormat.Binary:
        formatted = binaryFormat(value, this.width);
        break;
      case NumberFormat.Hexadecimal:
        formatted = hexFormat(value, Math.ceil(this.width / 4), true);
        break;
      default:
        formatted =
          this.width >= 4
            ? hexFormat(value, Math.ceil(this.width / 4), true)
            : binaryFormat(value, this.width);
        break;
    }

    if (includeEnumeration && this.enumeration) {
      if (this.enumeration[value]) {
        formatted = `${this.enumeration[value].name} (${formatted})`;
      } else {
        formatted = `Unkown Enumeration Value (${formatted})`;
      }
    }

    return formatted;
  }

  public getEnumerationValue(value: number): string | null {
    if (!this.enumeration) {
      return null;
    }

    if (this.enumeration[value]) {
      return this.enumeration[value].name;
    }
  }

  public getChildren(): PeripheralBaseNode[] | Promise<PeripheralBaseNode[]> {
    return [];
  }

  public performUpdate(): Thenable<any> {
    return new Promise((resolve, reject) => {
      if (this.enumeration) {
        window.showQuickPick(this.enumerationValues).then((val) => {
          if (val === undefined) {
            return reject("Input not selected");
          }

          const numval = this.enumerationMap[val];
          this.parent
            .updateBits(this.offset, this.width, numval)
            .then(resolve, reject);
        });
      } else {
        window
          .showInputBox({
            prompt: "Enter new value: (prefix hex with 0x, binary with 0b)",
            value: this.getCopyValue(),
          })
          .then((val) => {
            const numval = parseInteger(val);
            if (numval === undefined) {
              return reject("Unable to parse input value.");
            }
            this.parent
              .updateBits(this.offset, this.width, numval)
              .then(resolve, reject);
          });
      }
    });
  }

  public getCopyValue(): string {
    const value = this.parent.extractBits(this.offset, this.width);
    switch (this.getFormat()) {
      case NumberFormat.Decimal:
        return value.toString();
      case NumberFormat.Binary:
        return binaryFormat(value, this.width);
      case NumberFormat.Hexadecimal:
        return hexFormat(value, Math.ceil(this.width / 4), true);
      default:
        return this.width >= 4
          ? hexFormat(value, Math.ceil(this.width / 4), true)
          : binaryFormat(value, this.width);
    }
  }

  public updateData(): Thenable<boolean> {
    return Promise.resolve(true);
  }

  public getFormat(): NumberFormat {
    if (this.format !== NumberFormat.Auto) {
      return this.format;
    } else {
      return this.parent.getFormat();
    }
  }

  public saveState(path: string): NodeSetting[] {
    if (this.format !== NumberFormat.Auto) {
      return [{ node: `${path}.${this.name}`, format: this.format }];
    } else {
      return [];
    }
  }

  public findByPath(path: string[]): PeripheralBaseNode {
    if (path.length === 0) {
      return this;
    } else {
      return null;
    }
  }

  public getPeripheral(): PeripheralBaseNode {
    return this.parent.getPeripheral();
  }

  public collectRanges(a: AddrRange[]): void {
    throw new Error("Method not implemented.");
  }
}
