# ESP-IDF Extension Features for Visual Studio Code

This extension provides many features to ease development of ESP-IDF Projects.

- Quick [Configure ESP-IDF Extension](./SETUP.md) for first time user to help the user download, install and setup ESP-IDF and required tools within this Visual Studio Code extension.
- Quick prototyping by copying ESP-IDF examples with **ESP-IDF: Show ESP-IDF Examples Projects**.
- Syntax highlighting for [KConfig](#Kconfig-files-editor) and ESP-IDF Kconfig style syntax validation if `idf.useIDFKconfigStyle` is enabled.
- GUI [SDK Configuration Editor](#SDK-Configuration-editor) to configure your ESP-IDF project (esp-idf menuconfig).
- [Partition Table Editor](./PARTITION_TABLE_EDITOR.md)
- [NVS Partition Editor](./NVS_PARTITION_EDITOR.md)
- Easily [Build](#Build), [Flash](#Flash) and [Monitor](#Monitor) your code with Espressif chips.
- OpenOCD server within Visual Studio Code.
- [DEBUGGING](./DEBUGGING.md) with [ESP-IDF Debug Adapter](https://github.com/espressif/esp-debug-adapter).
- Size analysis of binaries with **ESP-IDF: Size Analysis of the Binaries**.
- App tracing when using ESP-IDF Application Level Tracing Library like in [ESP-IDF Application Level Tracing Example](https://github.com/espressif/esp-idf/tree/master/examples/system/app_trace_to_host).
- [Heap Tracing](./HEAP_TRACING.md)
- [System View Tracing Viewer](./SYS_VIEW_TRACING_VIEWER.md)
- Localization (English, Chinese, Spanish) of commands which you can also [add a language contribution](./LANG_CONTRIBUTE.md).
- [Code Coverage](./COVERAGE.md) for editor source highlighting and generate HTML reports.
- Search text editor's selected text in ESP-IDF documentation with **ESP-IDF: Search in Documentation...** right click command or with its [keyboard shortcut](#Available-commands). Results will be shown in ESP-IDF Explorer Tab if found on ESP-IDF Documentation based on your current vscode language, ESP-IDF version in `idf.espIdfPath` (latest otherwise) and `idf.adapterTargetName`.
- [ESP Rainmaker Support](./ESP_RAINMAKER.md)
- [Core Dump and GdbStub](./POSTMORTEM.md) postmortem mode.
- [CMake Editor](#CMake-Editor)
- [Support for WSL 2](./WSL.md)

## Commands

List of all the commands contributed by the extension

Here's the complete HTML table that combines the given information:

<table>
    <thead>
        <tr>
            <th>Command Description</th>
            <th>Description</th>
            <th>Keyboard Shortcuts (Mac)</th>
            <th>Keyboard Shortcuts (Windows/ Linux)</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Add Arduino ESP32 as ESP-IDF Component</td>
            <td>Add <a href="https://github.com/espressif/arduino-esp32">Arduino-ESP32</a> as a ESP-IDF component
            in your current directory (<strong>${CURRENT_DIRECTORY}/components/arduino</strong>).</a></td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Add Docker Container Configuration</td>
            <td>Add the <strong>.devcontainer</strong> files to the currently opened project directory, necessary to use a ESP-IDF project in a Docker container with Visual Studio Code
            <a href="https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers">Remote - Containers</a> extension</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Add Editor coverage</td>
            <td>Parse your project <a href="https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/app_trace.html#gcov-source-code-coverage)">GCOV Code coverage</a> files to add color lines
            representing code coverage on currently opened source code file</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Add OpenOCD rules file (For Linux users)</td>
            <td>Add OpenOCD permissions to /etc/udev/rules.d to allow OpenOCD execution.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Add vscode configuration folder</td>
            <td>Add <strong>.vscode</strong> files to the currently opened project directory. These include launch.json (for debugging), settings.json and c_cpp_properties.json for syntax highlight.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Build, Flash and start a monitor on your device</td>
            <td>Build the project, write binaries program to device and start a monitor terminal with a single command. Similar to `idf.py build flash monitor`</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>D</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>D</kbd></td>
        </tr>
        <tr>
            <td>Build your project</td>
            <td>Build your project using `CMake` and `Ninja-build` as explained in <a href="https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/build-system.html#using-cmake-directly">ESP-IDF Build System Using Cmake Directly</a>. You could modify the behavior of the build task with <strong>idf.cmakeCompilerArgs</strong> for Cmake configure step and <strong>idf.ninjaArgs</strong> for Ninja step. For example, using <strong>[-j N]</strong> where N is the number of jobs run in parallel.</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>B</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>B</kbd></td>
        </tr>
        <tr>
            <td>Clear eFuse Summary</td>
            <td>Clear the eFuse Summary tree from ESP Explorer EFUSEEXPLORER</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Clear ESP-IDF Search Results</td>
            <td>Clear results from ESP Explorer Documentation Search Results</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Clear Saved ESP-IDF Setups</td>
            <td>Clear existing esp-idf setups saved by the extension.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Configure ESP-IDF extension</td>
            <td>Open a window with a setup wizard to install ESP-IDF, IDF Tools and python virtual environment.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Configure Project SDKConfig for Coverage</td>
            <td>Set required values in your project SDKConfig to enable Code Coverage</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Create project from Extension Template</td>
            <td>Create ESP-IDF using one of the extension template projects.</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>C</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>C</kbd></td>
        </tr>
        <tr>
            <td>Create New ESP-IDF Component</td>
            <td>Create a new component in the current directory based on ESP-IDF component template</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Dispose Current SDK Configuration Editor Server Process</td>
            <td>If you already executed the SDK Configuration editor, a cache process will remain in the background for faster re opening. This command will dispose of such cache process.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Doctor Command</td>
            <td>Run a diagnostic of the extension setup settings and extension logs to provide a troubleshooting report.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Encrypt and Flash your Project</td>
            <td>Execute flashing the project program to device while adding <strong>--encrypt</strong> for partitions to be encrypted.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Erase Flash Memory from Device</td>
            <td>Execute esptool.py erase_flash command to erase flash chip (set to 0xFF bytes)</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>R</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>R</kbd></td>
        </tr>
        <tr>
            <td>Execute Custom Task</td>
            <td>User can define a command line command or script in <strong>idf.customTask</strong> which can be executed with this command.</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>J</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>J</kbd></td>
        </tr>
        <tr>
            <td>Flash your project</td>
            <td>Write binary data to the ESP’s flash chip from your current ESP-IDF project. This command will use either UART, DFU or JTAG based on <strong>idf.flashType</strong></td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>F</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>F</kbd></td>
        </tr>
        <tr>
            <td>Flash (DFU) your project</td>
            <td>Write binary data to the ESP’s flash chip from your current ESP-IDF project using DFU. Only for ESP32-S2 and ESP32-S3. </td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Flash (UART) your project</td>
            <td>Write binary data to the ESP’s flash chip from your current ESP-IDF project using esptool.py</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Flash (with JTag)</td>
            <td>Write binary data to the ESP’s flash chip from your current ESP-IDF project using OpenOCD JTAG</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Full Clean Project</td>
            <td>Delete the current ESP-IDF project build directory.</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>X</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>X</kbd></td>
        </tr>
        <tr>
            <td>Get eFuse Summary</td>
            <td>Get list of eFuse and values from currently serial port chip.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Get HTML Coverage Report for project</td>
            <td>Parse your project <a href="https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/app_trace.html#gcov-source-code-coverage)">GCOV Code coverage</a> files to generate a HTML coverage report.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Import ESP-IDF Project</td>
            <td>Import an existing ESP-IDF project and add .vscode and .devcontainer files to a new location and also able to rename the project.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Install ESP-ADF</td>
            <td>Clone ESP-ADF inside the selected directory and set <strong>idf.espAdfPath</strong> (<strong>idf.espAdfPathWin</strong> in Windows) configuration setting.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Install ESP-IDF Python Packages (DEPRECATION NOTICE)</td>
            <td>Install extension python packages. Deprecated will be removed soon. </td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Install ESP-MDF</td>
            <td>Clone ESP-MDF inside the selected directory and set <strong>idf.espMdfPath</strong> (<strong>idf.espMdfPathWin</strong> in Windows) configuration setting.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Install ESP-Matter</td>
            <td>Clone ESP-Matter and set <strong>idf.espMatterPath</strong>. The <strong>ESP-IDF: Set ESP-MATTER Device Path (ESP_MATTER_DEVICE_PATH)</strong> is used to define the device path for ESP-Matter. ESP-Matter is not supported in Windows.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Install ESP-Rainmaker</td>
            <td>Clone ESP-Rainmaker and set <strong>idf.espRainmakerPath</strong> (<strong>idf.espRainmakerPathWin</strong> in Windows) configuration setting.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Install ESP-HomeKit-SDK</td>
            <td>Clone ESP-HomeKit-SDK inside the selected directory and set <strong>idf.espHomeKitSdkPath</strong> (<strong>idf.espHomeKitSdkPathWin</strong> in Windows) configuration setting.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Launch IDF Monitor for CoreDump / GDB-Stub Mode</td>
            <td>Launch ESP-IDF Monitor with websocket capabilities. If the user has configured the panic handler to gdbstub or core dump, the monitor will launch a post mortem debug session of the chip.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Launch QEMU Server</td>
            <td>As described in <a href="./QEMU.md">QEMU documentation</a> this command will execute ESP32 QEMU from the project Dockerfile with the current project binaries.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Launch QEMU Debug Session</td>
            <td>As described in <a href="./QEMU.md">QEMU documentation</a> this command will start a debug session to ESP32 QEMU from the project Dockerfile with the current project binaries.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Monitor device</td>
            <td>This command will execute idf.py monitor to start serial communication with Espressif device.
            Please take a look at the <a href="https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/tools/idf-monitor.html?highlight=monitor">IDF Monitor Documentation</a>.</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>M</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>M</kbd></td>
        </tr>
        <tr>
            <td>Monitor QEMU Device</td>
            <td>As described in <a href="./QEMU.md">QEMU documentation</a> this command will start a terminal to monitor the ESP32 QEMU from the project Dockerfile with the current project binaries.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>New Project</td>
            <td>Launch UI with a ESP-IDF project creation wizard using examples templates from ESP-IDF and additional frameworks configured in the extension.</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>N</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>N</kbd></td>
        </tr>
        <tr>
            <td>Open ESP-IDF Terminal</td>
            <td>Launch a terminal window configured with extension ESP-IDF settings. Similar to export.sh script from ESP-IDF CLI.</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>T</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>T</kbd></td>
        </tr>
        <tr>
            <td>NVS Partition Editor</td>
            <td>Launch UI to create a CSV file for <a href="https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/storage/nvs_flash.html">ESP_IDF Non Volatile Storage</a></td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Partition Table Editor</td>
            <td>Launch UI to manage custom partition table as described in <a href="https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/partition-tables.html">ESP_IDF Partition Table</a></td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Pick a workspace folder</td>
            <td>when using a Visual Studio Code workspace with multiple workspace folders, this command allow you to select which workspace folder to use for this extension commands.
            More information in <a href="./MULTI_PROJECTS.md">working with multiple projects</a>.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Remove Editor coverage</td>
            <td>Remove editor colored lines from <strong>Add Editor coverage</strong> command </td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Run idf.py reconfigure task</td>
            <td>This command will execute <strong>idf.py reconfigure</strong> (CMake configure task). Useful when you need to generate compile_commands.json for the C/C++ language support.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Run ESP-IDF-SBOM vulnerability check</td>
            <td>Creates Software bill of materials (SBOM) files in the Software Package Data Exchange (SPDX) format for applications generated by the Espressif IoT Development Framework (ESP-IDF).</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Save Default SDKCONFIG file (save-defconfig)</td>
            <td>Generate sdkconfig.defaults files using the project current sdkconfig file.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>SDK Configuration editor</td>
            <td>Launch a UI to configure your ESP-IDF project settings. This is equivalent to <strong>idf.py menuconfig</strong></td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>G</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>G</kbd></td>
        </tr>
        <tr>
            <td>Search in documentation...</td>
            <td>Select some text from your source code file and search in ESP-IDF documentation with results right in the vscode ESP-IDF Explorer tab.</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>Q</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>Q</kbd></td>
        </tr>
        <tr>
            <td>Search Error Hint</td>
            <td>Type some text to find a matching error from ESP-IDF hints dictionary.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Select Flash Method</td>
            <td>Select which flash method to use for <strong>Flash your project</strong> command. It can be DFU, JTAG or UART.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Select port to use</td>
            <td>Select which serial port to use for ESP-IDF tasks like flashing or monitor your device.</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>P</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>P</kbd></td>
        </tr>
        <tr>
            <td>Select OpenOCD Board Configuration</td>
            <td>Select the openOCD configuration files that match your Espressif device target. For example if you are using DevKitC or ESP-Wrover-Kit. This is necessary for flashing with JTAG or debugging your device.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Select where to save configuration settings</td>
            <td>In Visual Studio Code settings can be saved in 3 places: User Settings (global settings), workspace ( .code-workspace file) or workspace folder (.vscode/settings.json).
            More information in <a href="./MULTI_PROJECTS.md">working with multiple projects</a>.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Select output and notification mode</td>
            <td>This extension shows many notifications and output in the Output window <strong>ESP-IDF</strong>. This command allows the user to set if to show notifications, show output, both or none of them.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Set Espressif device target</td>
            <td>This will set the target for the current project (IDF_TARGET). Similar to <strong>idf.py set-target</strong>. For example if you want to use ESP32 or ESP32-C3 you need to execute this command.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Set ESP-MATTER Device Path (ESP_MATTER_DEVICE_PATH)</td>
            <td>The <strong>ESP-IDF: Set ESP-MATTER Device Path (ESP_MATTER_DEVICE_PATH)</strong> is used to define the device path for ESP-Matter. ESP-Matter is not supported in Windows.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Show Examples Projects</td>
            <td>Launch UI to show examples from selected framework and allow the user to create a project from them. This command will show frameworks already configured in the extension so if
            you want to see ESP-Rainmaker examples you need to run the <strong>Install ESP-Rainmaker</strong> first (or set the equivalent setting idf.espRainmakerPath) and then execute this command to see the examples.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Show Ninja Build Summary</td>
            <td>Execute the Chromium ninja-build-summary.py </td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Size analysis of the binaries</td>
            <td>Launch UI with the ESP-IDF project binaries size information.</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>S</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>S</kbd></td>
        </tr>
        <tr>
            <td>Unit Test: Build and flash unit test app for testing</td>
            <td>Copy the unit test app in the current project, build the current project and flash the unit test application to the connected device. More information in <a href="./UNIT_TESTING.md">Unit testing documentation</a></td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Unit Test: Install ESP-IDF PyTest requirements</td>
            <td>Install the ESP-IDF Pytest requirements packages to be able to execute ESP-IDF Unit tests. More information in <a href="./UNIT_TESTING.md"</a></td>
            <td></td>
            <td></td>
        </tr>
</tbody>

</table>

## Arduino as ESP-IDF Component

The **Add Arduino-ESP32 as ESP-IDF Component** command will add [Arduino-ESP32](https://github.com/espressif/arduino-esp32) as a ESP-IDF component in your current directory (`${CURRENT_DIRECTORY}/components/arduino`). You can also use the **ESP-IDF: Create Project from Extension Template** command with `arduino-as-component` template to create a new project directory that includes Arduino-esp32 as an ESP-IDF component.

> **NOTE** Not all versions of ESP-IDF are supported. Make sure to check [Arduino-ESP32](https://github.com/espressif/arduino-esp32) to see if your ESP-IDF version is compatible.

## Build

**ESP-IDF: Build your Project** is provided by this extension to build your project using `CMake` and `Ninja-build` as explained in [ESP-IDF Build System Using Cmake Directly](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/build-system.html#using-cmake-directly). You could modify the behavior of the build task with `idf.cmakeCompilerArgs` for Cmake configure step and `idf.ninjaArgs` for Ninja step. For example, using `[-j N]` where N is the number of jobs run in parallel.

## Debugging

Click <kbd>F5</kbd> to start debugging. To configure the debug behaviour, please review [DEBUGGING](./DEBUGGING.md).

> **NOTE** For correct debug experience, first define the correct `idf.customExtraPaths` paths and `idf.customExtraVars` using [SETUP](./SETUP.md), `build` your project, choose the right serial port, `flash` the program to your device.

## CMakeLists.txt Editor

**THIS WILL OVERRIDE ANY EXISTING CODE IN THE FILE WITH THE ONE GENERATED IN THE EDITOR. IF YOU HAVE ANY CODE NOT INCLUDED IN THE [SCHEMA](../cmakeListsSchema.json) (OR SINGLE LINE COMMENTS) USE A REGULAR TEXT EDITOR INSTEAD**

On CMakeLists.txt file right click this extension provides a custom CMakeLists.txt Editor to fill an ESP-IDF Project and Component registration as specified in [ESP-IDF Project CMakeLists.txt](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/build-system.html#project-cmakelists-file) and [ESP-IDF Component CMakeLists.txt files](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/build-system.html#component-cmakelists-files). You need to choose which kind of CMakeLists.txt file (project or component) to edit. There is 2 types of input, one is a simple string and another is an array of strings, such as Component Sources (SRCS). All inputs are described in the CMakeLists.txt Schema (\${this_repository}/src/cmake/cmakeListsSchema.json).

> **NOTE** This editor doesn't support all CMake functions and syntaxes. This editor should only be used for simple CMakeLists.txt options such as component registration (using idf_component_register) and basic project elements. If you need more customization or advanced CMakeLists.txt, consider reviewing [ESP-IDF Build System](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/build-system.html). Also review [CMakeLists.txt Editor Schema](../cmakeListsSchema.json) for a list of supported code.

## Custom Tasks

There are couple of custom tasks that the user can implement by using one of these configuration settings:

1. Set `idf.customTask` to define a custom task to be executed with **ESP-IDF: Execute Custom Task** command or the activity bar icon.
2. Set `idf.preBuildTask` to define a custom task to be executed before **ESP-IDF: Build your Project** command task.
3. Set `idf.postBuildTask` to define a custom task to be executed after **ESP-IDF: Build your Project** command task.
4. Set `idf.preFlashTask` to define a custom task to be executed before **Flash** commands.
5. Set `idf.postFlashTask` to define a custom task to be executed after **Flash** commands.

## Flash

The commands **Select Flash Method and Flash**, **Flash (With JTag)** using OpenOCD and JTAG or **Flash (UART) your Project** using the ESP-IDF `esptool.py` as explained in [ESP-IDF Build System Flash Arguments](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/build-system.html#flash-arguments), are provided by this extension to flash your project. This command depends on the `${YOUR_PROJECT_DIR}/build/flasher_args.json` file generated by [Build](#Build) and the `idf.flashBaudRate` configuration setting.

## Kconfig Files Editor

When you open a `Kconfig`, `Kconfig.projbuild` or `Kconfig.in` file we provide syntax highlighting. If `idf.useIDFKconfigStyle` is enabled, we also provide ESP-IDF Kconfig style syntax validation such as indent validation and not closing blocks found (Example: menu-endmenu). Please review [Kconfig Formatting Rules](https://docs.espressif.com/projects/esp-idf/en/latest/api-reference/kconfig.html) and [Kconfig Language](https://github.com/espressif/esp-idf/blob/master/tools/kconfig/kconfig-language.txt) for further details about the ESP-IDF Kconfig formatting rules and Kconfig language in general.

## Log & Heap Tracing

We support [Log](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/app_trace.html) and [Heap Tracing](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/system/heap_debug.html) out of the box, which enables users to perform log/heap tracing with just few button clicks and present the results of tracing data with UI.

You can follow [this](./HEAP_TRACING.md) quick step-by-step guide for Heap Tracing.

## Monitor

**ESP-IDF: Monitor Device** is provided by this extension to start `idf.py monitor` terminal program in Visual Studio Code. Please take a look at the [IDF Monitor Documentation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/tools/idf-monitor.html?highlight=monitor).

In Visual Studio Code, for **ESP-IDF: Monitor Device** we use the shell executable given in `vscode.env.shell` which is override by `terminal.integrated.shell.*` in your Visual Studio Code Settings when using the `Terminal: Select Default Shell` command to update the shell or updating `terminal.integrated.shell.windows` for Windows, `terminal.integrated.shell.osx` for MacOS and `terminal.integrated.shell.linux` for Linux in VSCode Settings Preference menu (F1 -> Preferences: Open Settings (JSON)).

## OpenOCD Server

The user can start or stop the OpenOCD from Visual Studio Code using the **ESP-IDF: OpenOCD Manager** command or from the `OpenOCD Server (Running | Stopped)` button in the Visual Studio Code status bar. The output is shown in menu `View` -> `Output` -> `OpenOCD`. By default it will be launched using localhost, port 4444 for Telnet communication, port 6666 for TCL communication and port 3333 for Gdb.

Before using the OpenOCD server, you need to set the proper values for OpenOCD Configuration files in the `idf.openOCDConfigs` configuration setting. You can choose a specific board listed in OpenOCD using **ESP-IDF: Select OpenOCD Board Configuration**.

> **NOTE:** The user can modify `openocd.tcl.host` and `openocd.tcl.port` configuration settings to modify these values. Please review [ESP-IDF Settings](../SETTINGS.md) to see how to modify these configuration settings.

The resulting OpenOCD server launch command looks like this: `openocd -d${idf.openOcdDebugLevel} -f ${idf.openOcdConfigs} ${idf.openOcdLaunchArgs}`. The `idf.openOcdDebugLevel` is a number used to define the OpenOCD Log Level (0-4) and `idf.openOcdLaunchArgs` is a string array of any custom openOCD launch arguments the user wants to use.

## Partition Table Tree

Click the`ESP-IDF Explorer` in the [Activity Bar](https://code.visualstudio.com/docs/getstarted/userinterface). On the `Device Partition Explorer` section, click the `Refresh Partition Table` icon or the `ESP-IDF: Refresh Partition Table` command in the Command Palette. This will get a list of the partitions listed in the Partition Table of your connected device and show them in the `Device Partition Explorer` section. When you can any partition, you can choose to either open the Partition Table Editor (only when custom partition table is enabled) or choose a binary (.bin) file to flash on the selected partition. You can also right click any `.bin` file and choose the partition in device to flash this partition.

## SDK Configuration Editor

This extension includes a GUI Menuconfig using the `ESP-IDF: SDK Configuration Editor` command that reads your current project folder's `sdkconfig` file (if available, otherwise it would take default values) and start the [ESP-IDF JSON Configuration Server](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/build-system.html?highlight=confserver#json-configuration-server) process (confserver.py in **\${IDF_PATH}**/tools) that enables the user to redefine ESP-IDF project and board configuration.

When the user modify a parameter value, the value is send to the `confserver.py` process, which return the new value and other values modified to GUI Menuconfig and then update the values in the UI.

Values are not automatically saved to the SDKConfig file until you click save changes. You can cancel any changes and load the values from the SDKConfig file by clicking cancel changes. If you click set default the current SDKConfig file is replaced by a template SDKConfig file and then loaded into the GUI Menuconfig rendered values.

The search functionality allows to find a parameter by description, i.e the name that appears in the SDKConfig file.

An IDF GUI Menuconfig log in `ESP-IDF` Output (Menu View -> Output) is created to print all communications with `${idf.espIdfPath}\tools\confserver.py`. It can be be used to track any errors.

> **NOTE:** The ESP-IDF JSON Configuration Server is built from the project's `build/config/kconfig_menus.json` which is generated by the build system from ESP-IDF and user defined components Kconfig files on the first run of SDK Configuration Editor. This process takes a bit of time so we keep the process running in the background to speed things up. If you are making changes to any Kconfig files or you want to re-run the SDK Configuration Editor from scratch, you need to dispose the current process with the `ESP-IDF: Dispose Current SDK Configuration Editor Server Process` and run the `ESP-IDF: SDK Configuration Editor` again.

## Set Espressif Device Target

The **ESP-IDF: Set Espressif Device Target** allows the user to choose among Espressif different chips based on [idf.py set-target](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/build-system.html?highlight=target#selecting-idf-target).

When you use this command, the following files are set:

- Choosing `esp32` as IDF_TARGET will set `idf.openOCDConfigs` to ["interface/ftdi/esp32_devkitj_v1.cfg", "target/esp32.cfg"]
- Choosing `esp32s2` as IDF_TARGET will set `idf.openOCDConfigs` to ["interface/ftdi/esp32_devkitj_v1.cfg", "target/esp32s2.cfg"]
- Choosing `esp32s3` as IDF_TARGET will set `idf.openOCDConfigs` to ["interface/ftdi/esp32_devkitj_v1.cfg", "target/esp32s3.cfg"]
- Choosing `esp32c3` as IDF_TARGET will set `idf.openOCDConfigs` to ["board/esp32c3-builtin.cfg"] if using built-in usb jtag or ["board/esp32c3-ftdi.cfg"] if using ESP-PROG-JTAG.

## System View Tracing Viewer

We have provide a [System View Tracing Viewer](./SYS_VIEW_TRACING_VIEWER.md) inside the VS Code Extension which will enable you to view the traces along with other relevant details.
