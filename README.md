# ESP-IDF Visual Studio Code Extension

Visual Studio Code extension for Espressif IoT Development Framework, [ESP-IDF](https://github.com/espressif/esp-idf) is official development framework for the [ESP-32](https://espressif.com/en/products/hardware/esp32/overview) chip.

The ESP-IDF extension makes it easy to develop, build, flash, monitor and debug your ESP-IDF code, some functionality includes:

- Quick On-boarding for first time user.
- Quick prototyping using some examples directly baked into the extension.
- Easily Build, Flash and Monitor your code for the ESP-32 chip.
- Debugging support with OpenOCD integration.
- IntelliSense and syntax highlighting for [KConfig](https://docs.espressif.com/projects/esp-idf/en/latest/api-reference/kconfig.html)
- Commands and Shortcuts for existing [ESP-IDF Tools](https://github.com/espressif/esp-idf/tree/master/tools) within the extension

## Prerequisites
There are a few dependencies which needs to be downloaded and installed before you can continue to use the extension.
- Python [3.5](https://www.python.org/download/releases/3.5/)+ (recommended)
- ESP-IDF ([CMake Version](https://docs.espressif.com/projects/esp-idf/en/latest/get-started-cmake/index.html))

## Quick Installation Guide
There are several ways to install this extension to your VSCode, easiest one is from VSCode Marketplace. However if you are looking to contribute to this project we suggest you to have install in [source mode](#Source-Mode)

### Marketplace Installation
Launch VSCode Quick Open (<kbd>⌘</kbd>+<kbd>P</kbd> on Mac or <kbd>Ctrl</kbd>+<kbd>P</kbd> on Windows) and then paste the following command and press enter

	ext install esp-idf-extension

### Build from Source Code
- Install [Node.js](https://nodejs.org/en/)
- Make sure have the [C/C++ Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) from Visual Studio Code Marketplace.
- Clone this repository `git clone https://github.com/espressif/vscode-esp-idf-extension.git`
- Install all the dependencies, using `npm i`
- Press <kbd>F5</kbd> to Run with Debugger, this will launch a new VSCode Extension Development Host

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
- Set the ESP path, OpenOCD and Xtensa path by pressing F1 then typing **ESP-IDF: Set binaries path** and the USB port by pressing F1 and typing **ESP-IDF: Select port to use:**. You can also manually define this parameters in {project_folder}/.vscode/settings.json as `idf.espIdfPath`,`idf.openOcdBin`,`idf.xtensaEsp32Path` and `idf.port` respectively. If you are on Windows, the parameters used are `idf.espIdfPathWin`,`idf.openOcdBinWin`,`idf.xtensaEsp32PathWin` instead of the previous ones, in case you are manually configuring the `{project_folder}/.vscode/settings.json` in your project.

	__NOTE:__ Please consider that `~` is not recognized when you set one of the previous path. You can instead set any environment variable in the path using a `${env:VARNAME}` such as `${env:HOME}` or you can refer to other configuration parameter path such as `${config:idf.espIdfPath}`.

- Press <kbd>F1</kbd> and type **ESP-IDF: Create ESP-IDF project** to generate a template ESP-IDF project.

	__Note:__ If you want to get code navigation and ESP-IDF function references, build the project a first time. This will generate the required __compile_commands.json__ used by C/C++ extension to solve header/source links. You can do a rebuild by pressing <kbd>F1</kbd> and typing **ESP-IDF: Build your project**.

- Do some coding!
- Check you set the correct port of your device by pressing <kbd>F1</kbd>, typing **ESP-IDF: Select port to use:** and choosing the serial port your device is connected.
- When you are ready, build your project. Then flash to your device by pressing <kbd>F1</kbd> and typing **ESP-IDF: Flash your device** then selecting Flash allows you to flash the device.
- You can later start a monitor by pressing <kbd>F1</kbd> and typing **ESP-IDF: Monitor your device** which will log the activity in a Visual Studio Code terminal.
- If you want to start a debug session, just press F5 (make sure you had at least build and flash once before so the debugger works correctly). To make sure you can debug your device, set the proper `idf.deviceInterface` and `idf.board` settings in your settings.json or by pressing <kbd>F1</kbd> and typing **ESP-IDF: Device configuration**.

## Available commands

Click <kbd>F1</kbd> to show Visual studio code actions, then type __ESP-IDF__ to see possible actions.

| Command Description | Keyboard Shortcuts (Mac) | Keyboard Shortcuts (Windows/ Linux) |
| --- | --- | --- |
| Create ESP-IDF project | <kbd>⌘</kbd> <kbd>E</kbd> <kbd>C</kbd> | <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>C</kbd> | 
| Configure Paths |||
| Device configuration |||
| Launch gui configuration tool |||
| Set default sdkconfig file in project	 |||
| Select port to use |<kbd>⌘</kbd> <kbd>E</kbd> <kbd>P</kbd>| <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>P</kbd> |
| Build your project |<kbd>⌘</kbd> <kbd>E</kbd> <kbd>B</kbd>| <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>B</kbd> |
| Flash your project |<kbd>⌘</kbd> <kbd>E</kbd> <kbd>F</kbd>| <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>F</kbd> |
| Monitor your device |<kbd>⌘</kbd> <kbd>E</kbd> <kbd>M</kbd>| <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>M</kbd> |
| Build, Flash and start a monitor on your device |<kbd>⌘</kbd> <kbd>E</kbd> <kbd>D</kbd>| <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>D</kbd> |
| Pick a workspace folder |||
| Clean current project |||
| Erase device flash |||
| Size analysis of the binaries |<kbd>⌘</kbd> <kbd>E</kbd> <kbd>S</kbd>| <kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>S</kbd> |

## ESP-IDF Settings

This extension contributes the following settings that can be later updated in settings.json:


| Setting | Description |
| --- | --- |
| `idf.espIdfPath` | Define the locations of ESP-IDF tools and components |
| `idf.xtensaEsp32Path` | Xtensa ESP32 Path |
| `idf.openOcdBin` | Full path of OpenOCD program |
| `idf.openOcdScriptsPath` | Full path of OpenOCD scripts |
| `idf.deviceInterface` | OpenOCD interface of currently debugged device. Need to specify the full path of device interface definition file |
| `idf.board` | OpenOCD defined board for currently debugged device. Need to specify the full path of board definition file |
| `idf.port` | USB port of your currently used ESP device |
| `idf.baudRate` | Baud Rate of your ESP-IDF board |
| `idf.useIDFKconfigStyle` | Enable or Disable ESP-IDF Kconfig style validation on Kconfig files text editor |

### Use of environment variables in ESP-IDF settings

Environment (env) variables and other ESP-IDF settings (config) current values strings can be used in other ESP-IDF setting as `${env:VARNAME}` and `${config:ESPIDFSETTING}`, respectively.

Example : `idf.espIdfPath` = `"${env:HOME}/esp/esp-idf"` would be translated to `"~/esp/esp-idf"`.

## Available Tasks in tasks.json

There is also some tasks defined in Tasks.json, which can be executed by running <kbd>F1</kbd> and writing `Tasks: Run task` and selecting one of
the following:

1. `Build` - Build Project
2. `Clean` - Clean the project
3. `Flash` - Flash the device
4. `Monitor` - Start a monitor terminal
5. `OpenOCD` - Start the openOCD server
6. `BuildFlash` - Execute a build followed by a flash command.

## IDF GUI Menuconfig

This plugin includes a GUI menuconfig that reads your current project folder's sdkconfig file (if available, otherwise it would take default values) and start a configuration server process (confserver.py in __${ESP-IDF-DIRECTORYPATH}__/tools) that enables the user to redefine ESP-IDF board parameters.

When the user modify a parameter value, the value is send to the confserver.py process, which return the new value and other values modified to GUI menuconfig and then update the values in the UI.

Values are not automatically saved to the sdkconfig file until you click save changes. You can cancel any changes and load the values from the sdkconfig file by clicking cancel changes. If you click set default the current sdkconfig file is replaced by a template sdkconfig file and then loaded into the GUI menuconfig rendered values.

The search functionality allows to find a parameter by description, i.e the name that appears in the sdkconfig file.

An IDF GUI Menuconfig log in Output is created to print all communications with confserver.py. It can be be used to track any errors.

## Working with multiple projects.

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
		"idf.xtensaEsp32Path": "${env:HOME}/esp/xtensa-esp32-elf",
		"idf.openOcdBin": "${env:HOME}/esp/openocd-esp32/bin/openocd",
		"idf.port": "/dev/ttyUSB1",
		"idf.projectName": "hello-world",
		"idf.espIdfPath": "${env:HOME}/esp/esp-idf"
	}
}
```
Settings in the root folder's `.code-workspace` can be used when your current project directory doesn't contain a `.vscode/settings.json` file.

If you want to open a project with multiple subprojects in Visual Studio Code, click Menu __File__ then __Open Workspace__ which will open a window to select the `.code-workspace` of your root project. You can either manually create this `.code-workspace` file and define all sub folders (projects) or when you click Menu __File__ --> __Save Workspace as...__ which doesn't automatically add any folder inside the current directory. You can add a folder to the workspace when you click Menu __File__ --> __Add Folder to Workspace...__.

**NOTE:** You still need to manually select the debug configuration in the Debug tab that correspond to your current workspace folder. There is a project folder suffix on each debug configuration.

## Debugging

Click <kbd>F5</kbd> to start debugging. For correct debug experience, first `build`, `flash` your device and define the correct `OpenOCD` and `XtensaESP32` paths.

When you start debug, a OpenOCD process start in the background, which create a OpenOCD Output log in Visual Studio Code lower panel.

## Kconfig files editor

When you open a `Kconfig`, `Kconfig.projbuild` or `Kconfig.in` file you get syntax highlighting (and ESP-IDF Kconfig style diagnostics if `idf.useIDFKconfigStyle` is enabled, such as indent validation and blocks that are not properly closed (Example: menu-endmenu)). Please review [Kconfig Formatting Rules](https://docs.espressif.com/projects/esp-idf/en/latest/api-reference/kconfig.html) and [Kconfig Language](https://github.com/espressif/esp-idf/blob/master/tools/kconfig/kconfig-language.txt) for further details about the ESP-IDF Kconfig formatting rules and Kconfig language in general.

# Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](./docs/CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [vscode@espressif.com](mailto:vscode@espressif.com).

# License

This extension is licensed under the Apache License 2.0. Please see the [LICENSE](./LICENSE) file for additional copyright notices and terms.