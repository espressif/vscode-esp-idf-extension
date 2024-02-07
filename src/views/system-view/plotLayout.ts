/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 13th September 2023 9:52:20 am
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

export const layout = {
  height: 200,
  margin: {
    t: 30,
    b: 30,
    r: 20,
  },
  paper_bgcolor: undefined,
  plot_bgcolor: undefined,
  font: {
    color: undefined,
    size: 8,
  },
  hovermode: "closest",
  showlegend: false,
  dragmode: "pan",
  xaxis: {
    range: [0, 0.01],
    // rangeslider: { range: [range.xmin, range.xmax] },
    showspikes: true,
    spikemode: "across",
    spikedash: "solid",
    spikecolor: undefined,
    spikethickness: 0.5,
  },
  yaxis: {
    title: "Core 0",
    domain: [0.5, 1],
    fixedrange: true,
    showgrid: false,
    zeroline: false,
    showline: false,
  },
  yaxis2: {
    title: "Core 1",
    domain: [0, 0.49],
    fixedrange: true,
    showgrid: false,
    zeroline: false,
    showline: false,
  },
  spikedistance: 200,
  hoverdistance: 10,
  grid: {
    rows: 2,
    columns: 1,
    subplots: [["xy"], ["xy2"]],
  },
};
