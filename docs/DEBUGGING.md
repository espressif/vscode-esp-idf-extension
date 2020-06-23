# Use our ESP-IDF Debug Adapter

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

- `debugPort`: Port for ESP-IDF Debug Adapter. Default: 43474.
- `logLevel`: Debug Adapter Debug level (0-4), 5 - for a full OOCD log. Default: 2.
- `mode`: Can be either `auto`, to start the debug adapter and openOCD server within the extension or `manual`, to connect to existing debug adapter and openOCD session.
- `env`: Environment variables to apply to the ESP-IDF Debug Adapter.

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
