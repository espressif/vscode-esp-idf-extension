# Configuration for Visual Studio Code Debug

The Visual Studio Code uses `.vscode/launch.json` to configure debug as specified in [Visual Studio Code Debugging](https://code.visualstudio.com/docs/editor/debugging#_launch-configurations). We recommend using our ESP-IDF Debug Adapter to

## Use the ESP-IDF Debug Adapter

This extension includes the [ESP-IDF Debug Adapter](https://github.com/espressif/esp-debug-adapter) which implement a protocol to communicate Xtensa's Toolchain and OpenOCD with Visual Studio Code allowing the user to easily debug ESP-IDF applications.

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

Configuration settings of the ESP-IDF Debug Adapter for launch.json are:

- `appOffset`: Program start address offset to start debugging.
- `debugPort`: Port for ESP-IDF Debug Adapter. Default: 43474.
- `env`: Environment variables to apply to the ESP-IDF Debug Adapter.
- `gdbinitFile`: Specify the gdbinit file to send to gdb.
- `initGdbCommands`: One or more xtensa-esp32-elf-gdb commands to execute in order to setup the underlying debugger. If gdbinitFile is defined, these commands will be ignored.
  > **NOTE:** By default, the gdbinit file is generated automatically by the ESP-IDF Debug Adapter. If `gdbinitFile` and `initGdbCommands` are defined in launch.json, as shown in [JTAG Debugging debugging with command line](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/using-debugger.html#command-line) make sure to include the following commands in given gdbinitFile or initGdbCommands for the debug session to properly work.
- `logLevel`: Debug Adapter Debug level (0-4), 5 - for a full OOCD log. Default: 2.
- `mode`: Can be either `auto`, to start the debug adapter and openOCD server within the extension or `manual`, to connect to existing debug adapter and openOCD session.
  > **NOTE:** If set to `manual`, openOCD and ESP-IDF Debug Adapter have to be manually executed outside Visual Studio Code.
- `name`: The name of the debug launch configuration. Can be anything you want.
- `type`: Type of debug configuration. It **must** be `espidf`.

If specified, a custom `gdbinitFile` (or the `initGdbCommands` string array) should include:

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
      "env": {
        "CUSTOM_ENV_VAR": "SOME_VALUE"
      }
    }
  ]
}
```

## Use Microsoft C/C++ extension to debug

If you prefer using Microsoft C/C++ Extension to debug, the user community recommend this launch.json configuration:

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
