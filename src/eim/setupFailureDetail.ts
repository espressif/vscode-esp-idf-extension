/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 26th October 2026
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

import { l10n, MarkdownString } from "vscode";

export function missingActivationScriptDetail(
  idfPath: string,
  scriptPath: string
): string {
  return l10n.t(
    "Activation script for {0} does not exist: {1}.",
    idfPath,
    scriptPath
  );
}

export function installPathMissingDetail(idfPath: string): string {
  return l10n.t("The ESP-IDF install path does not exist: {0}.", idfPath);
}

export function installStatusDetail(idfPath: string, status: string): string {
  return l10n.t("The ESP-IDF install at {0} is {1}.", idfPath, status);
}

export function currentSetupNotFinishedDetail(idfPath: string): string {
  return l10n.t(
    "idf.currentSetup {0} is not a finished ESP-IDF setup.",
    idfPath
  );
}

export function missingIdfEnvDetail(): string {
  return l10n.t(
    "The ESP-IDF environment is missing IDF_PATH, PATH, or IDF_PYTHON_ENV_PATH."
  );
}

export function couldNotSaveCurrentSetupDetail(): string {
  return l10n.t("Could not save idf.currentSetup.");
}

/** Status bar markdown hovers hard-break near this width when spaces cannot wrap. */
const tooltipLineLimit = 60;

function tooltipPieces(line: string): string[] {
  const pieces: string[] = [];
  let current = "";
  for (const char of line) {
    current += char;
    if (char === "/" || char === "\\" || char === " ") {
      pieces.push(current);
      current = "";
    }
  }
  if (current) {
    pieces.push(current);
  }
  return pieces;
}

function wrapTooltipLine(line: string, limit: number): string {
  const lines: string[] = [];
  let current = "";
  for (const piece of tooltipPieces(line)) {
    if (current && current.length + piece.length > limit) {
      lines.push(current.trimEnd());
      current = piece.trimStart();
    } else {
      current += piece;
    }
  }
  if (current.trim()) {
    lines.push(current.trimEnd());
  }
  return lines.join("\n");
}

export function wrapTooltipText(
  text: string,
  limit = tooltipLineLimit
): string {
  return text
    .split("\n")
    .map((line) => wrapTooltipLine(line, limit))
    .join("\n");
}

function escapeTooltipMarkdown(text: string): string {
  return text.replace(/[\\`*_{}[\]()#+\-.!]/g, "\\$&");
}

export function statusBarFailureTooltip(
  action: string,
  detail?: string
): MarkdownString {
  const tooltip = new MarkdownString();
  const wrapped = detail
    ? `${wrapTooltipText(detail)}\n${wrapTooltipText(action)}`
    : wrapTooltipText(action);
  tooltip.appendMarkdown(escapeTooltipMarkdown(wrapped).replace(/\n/g, "  \n"));
  return tooltip;
}
