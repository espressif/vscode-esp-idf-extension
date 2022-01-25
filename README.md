<a href="https://marketplace.visualstudio.com/items?itemName=espressif.esp-idf-extension">
  <img src="./media/espressif_icon.png" alt="espressif logo" title="Espressif" align="right" height="60" />
</a>

# ESP-IDF VS Code Extension

[![Tutorials](https://img.shields.io/badge/-Tutorials-red)](./docs/tutorial/toc.md)
[![Documentation](https://img.shields.io/badge/Documentation-blue)](./docs/ONBOARDING.md)
[![ESP32](https://img.shields.io/badge/Supported%20Chip-ESP32%20ESP32--S2%20ESP32--S3%20ESP32--C3-red)](./docs/HARDWARE_SUPPORT.md)
![Version](https://img.shields.io/github/package-json/v/espressif/vscode-esp-idf-extension)
[![Releases](https://img.shields.io/badge/Github-Releases-blue)](https://github.com/espressif/vscode-esp-idf-extension/releases)
[![Forum](https://img.shields.io/badge/Forum-esp32.com-blue)](https://esp32.com/viewforum.php?f=40)

Develop, build, flash, monitor, [debug](./docs/DEBUGGING.md) and [more](./docs/FEATURES.md) with Espressif chips using Espressif IoT Development Framework [(ESP-IDF)](https://github.com/espressif/esp-idf)

Make sure to review our [documentation](./docs/ONBOARDING.md) first to properly use the extension.

<a href="https://youtu.be/Lc6ausiKvQM">
  <p align="center">
    <img src="./media/youtube_tutorial_preview.png" alt="Quick User Guide for the ESP-IDF VS Code Extension" width="1024">
  </p>
</a>

# Tutorials

1. [Install and setup the extension](./docs/tutorial/install.md).
2. [Create a project from example, Build, flash and monitor](./docs/tutorial/install.md).
3. [Debugging](./docs/tutorial/debugging.md) with steps to configure OpenOCD and debug adapter.
4. [Heap tracing](./docs/tutorial/heap_tracing.md)
5. [Code coverage](./docs/tutorial/code_coverage.md)

Check all the tutorials [here](./docs/tutorial/toc.md).

# Table of content

1. [Prerequisites](#Prerequisites)
2. [How to use](#How-to-use)
3. [Available commands](#Available-commands)
4. [Commands for tasks.json and launch.json](#Commands-for-tasks.json-and-launch.json)
5. [Available Tasks in tasks.json](#Available-Tasks-in-tasks.json)
6. [Troubleshooting](#Troubleshooting)
7. [Code of Conduct](#Code-of-Conduct)
8. [License](#License)

Check all the [documentation](./docs/ONBOARDING.md).

# Prerequisites

There are few dependencies required in your system and available in environment variable PATH before installing this extension. Please review [ESP-IDF Prerequisites](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/get-started/index.html#step-1-install-prerequisites) documentation.

- Requirements for [Linux](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/get-started/linux-setup.html#install-prerequisites)
- Requirements for [MacOS](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/get-started/macos-setup.html#install-prerequisites)
- For Windows the [C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools) might be required.

All the other dependencies like ESP-IDF and ESP-IDF Tools can be installed using the **ESP-IDF: Configure ESP-IDF extension** setup wizard or following the steps in the [setup documentation](./docs/SETUP.md).

> Please note that this extension **only [supports](https://github.com/espressif/esp-idf/blob/master/SUPPORT_POLICY.md)** the release versions of ESP-IDF, you can still use the extension on `master` branch or some other branch, but certain feature might not properly work.

> **NOTE:** If you are using Windows Subsystem for Linux (WSL) 2, please take a look at the additional requirements in [WSL Documentation](./docs/WSL.md) needed in the WSL distribution.

# How to use

- Install this extension in your Visual Studio Code.
- Then
  - Either open Visual Studio Code and create a workspace folder.
  - Run `code ${YOUR_PROJECT_DIR}` from the command line.
- Check you have installed the [Prerequisites](#Prerequisites)
- (OPTIONAL) Press <kbd>F1</kbd> and type **ESP-IDF: Select where to save configuration settings**, which can be User settings, Workspace settings or workspace folder settings. Please take a look at [Working with multiple projects](./docs/MULTI_PROJECTS.md) for more information. Default is User settings.
- On the first time using the extension, press <kbd>F1</kbd> and type **ESP-IDF: Configure ESP-IDF extension** to open the extension configuration wizard. This will install ESP-IDF, ESP-IDF tools, create a virtual python environment with ESP-IDF and this extension python packages and configure the extension settings with these values.

  > **NOTE:** Please take a look at [SETUP](./docs/SETUP.md) documentation or the [Install](./docs/tutorial/install.md) tutorial for details about extension setup and configuration.

- Press <kbd>F1</kbd> and type **ESP-IDF: Show Examples Projects** to create a new project from ESP-IDF examples.

- Configure the `.vscode/c_cpp_properties.json` as explained in [C/C++ Configuration](./docs/C_CPP_CONFIGURATION.md). There is a default configuration that should work when you create a new project with the extension commands but you might want to modify it to your needs.

  > **Note:** If you want to get code navigation and ESP-IDF function references, the [Microsoft C/C++ Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) can be used to resolve header/source links. By default, projects created with **ESP-IDF: Create project from extension template** or **ESP-IDF: Show Examples Projects** tries to resolve headers by manually recursing ESP-IDF directory sources with the `Tag Parser` engine. This can be optimized by building the project first and configure your project to use `build/compile_commands.json` as explained in [C/C++ Configuration](./docs/C_CPP_CONFIGURATION.md).

  > **NOTE:** You should set `"C_Cpp.intelliSenseEngine": "Tag Parser"` in your settings.json if you are not using the compile_commands.json approach.

- Do some coding!
- Check you set the correct port of your device by pressing <kbd>F1</kbd>, typing **ESP-IDF: Select port to use:** and choosing the serial port your device is connected.
- Select an Espressif target (esp32, esp32s2, etc.) with the **ESP-IDF: Set Espressif device target** command. If you are using one of our boards, use the **ESP-IDF: Select OpenOCD Board Configuration** to choose the openOCD configuration files for the extension openOCD server.
- When you are ready, build your project by pressing <kbd>F1</kbd> and typing **ESP-IDF: Build your project**.
- Flash to your device by pressing <kbd>F1</kbd> and typing **ESP-IDF: Select Flash Method and Flash** to select either UART or JTAG. You can also use the **ESP-IDF: Flash (UART) your project** or **ESP-IDF: Flash (with JTag)** directly.
  > **NOTE:** When using the **ESP-IDF: Select Flash Method and Flash** command, your choice will be saved in the `idf.flashType` configuration setting.
- You can later start a monitor by pressing <kbd>F1</kbd> and typing **ESP-IDF: Monitor your device** which will log the device activity in a Visual Studio Code terminal.
- To make sure you can debug your device, select the your board by pressing <kbd>F1</kbd> and typing **ESP-IDF: Select OpenOCD Board Configuration** or manually define the openOCD configuration files with `idf.openOcdConfigs` configuration in your settings.json.
- If you want to start a debug session, just press F5 (make sure you had at least build and flash once before so the debugger works correctly).

# Available commands

Click <kbd>F1</kbd> to show Visual studio code actions, then type **ESP-IDF** to see possible actions.

| Command Description                                     | Keyboard Shortcuts (Mac)               | Keyboard Shortcuts (Windows/ Linux)       |
| ------------------------------------------------------- | -------------------------------------- | ----------------------------------------- |
| Add Arduino ESP32 as ESP-IDF Component                  |                                        |                                           |
| Add docker container configuration                      |                                        |                                           |
| Add Editor coverage                                     |                                        |                                           |
| Add OpenOCD rules file (For Linux users)                |                                        |                                           |
| Add vscode configuration folder                         |                                        |                                           |
| Build, Flash and start a monitor on your device         | <kbd>⌘</kbd> <kbd>I</kbd> <kbd>D</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>D</kbd> |
| Build your project                                      | <kbd>⌘</kbd> <kbd>I</kbd> <kbd>B</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>B</kbd> |
| Configure ESP-IDF extension                             |                                        |                                           |
| Configure Paths                                         |                                        |                                           |
| Configure project sdkconfig for coverage                |                                        |                                           |
| Create project from extension template                  | <kbd>⌘</kbd> <kbd>I</kbd> <kbd>C</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>C</kbd> |
| Create new ESP-IDF Component                            |                                        |                                           |
| Device configuration                                    |                                        |                                           |
| Dispose current SDK Configuration editor server process |                                        |                                           |
| Doctor command                                          |                                        |                                           |
| Erase flash memory from device                          | <kbd>⌘</kbd> <kbd>I</kbd> <kbd>R</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>R</kbd> |
| Execute custom task                                     | <kbd>⌘</kbd> <kbd>I</kbd> <kbd>J</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>J</kbd> |
| Flash (UART) your project                               |                                        |                                           |
| Flash (with JTag)                                       |                                        |                                           |
| Full clean project                                      | <kbd>⌘</kbd> <kbd>I</kbd> <kbd>X</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>X</kbd> |
| Get HTML Coverage Report for project                    |                                        |                                           |
| Import ESP-IDF Project                                  |                                        |                                           |
| Install ESP-ADF                                         |                                        |                                           |
| Install ESP-IDF Python Packages                         |                                        |                                           |
| Install ESP-MDF                                         |                                        |                                           |
| Launch IDF Monitor for CoreDump / GDB-Stub Mode         |                                        |                                           |
| Launch QEMU server                                      |                                        |                                           |
| Launch QEMU debug session                               |                                        |                                           |
| Monitor your device                                     | <kbd>⌘</kbd> <kbd>I</kbd> <kbd>M</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>M</kbd> |
| Monitor QEMU device                                     |                                        |                                           |
| New Project                                             | <kbd>⌘</kbd> <kbd>I</kbd> <kbd>N</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>N</kbd> |
| Open ESP-IDF Terminal                                   | <kbd>⌘</kbd> <kbd>I</kbd> <kbd>T</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>T</kbd> |
| Open NVS Partition Editor                               |                                        |                                           |
| Pick a workspace folder                                 |                                        |                                           |
| SDK Configuration editor                                | <kbd>⌘</kbd> <kbd>I</kbd> <kbd>G</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>G</kbd> |
| Search in documentation...                              | <kbd>⌘</kbd> <kbd>I</kbd> <kbd>Q</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>Q</kbd> |
| Select Flash Method and Flash                           | <kbd>⌘</kbd> <kbd>I</kbd> <kbd>F</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>F</kbd> |
| Select port to use                                      | <kbd>⌘</kbd> <kbd>I</kbd> <kbd>P</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>P</kbd> |
| Select OpenOCD Board Configuration                      |                                        |                                           |
| Select where to save configuration settings             |                                        |                                           |
| Set default sdkconfig file in project                   |                                        |                                           |
| Set Espressif device target                             |                                        |                                           |
| Show Examples Projects                                  |                                        |                                           |
| Show ninja build summary                                |                                        |                                           |
| Size analysis of the binaries                           | <kbd>⌘</kbd> <kbd>I</kbd> <kbd>S</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>S</kbd> |
| Remove Editor coverage                                  |                                        |                                           |

# About commands

1. The **Add Arduino-ESP32 as ESP-IDF Component** command will add [Arduino-ESP32](https://github.com/espressif/arduino-esp32) as a ESP-IDF component in your current directory (`${CURRENT_DIRECTORY}/components/arduino`).

   > **NOTE:** Not all versions of ESP-IDF are supported. Make sure to check [Arduino-ESP32](https://github.com/espressif/arduino-esp32) to see if your ESP-IDF version is compatible.

2. You can also use the **ESP-IDF: Create project from extension template** command with `arduino-as-component` template to create a new project directory that includes Arduino-ESP32 as an ESP-IDF component.

3. The **Install ESP-ADF** will clone ESP-ADF inside the selected directory and set `idf.espAdfPath` (`idf.espAdfPathWin` in Windows) configuration setting.

4. The **Install ESP-MDF** will clone ESP-MDF inside the selected directory and set `idf.espMdfPath` (`idf.espMdfPathWin` in Windows) configuration setting.

5. The **Show Examples Projects** command allows you create a new project using one of the examples in ESP-IDF, ESP-ADF or ESP-MDF directory if related configuration settings are correctly defined.

# Commands for tasks.json and launch.json

We have implemented some utilities commands that can be used in tasks.json and launch.json that can be used like:

```json
"miDebuggerPath": "${command:espIdf.getXtensaGdb}"
```

- `espIdf.getExtensionPath`: Get the installed location absolute path.
- `espIdf.getOpenOcdScriptValue`: Return the value of OPENOCD_SCRIPTS from `idf.customExtraVars` or from system OPENOCD_SCRIPTS environment variable.
- `espIdf.getOpenOcdConfig`: Return the openOCD configuration files as string. Example `-f interface/ftdi/esp32_devkitj_v1.cfg -f board/esp32-wrover.cfg`.
- `espIdf.getProjectName`: Return the project name from current workspace folder `build/project_description.json`.
- `espIdf.getXtensaGcc`: Return the absolute path of the xtensa toolchain gcc for the ESP-IDF target given by `idf.adapterTargetName` configuration setting and `idf.customExtraPaths`.
- `espIdf.getXtensaGdb`: Return the absolute path of the xtensa toolchain gdb for the ESP-IDF target given by `idf.adapterTargetName` configuration setting and `idf.customExtraPaths`.

See an example in the [debugging](./docs/DEBUGGING.md) documentation.

# Available Tasks in tasks.json

A template Tasks.json is included when creating a project using **ESP-IDF: Create project from extension template**. These tasks can be executed by running <kbd>F1</kbd>, writing `Tasks: Run task` and selecting one of the following:

1. `Build` - Build Project
2. `Set Target to esp32`
3. `Set Target to esp32s2`
4. `Clean` - Clean the project
5. `Flash` - Flash the device
6. `Monitor` - Start a monitor terminal
7. `OpenOCD` - Start the openOCD server
8. `BuildFlash` - Execute a build followed by a flash command.

Note that for OpenOCD tasks you need to define `OPENOCD_SCRIPTS` in your system environment variables with openocd scripts folder path.

# Troubleshooting

If something is not working please check for any error on one of these:

> **NOTE:** Use `idf.openOcdDebugLevel` configuration setting to 3 or more to show debug logging in OpenOCD server output.

> **NOTE:** Use `logLevel` in your <project-directory>/.vscode/launch.json to 3 or more to show more debug adapter output.

1. In Visual Studio Code select menu "View" -> Output -> ESP-IDF, ESP-IDF Debug Adapter, Heap Trace, OpenOCD and SDK Configuration Editor. This output information is useful to know what is happening in each tool.
2. Use the `ESP-IDF: Doctor command` to generate a report of your configuration and it will be copied in your clipboard to paste anywhere.
3. Check log file which can be obtained from:

- Windows: `%USERPROFILE%\.vscode\extensions\espressif.esp-idf-extension-VERSION\esp_idf_vsc_ext.log`
- Linux & MacOSX: `$HOME/.vscode/extensions/espressif.esp-idf-extension-VERSION/esp_idf_vsc_ext.log`

4. In Visual Studio Code, select menu "Help" -> `Toggle Developer Tools` and copy any error in the Console tab related to this extension.

5. Make sure that your extension is properly configured as described in [JSON Manual Configuration](./docs/SETUP.md#JSON-Manual-Configuration). Visual Studio Code allows the user to configure settings at different levels: Global (User Settings), Workspace and WorkspaceFolder so make sure your project has the right settings. The doctor command might give the values from user settings instead of the workspace folder settings.

6. Review the [OpenOCD troubleshooting FAQ](https://github.com/espressif/openocd-esp32/wiki/Troubleshooting-FAQ) related to the `OpenOCD` output, for application tracing, debug or any OpenOCD related issues.

If there is any Python package error, please try to reinstall the required python packages with the **ESP-IDF: Install ESP-IDF Python Packages** command. Please consider that this extension install ESP-IDF, this extension's and ESP-IDF Debug Adapter python packages when running the **ESP-IDF: Configure ESP-IDF extension** setup wizard.

If the user can't resolve the error, please search in the [github repository issues](http://github.com/espressif/vscode-esp-idf-extension/issues) for existing errors or open a new issue [here](https://github.com/espressif/vscode-esp-idf-extension/issues/new/choose).

# Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](./docs/CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [vscode@espressif.com](mailto:vscode@espressif.com).

# License

This extension is licensed under the Apache License 2.0. Please see the [LICENSE](./LICENSE) file for additional copyright notices and terms.
