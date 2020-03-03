# ESP-IDF Visual Studio Code Extension

Visual Studio Code extension for Espressif IoT Development Framework, [ESP-IDF](https://github.com/espressif/esp-idf) is official development framework for the [ESP-32](https://espressif.com/en/products/hardware/esp32/overview) chip.

The ESP-IDF extension makes it easy to develop, build, flash, monitor and debug your ESP-IDF code, some functionality includes:

- Quick [Configure ESP-IDF extension](https://github.com/espressif/vscode-esp-idf-extension/blob/master/docs/ONBOARDING.md) for first time user to help you download, install and setup ESP-IDF and required tools within Visual Studio Code extension.
- Quick prototyping by copying ESP-IDF examples with **ESP-IDF: Show ESP-IDF Examples Projects**.
- App tracing when using ESP-IDF Application Level Tracing Library like in [ESP-IDF Application Level Tracing Example](https://github.com/espressif/esp-idf/tree/master/examples/system/app_trace_to_host).
- Size analysis of binaries with **ESP-IDF: Size analysis of the binaries**.
- [GUI Menuconfig tool](#ESP-IDF-GUI-Menuconfig-tool) within the extension with enabled search.
- Easily Build, Flash and Monitor your code for the ESP-32 chip.
- Syntax highlighting for [KConfig](https://docs.espressif.com/projects/esp-idf/en/latest/api-reference/kconfig.html) and ESP-IDF Kconfig style syntax validation if enabled.
- Localization (English, Chinese, Spanish)of commands which you can also [add a language contribution](https://github.com/espressif/vscode-esp-idf-extension/blob/master/docs/LANG_CONTRIBUTE.md).
- OpenOCD server within Visual Studio Code.

## Prerequisites

There are a few dependencies which needs to be downloaded and installed before you can continue to use the extension.

- [Python 3.5](https://www.python.org/download/releases/3.5/)+
- [Git](https://www.python.org/downloads)
- [CMake](https://cmake.org/download) and [Ninja](https://github.com/ninja-build/ninja/releases) for Linux/MacOS users. For Windows users, it is part of the onboarding configuration tools intall.
- ESP-IDF [CMake Version](https://docs.espressif.com/projects/esp-idf/en/latest/get-started-cmake/index.html) (> 4.x Recommended).
- [ESP-IDF Prerequisites](https://docs.espressif.com/projects/esp-idf/en/latest/get-started/index.html#step-1-install-prerequisites)

## Coming Soon 🔜

- Heap Tracing with complete GUI
- VSCode Remote

## Quick Installation Guide

There are several ways to install this extension to your VSCode, easiest one is from VSCode Marketplace. However if you are looking to contribute to this project we suggest you to have install in [source mode](#Source-Mode)

### Marketplace Installation

#### _[Link to the marketplace](https://marketplace.visualstudio.com/items?itemName=espressif.esp-idf-extension)_

Launch VSCode Quick Open (<kbd>⌘</kbd>+<kbd>P</kbd> on Mac or <kbd>Ctrl</kbd>+<kbd>P</kbd> on Windows) and then paste the following command and press enter

```none
ext install esp-idf-extension
```

### Install from `.vsix` file

To install from `.vsix` file, first head to [releases page](https://github.com/espressif/vscode-esp-idf-extension/releases/) pick the latest release and download the `esp-idf-extension-VERSION.vsix` file and press <kbd>F1</kbd> and type `Install from VSIX` and then select the downloaded `.vsix` file.

### Build from Source Code

- Install [Node.js](https://nodejs.org/en/)
- Make sure have the [C/C++ Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) from Visual Studio Code Marketplace.
- Clone this repository `git clone https://github.com/espressif/vscode-esp-idf-extension.git`
- Install all the dependencies, using `yarn`
- Compile typescript with `yarn run compile`
- Bundle the webviews using `yarn run webpack`.
- Press <kbd>F5</kbd> to Run with Debugger, this will launch a new VSCode Extension Development Host to debug the extension.

#### Build vsix locally

- Build the Visual Studio Code extension setup with `yarn run build_vsix`

## Uninstalling the plugin

- In Visual Studio Code, go to the Extensions tab.
- Click on the EspressifIDF extension lower right icon.
- Click Uninstall.
- Go to your `{VSCODE_EXTENSION_DIR}` and make sure to delete the Espressif IDF plugin folder.

## How to use

- First set up your Visual Studio Code as explained in the former section.
- Then
    - Either open Visual Studio Code and create a workspace folder.
    - Run `code {YOUR_PROJECT_DIR}` from the command line.
- Press <kbd>F1</kbd> and type **ESP-IDF: Configure ESP-IDF extension** to configure the extension Please take a look at [ONBOARDING](./docs/ONBOARDING.md) for more detail.

- Press <kbd>F1</kbd> and type **ESP-IDF: Create ESP-IDF project** to generate a template ESP-IDF project.

    __Note:__ If you want to get code navigation and ESP-IDF function references, build the project a first time. This will generate the required __compile_commands.json__ used by [Microsoft C/C++ Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) to resolve header/source links. You can do a rebuild by pressing <kbd>F1</kbd> and typing **ESP-IDF: Build your project**. If you don't want to build your project beforehand, you can configure your project using [C/C++ Configuration](./docs/C_CPP_CONFIGURATION.md)

- Do some coding!
- Check you set the correct port of your device by pressing <kbd>F1</kbd>, typing **ESP-IDF: Select port to use:** and choosing the serial port your device is connected.
- When you are ready, build your project. Then flash to your device by pressing <kbd>F1</kbd> and typing **ESP-IDF: Flash your device** then selecting Flash allows you to flash the device.
- You can later start a monitor by pressing <kbd>F1</kbd> and typing **ESP-IDF: Monitor your device** which will log the activity in a Visual Studio Code terminal.
- If you want to start a debug session, just press F5 (make sure you had at least build and flash once before so the debugger works correctly). To make sure you can debug your device, set the proper `idf.openOcdConfigs` settings in your settings.json or by pressing <kbd>F1</kbd> and typing **ESP-IDF: Device configuration**.

## Available commands

Click <kbd>F1</kbd> to show Visual studio code actions, then type __ESP-IDF__ to see possible actions.

| Command Description | Keyboard Shortcuts (Mac) | Keyboard Shortcuts (Windows/ Linux) |
| --- | --- | --- |
| Configure ESP-IDF extension |
| Create ESP-IDF project | <kbd>⌘</kbd> <kbd>E</kbd> <kbd>C</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>C</kbd> |
| Add vscode configuration folder |
| Configure Paths |||
| Set Espressif device target |
| Device configuration |||
| Launch gui configuration tool |||
| Set default sdkconfig file in project |||
| Select port to use |<kbd>⌘</kbd> <kbd>E</kbd> <kbd>P</kbd>| <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>P</kbd> |
| Build your project |<kbd>⌘</kbd> <kbd>E</kbd> <kbd>B</kbd>| <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>B</kbd> |
| Flash your project |<kbd>⌘</kbd> <kbd>E</kbd> <kbd>F</kbd>| <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>F</kbd> |
| Monitor your device |<kbd>⌘</kbd> <kbd>E</kbd> <kbd>M</kbd>| <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>M</kbd> |
| Build, Flash and start a monitor on your device |<kbd>⌘</kbd> <kbd>E</kbd> <kbd>D</kbd>| <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>D</kbd> |
| Pick a workspace folder |||
| Size analysis of the binaries |<kbd>⌘</kbd> <kbd>E</kbd> <kbd>S</kbd>| <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>S</kbd> |
| Show ESP-IDF Examples Projects |

## ESP-IDF Configure extension

Initial configuration is done easily by executing **ESP-IDF: Configure ESP-IDF extension** Please take a look at [ONBOARDING](./docs/ONBOARDING.md) for more in-depth detail. This window is always shown when extension is activated which you can disable with `idf.showOnboardingOnInit`.

This windows helps you setup key Visual Studio Code configurations for this extension to perform included features correctly. This is how the extension uses them:

1) `idf.pythonBinPath` is used to executed python scripts within the extension. In **ESP-IDF: Configure ESP-IDF extension** we first select a `idf.pythonSystemBinPath` from which we create a python virtual environment and we save the executable from this virtual environment in `idf.pythonBinPath`. All required python packages by ESP-IDF are installed in this virtual environment, if using **ESP-IDF: Configure ESP-IDF extension**
2) `idf.customExtraPaths` is pre-appended to your system environment variable PATH within visual studio code __(not modifying your system environment)__ before executing any of our extension commands such as openocd or cmake (build your current project) else extension commands will try to use what is already in your system PATH. In **ESP-IDF: Configure ESP-IDF extension** you can download ESP-IDF Tools or skip download and manually enter all required ESP-IDF Tools as explain in [ONBOARDING](./docs/ONBOARDING.md) which will be saved in `idf.customExtraPaths`.
3) `idf.customExtraVars` stores any custom environment variable we use such as OPENOCD_SCRIPTS, which is the openOCD scripts directory used in openocd server startup. We add these variables to visual studio code process environment variables, choosing the extension variable if available, else extension commands will try to use what is already in your system PATH. __This doesn't modify your system environment outside visual studio code.__
4) `idf.adapterTargetName` is used to select the chipset (esp32, esp32 s2, etc.) on which to run our extension commands.
5) `idf.openOcdConfigs` is used to store an array of openOCD scripts directory relative path config files to use with OpenOCD server. (Example: ["interface/ftdi/esp32_devkitj_v1.cfg", "board/esp32-wrover.cfg"]).
6) `idf.espIdfPath` is used to store ESP-IDF directory path within our extension. We override visual studio code process IDF_PATH if this value is available. __This doesn't modify your system environment outside visual studio code.__

Note: From Visual Studio Code extension context, we can't modify your system PATH or any other environment variable. We do override the current Visual Studio Code process environment variables which might collide with other extension you might have installed. Please review the content of `idf.customExtraPaths` and `idf.customExtraVars` in case you have issues with other extensions.

## ESP-IDF Settings

This extension contributes the following settings that can be later updated in settings.json or from VSCode Settings Preference menu.

### IDF Specific Settings

These are project IDF Project specific settings

| Setting | Description |
| --- | --- |
| `idf.espIdfPath` | Path to locate ESP-IDF framework (IDF_PATH) |
| `idf.toolsPath` | Path to locate ESP-IDF Tools (IDF_TOOLS_PATH) |
| `idf.pythonBinPath` | Python absolute binary path used to execute ESP-IDF Python Scripts |
| `idf.pythonSystemBinPath` | System level Python binary path to append in PATH |
| `idf.customExtraPaths` | Paths to be appended to $PATH |
| `idf.customExtraVars` | Variables to be added to system environment variables |
| `idf.useIDFKconfigStyle` | Enable style validation for Kconfig files |
| `idf.showOnboardingOnInit` | Show ESP-IDF Configuration window on extension activation |
| `idf.adapterTargetName` | ESP-IDF target Chip (Example: esp32) |
| `idf.openOcdConfigs` | Configuration files for OpenOCD. Relative to OPENOCD_SCRIPTS folder |

When you use the command **ESP-IDF: Set Espressif device target** it will override `idf.adapterTargetName` with selected chip and `idf.openOcdConfigs` with its default OpenOCD Configuration files. If you want to customize the `idf.openOcdConfigs` alone, you can modify your user settings.json or use **ESP-IDF: Device configuration** and select `Enter OpenOCD Configuration File Paths list` by entering each file separated by comma ",".

### Board/ Chip Specific Settings

These settings are specific to the ESP32 Chip/ Board

| Setting | Description |
| --- | --- |
| `idf.port` | Path of selected device port |
| `idf.baudRate` | Device Baud rate |

### Log Tracing Specific Settings

These settings are specific to the Log Tracing

| Setting | Description |
| --- | --- |
| `trace.poll_period` | poll_period will be set for the apptrace |
| `trace.trace_size` | trace_size will set for the apptrace |
| `trace.stop_tmo` | stop_tmo will be set for the apptrace |
| `trace.wait4halt` | wait4halt will be set for the apptrace |
| `trace.skip_size` | skip_size will be set for the apptrace |

__NOTE:__ Please consider that `~` is not recognized when you set one of the previous path. You can instead set any environment variable in the path using a `${env:VARNAME}` such as `${env:HOME}` or you can refer to other configuration parameter path such as `${config:idf.espIdfPath}`.

### Use of environment variables in ESP-IDF settings.json and tasks.json

Environment (env) variables and other ESP-IDF settings (config) current values strings can be used in other ESP-IDF setting as `${env:VARNAME}` and `${config:ESPIDFSETTING}`, respectively.

Example : `idf.espIdfPath` = `"${env:HOME}/esp/esp-idf"` would be translated to `"~/esp/esp-idf"`.

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

## ESP-IDF GUI Menuconfig tool

This plugin includes a GUI menuconfig that reads your current project folder's sdkconfig file (if available, otherwise it would take default values) and start a configuration server process (confserver.py in __${ESP-IDF-DIRECTORYPATH}__/tools) that enables the user to redefine ESP-IDF board parameters.

When the user modify a parameter value, the value is send to the confserver.py process, which return the new value and other values modified to GUI menuconfig and then update the values in the UI.

Values are not automatically saved to the sdkconfig file until you click save changes. You can cancel any changes and load the values from the sdkconfig file by clicking cancel changes. If you click set default the current sdkconfig file is replaced by a template sdkconfig file and then loaded into the GUI menuconfig rendered values.

The search functionality allows to find a parameter by description, i.e the name that appears in the sdkconfig file.

An IDF GUI Menuconfig log in Output is created to print all communications with `${idf.espIdfPath}\tools\confserver.py`. It can be be used to track any errors.

## Working with multiple projects

For big projects, a user will typically have one or more projects to build, flash or monitor. The ESP-IDF uses the [Visual Studio Code Workspace file schema](https://code.visualstudio.com/docs/editor/multi-root-workspaces#_workspace-file-schema) to identify all projects folders inside the current workspace (which would be the root folder).

You can select the current project by clicking the __IDF Current Project__ Item in the Visual Studio Code Status bar or by pressing F1 and typing **ESP-IDF: Pick a workspace folder for IDF commands** which will determine the folder where to obtain the ESP-IDF Settings such as current device USB port, ESP-IDF path, etc.

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

If you want to open a project with multiple subprojects in Visual Studio Code, click Menu __File__ then __Open Workspace__ which will open a window to select the `.code-workspace` of your root project. You can either manually create this `.code-workspace` file and define all sub folders (projects) or when you click Menu __File__ --> __Save Workspace as...__ which doesn't automatically add any folder inside the current directory. You can add a folder to the workspace when you click Menu __File__ --> __Add Folder to Workspace...__.

**NOTE:** You still need to manually select the debug configuration in the Debug tab that correspond to your current workspace folder. There is a project folder suffix on each debug configuration.

## Debugging

Click <kbd>F5</kbd> to start debugging. For correct debug experience, first `build`, `flash` your device and define the correct `idf.customExtraPaths` paths and `idf.customExtraVars` using [ONBOARDING](./docs/ONBOARDING.md).

When you start debug, an OpenOCD process starts in the background. OpenOCD Output log window is created in Visual Studio Code lower panel.

## Kconfig files editor

When you open a `Kconfig`, `Kconfig.projbuild` or `Kconfig.in` file we provide syntax highlighting. If `idf.useIDFKconfigStyle` is enabled, we also provide ESP-IDF Kconfig style syntax validation such as indent validation and not closing blocks found (Example: menu-endmenu). Please review [Kconfig Formatting Rules](https://docs.espressif.com/projects/esp-idf/en/latest/api-reference/kconfig.html) and [Kconfig Language](https://github.com/espressif/esp-idf/blob/master/tools/kconfig/kconfig-language.txt) for further details about the ESP-IDF Kconfig formatting rules and Kconfig language in general.

## Forum

If you are lost at any point you can always ask question, help and suggestion in the [forum](https://spectrum.chat/espidf-vsc?tab=posts), apart from creating Github Issues. For all the [ESP-IDF](https://github.com/espressif/esp-idf) related concerns please follow [their suggested channel](https://esp32.com) of communications.

## Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](./docs/CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [vscode@espressif.com](mailto:vscode@espressif.com).

## License

This extension is licensed under the Apache License 2.0. Please see the [LICENSE](./LICENSE) file for additional copyright notices and terms.
