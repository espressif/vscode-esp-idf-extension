/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 23rd August 2023 5:27:30 pm
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

import { defineStore } from "pinia";
import { Ref, ref } from "vue";

declare var acquireVsCodeApi: any;
let vscode: any;
try {
  vscode = acquireVsCodeApi();
} catch (error) {
  // tslint:disable-next-line: no-console
  console.error(error);
}

export interface IState {
  espIdf: string;
  extensionVersion: string;
  showOnInit: boolean;
}

export interface BlogArticle {
  title: string;
  description: string;
  url: string;
  pubDate: string;
  image?: string;
}

export const useWelcomeStore = defineStore("welcome", () => {
  const espIdf: Ref<string> = ref("");
  const extensionVersion: Ref<string> = ref("");
  const showOnInit: Ref<boolean> = ref(true);
  const blogArticles: Ref<BlogArticle[]> = ref([]);
  const isLoadingArticles: Ref<boolean> = ref(false);

  // Function to decode HTML entities
  function decodeHtmlEntities(text: string): string {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }

  function exploreComponents() {
    vscode.postMessage({
      command: "exploreComponents",
    });
  }

  function openImportProject() {
    vscode.postMessage({
      command: "importProject",
    });
  }

  function openNewProjectPanel() {
    vscode.postMessage({
      command: "newProject",
    });
  }
  function openSetupPanel() {
    vscode.postMessage({
      command: "configureExtension",
    });
  }
  function openShowExamplesPanel() {
    vscode.postMessage({
      command: "showExamples",
    });
  }
  function requestInitValues() {
    vscode.postMessage({
      command: "requestInitialValues",
    });
  }

  function updateShowOnboardingOnInit() {
    vscode.postMessage({
      command: "updateShowOnboardingOnInit",
      showOnInit: showOnInit.value,
    });
  }

  async function fetchBlogArticles() {
    if (blogArticles.value.length > 0) return; // Already loaded
    
    isLoadingArticles.value = true;
    
    // Request the extension backend to fetch the RSS feed
    vscode.postMessage({
      command: "fetchBlogArticles"
    });
    
    // Set a timeout to show fallback articles if backend doesn't respond
    setTimeout(() => {
      if (blogArticles.value.length === 0) {
        blogArticles.value = [
          {
            title: "Debugging with ESP-IDF VS Code extension: Part 2",
            description: "This two-part guide shows how to set up VS Code with the ESP-IDF extension to debug Espressif boards using JTAG. In this second part, we will debug a simple project using gdb through Espressif's VSCode extension.",
            url: "https://developer.espressif.com/blog/2025/06/debugging-with-vscode-part-2/",
            pubDate: "June 12, 2025",
            image: "https://developer.espressif.com/blog/2025/06/debugging-with-vscode-part-2/featured.webp"
          },
          {
            title: "Lightweight MQTT Broker for ESP32: Mosquitto ported to ESP-IDF",
            description: "Mosquitto – the industry-standard MQTT broker – has been ported to ESP-IDF. Its lightweight version retains Mosquitto's core functionality and security features to run on resource-constrained IoT devices.",
            url: "https://developer.espressif.com/blog/2025/05/esp-idf-mosquitto-port/",
            pubDate: "May 28, 2025",
            image: "https://developer.espressif.com/blog/2025/05/esp-idf-mosquitto-port/featured.webp"
          },
          {
            title: "Espressif's ESP32-C5 is Now in Mass Production",
            description: "Espressif has launched the ESP32-C5, the first RISC-V SoC with dual-band Wi-Fi 6, Bluetooth 5 (LE), and IEEE 802.15.4 support. Designed for low-latency wireless applications.",
            url: "https://developer.espressif.com/blog/2025/05/news-esp32c5-mp/",
            pubDate: "May 23, 2025",
            image: ""
          },
          {
            title: "Touchpad Digit Recognition Based on ESP-DL",
            description: "This article demonstrates how to implement a touchpad-based digit recognition system using ESP-DL on ESP32 series chips. It covers the complete workflow from data collection and preprocessing to model training, quantization, and deployment.",
            url: "https://developer.espressif.com/blog/2025/06/touchpad-digit-recognition/",
            pubDate: "June 18, 2025",
            image: "https://developer.espressif.com/blog/2025/06/touchpad-digit-recognition/featured.webp"
          },
          {
            title: "NuttX for Motor Control and Sensing: MCPWM and DC Motor Control",
            description: "This article demonstrates how to implement motor control and speed sensing on an ESP32-C6 using NuttX RTOS. It covers setting up MCPWM for motor control, ADC for potentiometer reading, and quadrature encoder for speed measurement.",
            url: "https://developer.espressif.com/blog/2025/05/nuttx-motor-control-and-sensing/",
            pubDate: "May 16, 2025",
            image: "https://developer.espressif.com/blog/2025/05/nuttx-motor-control-and-sensing/featured.webp"
          },
          {
            title: "Introducing ESP32-P4-EYE: A Powerful Vision Development Board for Edge AI",
            description: "Discover the ESP32-P4 EYE DevKit — a compact, camera-focused development board designed for real-time image processing and edge computing. Learn how this powerful, low-cost solution can accelerate your next smart camera or IoT project.",
            url: "https://developer.espressif.com/blog/2025/05/introducing-p4-eye/",
            pubDate: "May 1, 2025",
            image: "https://developer.espressif.com/blog/2025/05/introducing-p4-eye/featured-p4_eye_front.webp"
          }
        ];
        isLoadingArticles.value = false;
      }
    }, 3000); // 3 second timeout
  }

  function openArticle(url: string) {
    vscode.postMessage({
      command: "openExternal",
      url: url,
    });
  }

  return {
    decodeHtmlEntities,
    espIdf,
    extensionVersion,
    showOnInit,
    blogArticles,
    isLoadingArticles,
    exploreComponents,
    openImportProject,
    openNewProjectPanel,
    openSetupPanel,
    openShowExamplesPanel,
    requestInitValues,
    updateShowOnboardingOnInit,
    fetchBlogArticles,
    openArticle,
  };
});
