# System View Tracing Viewer for ESP-IDF

In this System View tracing guide, we will follow the [**sysview_tracing_heap_log**](https://github.com/espressif/esp-idf/tree/master/examples/system/sysview_tracing_heap_log) example project which can be obtained from Github, this project need some configuration from menuconfig and also some jumpers to be set in your devkit.

## Prerequisites

- ESP-IDF `>=v4.2` and equivalent OpenOCD and Xtensa Tools
- IDF VSCode extension version `>=0.4.0`
- We assume you have already generated the `(.svdat)` file using [head tracing](./HEAP_Tracing)
- ESP Wrover Kit (optional)

## Steps

- Once you've finished collecting heap tracing (.svdat) file stats
- From the left hand corner, click the Espressif Logo
- Then your recent traces will be present inside `App Tracing Archives` list
- Click on the one you want to open.
- It will ask you which view you want (`Heap Tracing UI` or `System View Tracing UI`)
- Select `System View Tracing`
- It will open your system view tracing (_this could take some time to load if your trace file is heavy_)

---

> If you find any of the data/graph/tables represent wrong data points please help us correct/improve the same by [reporting bugs here](http://github.com/espressif/vscode-esp-idf-extension/issues)
