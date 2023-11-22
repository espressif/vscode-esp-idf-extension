# Heap Tracing for ESP Chips

In this Heap Tracing guide, we will follow the [**sysview_tracing_heap_log**](https://github.com/espressif/esp-idf/tree/master/examples/system/sysview_tracing_heap_log) example project which can be obtained from Github, this project need some configuration from menuconfig and also some jumpers to be set in your devkit.

## Prerequisites

- ESP-IDF `>=v4.2` and equivalent OpenOCD and Xtensa Tools
- IDF VS Code Extension version `>=0.3.0`
- ESP Wrover Kit (optional)

## Steps

- Inside VS Code at left hand side, you will see Espressif Logo, click on that
- Click on the `Start Heap Tracing` button
- It will prompt you to launch `OpenOCD` (if not already running), you need to allow it to launch OpenOCD
- Once `OpenOCD` is launched, it will connect with OpenOCD using `TCL` at `localhost:6666`
- If everything is a success until now, it will send instruction to capture Heap Trace from your chip

## Results

Once Heap Tracing is done `Stop Heap Tracing` button will change the state to `Start Heap Tracing` again and you will be notified, now here are steps for how to parse your result and view the same.

- Inside `App Trace Archives` Section, your result will be present as archive
- Click on any of the archived results.
- This will open a webview with the results, you need to click on the calculate result button
- It will parse `.svdat` file and prepare a JSON format, which will display you the graphs and tables with the info.

---

> If you find any of the data/graph/tables represent wrong data points please help us correct/improve the same by [reporting bugs here](http://github.com/espressif/vscode-esp-idf-extension/issues)
