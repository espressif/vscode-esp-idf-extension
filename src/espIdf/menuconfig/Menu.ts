// Copyright 2019 Espressif Systems (Shanghai) CO LTD
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

export enum menuType {
  string = "string",
  bool = "bool",
  int = "int",
  choice = "choice",
  hex = "hex",
  menu = "menu",
}

export interface Menu {
  children: Menu[];
  help: string;
  id: string;
  name: string;
  range: number[];
  title: string;
  type: menuType;
  isVisible: boolean;
  isCollapsed: boolean;
  value: any;
  dependsOn: string;
  isMenuconfig: boolean;
  default: any;
}
