<a href="https://marketplace.visualstudio.com/items?itemName=espressif.esp-idf-extension">
  <img src="./media/espressif_icon.png" alt="espressif logo" title="Espressif" align="right" height="60" />
</a>

# ESP-IDF Visual Studio Code Extension

[![Tutorials](https://img.shields.io/badge/-Tutorials-red)](./docs/tutorial/toc.md)
[![Documentation](https://img.shields.io/badge/Documentation-blue)](./docs/ONBOARDING.md)
[![Troubleshooting](https://img.shields.io/badge/Troubleshooting-red)](./README.md#Troubleshooting)
[![ESP32](https://img.shields.io/badge/Supported%20Chips-red)](./docs/HARDWARE_SUPPORT.md)
![Version](https://img.shields.io/github/package-json/v/espressif/vscode-esp-idf-extension)
[![Releases](https://img.shields.io/badge/Github-Releases-blue)](https://github.com/espressif/vscode-esp-idf-extension/releases)
[![Forum](https://img.shields.io/badge/Forum-esp32.com-blue)](https://esp32.com/viewforum.php?f=40)

Develop, build, flash, monitor, [debug](./docs/DEBUGGING.md) and [more](./docs/FEATURES.md) with Espressif chips using Espressif IoT Development Framework [(ESP-IDF)](https://github.com/espressif/esp-idf)

**Nightly builds** for <a href="https://nightly.link/espressif/vscode-esp-idf-extension/workflows/ci/master/esp-idf-extension.vsix.zip">Visual Studio Code</a>. You can use this VSIX to test the current github master of the extension by pressing <kbd>F1</kbd> or click menu `View` -> `Command Palette...`, type `Install from VSIX` and then select the previously downloaded `.vsix` file to install the extension.

Make sure to review our [documentation](./docs/ONBOARDING.md) first to properly use the extension.

# How to use

1.  Download and install [Visual Studio Code](https://code.visualstudio.com/).

2.  Install ESP-IDF system requirements for your operating system:

- Requirements for [Linux](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/get-started/linux-setup.html#install-prerequisites)
- Requirements for [MacOS](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/get-started/macos-setup.html#install-prerequisites)
- For Windows the [C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools) might be required.

3. In Visual Studio Code, Open the **Extensions** view by clicking on the Extension icon in the Activity Bar on the side of Visual Studio Code or the **View: Extensions** command (shortcut: <kbd>⇧</kbd> <kbd>⌘</kbd> <kbd>X</kbd> or <kbd>Ctrl+Shift+X</kbd>.

4. Search for [ESP-IDF Extension](https://marketplace.visualstudio.com/items?itemName=espressif.esp-idf-extension).

5. Install the extension.

6. (OPTIONAL) Press <kbd>F1</kbd> and type **ESP-IDF: Select where to Save Configuration Settings**, which can be User Settings, Workspace Settings or Workspace Folder Settings. Default is User settings.

   > **NOTE:** Please take a look at [Working with multiple projects](./docs/MULTI_PROJECTS.md) for more information.

7. In Visual Studio Code, select menu "View" and "Command Palette" and type [configure esp-idf extension]. After, choose the **ESP-IDF: Configure ESP-IDF Extension** option. You can also choose where to save settings in the setup wizard.
   > **NOTE:** For versions of ESP-IDF < 5.0, spaces are not supported inside configured paths.

<p>
  <img src="./media/tutorials/setup/select-esp-idf.png" alt="Select ESP-IDF" width="950">
</p>

8. Choose **Express** and select the download server:

- Espressif: Faster speed in China using Espressif Download servers links.
- Github: Using github releases links.

9. Pick an ESP-IDF version to download or find ESP-IDF in your system option to search for existing ESP-IDF directory.

10. Choose the location for ESP-IDF Tools (also known as `IDF_TOOLS_PATH`) which is `$HOME\.espressif` on MacOS/Linux and `%USERPROFILE%\.espressif` on Windows by default.

11. If your operating system is Linux or MacOS, choose the python executable to create ESP-IDF virtual environment.

    > **NOTE:** Windows users don't need to select a python executable since it is part of the setup.
    > **NOTE:** Make sure that `IDF_TOOLS_PATH` doesn't have any spaces to avoid any build issues.

12. The user will see a page showing the setup progress status showing ESP-IDF download progress, ESP-IDF Tools download and install progress as well as the creation of a python virtual environment.

13. If everything is installed correctly, the user will see a message that all settings have been configured. You can start using the extension.

14. Press <kbd>F1</kbd> and type **ESP-IDF: Show Examples Projects** to create a new project from ESP-IDF examples.

15. (OPTIONAL) Configure the `.vscode/c_cpp_properties.json` as explained in [C/C++ Configuration](./docs/C_CPP_CONFIGURATION.md).

> **Note:** For code navigation the [Microsoft C/C++ Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) or [Clangd extension](https://marketplace.visualstudio.com/items?itemName=llvm-vs-code-extensions.vscode-clangd) can be used for C/C++ language support. By default, projects created with **ESP-IDF: Create Project from Extension Template** or **ESP-IDF: Show Examples Projects** include a template for Microsoft C/C++ extension `c_cpp_properties.json` configuration file.

15. Set the serial port of your device by pressing <kbd>F1</kbd>, typing **ESP-IDF: Select Port to Use:** and choosing the serial port your device is connected.

16. Select an Espressif target (esp32, esp32s2, etc.) with the **ESP-IDF: Set Espressif Device Target** command.

17. Use the **ESP-IDF: Select OpenOCD Board Configuration** to choose the openOCD configuration files for the extension openOCD server.

18. Next configure your ESP-IDF project by pressing <kbd>F1</kbd> and typing **ESP-IDF: SDK Configuration Editor** command (<kbd>CTRL</kbd> <kbd>E</kbd> <kbd>G</kbd> keyboard shortcut ) where the user can modify the ESP-IDF project settings. After all changes are made, click save and close this window.

19. When you are ready, build your project by pressing <kbd>F1</kbd> and typing **ESP-IDF: Build your Project**.

20. Flash to your device by pressing <kbd>F1</kbd> and typing **ESP-IDF: Select Flash Method and Flash** to select either `UART`, `DFU` or `JTAG` depending on your serial connection.

> **NOTE:** You can also use the **ESP-IDF: Flash (UART) your Project** or **ESP-IDF: Flash (with JTag)** directly.

20. Start a monitor by pressing <kbd>F1</kbd> and typing **ESP-IDF: Monitor Device** which will log the device activity in a Visual Studio Code terminal.

21. To make sure you can debug your device, select the your board by pressing <kbd>F1</kbd> and typing **ESP-IDF: Select OpenOCD Board Configuration**. You can test the connection by pressing <kbd>F1</kbd> and typing **ESP-IDF: OpenOCD Manager**.

    > **NOTE:** The user can start or stop the OpenOCD from Visual Studio Code using the **ESP-IDF: OpenOCD Manager** command or from the `OpenOCD Server (Running | Stopped)` button in the visual studio code status bar.

22. If you want to start a debug session, just press `F5` (make sure you had at least build, flash and openOCD is connecting correctly so the debugger works correctly).

Check the [Troubleshooting](#Troubleshooting) if you have any issues.

# Tutorials

1. [Install and setup the extension](./docs/tutorial/install.md).
2. [Create a project from ESP-IDF examples, Build, flash and monitor](./docs/tutorial/basic_use.md).
3. [Debugging](./docs/tutorial/debugging.md) with steps to configure OpenOCD and debug adapter.
4. [Heap tracing](./docs/tutorial/heap_tracing.md)
5. [Code coverage](./docs/tutorial/code_coverage.md)
6. [Developing on Docker Container](./docs/tutorial/using-docker-container.md)
7. [Developing on WSL](./docs/tutorial/wsl.md)

Check all the tutorials [here](./docs/tutorial/toc.md).

# Table of content

- [ESP-IDF Visual Studio Code Extension](./README.md#esp-idf-visual-studio-code-extension)
- [Tutorials](./README.md#tutorials)
- [Table of content](./README.md#table-of-content)
- [How to use](./README.md#how-to-use)
- [Available commands](./README.md#available-commands)
- [About commands](./README.md#about-commands)
- [Commands for tasks.json and launch.json](./README.md#commands-for-tasksjson-and-launchjson)
- [Available Tasks in tasks.json](./README.md#available-tasks-in-tasksjson)
- [Troubleshooting](./README.md#troubleshooting)
- [Code of Conduct](./README.md#code-of-conduct)
- [License](./README.md#license)

Check all the [documentation](./docs/ONBOARDING.md).

# Available commands

Click <kbd>F1</kbd> to show Visual studio code actions, then type **ESP-IDF** to see all possible actions.

| Command Description                                     | Keyboard Shortcuts (Mac)               | Keyboard Shortcuts (Windows/ Linux)       |
| ------------------------------------------------------- | -------------------------------------- | ----------------------------------------- |
| Add Arduino ESP32 as ESP-IDF Component                  |                                        |                                           |
| Add Docker Container Configuration                      |                                        |                                           |
| Add Editor coverage                                     |                                        |                                           |
| Add OpenOCD rules file (For Linux users)                |                                        |                                           |
| Add vscode configuration folder                         |                                        |                                           |
| Build, Flash and start a monitor on your device         | <kbd>⌘</kbd> <kbd>I</kbd> <kbd>D</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>D</kbd> |
| Build your project                                      | <kbd>⌘</kbd> <kbd>I</kbd> <kbd>B</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>B</kbd> |
| Clear eFuse Summary                                     |                                        |                                           |
| Clear ESP-IDF Search Results                            |                                        |                                           |
| Clear Saved ESP-IDF Setups                              |                                        |                                           |
| Configure ESP-IDF extension                             |                                        |                                           |
| Configure Paths                                         |                                        |                                           |
| Configure Project SDKConfig for Coverage                |                                        |                                           |
| Create project from Extension Template                  | <kbd>⌘</kbd> <kbd>I</kbd> <kbd>C</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>C</kbd> |
| Create New ESP-IDF Component                            |                                        |                                           |
| Device configuration                                    |                                        |                                           |
| Dispose Current SDK Configuration Editor Server Process |                                        |                                           |
| Doctor Command                                          |                                        |                                           |
| Encrypt and Flash your Project                          |                                        |                                           |
| Erase Flash Memory from Device                          | <kbd>⌘</kbd> <kbd>I</kbd> <kbd>R</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>R</kbd> |
| Execute Custom Task                                     | <kbd>⌘</kbd> <kbd>I</kbd> <kbd>J</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>J</kbd> |
| Flash your project                                      | <kbd>⌘</kbd> <kbd>I</kbd> <kbd>F</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>F</kbd> |
| Flash (DFU) your project                                |                                        |                                           |
| Flash (UART) your project                               |                                        |                                           |
| Flash (with JTag)                                       |                                        |                                           |
| Full Clean Project                                      | <kbd>⌘</kbd> <kbd>I</kbd> <kbd>X</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>X</kbd> |
| Get eFuse Summary                                       |                                        |                                           |
| Get HTML Coverage Report for project                    |                                        |                                           |
| Import ESP-IDF Project                                  |                                        |                                           |
| Install ESP-ADF                                         |                                        |                                           |
| Install ESP-IDF Python Packages                         |                                        |                                           |
| Install ESP-MDF                                         |                                        |                                           |
| Install ESP-Matter                                      |                                        |                                           |
| Install ESP-Rainmaker                                   |                                        |                                           |
| Install ESP-HomeKit-SDK                                 |                                        |                                           |
| Launch IDF Monitor for CoreDump / GDB-Stub Mode         |                                        |                                           |
| Launch QEMU Server                                      |                                        |                                           |
| Launch QEMU Debug Session                               |                                        |                                           |
| Monitor device                                          | <kbd>⌘</kbd> <kbd>I</kbd> <kbd>M</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>M</kbd> |
| Monitor QEMU Device                                     |                                        |                                           |
| New Project                                             | <kbd>⌘</kbd> <kbd>I</kbd> <kbd>N</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>N</kbd> |
| Open ESP-IDF Terminal                                   | <kbd>⌘</kbd> <kbd>I</kbd> <kbd>T</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>T</kbd> |
| NVS Partition Editor                                    |                                        |                                           |
| Partition Table Editor                                  |                                        |                                           |
| Pick a workspace folder                                 |                                        |                                           |
| Remove Editor coverage                                  |                                        |                                           |
| Run idf.py reconfigure task                             |                                        |                                           |
| Run ESP-IDF-SBOM vulnerability check                    |                                        |                                           |
| Save Default SDKCONFIG file (save-defconfig)            |                                        |                                           |
| SDK Configuration editor                                | <kbd>⌘</kbd> <kbd>I</kbd> <kbd>G</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>G</kbd> |
| Search in documentation...                              | <kbd>⌘</kbd> <kbd>I</kbd> <kbd>Q</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>Q</kbd> |
| Select Flash Method                                     |                                        |                                           |
| Select port to use                                      | <kbd>⌘</kbd> <kbd>I</kbd> <kbd>P</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>P</kbd> |
| Select OpenOCD Board Configuration                      |                                        |                                           |
| Select where to save configuration settings             |                                        |                                           |
| Select output and notification mode                     |                                        |                                           |
| Set default sdkconfig file in project                   |                                        |                                           |
| Set Espressif device target                             |                                        |                                           |
| Set ESP-MATTER Device Path (ESP_MATTER_DEVICE_PATH)     |                                        |                                           |
| Show Examples Projects                                  |                                        |                                           |
| Show Ninja Build Summary                                |                                        |                                           |
| Size analysis of the binaries                           | <kbd>⌘</kbd> <kbd>I</kbd> <kbd>S</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>S</kbd> |
| Unit Test: Build and flash unit test app for testing    |                                        |                                           |
| Unit Test: Install ESP-IDF PyTest requirements          |                                        |                                           |
| Search Error Hint                                       |                                        |                                           |

# About commands

1. The **Add Arduino-ESP32 as ESP-IDF Component** command will add [Arduino-ESP32](https://github.com/espressif/arduino-esp32) as a ESP-IDF component in your current directory (`${CURRENT_DIRECTORY}/components/arduino`).

   > **NOTE:** Not all versions of ESP-IDF are supported. Make sure to check [Arduino-ESP32](https://github.com/espressif/arduino-esp32) to see if your ESP-IDF version is compatible.

2. You can also use the **ESP-IDF: Create Project from Extension Template** command with `arduino-as-component` template to create a new project directory that includes Arduino-ESP32 as an ESP-IDF component.

3. The **Install ESP-ADF** will clone ESP-ADF inside the selected directory and set `idf.espAdfPath` (`idf.espAdfPathWin` in Windows) configuration setting.

4. The **Install ESP-Matter** will clone ESP-Matter inside the selected directory and set `idf.espMatterPath` configuration setting. The **ESP-IDF: Set ESP-MATTER Device Path (ESP_MATTER_DEVICE_PATH)** is used to define the device path for ESP-Matter. **ESP-Matter is not supported in Windows**.

5. The **Install ESP-MDF** will clone ESP-MDF inside the selected directory and set `idf.espMdfPath` (`idf.espMdfPathWin` in Windows) configuration setting.

6. The **Install ESP-HomeKit-SDK** will clone ESP-HomeKit-SDK inside the selected directory and set `idf.espHomeKitSdkPath` (`idf.espHomeKitSdkPathWin` in Windows) configuration setting.

7. The **Show Examples Projects** command allows you create a new project using one of the examples in ESP-IDF, ESP-ADF, ESP-Matter, ESP-HomeKit-SDK or ESP-MDF directory if related configuration settings are correctly defined.

# Commands for tasks.json and launch.json

We have implemented some utilities commands that can be used in tasks.json and launch.json that can be used like:

```json
"miDebuggerPath": "${command:espIdf.getToolchainGdb}"
```

- `espIdf.getExtensionPath`: Get the installed location absolute path.
- `espIdf.getOpenOcdScriptValue`: Return the value of OPENOCD_SCRIPTS from `idf.customExtraVars` or from system OPENOCD_SCRIPTS environment variable.
- `espIdf.getOpenOcdConfig`: Return the openOCD configuration files as string. Example `-f interface/ftdi/esp32_devkitj_v1.cfg -f board/esp32-wrover.cfg`.
- `espIdf.getProjectName`: Return the project name from current workspace folder `build/project_description.json`.
- `espIdf.getToolchainGcc`: Return the absolute path of the toolchain gcc for the ESP-IDF target given by `idf.adapterTargetName` configuration setting and `idf.customExtraPaths`.
- `espIdf.getToolchainGdb`: Return the absolute path of the toolchain gdb for the ESP-IDF target given by `idf.adapterTargetName` configuration setting and `idf.customExtraPaths`.

See an example in the [debugging](./docs/DEBUGGING.md) documentation.

# Available Tasks in tasks.json

A template Tasks.json is included when creating a project using **ESP-IDF: Create Project from Extension Template**. These tasks can be executed by running <kbd>F1</kbd>, writing `Tasks: Run task` and selecting one of the following:

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

1. In Visual Studio Code select menu **View** -> **Output** -> **ESP-IDF**. This output information is useful to know what is happening in the extension.
2. In Visual Studio Code select menu **View** then click **Command Palette...** and type `ESP-IDF: Doctor Command` to generate a report of your environment configuration and it will be copied in your clipboard to paste anywhere.
3. Check log file which can be obtained from:

- Windows: `%USERPROFILE%\.vscode\extensions\espressif.esp-idf-extension-VERSION\esp_idf_vsc_ext.log`
- Linux & MacOSX: `$HOME/.vscode/extensions/espressif.esp-idf-extension-VERSION/esp_idf_vsc_ext.log`

4. In Visual Studio Code, select menu **Help** -> `Toggle Developer Tools` and copy any error in the Console tab related to this extension.

5. Make sure that your extension is properly configured as described in [JSON Manual Configuration](./docs/SETUP.md#JSON-Manual-Configuration). Visual Studio Code allows the user to configure settings at different levels: **Global (User Settings)**, **Workspace** and **Workspace Folder** so make sure your project has the right settings. The `ESP-IDF: Doctor command` result might give the values from user settings instead of the workspace folder settings.

6. Review the [OpenOCD troubleshooting FAQ](https://github.com/espressif/openocd-esp32/wiki/Troubleshooting-FAQ) related to the `OpenOCD` output, for application tracing, debug or any OpenOCD related issues.

If there is any Python package error, please try to reinstall the required python packages with the **ESP-IDF: Install ESP-IDF Python Packages** command. Please consider that this extension install ESP-IDF, this extension's and ESP-IDF Debug Adapter python packages when running the **ESP-IDF: Configure ESP-IDF Extension** setup wizard.

> **NOTE:** When downloading ESP-IDF using git cloning in Windows if you receive errors like "unable to create symlink", enabling `Developer Mode` while cloning ESP-IDF could help resolve the issue.

If the user can't resolve the error, please search in the [github repository issues](http://github.com/espressif/vscode-esp-idf-extension/issues) for existing errors or open a new issue [here](https://github.com/espressif/vscode-esp-idf-extension/issues/new/choose).

# Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](./docs/CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [vscode@espressif.com](mailto:vscode@espressif.com).

# License

This extension is licensed under the Apache License 2.0. Please see the [LICENSE](./LICENSE) file for additional copyright notices and terms.
