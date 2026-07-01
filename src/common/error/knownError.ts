/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 26th June 2026 6:39:51 pm
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

import { ErrorCode } from "./types";

/**
 * Base class for all known/expected errors in the extension.
 * Throwing a KnownError tells the error handler to look up
 * its ErrorCode in the registry for user messaging and actions.
 */
export class KnownError extends Error {
  public readonly isKnownError = true as const;

  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'KnownError';
    // Fix prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Type guard: is this a KnownError?
 */
export function isKnownError(error: unknown): error is KnownError {
  return (
    error instanceof KnownError ||
    (error instanceof Error && (error as any).isKnownError === true)
  );
}

export function idfToolNotFound(toolName: string): KnownError {
  return new KnownError(
    ErrorCode.IdfToolNotFound,
    `${toolName} executable not found`,
    { toolName }
  );
}

export function fileNotFound(filePath: string): KnownError {
  return new KnownError(
    ErrorCode.FILE_NOT_FOUND,
    `File not found: ${filePath}`,
    { filePath }
  );
}

export function filePermissionDenied(filePath: string): KnownError {
  return new KnownError(
    ErrorCode.FILE_PERMISSION_DENIED,
    `Permission denied when accessing: ${filePath}`,
    { filePath }
  );
}

export function invalidConfiguration(setting: string): KnownError {
  return new KnownError(
    ErrorCode.INVALID_CONFIGURATION,
    `Invalid extension configuration: ${setting}`,
    { setting }
  );
}

export function missingDependency(dependency: string): KnownError {
  return new KnownError(
    ErrorCode.MISSING_DEPENDENCY,
    `Missing dependency: ${dependency}`,
    { dependency }
  );
}

export function parseError(filePath: string): KnownError {
  return new KnownError(
    ErrorCode.PARSE_ERROR,
    `Failed to parse: ${filePath}`,
    { filePath }
  );
}

export function alreadyBuilding(): KnownError {
  return new KnownError(
    ErrorCode.AlreadyBuilding,
    "Attempted to start a build while another build is in progress"
  );
}

export function buildTerminated(): KnownError {
  return new KnownError(ErrorCode.BuildTerminated, "Build was terminated");
}

export function flashInProgress(): KnownError {
  return new KnownError(
    ErrorCode.FlashInProgress,
    "Wait for ESP-IDF flash to finish before building"
  );
}