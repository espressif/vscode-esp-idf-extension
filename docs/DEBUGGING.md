# Use the ESP-IDF Debug Adapter

This extension includes the [ESP-IDF Debug Adapter](https://github.com/espressif/esp-debug-adapter) which implement a protocol to communicate ESP-IDF's debugger with Visual Studio Code allowing the user to debug ESP-IDF applications with ease.

Default values launch.json for ESP-IDF Debug Adapter:

```
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "espidf",
      "name": "Launch",
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
- `logLevel`: Debug Adapter Debug level (0-4), 5 - for a full OOCD log. Default: 2.
- `mode`: Can be either `auto`, to start the debug adapter and openOCD server within the extension or `manual`, to connect to existing debug adapter and openOCD session.

> **NOTE:** As shown in [JTAG Debugging debugging with command line](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/using-debugger.html#command-line) make sure to include the following commands in gdbinit file or initGdbCommands, if used, for the debug session to properly work.

```
target remote :3333
set remote hardware-watchpoint-limit 2
mon reset halt
flushregs
thb app_main
c
```

Custom launch.json for ESP-IDF Debug Adapter:

```
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

# Use Microsoft C/C++ extension to debug

If you prefer using Microsoft C/C++ Extension to debug, the user community have found this launch.json configuration to be working.

```
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
      "environment": [{ name: "PATH", value: "${config:idf.customExtraPaths}" }],
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
