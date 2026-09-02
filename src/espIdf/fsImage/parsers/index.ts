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

import { join } from "path";
import { l10n } from "vscode";
import {
  getCurrentIdfConfiguration,
  getVirtualEnvPythonPath,
} from "../../../configuration/env";
import { spawn } from "../../../utils";
import { detectFsType } from "../detect";
import {
  emptyDir,
  FsKind,
  FsNode,
  fsKindLabel,
  NonFsFormat,
  sortFsNode,
} from "../types";
import { listFatfs } from "./fatfs";
import { listLittlefs } from "./littlefs";
import { listNvs } from "./nvs";
import { listSpiffs } from "./spiffs";

export interface ListFsImageOptions {
  data: Buffer;
  imagePath: string;
  kind?: FsKind;
  subtypeHint?: string;
}

export async function listFsImage(
  options: ListFsImageOptions
): Promise<{ kind: FsKind; root: FsNode; hintMismatch: boolean }> {
  const detected = detectFsType(options.data, options.subtypeHint);
  const kind = options.kind ?? detected.kind;
  const root = await listByKind(kind, options, detected.nonFsFormat);
  if (detected.hintMismatch) {
    root.warning = `Partition subtype is ${fsKindLabel(
      detected.hintKind || "unknown"
    )} but the binary looks like ${fsKindLabel(kind)}.`;
  } else if (!root.error && !root.children?.length) {
    root.warning = "Filesystem is empty.";
  }
  sortFsNode(root);
  return { kind, root, hintMismatch: detected.hintMismatch };
}

async function listByKind(
  kind: FsKind,
  options: ListFsImageOptions,
  nonFsFormat?: NonFsFormat
): Promise<FsNode> {
  switch (kind) {
    case "nvs":
      return listNvs(options.data);
    case "spiffs":
      return listSpiffs(options.data);
    case "littlefs":
      return listLittlefs(options.data);
    case "fatfs":
      return listFatWithIdf(options.imagePath);
    default: {
      const root = emptyDir("/", "/");
      root.error = unknownImageMessage(nonFsFormat);
      return root;
    }
  }
}

function unknownImageMessage(nonFsFormat?: NonFsFormat): string {
  switch (nonFsFormat) {
    case "espAppImage":
      return l10n.t(
        "This is an ESP-IDF application or bootloader image, not a filesystem partition. Open the binary generated for a data partition (for example storage.bin), or read the partition from the device with Device Partition Explorer."
      );
    case "espPartitionTable":
      return l10n.t(
        "This is a partition table binary, not a filesystem partition."
      );
    case "elf":
      return l10n.t("This is an ELF file, not a filesystem partition.");
    case "erased":
      return l10n.t(
        "This partition is erased, so no filesystem has been written to it yet."
      );
    default:
      return l10n.t(
        "Not a recognized SPIFFS, FAT, LittleFS, or NVS image. To inspect a filesystem created on the device, read the partition with Device Partition Explorer."
      );
  }
}

async function listFatWithIdf(imagePath: string): Promise<FsNode> {
  const env = getCurrentIdfConfiguration();
  const pythonPath = getVirtualEnvPythonPath() || "";
  const fatfsparsePath = join(
    env.IDF_PATH || "",
    "components",
    "fatfs",
    "fatfsparse.py"
  );
  return listFatfs(imagePath, {
    pythonPath,
    fatfsparsePath,
    spawnFn: spawn,
    env,
  });
}
