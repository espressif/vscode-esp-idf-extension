/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 19th December 2023 4:06:14 pm
 * Copyright 2023 Espressif Systems (Shanghai) CO LTD
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

export interface IGcovLine {
  count: number;
  function_name: string;
  line_number: number;
  unexecuted_block: boolean;
  branches: IGcovBranches[];
}

export interface IGcovFunction {
  blocks: number;
  blocks_executed: number;
  demangled_name: string;
  start_column: number;
  start_line: number;
  end_column: number;
  end_line: number;
  execution_count: number;
  name: string;
}

export interface IGcovBranches {
  fallthrough: boolean;
  count: number;
  throw: boolean;
}

export interface IGcovFile {
  file: string;
  lines: IGcovLine[];
  functions: IGcovFunction[];
}

export interface IGcovOutput {
  files: IGcovFile[];
  current_working_directory: string;
  data_file: string;
}

export interface IGcovTotal {
  executed: number;
  total: number;
}

export interface IGcovFileTotal {
  branches: IGcovTotal;
  file: string;
  functions: IGcovTotal;
  lines: IGcovTotal;
}

export interface IGcovReport {
  totals: {
    lines: IGcovTotal;
    functions: IGcovTotal;
    branches: IGcovTotal;
  };
  fileTotals: IGcovFileTotal[];
}
