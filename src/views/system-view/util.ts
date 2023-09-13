/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 13th September 2023 9:49:23 am
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

import * as Plotly from "plotly.js-dist";
import interact from "interactjs";

export function eventNameMap(streams: Object): Map<number, string> {
  const m = new Map<number, string>();
  Object.keys(streams).forEach((stream) => {
    Object.keys(streams[stream]).forEach((event) => {
      m.set(streams[stream][event], event);
    });
  });
  return m;
}

export function resize(e: string) {
  const el = document.getElementById(e);
  interact(e).resizable({
    edges: { left: false, right: false, bottom: true, top: true },
    listeners: {
      move(event) {
        var target = event.target;
        var x = 0;
        var y = 0;

        // update the element's style
        target.style.width = event.rect.width + "px";
        target.style.height = event.rect.height + "px";

        Plotly.relayout(el, { height: event.rect.height });

        // translate when resizing from top or left edges
        x += event.deltaRect.left;
        y += event.deltaRect.top;

        target.style.webkitTransform = target.style.transform =
          "translate(" + x + "px," + y + "px)";
      },
    },
  });
}
