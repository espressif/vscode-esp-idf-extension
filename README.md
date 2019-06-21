# Espressif IDF Visual Studio Code Extension

Visual Studio Code extension for improved IDE Espressif development experience.

## Requirements

This plugin works on [Visual Studio Code](https://code.visualstudio.com/).

Features such as Code navigation is supported by the [C/C++ Visual Studio Code extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools). 

It also requires that you build your project since it is based on the project build's compile_commands.json to identify the header files and code navigation.

## Installation using VSIX package file.

1. Install [Visual Studio Code](https://code.visualstudio.com/). Make sure you also install the C/C++ Extension from Visual Studio Code Marketplace.

2. In Visual Studio Code, go to the extensions tab.

3. Click the ... button left to the Extensions tab title.

4. Click `Install from VSIX...` and select the plugin VSIX package file.

5. See the [How to use](#How-to-use) section.

## Installation using compressed source code (espidf-vscode.tar.gz)

1. Install [NodeJS](https://nodejs.org/en/) and [Visual Studio Code](https://code.visualstudio.com/). Make sure you also install the C/C++ Extension from Visual Studio Code Marketplace.

2. Install the extension "C/C++ for Visual Studio Code" inside VS Code.

3. Decompress the content of espidf-vscode.tar.gz to the following location (corresponding to your operating system) which we will later identify as {VSCODE_EXTENSION_DIR}:
    1. Windows: `%USERPROFILE%\.vscode\extensions`
    2. macOS: `~/.vscode/extensions`
    3. Linux: `~/.vscode/extensions`

4. Run `npm install` in `{VSCODE_EXTENSION_DIR}/vscode-plugin` to download all nodeJS dependencies. NPM is a dependency manager shipped with NodeJS.

5. Run `npm run compile` in `{VSCODE_EXTENSION_DIR}/vscode-plugin` to compile the source code.

6. See the [How to use](#How-to-use) section.

## Uninstalling the plugin

1. In Visual Studio Code, go to the Extensions tab.

2. Click on the EspressifIDF extension lower right icon.

3. Click Uninstall.

4. Go to your `{VSCODE_EXTENSION_DIR}` and make sure to delete the Espressif IDF plugin folder. 

## How to use

1. First set up your Visual Studio Code as explained in the former section. 

2. Then,
    1. Either open Visual Studio Code and create a workspace folder.
    2. Run `code {YOUR_PROJECT_DIR}` from the command line.

3. Set the ESP path, OpenOCD and Xtensa path by pressing F1 then typing **ESP-IDF: Set binaries path** and the USB port by pressing F1 and typing **ESP-IDF: Select port to use:**. You can also manually define this parameters in {project_folder}/.vscode/settings.json as `idf.espIdfPath`,`idf.openOcdBin`,`idf.xtensaEsp32Path` and `idf.port` respectively. If you are on Windows, the parameters used are `idf.espIdfPathWin`,`idf.openOcdBinWin`,`idf.xtensaEsp32PathWin` instead of the previous ones, in case you are manually configuring the {project_folder}/.vscode/settings.json in your project.

NOTE: Please consider that ~ is not recognized when you set one of the previous path. You can instead set any environment variable in the path using a `${env:VARNAME}` such as ${env:HOME} or you can refer to other configuration parameter path such as `${config:idf.espIdfPath}`.

4. Press F1 and type **ESP-IDF: Create ESP-IDF project** to copy a minimum set of files
 to run a ESP-IDF project.

5. If you want to get code navigation and ESP-IDF function references, build the project a first time.
 This will generate the required __compile_commands.json__ used by C/C++ extension to solve header/source links.
 You can do a rebuild by pressing F1 and typing **ESP-IDF: Build your project**.

6. Do some coding!

7. Check you set the correct port of your device by pressing F1, typing **ESP-IDF: Select port to use:** and choosing the serial port your device is connected.

8. When you are ready, do another rebuild as explained before. Then flash to your device by pressing F1 and typing **ESP-IDF: Flash your device** then selecting Flash allows you to flash the device.

9. You can later start a monitor by pressing F1 and typing **ESP-IDF: Monitor your device** which will log the activity in a Visual Studio Code terminal.

10. If you want to start a debug session, just press F5 (make sure you had at least build and flash once before so the debugger works correctly). To make sure you can debug your device, set the proper `idf.deviceInterface` and `idf.board` settings in your settings.json or by pressing F1 and typing **ESP-IDF: Device configuration**.

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

```
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

## Available commands

Click F1 to show Visual studio code actions.

Type ESP-IDF to see possible actions.

1. ESP-IDF: Create ESP-IDF project. Create minimum set of files to start an ESP-IDF project.
2. ESP-IDF: Build your project: Run a Cmake build in your current work folder or selected folder (multiple folders scenario).
3. ESP-IDF: Flash your device: Flash your device on the selected `idf.port`.
4. ESP-IDF: Monitor your device: Start a monitor of your device for the selected `idf.port`.
5. ESP-IDF: Build, Flash and start a monitor on your device: Build the current workspace project, flash it on the selected port device and start a monitor on your device.
6. ESP-IDF: Select port to use: Select one of the system serial port to use for flash, debug and monitor actions by showing available USB ports.
7. ESP-IDF: Launch the gui configuration tool. GUI-menuconfig to configure our sdkconfig files.
8. ESP-IDF: Pick a workspace folder for ESP-IDF commands. For multiple folder projects, pick the folder where to obtain the ESP-IDF Settings to Build, Flash, Monitor or Debug an ESP-IDF project.
9. ESP-IDF: Device configuration: Define the following board parameters:
    1. Device port. Set the device USB port (COM1, /dev/ttyUSB1) manually.
    2. Baud Rate. Communication baud rate.
    3. Device interface. Device interface required by OpenOCD (Example interface/ftdi/esp32_devkitj_v1.cfg)
    4. Board. Used board required by OpenOCD (Example board/esp32-wrover.cfg)
10. ESP-IDF: Set Binaries Path
    1. ESP Path. Set the ESP-IDF directory path (default: /esp/esp-idf).
    2. Xtensa-ESP32 Path. Set the Xtensa-ESP32 path (default: /esp/xtensa-esp32-elf).
    3. OpenOCD Path. Set the OpenOCD path directory (default: /esp/openocd).
11. ESP-IDF: Size analysis of the binaries

## Keyboard shortcuts

By default, the Espressif IDF Visual Studio Code extension define the following keyboard shortcuts for ESP-IDF Commands:

ESP-IDF: Create ESP-IDF project : `ctrl+e c` in Windows/Linux or `cmd+e c` in MacOS.

ESP-IDF: Build your project: `ctrl+e b` in Windows/Linux or `cmd+e b` in MacOS.

ESP-IDF: Flash your device: `ctrl+e f` in Windows/Linux or `cmd+e f` in MacOS.

ESP-IDF: Monitor your device: `ctrl+e m` in Windows/Linux or `cmd+e m` in MacOS.

ESP-IDF: Select port to use: `ctrl+e p` in Windows/Linux or `cmd+e p` in MacOS.

ESP-IDF: Build, Flash and start a monitor on your device: `ctrl+e d` in Windows/Linux or `cmd+e d` in MacOS.

ESP-IDF: Size analysis of the binaries: `ctrl+e s` in Windows/Linux or `cmd+e s` in MacOS.

All the previous keyboard shortcut can be modified on Visual Studio Code by clicking F1 and typing `Preferences: Open Keyboard Shortcuts` or by manually defining a keybindings.json in your current workspace `.vscode` directory.

## Debugging

Click F5 to start debugging. For correct debug experience, first build and flash your device as explained before as well as define the correct OpenOCD and XtensaESP32 paths.

When you start debug, a OpenOCD process start in the background, which create a OpenOCD Output log in Visual Studio Code lower panel.

# Kconfig files editor

When you open a `Kconfig`, `Kconfig.projbuild` or `Kconfig.in` file you get syntax highlighting (and ESP-IDF Kconfig style diagnostics if `idf.useIDFKconfigStyle` is enabled, such as indent validation and blocks that are not properly closed (Example: menu-endmenu)). Please review [Kconfig Formatting Rules](https://docs.espressif.com/projects/esp-idf/en/latest/api-reference/kconfig.html) and [Kconfig Language](https://github.com/espressif/esp-idf/blob/master/tools/kconfig/kconfig-language.txt) for further details about the ESP-IDF Kconfig formatting rules and Kconfig language in general.

## Available Tasks in tasks.json

There is also some tasks defined in Tasks.json, which can be executed by running F1 and writing `Tasks: Run task` and selecting one of
the following:

1. Build - Build Project
2. Clean - Clean the project
3. Flash - Flash the device
4. Monitor - Start a monitor terminal
5. OpenOCD - Start the openOCD server
6. BuildFlash - Execute a build followed by a flash command.

## ESP-IDF Settings

This extension contributes the following settings that can be later updated in settings.json:

* `idf.espIdfPath` Define the locations of ESP-IDF tools and components
* `idf.xtensaEsp32Path`: Xtensa ESP32 Path
* `idf.openOcdBin`: Full path of OpenOCD program.
* `idf.openOcdScriptsPath`: Full path of OpenOCD scripts.
* `idf.deviceInterface`: OpenOCD interface of currently debugged device. Need to specify the full path of device interface definition file.
* `idf.board`: OpenOCD defined board for currently debugged device. Need to specify the full path of board definition file.
* `idf.port`: USB port of your currently used ESP device.
* `idf.baudRate`: Baud Rate of your ESP-IDF board.
* `idf.useIDFKconfigStyle`: Enable or Disable ESP-IDF Kconfig style validation on Kconfig files text editor.

The previously shown settings are used for tasks defined in tasks.json, the extension itself and the debugger. Make sure they correspond with your device as shown in the esp-idf documentation.

### Use of environment variables in ESP-IDF settings

Environment (env) variables and other ESP-IDF settings (config) current values strings can be used in other ESP-IDF setting as ${env:VARNAME} and ${config:ESPIDFSETTING}, respectively.

Example : `idf.espIdfPath` = "${env:HOME}/esp/esp-idf" would be translated to "~/esp/esp-idf".

## Known Issues

Debugging session needs to be executed a couple of times before working. These issues come from debugging configuration gdb setup commands and the C/C++ gdb debug provider which still need some improvement.

## Work to do

- [x] Implement Finite State Machine Build-Flash-Debug Process.
- [x] Update gui-menuconfig to work with IDF-server.
- [x] Custom project treeview with external components.
- [x] Kconfig files linter.
- [ ] ESP-IDF Profiler
- [ ] More cool stuff to come.

## Contribute

Post an issue or pull/merge request on Github/Gitlab and let's explore a solution together.

-----------------------------------------------------------------------------------------------------------