List of Available Commands
==========================

:link_to_translation:`zh_CN:[中文]`

All commands start with ``ESP-IDF:``.

.. list-table::
   :header-rows: 1

   * - Command
     - Description
   * - Activate ESP-IDF
     - When no standard ESP-IDF project is detected and **idf.currentSetup** is empty, save the first finished ESP-IDF install and initialize project commands. This does not change **idf.extensionActivationMode**.
   * - Add Arduino ESP32 as ESP-IDF Component
     - Add `Arduino-ESP32 <https://github.com/espressif/arduino-esp32>`_ as an ESP-IDF component in your current directory (**${CURRENT_DIRECTORY}/components/arduino**).
   * - Add Docker Container Configuration
     - Add the **.devcontainer** files to the currently opened project directory. It is necessary to use an ESP-IDF project in a Docker container with Visual Studio Code `Dev Containers <https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers>`_ extension.
   * - Add Editor Coverage
     - Parse your project `GCOV Code coverage <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/app_trace.html#gcov-source-code-coverage>`_ files to add color lines representing code coverage on currently opened source code file.
   * - Add New Node
     - Add a device node to the linked ESP RainMaker account. More information can be found in :doc:`ESP RainMaker <additionalfeatures/rainmaker>`.
   * - Add VS Code Configuration Folder
     - Add **.vscode** files to the currently opened project directory. This includes launch.json (for debugging), settings.json and c_cpp_properties.json for syntax highlight.
   * - App Trace
     - Start an application trace and store the log in the trace archive. More information can be found in :doc:`Application Tracing <additionalfeatures/app-tracing>`.
   * - Build App Only
     - Build only the application partition of the current project.
   * - Build App, Flash App and Start Monitor
     - Build the application, write only the app binary to the device, and start a monitor terminal.
   * - Build Bootloader Only
     - Build only the bootloader of the current project.
   * - Build Partition Table
     - Build only the partition table of the current project.
   * - Build, Flash and Start a Monitor on Your Device
     - Build the project, write binaries program to device and start a monitor terminal with a single command. Similar to ``idf.py build flash monitor``.
   * - Build Your Project
     - Build your project using ``CMake`` and ``Ninja-build`` as explained in `ESP-IDF Build System Using Cmake Directly <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/build-system.html#using-cmake-directly>`_. You can modify the behavior of the build task with **idf.cmakeCompilerArgs** for Cmake configuration step and **idf.ninjaArgs** for Ninja step. For example, using **[-j N]** where N is the number of jobs running in parallel.
   * - Clear All Error Hints
     - Clear every entry in the Error Hints view.
   * - Clear Build Error Hints
     - Clear build errors from the Error Hints view.
   * - Clear eFuse Summary
     - Clear the eFuse Summary tree from ESP Explorer EFUSEEXPLORER.
   * - Clear ESP-IDF Search Results
     - Clear results from ESP Explorer Documentation Search Results.
   * - Clear OpenOCD Error Hints
     - Clear OpenOCD errors from the Error Hints view.
   * - CMakeLists.txt Editor
     - Open the editor for a project or component ``CMakeLists.txt``. More information can be found in :doc:`CMakeLists.txt Editor <additionalfeatures/cmakelists-editor>`.
   * - Configure Project SDKConfig for Coverage
     - Set required values in your project SDKConfig to enable code coverage analysis.
   * - Configure project for ESP-Clang
     - Configure the current ESP-IDF project to use esp-clang as toolchain to use and configure LLVM Clang extension in settings.json.
   * - Connect with ESP-Rainmaker Cloud Server
     - Sign in to the ESP RainMaker cloud from the ESP-IDF Explorer. More information can be found in :doc:`ESP RainMaker <additionalfeatures/rainmaker>`.
   * - Copy value to clipboard
     - Copy the selected hex view value to the clipboard.
   * - Create New ESP-IDF Component
     - Create a new component in the current directory based on ESP-IDF component template.
   * - Create New Empty Project
     - Ask for the new project name, choose the directory to create the project, and show a notification to open the newly created project.
   * - Create Project Configuration
     - Create ``CMakePresets.json`` in the project root with a starter **default** and **production** configure preset to rename and extend. Presets you already defined are left untouched.
   * - Customize Parameters for App Trace
     - Set the parameters used for the next application trace.
   * - Delete hex value from list
     - Remove the selected value from the hex view list.
   * - Detect Serial Port
     - Detect the connected device port and save it as **idf.port**.
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
   * - Flash App Only (UART)
     - Write only the application binary to the device using UART (esptool.py).
   * - Flash Binary to Partition...
     - Flash a selected ``.bin`` file to a partition on the connected device.
   * - Flash Bootloader Only (UART)
     - Write only the bootloader binary to the device using UART (esptool.py).
   * - Flash Partition Table (UART)
     - Write only the partition table to the device using UART (esptool.py).
   * - Flash Your Project
     - Write binary data to the ESP's flash chip from your current ESP-IDF project. This command will use either UART, DFU or JTAG based on **idf.flashType**.
   * - Flash (DFU) your project
     - Write binary data to the ESP's flash chip from your current ESP-IDF project using DFU. Only for ESP32-S2 and ESP32-S3.
   * - Flash (UART) your project
     - Write binary data to the ESP's flash chip from your current ESP-IDF project using esptool.py
   * - Flash Full Image (UART)
     - Write every byte of the selected images to the ESP's flash chip with esptool.py, without ``--diff-with`` or ``--skip-flashed``. This command does not change **idf.flashFullImage**.
   * - Flash (with JTag)
     - Write binary data to the ESP's flash chip from your current ESP-IDF project using OpenOCD JTAG
   * - Flash Binary to Partition...
     - Write a ``.bin`` file to a partition offset with ``esptool.py write_flash``. More information can be found in :doc:`Device Partition Explorer <additionalfeatures/device-partition-explorer>`.
   * - Full Clean Project
     - Delete the current ESP-IDF project build directory.
   * - Get eFuse Summary
     - Retrieve a list of eFuses and their corresponding values from the chip currently connected to the serial port.
   * - Get HTML Coverage Report for Project
     - Parse your project `GCOV Code coverage <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/app_trace.html#gcov-source-code-coverage>`_ files to generate an HTML coverage report.
   * - Heap Trace
     - Start a heap trace. More information can be found in :doc:`Heap Tracing <additionalfeatures/heap-tracing>`.
   * - Import ESP-IDF Project
     - Import an existing ESP-IDF project, add .vscode and .devcontainer files to a new location, and optionally rename the project.
   * - Install ESP-ADF
     - Clone ESP-ADF inside the selected directory and set **idf.customExtraVars["ADF_PATH"]** configuration setting.
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
   * - Open Classic Menuconfig Terminal
     - Open a terminal running the classic ``idf.py menuconfig`` interface.
   * - Open ESP-IDF Documentation...
     - Open the selected ESP-IDF documentation search result in the browser.
   * - Open ESP-IDF Terminal
     - Open a terminal with IDF_PATH and Python virtual environment activated.
   * - Open Get Started Walkthrough
     - Open the ESP-IDF Get Started walkthrough. More information can be found in :ref:`extension activation <extension-activation>`.
   * - OpenOCD Adaptor (serial & location)
     - Toggle the status bar item that shows the OpenOCD adapter serial number (S) and USB adapter location (L), useful to verify which adapter will be used when multiple devices are connected.
   * - OpenOCD Manager
     - Start or stop the OpenOCD server used for JTAG flash and debugging.
   * - Open ESP-IDF Install Manager
     - Open the ESP-IDF Install Manager to install and manage ESP-IDF versions and tools.
   * - Partition Table Editor
     - Launch UI to manage custom partition table as described in `ESP-IDF Partition Tables <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/partition-tables.html>`_.
   * - Pick a Workspace Folder
     - When using a Visual Studio Code workspace with multiple workspace folders, this command allows you to choose which workspace folder to apply this extension’s commands to. More information can be found in :ref:`working with multiple projects <multiple projects>`.
   * - Refresh Partition Table
     - Load the project's built partition table into the :doc:`Device Partition Explorer <additionalfeatures/device-partition-explorer>`.
   * - Refresh Trace Archive List
     - Reload the application trace archive list in the ESP-IDF Explorer.
   * - Remove Editor Coverage
     - Remove editor colored lines from **Add Editor Coverage** command.
   * - Remove ESP-IDF Settings
     - Remove the ESP-IDF settings saved by the extension.
   * - Remove This Node
     - Remove the selected node from the linked ESP RainMaker account. More information can be found in :doc:`ESP RainMaker <additionalfeatures/rainmaker>`.
   * - Retry ESP-IDF Activation
     - Run setup validation and activation checks again. More information can be found in :ref:`extension activation <extension-activation>`.
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
   * - Select Current ESP-IDF Version
     - Choose which finished ESP-IDF install from ``eim_idf.json`` to use for this workspace. More information can be found in :ref:`extension activation <extension-activation>`.
   * - Select eim_idf.json
     - Choose the ESP-IDF Installation Manager ``eim_idf.json`` catalog file. More information can be found in :ref:`extension activation <extension-activation>`.
   * - Select Flash Method
     - Select which flash method to use for **Flash Your Project** command. It can be ``DFU``, ``JTAG`` or ``UART``.
   * - Select Monitor Port to Use (COM, tty, usbserial)
     - Select the serial port stored in **idf.monitorPort**. When this setting is empty, the monitor uses **idf.port**.
   * - Select Port to Use
     - Select which serial port to use for ESP-IDF tasks, such as flashing or monitoring your device.
   * - Select OpenOCD Board Configuration
     - Select the OpenOCD configuration files that match your Espressif device target, such as DevKitC or ESP-Wrover-Kit. This is necessary for flashing with JTAG or debugging your device.
   * - Select Project Configuration
     - Choose which configure preset from ``CMakePresets.json`` or ``CMakeUserPresets.json`` overrides the extension settings. Presets marked ``hidden`` and presets disabled by their ``condition`` are not offered.
   * - Select Where to Save Configuration Settings
     - In Visual Studio Code, settings can be saved in three places: User Settings (global settings), workspace ( .code-workspace file) or workspace folder (.vscode/settings.json).
   * - Select Output and Notification Mode
     - This extension shows many notifications and output in the Output window **ESP-IDF**. This command allows you to set if to show notifications only, output only, both notifications and output, or neither.
   * - Set Espressif Device Target
     - This will set the target for the current project (IDF_TARGET). Similar to **idf.py set-target**. For example, if you want to use ESP32 or ESP32-C3, you need to execute this command.
   * - Show ESP Component Registry
     - Open the ESP Component Registry browser to install components or create a project from an example. More information can be found in :ref:`ESP-IDF Component Registry <ESP-IDF Component Registry>`.
   * - Show Ninja Build Summary
     - Execute the Chromium ninja-build-summary.py.
   * - Show Trace Report
     - Open the report for a saved application trace.
   * - Size Analysis of the Binaries
     - Launch UI with the ESP-IDF project binaries size information.
   * - Sync with ESP-Rainmaker Cloud Server
     - Refresh nodes and parameters from the ESP RainMaker cloud. More information can be found in :doc:`ESP RainMaker <additionalfeatures/rainmaker>`.
   * - Unlink Rainmaker Account
     - Sign out of the linked ESP RainMaker account. More information can be found in :doc:`ESP RainMaker <additionalfeatures/rainmaker>`.
   * - Unit Test: Build Unit Test App
     - Build the unit test application for the current project. More information can be found in :ref:`Unit Testing Documentation <unit testing>`.
   * - Unit Test: Flash Unit Test App
     - Flash the unit test application for the current project to the connected device. More information can be found in :ref:`Unit Testing Documentation <unit testing>`.
   * - Unit Test: Build and Flash Unit Test App for Testing
     - Copy the unit test app in the current project, build the current project and flash the unit test application to the connected device. More information can be found in :ref:`Unit Testing Documentation <unit testing>`.
   * - Update Param for Device
     - Edit a parameter of a device in the linked ESP RainMaker account. More information can be found in :doc:`ESP RainMaker <additionalfeatures/rainmaker>`.
   * - View as Hex
     - Show the selected debug variable in the hex view while debugging.
   * - View Variable as Image
     - Show the selected debug variable in the Image Viewer while debugging.
   * - Welcome
     - Open the ESP-IDF welcome page.
   * - Load Image from LVGL C File
     - Load and display an image from a LVGL C file containing lv_image_dsc_t structure. This command allows you to view LVGL images without requiring a debug session.
   * - Open Image Viewer
     - Open the Image Viewer panel to display images from debug variables or LVGL C files. This panel provides tools for viewing and analyzing image data in various formats.
