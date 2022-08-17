/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 28th June 2022 4:05:21 pm
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

import { pathExists, readJson, writeJson } from "fs-extra";
import { isAbsolute, join, normalize } from "path";
import {
  debug,
  DebugSession,
  Event,
  EventEmitter,
  ProviderResult,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  Uri,
  window,
} from "vscode";
import { Logger } from "../../logger/logger";
import { AddrRange, MessageNode, NodeSetting } from "./common";
import { BasePeripheral, PeripheralBaseNode } from "./nodes/base";
import { Peripheral } from "./nodes/peripheral";
import { SVDParser } from "./svdParser";

const tag: string = "ESP-IDF Debug Adapter";

export class PeripheralTreeForSession extends PeripheralBaseNode {
  public myTreeItem: TreeItem;
  private peripherials: Peripheral[] = [];
  private loaded: boolean = false;
  private svdFileName: string;
  private gapThreshold: number = 16;
  private errMessage: string = "No SVD file loaded";
  private wsFolderPath: string;

  constructor(
    public session: DebugSession,
    public state: TreeItemCollapsibleState,
    private fireCb: () => void
  ) {
    super();
    try {
      // Remember the path as it may not be available when session ends
      this.wsFolderPath = this.session.workspaceFolder.uri.fsPath;
    } catch {}
    this.myTreeItem = new TreeItem(this.session.name, this.state);
  }

  public saveState(fspath: string): NodeSetting[] {
    const state: NodeSetting[] = [];
    this.peripherials.forEach((p) => {
      state.push(...p.saveState());
    });
    return state;
  }

  private loadSVD(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        this.errMessage = `Loading ${this.svdFileName}`;
        SVDParser.parse(this.session, this.svdFileName, this.gapThreshold)
          .then((peripherals) => {
            this.peripherials = peripherals;
            this.loaded = true;
            this.errMessage = "";
            resolve(true);
          })
          .catch((e) => {
            this.peripherials = [];
            this.loaded = false;
            reject(e);
          });
      } catch (e) {
        reject(e);
      }
    });
  }

  public performUpdate(): Thenable<any> {
    throw new Error("Method not implemented.");
  }
  public updateData(): Thenable<boolean> {
    if (this.loaded) {
      const promises = this.peripherials.map((p) => p.updateData());
      Promise.all(promises).then(
        (_) => {
          this.fireCb();
        },
        (_) => {
          this.fireCb();
        }
      );
    }
    return Promise.resolve(true);
  }
  public getPeripheral(): PeripheralBaseNode {
    throw new Error("Method not implemented.");
  }
  public collectRanges(ary: AddrRange[]): void {
    throw new Error("Method not implemented.");
  }
  public findByPath(path: string[]): PeripheralBaseNode {
    throw new Error("Method not implemented."); // Shouldn't be called
  }

  private findNodeByPath(path: string): PeripheralBaseNode {
    const pathParts = path.split(".");
    const peripheral = this.peripherials.find((p) => p.name === pathParts[0]);
    if (!peripheral) {
      return null;
    }

    return peripheral.findByPath(pathParts.slice(1));
  }

  public refresh(): void {
    this.fireCb();
  }

  public getTreeItem(element?: BasePeripheral): TreeItem | Promise<TreeItem> {
    return element ? element.getTreeItem() : this.myTreeItem;
  }

  public getChildren(
    element?: PeripheralBaseNode
  ): PeripheralBaseNode[] | Promise<PeripheralBaseNode[]> {
    if (this.loaded) {
      return element ? element.getChildren() : this.peripherials;
    } else if (!this.loaded) {
      return [new MessageNode(this.errMessage)];
    } else {
      return this.peripherials;
    }
  }
  public getCopyValue(): string {
    return undefined;
  }

  public sessionStarted(SVDFile: string, thresh: any): Thenable<any> {
    // Never rejects
    this.svdFileName = SVDFile;
    if (!isAbsolute(this.svdFileName) && this.wsFolderPath) {
      const fullpath = normalize(join(this.wsFolderPath, this.svdFileName));
      this.svdFileName = fullpath;
    }

    if (typeof thresh === "number" && thresh < 0) {
      this.gapThreshold = -1;
    } else {
      // Set the threshold between 0 and 32, with a default of 16 and a multiple of 8
      this.gapThreshold =
        ((typeof thresh === "number" ? Math.max(0, Math.min(thresh, 32)) : 16) +
          7) &
        ~0x7;
    }

    return new Promise<void>((resolve, reject) => {
      this.peripherials = [];
      this.fireCb();

      this.loadSVD().then(
        async () => {
          const stateFilePath = this.stateFileName();
          const stateFileExists = await pathExists(stateFilePath);
          if (stateFileExists) {
            const settings = await readJson(stateFilePath);
            settings.forEach((s: NodeSetting) => {
              const node = this.findNodeByPath(s.node);
              if (node) {
                node.expanded = s.expanded || false;
                node.pinned = s.pinned || false;
                node.format = s.format;
              }
            });
          }
          this.peripherials.sort(Peripheral.compare);
          this.fireCb();
          resolve(undefined);
        },
        (e) => {
          this.errMessage = `Unable to parse SVD file ${
            this.svdFileName
          }: ${e.toString()}`;
          Logger.errorNotify(this.errMessage, new Error(this.errMessage), tag);
          if (debug.activeDebugConsole) {
            debug.activeDebugConsole.appendLine(this.errMessage);
          }
          this.fireCb();
          resolve(undefined);
        }
      );
    });
  }

  public stateFileName(): string {
    return this.wsFolderPath
      ? join(this.wsFolderPath, ".vscode", ".espidf.peripherals.state.json")
      : undefined;
  }

  public sessionTerminated() {
    const state = this.saveState(this.stateFileName());
    try {
      if (this.stateFileName()) {
        writeJson(this.stateFileName(), state);
      }
    } catch (e) {
      window.showWarningMessage(`Unable to save periperal preferences ${e}`);
    }
  }

  public togglePinPeripheral(node: PeripheralBaseNode) {
    node.pinned = !node.pinned;
    this.peripherials.sort(Peripheral.compare);
  }
}

export class PeripheralTreeView
  implements TreeDataProvider<PeripheralBaseNode> {
  private _onDidChangeTreeData: EventEmitter<
    PeripheralBaseNode
  > = new EventEmitter<PeripheralBaseNode>();

  protected sessionPeripheralsMap = new Map<string, PeripheralTreeForSession>();
  protected oldState = new Map<string, TreeItemCollapsibleState>();

  readonly onDidChangeTreeData: Event<PeripheralBaseNode> = this
    ._onDidChangeTreeData.event;

  constructor() {}

  refresh() {
    this._onDidChangeTreeData.fire(null);
  }

  getTreeItem(element: PeripheralBaseNode): TreeItem | Promise<TreeItem> {
    return element?.getTreeItem();
  }

  getChildren(
    element?: PeripheralBaseNode
  ): ProviderResult<PeripheralBaseNode[]> {
    const values = Array.from(this.sessionPeripheralsMap.values());
    if (element) {
      return element.getChildren();
    } else if (values.length === 0) {
      return [];
    } else if (values.length === 1) {
      return values[0].getChildren();
    } else {
      return values;
    }
  }

  public debugSessionStarted(
    session: DebugSession,
    svdFilePath: string,
    thresh: any
  ): Thenable<any> {
    return new Promise<void>(async (resolve, reject) => {
      const svdFileExists = await pathExists(svdFilePath);
      if (!svdFilePath || !svdFileExists) {
        resolve(undefined);
        return;
      }
      if (this.sessionPeripheralsMap.get(session.id)) {
        this._onDidChangeTreeData.fire(undefined);
        const err = new Error(
          `Internal Error: Session ${session.name} id=${session.id} already in the tree view?`
        );
        Logger.errorNotify(err.message, err, tag);
        resolve(undefined);
        return;
      }
      let state = this.oldState.get(session.name);
      if (state === undefined) {
        state =
          this.sessionPeripheralsMap.size === 0
            ? TreeItemCollapsibleState.Expanded
            : TreeItemCollapsibleState.Collapsed;
      }
      const regs = new PeripheralTreeForSession(session, state, () => {
        this._onDidChangeTreeData.fire(undefined);
      });
      this.sessionPeripheralsMap.set(session.id, regs);
      try {
        await regs.sessionStarted(svdFilePath, thresh); // Should never reject
      } catch (e) {
        const err = new Error(
          `Internal Error: Unexpected rejection of promise ${e}`
        );
        Logger.errorNotify(err.message, err, tag);
      } finally {
        this._onDidChangeTreeData.fire(undefined);
      }
    });
  }

  public debugSessionTerminated(session: DebugSession): Thenable<any> {
    const regs = this.sessionPeripheralsMap.get(session.id);
    if (regs) {
      this.oldState.set(session.name, regs.myTreeItem.collapsibleState);
      this.sessionPeripheralsMap.delete(session.id);
      regs.sessionTerminated();
      this._onDidChangeTreeData.fire(undefined);
    }
    return Promise.resolve(true);
  }

  public debugStopped(session: DebugSession) {
    const regs = this.sessionPeripheralsMap.get(session.id);
    if (regs) {
      regs.updateData();
    }
  }

  public debugContinued() {}

  public getActiveDebugSession() {
    return debug.activeDebugSession?.type === "espidf"
      ? debug.activeDebugSession
      : null;
  }

  public togglePinPeripheral(node: PeripheralBaseNode) {
    const session = this.getActiveDebugSession();
    const regs = this.sessionPeripheralsMap.get(session?.id);
    if (regs) {
      regs.togglePinPeripheral(node);
      this._onDidChangeTreeData.fire(undefined);
    }
  }
}
