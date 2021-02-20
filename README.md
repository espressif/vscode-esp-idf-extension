<a href="https://marketplace.visualstudio.com/items?itemName=espressif.esp-idf-extension">
  <img src="./media/espressif_icon.png" alt="espressif logo" title="Espressif" align="right" height="60" />
</a>

# ESP-IDF VS Code Extension

[![Forum](https://img.shields.io/badge/Forum-esp32.com-blue)](https://esp32.com/viewforum.php?f=40)
[![ESP32](https://img.shields.io/badge/Supported%20Chip-ESP32%20ESP32--S2-green)](./docs/HARDWARE_SUPPORT.md)
![Version](https://img.shields.io/github/package-json/v/espressif/vscode-esp-idf-extension)
[![Releases](https://img.shields.io/badge/Github-Releases-blue)](https://github.com/espressif/vscode-esp-idf-extension/releases)

Develop, [build](./docs/FEATURES.md), [flash](./docs/FEATURES.md), [monitor](./docs/FEATURES.md), [debug](./DEBUGGING.md) and [more](./docs/FEATURES.md) with Espressif chips using Espressif IoT Development Framework [(ESP-IDF)](https://github.com/espressif/esp-idf).

<a href="https://youtu.be/Lc6ausiKvQM">
  <p align="center">
    <img src="./media/youtube_tutorial_preview.png" alt="Quick User Guide for the ESP-IDF VS Code Extension" width="1024">
  </p>
</a>

## Quick links

- [Build from source code and how to install](./docs/INSTALL.md)
- [Configuration settings](./docs/SETTINGS.md)
- [Chips and supported frameworks](./docs/HARDWARE_SUPPORT.md)
- [Commands](#Available-commands)
- [Contribute](./docs/CONTRIBUTING.md)
- [Github Repository](https://github.com/espressif/vscode-esp-idf-extension)
- [Github issues](https://github.com/espressif/vscode-esp-idf-extension/issues)
- [How to use](#How-to-use)
- [**See all features**](./docs/FEATURES.md)
- [Setup process](./docs/SETUP.md)
- [Releases](https://github.com/espressif/vscode-esp-idf-extension/releases)
- [Working with multiple projects](./docs/MULTI_PROJECTS.md)

## Prerequisites

There are few dependencies required in your system and available in environment variable PATH before installing this extension:

| Linux                                                        | MacOS                                                        | Windows                                                      |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| [Python 3.5](https://www.python.org/download/releases/3.5/)+ | [Python 3.5](https://www.python.org/download/releases/3.5/)+ | [Python 3.5](https://www.python.org/download/releases/3.5/)+ |
| [Git](https://git-scm.com/downloads)                         | [Git](https://git-scm.com/downloads)                         | [Git](https://git-scm.com/downloads)                         |
| [CMake](https://cmake.org/download)                          | [CMake](https://cmake.org/download)                          |                                                              |
| [Ninja-build](https://github.com/ninja-build/ninja/releases) | [Ninja-build](https://github.com/ninja-build/ninja/releases) |                                                              |

All the other dependencies like ESP-IDF and ESP-IDF Tools can be installed using the **ESP-IDF: Configure ESP-IDF extension** setup wizard or following the steps in the [setup documentation](./docs/SETUP.md).

> Please note that this extension **only [supports](https://github.com/espressif/esp-idf/blob/master/SUPPORT_POLICY.md)** the release versions of ESP-IDF, you can still use the extension on `master` branch or some other branch, but certain feature might not properly work.

## How to use

- Install this extension in your Visual Studio Code.
- Then
  - Either open Visual Studio Code and create a workspace folder.
  - Run `code ${YOUR_PROJECT_DIR}` from the command line.
- Check you have installed the [Prerequisites](#Prerequisites)
- Press <kbd>F1</kbd> and type **ESP-IDF: Configure ESP-IDF extension** to open the extension configuration wizard. This will install ESP-IDF and tools and configure the extension.

  - Please take a look at [SETUP](./docs/SETUP.md) for details about extension configuration.

- Press <kbd>F1</kbd> and type **ESP-IDF: Create ESP-IDF project** to generate a template ESP-IDF project.

- Configure the `.vscode/c_cpp_properties.json` as explained in [C/C++ Configuration](./docs/C_CPP_CONFIGURATION.md).

  > **Note:** If you want to get code navigation and ESP-IDF function references, the [Microsoft C/C++ Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) can be used to resolve header/source links. By default, projects created with **ESP-IDF: Create ESP-IDF project** tries to resolve headers by manually recursing ESP-IDF directory sources with the Tag Parser engine. This can be optimized by building the project first and configure your project to use `build/compile_commands.json` as explained in [C/C++ Configuration](./docs/C_CPP_CONFIGURATION.md).

- Do some coding!
- Check you set the correct port of your device by pressing <kbd>F1</kbd>, typing **ESP-IDF: Select port to use:** and choosing the serial port your device is connected.
- When you are ready, build your project. Then flash to your device by pressing <kbd>F1</kbd> and typing **ESP-IDF: Flash your device** then selecting Flash allows you to flash the device.
- You can later start a monitor by pressing <kbd>F1</kbd> and typing **ESP-IDF: Monitor your device** which will log the activity in a Visual Studio Code terminal.
- If you want to start a debug session, just press F5 (make sure you had at least build and flash once before so the debugger works correctly). To make sure you can debug your device, set the proper `idf.openOcdConfigs` settings in your settings.json or by pressing <kbd>F1</kbd> and typing **ESP-IDF: Device configuration**.

## Available commands

Click <kbd>F1</kbd> to show Visual studio code actions, then type **ESP-IDF** to see possible actions.

| Command Description                                     | Keyboard Shortcuts (Mac)               | Keyboard Shortcuts (Windows/ Linux)       |
| ------------------------------------------------------- | -------------------------------------- | ----------------------------------------- |
| Configure ESP-IDF extension                             |                                        |                                           |
| Create ESP-IDF project                                  | <kbd>⌘</kbd> <kbd>E</kbd> <kbd>C</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>C</kbd> |
| Add vscode configuration folder                         |                                        |                                           |
| Add Arduino ESP32 as ESP-IDF Component                  |                                        |                                           |
| Configure Paths                                         |                                        |                                           |
| Set Espressif device target                             |                                        |                                           |
| Device configuration                                    |                                        |                                           |
| SDK Configuration editor                                |                                        |                                           |
| Set default sdkconfig file in project                   |                                        |                                           |
| Select port to use                                      | <kbd>⌘</kbd> <kbd>E</kbd> <kbd>P</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>P</kbd> |
| Full clean project                                      | <kbd>⌘</kbd> <kbd>E</kbd> <kbd>F</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>F</kbd> |
| Build your project                                      | <kbd>⌘</kbd> <kbd>E</kbd> <kbd>B</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>B</kbd> |
| Flash your project                                      | <kbd>⌘</kbd> <kbd>E</kbd> <kbd>F</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>F</kbd> |
| Monitor your device                                     | <kbd>⌘</kbd> <kbd>E</kbd> <kbd>M</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>M</kbd> |
| Build, Flash and start a monitor on your device         | <kbd>⌘</kbd> <kbd>E</kbd> <kbd>D</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>D</kbd> |
| Open ESP-IDF Terminal                                   | <kbd>⌘</kbd> <kbd>E</kbd> <kbd>T</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>T</kbd> |
| Pick a workspace folder                                 |                                        |                                           |
| Size analysis of the binaries                           | <kbd>⌘</kbd> <kbd>E</kbd> <kbd>S</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>S</kbd> |
| Show Examples Projects                                  |                                        |                                           |
| Add Editor coverage                                     |                                        |                                           |
| Remove Editor coverage                                  |                                        |                                           |
| Get HTML Coverage Report for project                    |                                        |                                           |
| Search in documentation...                              | <kbd>⌘</kbd> <kbd>E</kbd> <kbd>D</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>D</kbd> |
| Install ESP-ADF                                         |                                        |                                           |
| Install ESP-MDF                                         |                                        |                                           |
| Install ESP-IDF Python Packages                         |                                        |                                           |
| Open NVS Partition Editor                               |                                        |                                           |
| Select OpenOCD Board Configuration                      |                                        |                                           |
| Doctor command                                          |                                        |                                           |
| Create new ESP-IDF Component                            |                                        |                                           |
| Show ninja build summary                                |                                        |                                           |
| Dispose current SDK Configuration editor server process |                                        |                                           |

The **Add Arduino-ESP32 as ESP-IDF Component** command will add [Arduino-ESP32](https://github.com/espressif/arduino-esp32) as a ESP-IDF component in your current directory (`${CURRENT_DIRECTORY}/components/arduino`). You can also use the **Create ESP-IDF project** command with `arduino-as-component` template to create a new project directory that includes Arduino-esp32 as an ESP-IDF component.

> **NOTE** Not all versions of ESP-IDF are supported. Make sure to check [Arduino-ESP32](https://github.com/espressif/arduino-esp32) to see if your ESP-IDF version is compatible.

The **Show Examples Projects** command allows you create a new project using one of the examples in ESP-IDF, ESP-ADF or ESP-MDF directory if related configuration settings are set.
The **Install ESP-ADF** will clone ESP-ADF to a selected directory and set `idf.espAdfPath` (`idf.espAdfPathWin` in Windows) configuration setting.
The **Install ESP-MDF** will clone ESP-MDF to a selected directory and set `idf.espMdfPath` (`idf.espMdfPathWin` in Windows) configuration setting.

### Commands for tasks.json and launch.json

We have implemented some utilities commands that can be used in tasks.json and launch.json like

```json
"miDebuggerPath": "${command:espIdf.getXtensaGdb}"
```

as shown in the [debugging documentation](./DEBUGGING.md).

- `espIdf.getXtensaGcc`: Return the absolute path of the xtensa toolchain gcc for the ESP-IDF target given by `idf.adapterTargetName` configuration setting and `idf.customExtraPaths`.
- `espIdf.getXtensaGdb`: Return the absolute path of the xtensa toolchain gdb for the ESP-IDF target given by `idf.adapterTargetName` configuration setting and `idf.customExtraPaths`.

## Available Tasks in tasks.json

There is also some tasks defined in Tasks.json, which can be executed by running <kbd>F1</kbd> and writing `Tasks: Run task` and selecting one of
the following:

1. `Build` - Build Project
2. `Set Target to esp32`
3. `Set Target to esp32s2`
4. `Clean` - Clean the project
5. `Flash` - Flash the device
6. `Monitor` - Start a monitor terminal
7. `OpenOCD` - Start the openOCD server
8. `BuildFlash` - Execute a build followed by a flash command.

Note that for OpenOCD tasks you need to define OPENOCD_SCRIPTS in your system environment variables with openocd scripts folder path.

## Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](./docs/CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [vscode@espressif.com](mailto:vscode@espressif.com).

## License

This extension is licensed under the Apache License 2.0. Please see the [LICENSE](./LICENSE) file for additional copyright notices and terms.
