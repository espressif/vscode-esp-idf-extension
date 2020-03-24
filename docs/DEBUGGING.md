# Use our ESP-IDF Debug Adapter

```
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "espidf",
      "name": "Launch",
      "request": "launch",
      "env": {
        "PYTHONPATH": "${command:espIdf.getExtensionPath}/esp_debug_adapter/debug_adapter"
      },
    }
  ]
}
```

Configuration settings of the ESP-IDF Debug Adapter for launch.json are:

- `debugPort`: Port for ESP-IDF Debug Adapter. Default: 43474.
- `logLevel`: Specify log level for Debug Adapter. Default: 2.
- `mode`: Can be either `auto`, to start the debug adapter server within the extension or `manual`, to connect to existing debug adapter session.
- `env`: Environment variables to apply to the ESP-IDF Debug Adapter.

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
