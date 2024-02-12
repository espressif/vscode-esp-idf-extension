/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 10th January 2024 7:38:05 pm
 * Copyright 2024 Espressif Systems (Shanghai) CO LTD
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

import { IdfBoard } from "./boardConfiguration";

export const defaultBoards = [
  {
    name: "ESP32 module",
    description: "ESP32 used with ESP-PROG board",
    target: "esp32",
    configFiles: ["interface/ftdi/esp32_devkitj_v1.cfg", "target/esp32.cfg"],
  } as IdfBoard,
  {
    name: "ESP32-C3 chip (via ESP-PROG)",
    description: "ESP32-C3 used with ESP-PROG board",
    target: "esp32c3",
    configFiles: ["board/esp32c3-ftdi.cfg"],
  } as IdfBoard,
  {
    name: "ESP32-C3 chip (via ESP-PROG-2)",
    description: "ESP32-C3 debugging via ESP-PROG-2 board",
    target: "esp32c3",
    configFiles: ["board/esp32c3-bridge.cfg"],
  } as IdfBoard,
  {
    name: "ESP32-C3 chip (via builtin USB-JTAG)",
    description: "ESP32-C3 debugging via builtin USB-JTAG",
    target: "esp32c3",
    configFiles: ["board/esp32c3-builtin.cfg"],
  } as IdfBoard,
  {
    name: "ESP32-C6 chip (via ESP-PROG)",
    description: "ESP32-C6 used with ESP-PROG board",
    target: "esp32c6",
    configFiles: ["board/esp32c6-ftdi.cfg"],
  } as IdfBoard,
  {
    name: "ESP32-C6 chip (via ESP-PROG-2)",
    description: "ESP32-C6 debugging via ESP-PROG-2 board",
    target: "esp32c6",
    configFiles: ["board/esp32c6-bridge.cfg"],
  } as IdfBoard,
  {
    name: "ESP32-C6 chip (via builtin USB-JTAG)",
    description: "ESP32-C6 debugging via builtin USB-JTAG",
    target: "esp32c6",
    configFiles: ["board/esp32c6-builtin.cfg"],
  } as IdfBoard,
  {
    name: "ESP32-H2 chip (via builtin USB-JTAG)",
    description: "ESP32-H2 debugging via builtin USB-JTAG",
    target: "esp32h2",
    configFiles: ["board/esp32h2-builtin.cfg"],
  } as IdfBoard,
  {
    name: "ESP32-H2 chip (via ESP-PROG)",
    description: "ESP32-H2 debugging via ESP-PROG board",
    target: "esp32h2",
    configFiles: [ "board/esp32h2-ftdi.cfg"],
  } as IdfBoard,
  {
    name: "ESP32-H2 chip (via ESP-PROG-2)",
    description: "ESP32-H2 debugging via ESP-PROG-2 board",
    target: "esp32h2",
    configFiles: ["board/esp32h2-bridge.cfg"],
  } as IdfBoard,
  {
    name: "ESP32-S2 module",
    description: "ESP32-S2 used with ESP-PROG board",
    target: "esp32s2",
    configFiles: ["interface/ftdi/esp32_devkitj_v1.cfg", "target/esp32s2.cfg"],
  } as IdfBoard,
  {
    name: "ESP32-S2 chip (via ESP-PROG-2)",
    description: "ESP32-S2 debugging via ESP-PROG-2 board",
    target: "esp32s2",
    configFiles: ["board/esp32s2-bridge.cfg"],
  } as IdfBoard,
  {
    name: "ESP32-S3 chip (via ESP-PROG)",
    description: "ESP32-S3 used with ESP-PROG board",
    target: "esp32s3",
    configFiles: ["interface/ftdi/esp32_devkitj_v1.cfg", "target/esp32s3.cfg"],
  } as IdfBoard,
  {
    name: "ESP32-S3 chip (via builtin USB-JTAG)",
    description: "ESP32-S3 debugging via builtin USB-JTAG",
    target: "esp32s3",
    configFiles: ["board/esp32s3-builtin.cfg"],
  } as IdfBoard,
]; 