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
    name: "ESP-WROVER-KIT 3.3V",
    description: "ESP-WROVER-KIT with 3.3V ESP32-WROVER-B module",
    target: "esp32",
    configFiles: ["board/esp32-wrover-kit-3.3v.cfg"],
  } as IdfBoard,
  {
    name: "ESP-WROVER-KIT 1.8V",
    description: "ESP-WROVER-KIT with 1.8V ESP32-WROVER-B module",
    target: "esp32",
    configFiles: ["board/esp32-wrover-kit-1.8v.cfg"],
  } as IdfBoard,
  {
    name: "ESP32-ETHERNET-KIT",
    description: "ESP32-ETHERNET-KIT with ESP32-WROVER-E module",
    target: "esp32",
    configFiles: ["board/esp32-ethernet-kit-3.3v.cfg"],
  } as IdfBoard,
  {
    name: "ESP32 chip (via ESP-PROG)",
    description: "ESP32 debugging via ESP-PROG board",
    target: "esp32",
    configFiles: [
      "interface/ftdi/esp_ftdi.cfg",
      "target/esp32.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32 chip (via ESP-PROG-2)",
    description: "ESP32 debugging via ESP-PROG-2 board",
    target: "esp32",
    configFiles: [
      "board/esp32-bridge.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-SOLO-1 module (via ESP-PROG)",
    description: "ESP32-SOLO-1 debugging via ESP-PROG board",
    target: "esp32",
    configFiles: [
      "interface/ftdi/esp_ftdi.cfg",
      "target/esp32-solo-1.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-S2-KALUGA-1",
    description: "ESP32-S2-KALUGA-1 kit",
    target: "esp32s2",
    configFiles: ["board/esp32s2-kaluga-1.cfg"],
  } as IdfBoard,
  {
    name: "ESP32-S2 chip (via ESP-PROG)",
    description: "ESP32-S2 debugging via ESP-PROG board",
    target: "esp32s2",
    configFiles: [
      "interface/ftdi/esp_ftdi.cfg",
      "target/esp32s2.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-S2 chip (via ESP-PROG-2)",
    description: "ESP32-S2 debugging via ESP-PROG-2 board",
    target: "esp32s2",
    configFiles: [
      "board/esp32s2-bridge.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-S3 chip (via builtin USB-JTAG)",
    description: "ESP32-S3 debugging via builtin USB-JTAG",
    target: "esp32s3",
    configFiles: [
      "board/esp32s3-builtin.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-S3 chip (via ESP-PROG)",
    description: "ESP32-S3 debugging via ESP-PROG board",
    target: "esp32s3",
    configFiles: [
      "interface/ftdi/esp_ftdi.cfg",
      "target/esp32s3.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-S3 chip (via ESP-PROG-2)",
    description: "ESP32-S3 debugging via ESP-PROG-2 board",
    target: "esp32s3",
    configFiles: [
      "board/esp32s3-bridge.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-C2 chip (via ESP-PROG)",
    description: "ESP32-C2 debugging via ESP-PROG board",
    target: "esp32c2",
    configFiles: [
      "board/esp32c2-ftdi.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-C2 chip (via ESP-PROG-2)",
    description: "ESP32-C2 debugging via ESP-PROG-2 board",
    target: "esp32c2",
    configFiles: [
      "board/esp32c2-bridge.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-C3 chip (via builtin USB-JTAG)",
    description: "ESP32-C3 debugging via builtin USB-JTAG",
    target: "esp32c3",
    configFiles: [
      "board/esp32c3-builtin.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-C3 chip (via ESP-PROG)",
    description: "ESP32-C3 debugging via ESP-PROG board",
    target: "esp32c3",
    configFiles: [
      "board/esp32c3-ftdi.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-C3 chip (via ESP-PROG-2)",
    description: "ESP32-C3 debugging via ESP-PROG-2 board",
    target: "esp32c3",
    configFiles: [
      "board/esp32c3-bridge.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-C5 chip (via builtin USB-JTAG)",
    description: "ESP32-C5 debugging via builtin USB-JTAG",
    target: "esp32c5",
    configFiles: [
      "board/esp32c5-builtin.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-C5 chip (via ESP-PROG)",
    description: "ESP32-C5 debugging via ESP-PROG board",
    target: "esp32c5",
    configFiles: [
      "board/esp32c5-ftdi.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-C5 chip (via ESP-PROG-2)",
    description: "ESP32-C5 debugging via ESP-PROG-2 board",
    target: "esp32c5",
    configFiles: [
      "board/esp32c5-bridge.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-C6 chip (via builtin USB-JTAG)",
    description: "ESP32-C6 debugging via builtin USB-JTAG",
    target: "esp32c6",
    configFiles: [
      "board/esp32c6-builtin.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-C6 chip (via ESP-PROG)",
    description: "ESP32-C6 debugging via ESP-PROG board",
    target: "esp32c6",
    configFiles: [
      "board/esp32c6-ftdi.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-C6 chip (via ESP-PROG-2)",
    description: "ESP32-C6 debugging via ESP-PROG-2 board",
    target: "esp32c6",
    configFiles: [
      "board/esp32c6-bridge.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-C6 chip with LP core (via builtin USB-JTAG)",
    description: "ESP32-C6 with LP core debugging via builtin USB-JTAG",
    target: "esp32c6",
    configFiles: [
      "board/esp32c6-lpcore-builtin.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-C6 chip with LP core (via ESP-PROG)",
    description: "ESP32-C6 with LP core debugging via ESP-PROG board",
    target: "esp32c6",
    configFiles: [
      "board/esp32c6-lpcore-ftdi.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-C6 chip with LP core (via ESP-PROG-2)",
    description: "ESP32-C6 with LP core debugging via ESP-PROG-2 board",
    target: "esp32c6",
    configFiles: [
      "board/esp32c6-lpcore-bridge.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-C61 chip (via builtin USB-JTAG)",
    description: "ESP32-C61 debugging via builtin USB-JTAG",
    target: "esp32c61",
    configFiles: [
      "board/esp32c61-builtin.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-C61 chip (via ESP-PROG)",
    description: "ESP32-C61 debugging via ESP-PROG board",
    target: "esp32c61",
    configFiles: [
      "board/esp32c61-ftdi.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-C61 chip (via ESP-PROG-2)",
    description: "ESP32-C61 debugging via ESP-PROG-2 board",
    target: "esp32c61",
    configFiles: [
      "board/esp32c61-bridge.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-H2 chip (via builtin USB-JTAG)",
    description: "ESP32-H2 debugging via builtin USB-JTAG",
    target: "esp32h2",
    configFiles: [
      "board/esp32h2-builtin.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-H2 chip (via ESP-PROG)",
    description: "ESP32-H2 debugging via ESP-PROG board",
    target: "esp32h2",
    configFiles: [
      "board/esp32h2-ftdi.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-H2 chip (via ESP-PROG-2)",
    description: "ESP32-H2 debugging via ESP-PROG-2 board",
    target: "esp32h2",
    configFiles: [
      "board/esp32h2-bridge.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-H4 chip (via builtin USB-JTAG)",
    description: "ESP32-H4 debugging via builtin USB-JTAG",
    target: "esp32h4",
    configFiles: [
      "board/esp32h4-builtin.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-H4 chip (via ESP-PROG)",
    description: "ESP32-H4 debugging via ESP-PROG board",
    target: "esp32h4",
    configFiles: [
      "board/esp32h4-ftdi.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-H4 chip (via ESP-PROG-2)",
    description: "ESP32-H4 debugging via ESP-PROG-2 board",
    target: "esp32h4",
    configFiles: [
      "board/esp32h4-bridge.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-P4 chip (via builtin USB-JTAG)",
    description: "ESP32-P4 debugging via builtin USB-JTAG",
    target: "esp32p4",
    configFiles: [
      "board/esp32p4-builtin.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-P4 chip (via ESP-PROG)",
    description: "ESP32-P4 debugging via ESP-PROG board",
    target: "esp32p4",
    configFiles: [
      "board/esp32p4-ftdi.cfg"
    ],
  } as IdfBoard,
  {
    name: "ESP32-P4 chip (via ESP-PROG-2)",
    description: "ESP32-P4 debugging via ESP-PROG-2 board",
    target: "esp32p4",
    configFiles: [
      "board/esp32p4-bridge.cfg"
    ],
  } as IdfBoard,
]; 