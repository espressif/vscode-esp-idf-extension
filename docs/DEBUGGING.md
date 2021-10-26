# Configuration for Visual Studio Code Debug

> **NOTE:** Make sure to configure your drivers as mentioned in ESP-IDF [Configure JTAG interface](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/configure-ft2232h-jtag.html) documentation.

> **NOTE:** Please take a look first at [ESP-IDF JTAG Debugging](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/index.html#how-it-works).
> OpenOCD typically uses port 4444 for Telnet communication, port 6666 for TCL communication and port 3333 for gdb.

The Visual Studio Code uses `.vscode/launch.json` to configure debug as specified in [Visual Studio Code Debugging](https://code.visualstudio.com/docs/editor/debugging#_launch-configurations).

We recommend using our ESP-IDF Debug Adapter to debug your ESP-IDF projects, but you can also just configure launch.json for the [Microsoft C/C++ Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools).

## Use the ESP-IDF Debug Adapter

This extension includes the [ESP-IDF Debug Adapter](https://github.com/espressif/esp-debug-adapter) which implement the debug adapter protocol (DAP) to communicate Xtensa's Toolchain and OpenOCD with Visual Studio Code allowing the user to easily debug ESP-IDF applications. Visual Studio Code will:

1. Launch the debug adapter server in port `debugPort` given in launch.json if `mode` is `auto` or
2. Connect to existing debug adapter server in port `debugPort` if `mode` is `manual`.

Default values launch.json for ESP-IDF Debug Adapter:

```JSON
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "espidf",
      "name": "Launch-name",
      "request": "launch"
    }
  ]
}
```

The ESP-IDF Debug Adapter settings for launch.json are:

- `appOffset`: Program start address offset from where to start debugging.
- `debugPort`: Port for ESP-IDF Debug Adapter. Default: 43474.
- `env`: Environment variables to apply to the ESP-IDF Debug Adapter. It will replace global environment variables and environment variables used by the extension.
- `gdbinitFile`: Specify the gdbinit file to send to gdb. Example value: `"${workspaceFolder}/gdbinit"`.
  > **NOTE:** By default, the `gdbinit` file is generated automatically by the ESP-IDF Debug Adapter.
- `initGdbCommands`: One or more xtensa-esp32-elf-gdb commands to execute in order to setup the underlying debugger.
  > **NOTE**: If `gdbinitFile` is defined, these commands will be ignored.
- `logLevel`: Debug Adapter logging level (0-4), 5 - for a full OOCD log. Default: 2.
- `mode`: Can be either `auto`, to start the debug adapter and openOCD server within the extension or `manual`, to connect to existing debug adapter and openOCD session. Default: auto.
  > **NOTE:** If set to `manual`, openOCD and ESP-IDF Debug Adapter have to be manually executed by the user and the extension will just try to connect to existing servers at configured ports.
- `name`: The name of the debug launch configuration. This will be shown in the Run view (Menu View -> Run).
- `type`: Type of debug configuration. It **must** be `espidf`.
- `skipVerifyAppBinBeforeDebug`: (Default `true`) If disabled the extension will verify that the current workspace folder `build/${project-name}.bin` is the same of the target device application. `${project-name}` is the name of the project (i.e blink) and is obtained from the `build/project_description.json`. Set this to `false` to add application binary validation before debug session.

If `gdbinitFile` or `initGdbCommands` are defined in launch.json, make sure to include the following commands for debug session to properly work as shown in [JTAG Debugging debugging with command line](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/using-debugger.html#command-line).

```
target remote :3333
set remote hardware-watchpoint-limit 2
mon reset halt
flushregs
thb app_main
c
```

Example launch.json for ESP-IDF Debug Adapter:

```JSON
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "espidf",
      "name": "Launch",
      "request": "launch",
      "debugPort": 9998,
      "logLevel": 2,
      "mode": "manual",
      "skipVerifyAppBinBeforeDebug": true,
      "initGdbCommands": [
        "target remote :3333",
        "symbol-file /path/to/program.elf",
        "mon reset halt",
        "flushregs",
        "thb app_main"
      ],
      "env": {
        "CUSTOM_ENV_VAR": "SOME_VALUE"
      }
    }
  ]
}
```

### Output and logs from ESP-IDF Debug Adapter and OpenOCD

Beside the Visual Studio Code Debug console output. You can find the debug adapter output in `<project_dir>/debug.log` and Menu View -> Output -> `ESP-IDF Debug Adapter` as well as OpenOCD output in Menu View -> Output -> `OpenOCD`.

## Use Microsoft C/C++ extension to debug

The user can also use [Microsoft C/C++ Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) to debug, the community recommend this launch.json configuration:

```JSON
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "GDB",
      "type": "cppdbg",
      "request": "launch",
      "MIMode": "gdb",
      "miDebuggerPath": "${command:espIdf.getXtensaGdb}",
      "program": "${workspaceFolder}/build/${command:espIdf.getProjectName}.elf",
      "windows": {
        "program": "${workspaceFolder}\\build\\${command:espIdf.getProjectName}.elf"
      },
      "cwd": "${workspaceFolder}",
      "environment": [{ "name": "PATH", "value": "${config:idf.customExtraPaths}" }],
      "setupCommands": [
        { "text": "target remote :3333" },
        { "text": "set remote hardware-watchpoint-limit 2"},
        { "text": "mon reset halt" },
        { "text": "thb app_main" },
        { "text": "flushregs" }
      ],
      "externalConsole": false,
      "logging": {
        "engineLogging": true
      }
    }
  ]
}
```
