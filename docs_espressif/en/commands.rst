List of Available Commands
==========================

:link_to_translation:`zh_CN:[中文]`

All commands start with ``ESP-IDF:``.

.. list-table::
   :header-rows: 1

   * - Command
     - Description
   * - Add Arduino ESP32 as ESP-IDF Component
     - Add `Arduino-ESP32 <https://github.com/espressif/arduino-esp32>`_ as an ESP-IDF component in your current directory (**${CURRENT_DIRECTORY}/components/arduino**).
   * - Add Docker Container Configuration
     - Add the **.devcontainer** files to the currently opened project directory. It is necessary to use an ESP-IDF project in a Docker container with Visual Studio Code `Dev Containers <https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers>`_ extension.
   * - Add Editor Coverage
     - Parse your project `GCOV Code coverage <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/app_trace.html#gcov-source-code-coverage>`_ files to add color lines representing code coverage on currently opened source code file.
   * - Add VS Code Configuration Folder
     - Add **.vscode** files to the currently opened project directory. This includes launch.json (for debugging), settings.json and c_cpp_properties.json for syntax highlight.
   * - Build, Flash and Start a Monitor on Your Device
     - Build the project, write binaries program to device and start a monitor terminal with a single command. Similar to ``idf.py build flash monitor``.
   * - Build Your Project
     - Build your project using ``CMake`` and ``Ninja-build`` as explained in `ESP-IDF Build System Using Cmake Directly <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/build-system.html#using-cmake-directly>`_. You can modify the behavior of the build task with **idf.cmakeCompilerArgs** for Cmake configuration step and **idf.ninjaArgs** for Ninja step. For example, using **[-j N]** where N is the number of jobs running in parallel.
   * - Clear eFuse Summary
     - Clear the eFuse Summary tree from ESP Explorer EFUSEEXPLORER.
   * - Clear ESP-IDF Search Results
     - Clear results from ESP Explorer Documentation Search Results.
   * - Clear Saved ESP-IDF Setups
     - Clear existing ESP-IDF setups saved by the extension.
   * - Configure ESP-IDF Extension
     - Open a window with a setup wizard to install ESP-IDF, IDF Tools and Python virtual environment.
   * - Configure Project SDKConfig for Coverage
     - Set required values in your project SDKConfig to enable code coverage analysis.
   * - Configure project for ESP-Clang
     - Configure the current ESP-IDF project to use esp-clang as toolchain to use and configure LLVM Clang extension in settings.json.
   * - Create Project from Extension Template
     - Create an ESP-IDF project using one of the extension template projects.
   * - Create New ESP-IDF Component
     - Create a new component in the current directory based on ESP-IDF component template.
   * - Dispose of Current SDK Configuration Editor Server Process
     - If you already executed the SDK Configuration editor, a cache process will remain in the background for faster reopening. This command will dispose of such cache process.
   * - Doctor Command
     - Run a diagnostic on the extension setup settings and logs to generate a troubleshooting report.
   * - Troubleshoot Form
     - Launch UI for the user to submit a troubleshooting report with steps to reproduce the issue. Run a diagnostic on the extension setup settings and logs, and send the information to the telemetry backend.
   * - Encrypt and Flash Your Project
     - Execute flashing the project program to device while adding **--encrypt** for partitions to be encrypted.
   * - Erase Flash Memory from Device
     - Execute **esptool.py erase_flash** command to erase flash chip (set to 0xFF bytes).
   * - Execute Custom Task
     - User can define a command-line command or script in **idf.customTask**, which can be executed with this command.
   * - Flash Your Project
     - Write binary data to the ESP's flash chip from your current ESP-IDF project. This command will use either UART, DFU or JTAG based on **idf.flashType**.
   * - Flash (DFU) your project
     - Write binary data to the ESP's flash chip from your current ESP-IDF project using DFU. Only for ESP32-S2 and ESP32-S3.
   * - Flash (UART) your project
     - Write binary data to the ESP's flash chip from your current ESP-IDF project using esptool.py
   * - Flash (with JTag)
     - Write binary data to the ESP's flash chip from your current ESP-IDF project using OpenOCD JTAG
   * - Full Clean Project
     - Delete the current ESP-IDF project build directory.
   * - Get eFuse Summary
     - Retrieve a list of eFuses and their corresponding values from the chip currently connected to the serial port.
   * - Get HTML Coverage Report for Project
     - Parse your project `GCOV Code coverage <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/app_trace.html#gcov-source-code-coverage>`_ files to generate an HTML coverage report.
   * - Import ESP-IDF Project
     - Import an existing ESP-IDF project, add .vscode and .devcontainer files to a new location, and optionally rename the project.
   * - Install ESP-ADF
     - Clone ESP-ADF inside the selected directory and set **idf.espAdfPath** (**idf.espAdfPathWin** in Windows) configuration setting.
   * - Install ESP-IDF Python Packages (DEPRECATION NOTICE)
     - Install extension Python packages. This command is deprecated and will be removed soon.
   * - Install ESP-MDF
     - Clone ESP-MDF inside the selected directory and set **idf.espMdfPath** (**idf.espMdfPathWin** in Windows) configuration setting.
   * - Install ESP-Matter
     - Clone ESP-Matter and set **idf.espMatterPath**. ESP-Matter is not supported on Windows.
   * - Install ESP-Rainmaker
     - Clone ESP-Rainmaker and set **idf.espRainmakerPath** (**idf.espRainmakerPathWin** in Windows) configuration setting.
   * - Install ESP-HomeKit-SDK
     - Clone ESP-HomeKit-SDK inside the selected directory and set **idf.espHomeKitSdkPath** (**idf.espHomeKitSdkPathWin** in Windows) configuration setting.
   * - Launch IDF Monitor for Core Dump Mode/GDB Stub Mode
     - Launch ESP-IDF Monitor with WebSocket capabilities. If you have configured the panic handler to gdbstub or core dump, the monitor will launch a post-mortem debug session of the chip.
   * - Launch QEMU Server
     - As described in :ref:`QEMU documentation <qemu>`, this command will execute ESP32 QEMU from the project Dockerfile with the current project binaries.
   * - Launch QEMU Debug Session
     - As described in :ref:`QEMU documentation <qemu>`, this command will start a debug session to ESP32 QEMU from the project Dockerfile with the current project binaries.
   * - Monitor Device
     - This command will execute idf.py monitor to start serial communication with Espressif device. Please take a look at the `IDF Monitor Documentation <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/tools/idf-monitor.html?highlight=monitor>`_.
   * - Monitor QEMU Device
     - As described in :ref:`QEMU documentation <qemu>`, this command will start a terminal to monitor the ESP32 QEMU from the project Dockerfile with the current project binaries.
   * - New Project
     - Launch UI with an ESP-IDF project creation wizard using examples templates from ESP-IDF and ESP-ADF.
   * - NVS Partition Editor
     - Launch UI to create a CSV file for `ESP-IDF Non-Volatile Storage Library <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/storage/nvs_flash.html>`_.
   * - Open ESP-IDF Terminal
     - Open a terminal with IDF_PATH and Python virtual environment activated.
   * - Partition Table Editor
     - Launch UI to manage custom partition table as described in `ESP-IDF Partition Tables <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/partition-tables.html>`_.
   * - Pick a Workspace Folder
     - When using a Visual Studio Code workspace with multiple workspace folders, this command allows you to choose which workspace folder to apply this extension’s commands to. More information can be found in :ref:`working with multiple projects <multiple projects>`.
   * - Remove Editor Coverage
     - Remove editor colored lines from **Add Editor Coverage** command.
   * - Run idf.py reconfigure Task
     - This command will execute **idf.py reconfigure** (CMake configure task), which is useful for generating compile_commands.json for the C/C++ language support.
   * - Run ESP-IDF-SBOM Vulnerability Check
     - Create software bill of materials (SBOM) files in the Software Package Data Exchange (SPDX) format for applications generated by the Espressif IoT Development Framework (ESP-IDF).
   * - Save Default SDKCONFIG File (save-defconfig)
     - Generate sdkconfig.defaults files using the project current sdkconfig file.
   * - SDK Configuration Editor
     - Launch UI to configure your ESP-IDF project settings. This is equivalent to **idf.py menuconfig**.
   * - Search in documentation...
     - Select some text from your source code file and search in ESP-IDF documentation with results right in the VS Code ESP-IDF Explorer tab.
   * - Search Error Hint
     - Type some text to find a matching error from ESP-IDF hints dictionary.
   * - Select Flash Method
     - Select which flash method to use for **Flash Your Project** command. It can be ``DFU``, ``JTAG`` or ``UART``.
   * - Select Port to Use
     - Select which serial port to use for ESP-IDF tasks, such as flashing or monitoring your device.
   * - Select OpenOCD Board Configuration
     - Select the OpenOCD configuration files that match your Espressif device target, such as DevKitC or ESP-Wrover-Kit. This is necessary for flashing with JTAG or debugging your device.
   * - Select Where to Save Configuration Settings
     - In Visual Studio Code, settings can be saved in three places: User Settings (global settings), workspace ( .code-workspace file) or workspace folder (.vscode/settings.json).
   * - Select Output and Notification Mode
     - This extension shows many notifications and output in the Output window **ESP-IDF**. This command allows you to set if to show notifications only, output only, both notifications and output, or neither.
   * - Set Espressif Device Target
     - This will set the target for the current project (IDF_TARGET). Similar to **idf.py set-target**. For example, if you want to use ESP32 or ESP32-C3, you need to execute this command.
   * - Set ESP-MATTER Device Path (ESP_MATTER_DEVICE_PATH)
     - The **ESP-IDF: Set ESP-MATTER Device Path (ESP_MATTER_DEVICE_PATH)** is used to define the device path for ESP-Matter. ESP-Matter is not supported in Windows.
   * - Show Example Projects
     - Launch UI to show examples from selected framework and allow you to create a project from them. This command will show frameworks already configured in the extension. To view ESP-Rainmaker examples, you need to run the **Install ESP-Rainmaker** first (or set the equivalent setting idf.espRainmakerPath), and then execute this command to see the examples.
   * - Show Ninja Build Summary
     - Execute the Chromium ninja-build-summary.py.
   * - Size Analysis of the Binaries
     - Launch UI with the ESP-IDF project binaries size information.
   * - Unit Test: Build and Flash Unit Test App for Testing
     - Copy the unit test app in the current project, build the current project and flash the unit test application to the connected device. More information can be found in :ref:`Unit Testing Documentation <unit testing>`.
   * - Unit Test: Install ESP-IDF Pytest Requirements
     - Install the ESP-IDF Pytest requirement packages to be able to execute ESP-IDF unit tests. More information can be found in :ref:`Unit Testing Documentation <unit testing>`.
