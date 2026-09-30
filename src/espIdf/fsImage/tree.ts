/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 1st September 2026 3:31:00 pm
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
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

import { basename } from "path";
import {
  Event,
  EventEmitter,
  l10n,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  TreeView,
  window,
} from "vscode";
import { readFile } from "fs-extra";
import { Logger } from "../../common/logger";
import { listFsImage } from "./parsers";
import { FsKind, FsNode, fsKindLabel } from "./types";

export class FsImageItem extends TreeItem {
  constructor(public readonly node: FsNode, public readonly kind?: FsKind) {
    super(
      node.name,
      node.isDir || (node.children && node.children.length > 0)
        ? TreeItemCollapsibleState.Expanded
        : TreeItemCollapsibleState.None
    );
    this.iconPath = node.isDir ? ThemeIcon.Folder : ThemeIcon.File;
    this.description = describeNode(node);
    this.tooltip = [node.path, node.warning, node.error]
      .filter(Boolean)
      .join("\n");
    this.contextValue = node.isDir ? "fsImageDir" : "fsImageFile";
  }
}

export class FsImageTreeDataProvider implements TreeDataProvider<FsImageItem> {
  public readonly onDidChangeTreeData: Event<FsImageItem | undefined | null>;
  private readonly emitter = new EventEmitter<FsImageItem | undefined | null>();
  private root?: FsImageItem;
  private imagePath?: string;
  private kind?: FsKind;
  private subtypeHint?: string;
  private treeView?: TreeView<FsImageItem>;

  constructor() {
    this.onDidChangeTreeData = this.emitter.event;
  }

  public attachTreeView(treeView: TreeView<FsImageItem>): void {
    this.treeView = treeView;
  }

  public get currentImagePath(): string | undefined {
    return this.imagePath;
  }

  public get currentKind(): FsKind | undefined {
    return this.kind;
  }

  public getTreeItem(element: FsImageItem): TreeItem {
    return element;
  }

  public getChildren(element?: FsImageItem): FsImageItem[] {
    if (!element) {
      return this.root ? [this.root] : [];
    }
    return (element.node.children || []).map((child) => new FsImageItem(child));
  }

  public async load(imagePath: string, subtypeHint?: string): Promise<void> {
    this.imagePath = imagePath;
    this.subtypeHint = subtypeHint;
    await this.refresh();
  }

  public async refresh(): Promise<void> {
    if (!this.imagePath) {
      this.root = undefined;
      this.kind = undefined;
      this.updateViewTitle();
      this.emitter.fire(undefined);
      return;
    }
    try {
      const data = await readFile(this.imagePath);
      const listed = await listFsImage({
        data,
        imagePath: this.imagePath,
        subtypeHint: this.subtypeHint,
      });
      const rootNode: FsNode = {
        name: `${fsKindLabel(listed.kind)} — ${basename(this.imagePath)}`,
        path: this.imagePath,
        isDir: true,
        children: listed.root.children,
        warning: listed.root.warning,
        error: listed.root.error,
      };
      this.root = new FsImageItem(rootNode, listed.kind);
      this.kind = listed.kind;
      this.updateViewTitle(listed.kind, rootNode.error || rootNode.warning);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Logger.error(message, error, "fsImage load");
      this.kind = undefined;
      this.root = new FsImageItem({
        name: basename(this.imagePath),
        path: this.imagePath,
        isDir: true,
        error: message,
      });
      this.updateViewTitle(undefined, message);
    }
    this.emitter.fire(undefined);
  }

  private updateViewTitle(kind?: FsKind, message?: string): void {
    if (!this.treeView) {
      return;
    }
    if (!this.imagePath) {
      this.treeView.description = undefined;
      this.treeView.message = l10n.t(
        "Open a partition binary to inspect its filesystem."
      );
      return;
    }
    this.treeView.message = message;
    const kindText = kind ? fsKindLabel(kind) : "";
    this.treeView.description = kindText
      ? `${kindText} — ${basename(this.imagePath)}`
      : basename(this.imagePath);
  }
}

function describeNode(node: FsNode): string | undefined {
  if (node.error) {
    return node.error;
  }
  if (node.warning) {
    return node.warning;
  }
  if (node.nvsType) {
    return node.nvsValuePreview
      ? `${node.nvsType} = ${node.nvsValuePreview}`
      : node.nvsType;
  }
  if (typeof node.size === "number") {
    return `${node.size} B`;
  }
  return undefined;
}
