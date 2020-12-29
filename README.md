<a href="https://marketplace.visualstudio.com/items?itemName=espressif.esp-idf-extension">
  <img src="./media/espressif_icon.png" alt="espressif logo" title="Espressif" align="right" height="60" />
</a>

ESP-IDF VS Code Extension
===

Develop and debug applications for Espressif [ESP32](https://espressif.com/en/products/hardware/esp32), [ESP32-S2](https://www.espressif.com/en/products/socs/esp32-s2) chips with [ESP-IDF](https://github.com/espressif/esp-idf) IoT Development Framework.

<a href="https://youtu.be/Lc6ausiKvQM">
  <p align="center">
    <img src="./media/youtube_tutorial_preview.png" alt="Quick User Guide for the ESP-IDF VS Code Extension" width="1024">
  </p>
</a>

The ESP-IDF extension makes it easy to develop, build, flash, monitor and debug your ESP-IDF code, some functionality includes:

- Quick [Configure ESP-IDF extension](https://github.com/espressif/vscode-esp-idf-extension/blob/master/docs/ONBOARDING.md) for first time user to help you download, install and setup ESP-IDF and required tools within Visual Studio Code extension.
- Quick prototyping by copying ESP-IDF examples with **ESP-IDF: Show ESP-IDF Examples Projects**.
- App tracing when using ESP-IDF Application Level Tracing Library like in [ESP-IDF Application Level Tracing Example](https://github.com/espressif/esp-idf/tree/master/examples/system/app_trace_to_host).
- Size analysis of binaries with **ESP-IDF: Size analysis of the binaries**.
- [SDK Configuration editor](#SDK-Configuration-editor) to configure your ESP-IDF project (esp-idf menuconfig).
- Easily Build, Flash and Monitor your code for the ESP-32 and ESP32 S2 chip.
- Syntax highlighting for [KConfig](https://docs.espressif.com/projects/esp-idf/en/latest/api-reference/kconfig.html) and ESP-IDF Kconfig style syntax validation if enabled.
- Localization (English, Chinese, Spanish) of commands which you can also [add a language contribution](https://github.com/espressif/vscode-esp-idf-extension/blob/master/docs/LANG_CONTRIBUTE.md).
- OpenOCD server within Visual Studio Code.
- [Code Coverage](./docs/COVERAGE.md) for editor source highlighting and generate HTML reports.
- Search text editor's selected text in ESP-IDF documentation with **ESP-IDF: Search in documentation...** right click command or with its [keyboard shortcut](#Available-commands). Results will be shown in ESP-IDF Explorer Tab if found on ESP-IDF Documentation based on your current vscode language, ESP-IDF version in `idf.espIdfPath` (latest otherwise) and `idf.adapterTargetName`.

## Prerequisites

There are a few dependencies which needs to be downloaded and installed before you can continue to use the extension. All the other dependencies like ESP-IDF or toolchain will be taken care by the [onboarding](./docs/ONBOARDING.md) process.

- [Python 3.5](https://www.python.org/download/releases/3.5/)+
- [Git](https://git-scm.com/downloads)
- [CMake](https://cmake.org/download) and [Ninja](https://github.com/ninja-build/ninja/releases) for **Linux or MacOS users**. For Windows users, it is part of the onboarding configuration tools intall.

> Please note that this extension **only [supports](https://github.com/espressif/esp-idf/blob/master/SUPPORT_POLICY.md)** the release versions of ESP-IDF, you can still use the extension on `master` branch or some other branch, but certain feature might not work fully.


## Quick Installation Guide

There are several ways to install this extension to your VSCode, easiest one is from VSCode Marketplace. However if you are looking to contribute to this project we suggest you to have install in [Source mode](#Build-from-Source-Code).

### Marketplace Installation

#### _[Link to the marketplace](https://marketplace.visualstudio.com/items?itemName=espressif.esp-idf-extension)_

Launch VSCode Quick Open (<kbd>⌘</kbd>+<kbd>P</kbd> on Mac or <kbd>Ctrl</kbd>+<kbd>P</kbd> on Windows) and then paste the following command and press enter

    ext install esp-idf-extension

### Install from `.vsix` file

To install from `.vsix` file, first head to [releases page](https://github.com/espressif/vscode-esp-idf-extension/releases/) pick the latest release and download the `esp-idf-extension-VERSION.vsix` file and press <kbd>F1</kbd> and type `Install from VSIX` and then select the downloaded `.vsix` file.

### Build from Source Code

- Install [Node.js](https://nodejs.org/en/)
- Make sure have the [C/C++ Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) from Visual Studio Code Marketplace.
- Clone this repository `git clone https://github.com/espressif/vscode-esp-idf-extension.git`
- Install all the dependencies, using `yarn`
- Press <kbd>F5</kbd> to Run with Debugger, this will launch a new VSCode Extension Development Host to debug the extension.
- Compile project with `yarn webpack` (optional for production)

#### Build vsix locally

- Build the Visual Studio Code extension setup with `yarn package`

## Uninstalling the plugin

- In Visual Studio Code, go to the Extensions tab.
- Click on the EspressifIDF extension lower right icon.
- Click Uninstall.
- Go to your `${VSCODE_EXTENSION_DIR}` and make sure to delete the Espressif IDF plugin folder.

## How to use

- First set up your Visual Studio Code as explained in the former section.
- Then
  - Either open Visual Studio Code and create a workspace folder.
  - Run `code ${YOUR_PROJECT_DIR}` from the command line.
- Press <kbd>F1</kbd> and type **ESP-IDF: Configure ESP-IDF extension** to configure the extension Please take a look at [ONBOARDING](./docs/ONBOARDING.md) for more detail about extension configuration.

- Press <kbd>F1</kbd> and type **ESP-IDF: Create ESP-IDF project** to generate a template ESP-IDF project.

  > **Note:** If you want to get code navigation and ESP-IDF function references, build the project a first time. This will generate the required **compile_commands.json** used by [Microsoft C/C++ Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) to resolve header/source links. You can do a rebuild by pressing <kbd>F1</kbd> and typing **ESP-IDF: Build your project**. If you don't want to build your project beforehand, you can configure your project using [C/C++ Configuration](./docs/C_CPP_CONFIGURATION.md)

- Do some coding!
- Check you set the correct port of your device by pressing <kbd>F1</kbd>, typing **ESP-IDF: Select port to use:** and choosing the serial port your device is connected.
- When you are ready, build your project. Then flash to your device by pressing <kbd>F1</kbd> and typing **ESP-IDF: Flash your device** then selecting Flash allows you to flash the device.
- You can later start a monitor by pressing <kbd>F1</kbd> and typing **ESP-IDF: Monitor your device** which will log the activity in a Visual Studio Code terminal.
- If you want to start a debug session, just press F5 (make sure you had at least build and flash once before so the debugger works correctly). To make sure you can debug your device, set the proper `idf.openOcdConfigs` settings in your settings.json or by pressing <kbd>F1</kbd> and typing **ESP-IDF: Device configuration**.

## Available commands

Click <kbd>F1</kbd> to show Visual studio code actions, then type **ESP-IDF** to see possible actions.

| Command Description                             | Keyboard Shortcuts (Mac)               | Keyboard Shortcuts (Windows/ Linux)       |
| ----------------------------------------------- | -------------------------------------- | ----------------------------------------- |
| Configure ESP-IDF extension                     |                                        |                                           |
| Create ESP-IDF project                          | <kbd>⌘</kbd> <kbd>E</kbd> <kbd>C</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>C</kbd> |
| Add vscode configuration folder                 |                                        |                                           |
| Add Arduino ESP32 as ESP-IDF Component          |                                        |                                           |
| Configure Paths                                 |                                        |                                           |
| Set Espressif device target                     |                                        |                                           |
| Device configuration                            |                                        |                                           |
| SDK Configuration editor                        |                                        |                                           |
| Set default sdkconfig file in project           |                                        |                                           |
| Select port to use                              | <kbd>⌘</kbd> <kbd>E</kbd> <kbd>P</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>P</kbd> |
| Build your project                              | <kbd>⌘</kbd> <kbd>E</kbd> <kbd>B</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>B</kbd> |
| Flash your project                              | <kbd>⌘</kbd> <kbd>E</kbd> <kbd>F</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>F</kbd> |
| Monitor your device                             | <kbd>⌘</kbd> <kbd>E</kbd> <kbd>M</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>M</kbd> |
| Build, Flash and start a monitor on your device | <kbd>⌘</kbd> <kbd>E</kbd> <kbd>D</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>D</kbd> |
| Open ESP-IDF Terminal                           | <kbd>⌘</kbd> <kbd>E</kbd> <kbd>T</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>T</kbd> |
| Pick a workspace folder                         |                                        |                                           |
| Size analysis of the binaries                   | <kbd>⌘</kbd> <kbd>E</kbd> <kbd>S</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>S</kbd> |
| Show Examples Projects                          |                                        |                                           |
| Add Editor coverage                             |                                        |                                           |
| Remove Editor coverage                          |                                        |                                           |
| Get HTML Coverage Report for project            |                                        |                                           |
| Search in documentation...                      | <kbd>⌘</kbd> <kbd>E</kbd> <kbd>D</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>D</kbd> |
| Install ESP-ADF                                 |                                        |                                           |
| Install ESP-MDF                                 |                                        |                                           |

The **Add Arduino ESP32 as ESP-IDF Component** command will add [Arduino ESP32](https://github.com/espressif/arduino-esp32) as a ESP-IDF component in your current directory with in `${CURRENT_FOLDER}/components/arduino`. You can also use **Create ESP-IDF project** with the `arduino-as-component` template to create a new project folder that includes arduino as ESP-IDF component.

The **Show Examples Projects** command allows you create a new project using one of the examples in ESP-IDF, ESP-ADF or ESP-MDF directory if related configuration settings are set. The **Install ESP-ADF** will clone ESP-ADF and set `idf.espAdfPath` (`idf.espAdfPathWin` in Windows). **Install ESP-MDF** will clone ESP-MDF and set `idf.espMdfPath` (`idf.espMdfPathWin` in Windows).

## ESP-IDF Configure extension

Initial configuration is done easily by executing **ESP-IDF: Configure ESP-IDF extension** Please take a look at [ONBOARDING](./docs/ONBOARDING.md) for more in-depth detail. This window is always shown when extension is activated which you can disable with `idf.showOnboardingOnInit`.

This windows helps you setup key Visual Studio Code configurations for this extension to perform included features correctly. This is how the extension uses them:

1. `idf.pythonBinPath` is used to executed python scripts within the extension. In **ESP-IDF: Configure ESP-IDF extension** we first select a system-wide python executable from which to create a python virtual environment and we save the executable from this virtual environment in `idf.pythonBinPath`. All required python packages by ESP-IDF are installed in this virtual environment, if using **ESP-IDF: Configure ESP-IDF extension**
2. `idf.customExtraPaths` is pre-appended to your system environment variable PATH within Visual Studio Code **(not modifying your system environment)** before executing any of our extension commands such as `openocd` or `cmake` (i.e. build your current project) else extension commands will try to use what is already in your system PATH. In **ESP-IDF: Configure ESP-IDF extension** you can download ESP-IDF Tools or skip IDF Tools download and manually enter all required ESP-IDF Tools as explain in [ONBOARDING](./docs/ONBOARDING.md) which will be saved in `idf.customExtraPaths`.
3. `idf.customExtraVars` stores any custom environment variable we use such as OPENOCD_SCRIPTS, which is the openOCD scripts directory used in openocd server startup. We add these variables to visual studio code process environment variables, choosing the extension variable if available, else extension commands will try to use what is already in your system PATH. **This doesn't modify your system environment outside Visual Studio Code.**
4. `idf.adapterTargetName` is used to select the chipset (esp32, esp32 s2, etc.) on which to run our extension commands.
5. `idf.openOcdConfigs` is used to store an array of openOCD scripts directory relative path config files to use with OpenOCD server. (Example: ["interface/ftdi/esp32_devkitj_v1.cfg", "board/esp32-wrover.cfg"]).
6. `idf.espIdfPath` is used to store ESP-IDF directory path within our extension. We override Visual Studio Code process IDF_PATH if this value is available. **This doesn't modify your system environment outside Visual Studio Code.**

**Note**: From Visual Studio Code extension context, we can't modify your system PATH or any other environment variable. We do override the current Visual Studio Code process environment variables which might collide with other extension you might have installed. Please review the content of `idf.customExtraPaths` and `idf.customExtraVars` in case you have issues with other extensions.

## ESP IDF Settings

This extension contributes the following settings that can be later updated in settings.json or from VSCode Settings Preference menu (F1 -> Preferences: Open Settings (UI)).

### ESP-IDF Specific Settings

These are the configuration settings that ESP-IDF extension contributes to your Visual Studio Code editor settings.

| Setting ID                   | Description                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `idf.espIdfPath`             | Path to locate ESP-IDF framework (IDF_PATH)                                   |
| `idf.espIdfPathWin`          | Path to locate ESP-IDF framework in Windows (IDF_PATH)                        |
| `idf.espAdfPath`             | Path to locate ESP-ADF framework (ADF_PATH)                                   |
| `idf.espAdfPathWin`          | Path to locate ESP-ADF framework in Windows (ADF_PATH)                        |
| `idf.espMdfPath`             | Path to locate ESP-MDF framework (MDF_PATH)                                   |
| `idf.espMdfPathWin`          | Path to locate ESP-MDF framework in Windows (MDF_PATH)                        |
| `idf.toolsPath`              | Path to locate ESP-IDF Tools (IDF_TOOLS_PATH)                                 |
| `idf.toolsPathWin`           | Path to locate ESP-IDF Tools in Windows (IDF_TOOLS_PATH)                      |
| `idf.pythonBinPath`          | Python absolute binary path used to execute ESP-IDF Python Scripts            |
| `idf.pythonBinPathWin`       | Python absolute binary path used to execute ESP-IDF Python Scripts in Windows |
| `idf.customExtraPaths`       | Paths to be appended to \$PATH                                                |
| `idf.customExtraVars`        | Variables to be added to system environment variables                         |
| `idf.useIDFKconfigStyle`     | Enable style validation for Kconfig files                                     |
| `idf.showOnboardingOnInit`   | Show ESP-IDF Configuration window on extension activation                     |
| `idf.adapterTargetName`      | ESP-IDF target Chip (Example: esp32)                                          |
| `idf.openOcdConfigs`         | Configuration files for OpenOCD. Relative to OPENOCD_SCRIPTS folder           |
| `idf.saveBeforeBuild`        | Save all the edited files before building (default `true`)                    |
| `idf.coveredLightTheme`      | Background color for covered lines in light theme for gcov coverage           |
| `idf.coveredDarkTheme`       | Background color for covered lines in dark theme for gcov coverage            |
| `idf.partialLightTheme`      | Background color for partially covered lines in light theme for gcov coverage |
| `idf.partialDarkTheme`       | Background color for partially covered lines in dark theme for gcov coverage  |
| `idf.uncoveredLightTheme`    | Background color for uncovered lines in light theme for gcov coverage         |
| `idf.uncoveredDarkTheme`     | Background color for uncovered lines in dark theme for gcov coverage          |
| `idf.notificationSilentMode` | Silent all notifications messages (excluding error notifications)             |

When you use the command **ESP-IDF: Set Espressif device target** it will override `idf.adapterTargetName` with selected chip and `idf.openOcdConfigs` with its default OpenOCD Configuration files. If you want to customize the `idf.openOcdConfigs` alone, you can modify your user settings.json or use **ESP-IDF: Device configuration** and select `Enter OpenOCD Configuration File Paths list` by entering each file separated by comma ",".

### Board/ Chip Specific Settings

These settings are specific to the ESP32 Chip/ Board

| Setting             | Description                             |
| ------------------- | --------------------------------------- |
| `idf.port`          | Path of selected device port            |
| `idf.portWin`       | Path of selected device port in Windows |
| `idf.flashBaudRate` | Flash Baud rate                         |

The ESP-IDF Monitor default baud rate value is taken from your project's skdconfig `CONFIG_ESPTOOLPY_MONITOR_BAUD` (idf.py monitor' baud rate).
This value can be override by setting the environment variable `IDF_MONITOR_BAUD` or `MONITORBAUD` in your system environment variables or this extension's `idf.customExtraVars` configuration setting.

### Log Tracing Specific Settings

These settings are specific to the Log Tracing

| Setting             | Description                              |
| ------------------- | ---------------------------------------- |
| `trace.poll_period` | poll_period will be set for the apptrace |
| `trace.trace_size`  | trace_size will set for the apptrace     |
| `trace.stop_tmo`    | stop_tmo will be set for the apptrace    |
| `trace.wait4halt`   | wait4halt will be set for the apptrace   |
| `trace.skip_size`   | skip_size will be set for the apptrace   |

**NOTE:** Please consider that `~` and `$VAR` are not recognized when you set one of the previous path. You can instead set any environment variable in the path using a `${env:VARNAME}` such as `${env:HOME}` or you can refer to other configuration parameter path such as `${config:idf.espIdfPath}`.

### Use of environment variables in ESP-IDF settings.json and tasks.json

Environment (env) variables and other ESP-IDF settings (config) current values strings can be used in other ESP-IDF setting as `${env:VARNAME}` and `${config:ESPIDFSETTING}`, respectively.

Example : If you want to use `"~/esp/esp-idf"` you can set the value of `idf.espIdfPath` to `"${env:HOME}/esp/esp-idf"`.

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

## SDK Configuration editor

This plugin includes a GUI menuconfig that reads your current project folder's sdkconfig file (if available, otherwise it would take default values) and start a configuration server process (confserver.py in **\${ESP-IDF-DIRECTORYPATH}**/tools) that enables the user to redefine ESP-IDF board parameters.

When the user modify a parameter value, the value is send to the confserver.py process, which return the new value and other values modified to GUI menuconfig and then update the values in the UI.

Values are not automatically saved to the sdkconfig file until you click save changes. You can cancel any changes and load the values from the sdkconfig file by clicking cancel changes. If you click set default the current sdkconfig file is replaced by a template sdkconfig file and then loaded into the GUI menuconfig rendered values.

The search functionality allows to find a parameter by description, i.e the name that appears in the sdkconfig file.

An IDF GUI Menuconfig log in Output is created to print all communications with `${idf.espIdfPath}\tools\confserver.py`. It can be be used to track any errors.

## Working with multiple projects

For big projects, a user will typically have one or more projects to build, flash or monitor. The ESP-IDF uses the [Visual Studio Code Workspace file schema](https://code.visualstudio.com/docs/editor/multi-root-workspaces#_workspace-file-schema) to identify all projects folders inside the current workspace (which would be the root folder).

You can select the current project by clicking the **IDF Current Project** Item in the Visual Studio Code Status bar or by pressing F1 and typing **ESP-IDF: Pick a workspace folder for IDF commands** which will determine the folder where to obtain the ESP-IDF Settings such as current device USB port, ESP-IDF path, etc.

Projects folders and workspace level settings are defined in the `.code-workspace` file such as:

```json
{
  "folders": [
    {
      "path": "./project1"
    },
    {
      "path": "./project2"
    }
  ],
  "settings": {
    "idf.port": "/dev/ttyUSB1",
    "idf.espIdfPath": "${env:HOME}/esp/esp-idf"
  }
}
```

Settings in the root folder's `.code-workspace` can be used when your current project directory doesn't contain a `.vscode/settings.json` file.

If you want to open a project with multiple subprojects in Visual Studio Code, click Menu **File** then **Open Workspace** which will open a window to select the `.code-workspace` of your root project. You can either manually create this `.code-workspace` file and define all sub folders (projects) or when you click Menu **File** --> **Save Workspace as...** which doesn't automatically add any folder inside the current directory. You can add a folder to the workspace when you click Menu **File** --> **Add Folder to Workspace...**.

**NOTE:** You still need to manually select the debug configuration in the Debug tab that correspond to your current workspace folder. There is a project folder suffix on each debug configuration.

## Code Coverage

We provide editor code coverage highlight and HTML reports for ESP-IDF projects, if coverage files are generated on a ESP-IDF project's build directory. For more info please take a look at [Code Coverage](./docs/COVERAGE.md).

## Debugging

Click <kbd>F5</kbd> to start debugging. For correct debug experience, first `build`, `flash` your device and define the correct `idf.customExtraPaths` paths and `idf.customExtraVars` using [ONBOARDING](./docs/ONBOARDING.md).

When you start debug, an OpenOCD process starts in the background. OpenOCD Output log window is created in Visual Studio Code lower panel. To configure your project's launch.json to debug, please review [DEBUGGING](./docs/DEBUGGING.md).

## Log & Heap Tracing

We support [log](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/app_trace.html) and [heap tracing](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/system/heap_debug.html) out of the box, which enables users to perform log/heap tracing with just few button clicks and present the results of tracing data with UI.

You can follow [this](./docs/HEAP_TRACING.md) quick step-by-step guide for heap tracing.

## System View Tracing Viewer

We have provide a [system view tracing viewer](./docs/SYS_VIEW_TRACING_VIEWER.md) inside the vscode extension which will enable you to view the traces along with other relevant details.

## Kconfig files editor

When you open a `Kconfig`, `Kconfig.projbuild` or `Kconfig.in` file we provide syntax highlighting. If `idf.useIDFKconfigStyle` is enabled, we also provide ESP-IDF Kconfig style syntax validation such as indent validation and not closing blocks found (Example: menu-endmenu). Please review [Kconfig Formatting Rules](https://docs.espressif.com/projects/esp-idf/en/latest/api-reference/kconfig.html) and [Kconfig Language](https://github.com/espressif/esp-idf/blob/master/tools/kconfig/kconfig-language.txt) for further details about the ESP-IDF Kconfig formatting rules and Kconfig language in general.

# CMake Editor

On CMakeLists.txt file right click this extension provides a custom CMake Editor to fill our ESP-IDF Project and Component registration as specified in [ESP-IDF Project CMakeLists.txt](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/build-system.html#project-cmakelists-file) and [ESP-IDF Component CMakeLists.txt files](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/build-system.html#component-cmakelists-files). You need to choose which kind of CMakeLists.txt file (project or component) to edit. There is 2 types of input, one is a simple string and another is an array of strings, such as Component Sources (SRCS). All inputs are described in the CMakeLists.txt Schema (\${this_repository}/src/cmake/cmakeListsSchema.json).

## ESP Rainmaker Support

We support connecting, viewing and editing of ESP Rainmaker enabled devices out of the box, please [refer here](/docs/ESP_RAINMAKER.md) for more info.

## Forum

If you are lost at any point you can always ask question, help and suggestion in the [forum](https://spectrum.chat/espidf-vsc?tab=posts), apart from creating Github Issues. For all the [ESP-IDF](https://github.com/espressif/esp-idf) related concerns please follow [their suggested channel](https://esp32.com) of communications.

## Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](./docs/CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [vscode@espressif.com](mailto:vscode@espressif.com).

## License

This extension is licensed under the Apache License 2.0. Please see the [LICENSE](./LICENSE) file for additional copyright notices and terms.
