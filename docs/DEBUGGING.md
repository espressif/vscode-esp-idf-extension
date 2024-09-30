# Configuration for Visual Studio Code Debug

> **NOTE:** Make sure to configure your drivers as mentioned in ESP-IDF [Configure JTAG Interface](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/configure-ft2232h-jtag.html) documentation.

> **NOTE:** For Linux users, make sure to copy the [udev rules files](https://github.com/espressif/openocd-esp32/blob/master/contrib/60-openocd.rules) into the `/etc/udev/rules.d` directory.

> **NOTE:** Please take a look first at [ESP-IDF JTAG Debugging](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/index.html#how-it-works).
> OpenOCD typically uses port 4444 for Telnet communication, port 6666 for TCL communication and port 3333 for gdb.

The Visual Studio Code uses `.vscode/launch.json` to configure debug as specified in [Visual Studio Code Debugging](https://code.visualstudio.com/docs/editor/debugging#_launch-configurations).

We recommend using our `Eclipse CDT GDB Adapter` configuration to debug your ESP-IDF projects, but you can configure launch.json for any GDB debugger extension like [Microsoft C/C++ Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) and [Native Debug](https://marketplace.visualstudio.com/items?itemName=webfreak.debug). The ESP-IDF Debug adapter will be deprecated and removed in the next major release.

Our extension implements a `ESP-IDF: Peripheral View` tree view in the `Run and Debug` view which will use the SVD file defined in the `IDF SVD File Path (idf.svdFilePath)` configuration setting to be defined in the [settings.json](../SETTINGS.md) to populate a set of peripherals registers values for the active debug session target. You could find Espressif SVD files from [Espressif SVD](https://github.com/espressif/svd).

If `initCommands`, `gdbinitFile` or `initGdbCommands` are defined in launch.json, make sure to include the following commands for debug session to properly work as shown in [JTAG Debugging with command line](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/using-debugger.html#command-line).

# Setting a custom application image offset

If you modify the application image offset you need to modify openOCD launch arguments to update the application image offset. This can happens if OpenOCD output (Menu View -> Output -> `ESP-IDF`) shows an error like this:

```
 Failed to get flash maps (-6)!\n❌ Error: Failed to get flash maps (-6)!\nWarn : Application image is invalid! Check configured binary flash offset 'appimage_offset'.
```

To update openOCD launch arguments, open the project's `settings.json` and add or modify:

```json
{
  "idf.openOcdLaunchArgs": [
    "-c",
    "init",
    "-c",
    "reset halt",
    "-c",
    "esp appimage_offset 0x20000"
  ]
}
```

where `0x20000` is your application image offset used in the partition table.

## Using the Eclipse CDT GDB Debug Adapter

The Eclipse CDT team have published a GDB debug adapter as NPM package which we include in our extension dependencies. For more information about the debug adapter please review [CDT-GDB-Adapter Github Repository](https://github.com/eclipse-cdt-cloud/cdt-gdb-adapter).

The default configuration is:

```JSON
{
  "configurations": [
    {
      "type": "gdbtarget",
      "request": "attach",
      "name": "Eclipse CDT GDB Adapter"
    }
  ]
}
```

where required of the arguments are automatically defined and resolved by the extension itself.

In case you wants more customized control, the basic arguments in launch.json are:

```JSON
{
  "configurations": [
    {
      "type": "gdbtarget",
      "request": "attach",
      "name": "Eclipse CDT Remote",
      "program": "${workspaceFolder}/build/${command:espIdf.getProjectName}.elf",
      "initCommands": [
        "set remote hardware-watchpoint-limit {IDF_TARGET_CPU_WATCHPOINT_NUM}",
        "mon reset halt",
        "maintenance flush register-cache"
      ],
      "gdb": "${command:espIdf.getToolchainGdb}",
      "target": {
        "connectCommands": [
          "set remotetimeout 20",
          "-target-select extended-remote localhost:3333"
        ]
      }
    }
  ]
}
```

- `program`: ELF file of your project build directory to execute the debug session. The command `${command:espIdf.getProjectName}` will query the extension to find the current build directory project name.
- `initCommands`: GDB Commands to initialize GDB and target. The default value is `["set remote hardware-watchpoint-limit {IDF_TARGET_CPU_WATCHPOINT_NUM}", "mon reset halt", "maintenance flush register-cache"]`.
- `initialBreakpoint`: When `initCommands` is not defined, this command will add to default initCommands a hardward breakpoint at the given function name. For example `app_main`, the default value, will add `thb app_main` to default initCommmands. If set to "", an empty string, no initial breakpoint will be set and if let undefined it will use the default `thb app_main`.
- `gdb`: GDB executable to be used. By default `"${command:espIdf.getToolchainGdb}"` will query the extension to find the ESP-IDF toolchain GDB for the current `IDF_TARGET` of your esp-idf project (esp32, esp32c6, etc.).

> **NOTE** `{IDF_TARGET_CPU_WATCHPOINT_NUM}` is resolved by the extension according to the current `IDF_TARGET` of your esp-idf project (esp32, esp32c6, etc.).

Some additional arguments you might use are:

- `runOpenOCD`: (Default: true). Run extension OpenOCD Server.
- `verifyAppBinBeforeDebug`: (Default: false) Verify that current ESP-IDF project binary is the same as binary in chip.
- `logFile`: Absolute path to the file to log interaction with gdb. Example: `${workspaceFolder}/gdb.log`.
- `verbose`: Produce verbose log output.
- `environment`: Environment variables to apply to the ESP-IDF Debug Adapter. It will replace global environment variables and environment variables used by the extension.

```json
"environment": {
  "VAR": "Value"
}
```

- `imageAndSymbols`:

```json
"imageAndSymbols": {
  "symbolFileName": "If specified, a symbol file to load at the given (optional) offset",
  "symbolOffset": "If symbolFileName is specified, the offset used to load",
  "imageFileName": "If specified, an image file to load at the given (optional) offset",
  "imageOffset": "If imageFileName is specified, the offset used to load"
}
```

- `target`: Configuration for target to be attached. Specifies how to connect to the device to debug. Usually OpenOCD exposes the chip as a remote target on port `3333`.

```json
"target": {
  "type": "The kind of target debugging to do. This is passed to -target-select (defaults to remote)",
  "host": "Target host to connect to (defaults to 'localhost', ignored if parameters is set)",
  "port": "Target port to connect to (defaults to value captured by serverPortRegExp, ignored if parameters is set)",
  "parameters": "Target parameters for the type of target. Normally something like localhost:12345. (defaults to `${host}:${port}`)",
  "connectCommands": "Replace all previous parameters to specify an array of commands to establish connection"
}
```

Other arguments please review this extension's package.json `gdbtarget` debugger contribution.

## Use Microsoft C/C++ Extension to Debug

you can also use [Microsoft C/C++ Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) to debug, the community recommend this launch.json configuration:

```JSON
{
  "configurations": [
    {
      "name": "GDB",
      "type": "cppdbg",
      "request": "launch",
      "MIMode": "gdb",
      "miDebuggerPath": "${command:espIdf.getToolchainGdb}",
      "program": "${workspaceFolder}/build/${command:espIdf.getProjectName}.elf",
      "windows": {
        "program": "${workspaceFolder}\\build\\${command:espIdf.getProjectName}.elf"
      },
      "cwd": "${workspaceFolder}",
      "setupCommands": [
			  { "text": "set remotetimeout 20" },
		  ],
		  "postRemoteConnectCommands": [
			  { "text": "mon reset halt" },
			  { "text": "maintenance flush register-cache"},
		  ],
      "externalConsole": false,
      "logging": {
        "engineLogging": true
      }
    }
  ]
}
```

# Using NativeDebug

you can also try using the [Native Debug](https://marketplace.visualstudio.com/items?itemName=webfreak.debug) extension with this example launch.json configuration:

```JSON
{
  "configurations": [
    {
      "type": "gdb",
      "request": "attach",
      "name": "NativeDebug",
      "target": "extended-remote :3333",
      "executable": "${workspaceFolder}/build/${command:espIdf.getProjectName}.elf",
      "gdbpath": "${command:espIdf.getToolchainGdb}",
      "cwd": "${workspaceRoot}",
      "autorun": [
        "mon reset halt",
        "maintenance flush register-cache",
        "thb app_main"
      ]
    }
  ]
}
```

## Use the ESP-IDF Debug Adapter

**DEPRECATED NOTICE**: We are deprecating the use of our ESP-IDF Debug Adapter in favor of using the Eclipse CDT GDB Adapter. It will removed from extension in the future major release.

This extension includes the [ESP-IDF Debug Adapter](https://github.com/espressif/esp-debug-adapter) which implement the debug adapter protocol (DAP) to communicate Xtensa's Toolchain and OpenOCD with Visual Studio Code allowing you to easily debug ESP-IDF applications. Visual Studio Code will:

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
- `mode`: Can be either `auto`, to start the Debug Adapter and OpenOCD server within the extension or `manual`, to connect to an already running Debug Adapter and OpenOCD session. Default: auto.
  > **NOTE:** If set to `manual`, OpenOCD and ESP-IDF Debug Adapter have to be manually executed by you and the extension will just try to connect to existing servers at configured ports.
- `name`: The name of the debug launch configuration. This will be shown in the Run view (Menu View -> Run).
- `type`: Type of debug configuration. It **must** be `espidf`.
- `verifyAppBinBeforeDebug`: (Default `false`) If enabled the extension will verify that the current workspace folder `build/${project-name}.bin` is the same of the target device application. `${project-name}` is the name of the project (i.e blink) and is obtained from the `build/project_description.json`. Set this to `true` to add application binary validation before debug session.
- `tmoScaleFactor`: Scale factor for gdb timeout. Default: 1.

If `gdbinitFile` or `initGdbCommands` are defined in launch.json, make sure to include the following commands for debug session to properly work as shown in [JTAG Debugging with command line](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/using-debugger.html#command-line).

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
  "configurations": [
    {
      "type": "espidf",
      "name": "Launch",
      "request": "launch",
      "debugPort": 9998,
      "logLevel": 2,
      "mode": "manual",
      "verifyAppBinBeforeDebug": false,
      "tmoScaleFactor": 1,
      "initGdbCommands": [
        "target remote :3333",
        "set remotetimeout 20",
        "symbol-file /path/to/program.elf",
        "mon reset halt",
        "maintenance flush register-cache",
        "thb app_main"
      ],
      "env": {
        "CUSTOM_ENV_VAR": "SOME_VALUE"
      }
    }
  ]
}
```

### Output and Logs from ESP-IDF Debug Adapter and OpenOCD

Beside the Visual Studio Code Debug console output. You can find OpenOCD and the ESP-IDF debug adapter output in `<project_dir>/debug.log` and Menu View -> Output -> `ESP-IDF`.
