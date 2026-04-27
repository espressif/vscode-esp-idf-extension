/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

export interface ConfserverJsonStreamResult {
  latestJson?: string;
  remainingBuffer: string;
}

function extractLatestJsonFromBuffer(buffer: string): ConfserverJsonStreamResult {
  let depth = 0;
  let startIndex = -1;
  let latestJson: string | undefined;
  let latestEndIndex = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < buffer.length; i++) {
    const char = buffer[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) {
      continue;
    }
    if (char === "{") {
      if (depth === 0) {
        startIndex = i;
      }
      depth++;
    } else if (char === "}" && depth > 0) {
      depth--;
      if (depth === 0 && startIndex >= 0) {
        latestJson = buffer.slice(startIndex, i + 1);
        latestEndIndex = i + 1;
        startIndex = -1;
      }
    }
  }

  if (latestJson) {
    return {
      latestJson,
      remainingBuffer: buffer.slice(latestEndIndex),
    };
  }

  if (depth > 0 && startIndex >= 0) {
    return {
      remainingBuffer: buffer.slice(startIndex),
    };
  }

  return {
    remainingBuffer: "",
  };
}

export function parseConfserverJsonChunk(
  previousBuffer: string,
  chunk: string
): ConfserverJsonStreamResult {
  return extractLatestJsonFromBuffer(`${previousBuffer}${chunk}`);
}
