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

6. (OPTIONAL) Press <kbd>F1</kbd> and type **ESP-IDF: Select where to Save Configuration Settings**, which can be User Settings (global), Workspace Settings or Workspace Folder Settings. Default is User settings.

   > **NOTE:** Please take a look at [Working with multiple projects](./docs/MULTI_PROJECTS.md) for more information.

7. In Visual Studio Code, select menu "View" and "Command Palette" and type `configure esp-idf extension`. After, choose the **ESP-IDF: Configure ESP-IDF Extension** option. You can also choose where to save settings in the setup wizard.
   > **NOTE:** For versions of ESP-IDF < 5.0, spaces are not supported inside configured paths.

<p>
  <img src="./media/tutorials/setup/select-esp-idf.png" alt="Select ESP-IDF" width="950">
</p>

8. Choose **Express** and select the download server:

- Espressif: Faster speed in China using Espressif Download servers links.
- Github: Using github releases links.

9. Pick an ESP-IDF version to download or the `find ESP-IDF in your system` option to search for existing ESP-IDF directory.

10. Choose the location for ESP-IDF Tools (also known as `IDF_TOOLS_PATH`) which is `$HOME\.espressif` on MacOS/Linux and `%USERPROFILE%\.espressif` on Windows by default.

11. If your operating system is Linux or MacOS, choose the python executable to create ESP-IDF virtual environment.

    > **NOTE:** Windows users don't need to select a python executable since it is part of the setup.
    > **NOTE:** Make sure that `IDF_TOOLS_PATH` doesn't have any spaces to avoid any build issues. Also make sure that `IDF_TOOLS_PATH` is not the same directory as `IDF_PATH`.

12. The user will see a page showing the setup progress status showing ESP-IDF download progress, ESP-IDF Tools download and install progress as well as the creation of a python virtual environment.

13. If everything is installed correctly, the user will see a message that all settings have been configured. You can start using the extension. Otherwise check the [Troubleshooting](#Troubleshooting) section if you have any issues.

14. Press <kbd>F1</kbd> and type **ESP-IDF: Show Examples Projects** to create a new project from ESP-IDF examples. Select ESP-IDF and choose an example to create a new project from.

15. (OPTIONAL) Configure the `.vscode/c_cpp_properties.json` as explained in [C/C++ Configuration](./docs/C_CPP_CONFIGURATION.md).

> **Note:** For code navigation the [Microsoft C/C++ Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) or [Clangd extension](https://marketplace.visualstudio.com/items?itemName=llvm-vs-code-extensions.vscode-clangd) can be used for C/C++ language support. By default, projects created with **ESP-IDF: Create Project from Extension Template** or **ESP-IDF: Show Examples Projects** include a template for Microsoft C/C++ extension `c_cpp_properties.json` configuration file and doesn't need to be configured. Run **ESP-IDF: Run idf.py reconfigure task** to generate the compile_commands.json file so language support works.

16. Set the serial port of your device by pressing <kbd>F1</kbd>, typing **ESP-IDF: Select Port to Use:** and choosing the serial port your device is connected.

17. Select an Espressif target (esp32, esp32s2, etc.) with the **ESP-IDF: Set Espressif Device Target** command.

18. Use the **ESP-IDF: Select OpenOCD Board Configuration** to choose the openOCD configuration files for the extension openOCD server.

19. Next configure your ESP-IDF project by pressing <kbd>F1</kbd> and typing **ESP-IDF: SDK Configuration Editor** command (<kbd>CTRL</kbd> <kbd>E</kbd> <kbd>G</kbd> keyboard shortcut ) where the user can modify the ESP-IDF project settings. After all changes are made, click save and close this window.

20. When you are ready, build your project by pressing <kbd>F1</kbd> and typing **ESP-IDF: Build your Project**.

21. Flash to your device by pressing <kbd>F1</kbd> and typing **ESP-IDF: Select Flash Method and Flash** to select either `UART`, `DFU` or `JTAG` depending on your serial connection.

> **NOTE:** You can also use the **ESP-IDF: Flash (UART) your Project** or **ESP-IDF: Flash (with JTag)** directly.

22. Start a monitor by pressing <kbd>F1</kbd> and typing **ESP-IDF: Monitor Device** which will log the device activity in a Visual Studio Code terminal.

23. To make sure you can debug your device, select the your board by pressing <kbd>F1</kbd> and typing **ESP-IDF: Select OpenOCD Board Configuration**. You can test the connection by pressing <kbd>F1</kbd> and typing **ESP-IDF: OpenOCD Manager**.

    > **NOTE:** The user can start or stop the OpenOCD from Visual Studio Code using the **ESP-IDF: OpenOCD Manager** command or from the `OpenOCD Server (Running | Stopped)` button in the visual studio code status bar.

24. If you want to start a debug session, just press `F5` (make sure you had at least build, flash and openOCD is connecting correctly so the debugger works correctly).

Check the [Troubleshooting](#Troubleshooting) section if you have any issues.

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

<table>
    <thead>
        <tr>
            <th>Category</th>
            <th>Command Description</th>
            <th>Description</th>
            <th>Keyboard Shortcuts (Mac)</th>
            <th>Keyboard Shortcuts (Windows/ Linux)</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td rowspan=9 align="center">Configuration</td>
            <td>Add OpenOCD rules file (For Linux users)</td>
            <td>Add OpenOCD permissions to /etc/udev/rules.d to allow OpenOCD execution.</td>
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
            <td>Add vscode configuration folder</td>
            <td>Add <strong>.vscode</strong> files to the currently opened project directory. These include launch.json (for debugging), settings.json and c_cpp_properties.json for syntax highlight.</td>
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
            <td>Select output and notification mode</td>
            <td>This extension shows many notifications and output in the Output window <strong>ESP-IDF</strong>. This command allows the user to set if to show notifications, show output, both or none of them.</td>
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
            <td>Pick a workspace folder</td>
            <td>when using a Visual Studio Code workspace with multiple workspace folders, this command allow you to select which workspace folder to use for this extension commands.
            More information in <a href="./MULTI_PROJECTS.md">working with multiple projects</a>.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td rowspan=11 align="center">Basic</td>
            <td>Show Examples Projects</td>
            <td>Launch UI to show examples from selected framework and allow the user to create a project from them. This command will show frameworks already configured in the extension so if
            you want to see ESP-Rainmaker examples you need to run the <strong>Install ESP-Rainmaker</strong> first (or set the equivalent setting idf.espRainmakerPath) and then execute this command to see the examples.</td>
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
            <td>SDK Configuration editor</td>
            <td>Launch a UI to configure your ESP-IDF project settings. This is equivalent to <strong>idf.py menuconfig</strong></td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>G</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>G</kbd></td>
        </tr>
        <tr>
            <td>Build your project</td>
            <td>Build your project using `CMake` and `Ninja-build` as explained in <a href="https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/build-system.html#using-cmake-directly">ESP-IDF Build System Using Cmake Directly</a>. You could modify the behavior of the build task with <strong>idf.cmakeCompilerArgs</strong> for Cmake configure step and <strong>idf.ninjaArgs</strong> for Ninja step. For example, using <strong>[-j N]</strong> where N is the number of jobs run in parallel.</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>B</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>B</kbd></td>
        </tr>
        <tr>
            <td>Size analysis of the binaries</td>
            <td>Launch UI with the ESP-IDF project binaries size information.</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>S</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>S</kbd></td>
        </tr>
        <tr>
            <td>Select port to use</td>
            <td>Select which serial port to use for ESP-IDF tasks like flashing or monitor your device.</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>P</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>P</kbd></td>
        </tr>
        <tr>
            <td>Flash your project</td>
            <td>Write binary data to the ESP’s flash chip from your current ESP-IDF project. This command will use either UART, DFU or JTAG based on <strong>idf.flashType</strong></td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>F</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>F</kbd></td>
        </tr>
        <tr>
            <td>Monitor device</td>
            <td>This command will execute idf.py monitor to start serial communication with Espressif device.
            Please take a look at the <a href="https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/tools/idf-monitor.html?highlight=monitor">IDF Monitor Documentation</a>.</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>M</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>M</kbd></td>
        </tr>
        <tr>
            <td>Open ESP-IDF Terminal</td>
            <td>Launch a terminal window configured with extension ESP-IDF settings. Similar to export.sh script from ESP-IDF CLI.</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>T</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>T</kbd></td>
        </tr>
        <tr>
            <td>Select OpenOCD Board Configuration</td>
            <td>Select the openOCD configuration files that match your Espressif device target. For example if you are using DevKitC or ESP-Wrover-Kit. This is necessary for flashing with JTAG or debugging your device.</td>
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
            <td rowspan=5 align="center">Project creation</td>
            <td>Show Examples Projects</td>
            <td>Launch UI to show examples from selected framework and allow the user to create a project from them. This command will show frameworks already configured in the extension so if
            you want to see ESP-Rainmaker examples you need to run the <strong>Install ESP-Rainmaker</strong> first (or set the equivalent setting idf.espRainmakerPath) and then execute this command to see the examples.</td>
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
            <td>Import ESP-IDF Project</td>
            <td>Import an existing ESP-IDF project and add .vscode and .devcontainer files to a new location and also able to rename the project.</td>
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
            <td rowspan=7 align="center">Flashing</td>
            <td>Select Flash Method</td>
            <td>Select which flash method to use for <strong>Flash your project</strong> command. It can be DFU, JTAG or UART.</td>
            <td></td>
            <td></td>
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
            <td rowspan=4 align="center">Code coverage</td>
            <td>Add Editor coverage</td>
            <td>Parse your project <a href="https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/app_trace.html#gcov-source-code-coverage)">GCOV Code coverage</a> files to add color lines
            representing code coverage on currently opened source code file</td>
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
            <td>Get HTML Coverage Report for project</td>
            <td>Parse your project <a href="https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/app_trace.html#gcov-source-code-coverage)">GCOV Code coverage</a> files to generate a HTML coverage report.</td>
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
            <td rowspan=8 align="center">Additional frameworks</td>
            <td>Install ESP-ADF</td>
            <td>Clone ESP-ADF inside the selected directory and set <strong>idf.espAdfPath</strong> (<strong>idf.espAdfPathWin</strong> in Windows) configuration setting.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Add Arduino ESP32 as ESP-IDF Component</td>
            <td>Add <a href="https://github.com/espressif/arduino-esp32">Arduino-ESP32</a> as a ESP-IDF component
            in your current directory (<strong>${CURRENT_DIRECTORY}/components/arduino</strong>).</a></td>
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
            <td>Set ESP-MATTER Device Path (ESP_MATTER_DEVICE_PATH)</td>
            <td>The <strong>ESP-IDF: Set ESP-MATTER Device Path (ESP_MATTER_DEVICE_PATH)</strong> is used to define the device path for ESP-Matter. ESP-Matter is not supported in Windows.</td>
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
            <td rowspan=2 align="center">eFuse</td>
            <td>Get eFuse Summary</td>
            <td>Get list of eFuse and values from currently serial port chip.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Clear eFuse Summary</td>
            <td>Clear the eFuse Summary tree from ESP Explorer EFUSEEXPLORER</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td rowspan=3 align="center">QEMU</td>
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
            <td>Monitor QEMU Device</td>
            <td>As described in <a href="./QEMU.md">QEMU documentation</a> this command will start a terminal to monitor the ESP32 QEMU from the project Dockerfile with the current project binaries.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td rowspan=3 align="center">Monitoring</td>
            <td>Monitor device</td>
            <td>This command will execute idf.py monitor to start serial communication with Espressif device.
            Please take a look at the <a href="https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/tools/idf-monitor.html?highlight=monitor">IDF Monitor Documentation</a>.</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>M</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>M</kbd></td>
        </tr>
        <tr>
            <td>Launch IDF Monitor for CoreDump / GDB-Stub Mode</td>
            <td>Launch ESP-IDF Monitor with websocket capabilities. If the user has configured the panic handler to gdbstub or core dump, the monitor will launch a post mortem debug session of the chip.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Monitor QEMU Device</td>
            <td>As described in <a href="./QEMU.md">QEMU documentation</a> this command will start a terminal to monitor the ESP32 QEMU from the project Dockerfile with the current project binaries.</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td rowspan=3 align="center">Editors</td>
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
            <td>SDK Configuration editor</td>
            <td>Launch a UI to configure your ESP-IDF project settings. This is equivalent to <strong>idf.py menuconfig</strong></td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>G</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>G</kbd></td>
        </tr>
        <tr>
            <td rowspan=2 align="center">Unit Testing</td>
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
        <tr>
            <td rowspan=10 align="center">Scripts and Tools</td>
            <td>Run idf.py reconfigure task</td>
            <td>This command will execute <strong>idf.py reconfigure</strong> (CMake configure task). Useful when you need to generate compile_commands.json for the C/C++ language support.</td>
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
            <td>Show Ninja Build Summary</td>
            <td>Execute the Chromium ninja-build-summary.py </td>
            <td></td>
            <td></td>
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
    </tbody>
</table>

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
