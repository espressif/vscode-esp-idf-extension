List of available commands
===============================

All commands start with ``ESP-IDF:``.

.. list-table::
   :header-rows: 1

   * - Command Description
     - Description
   * - Add Arduino ESP32 as ESP-IDF Component
     - Add `Arduino-ESP32 <https://github.com/espressif/arduino-esp32>`_ as a ESP-IDF component in your current directory (**${CURRENT_DIRECTORY}/components/arduino**).
   * - Add Docker Container Configuration
     - Add the **.devcontainer** files to the currently opened project directory, necessary to use a ESP-IDF project in a Docker container with Visual Studio Code `Remote - Containers <https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers>`_ extension
   * - Add Editor coverage
     - Parse your project `GCOV Code coverage <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/app_trace.html#gcov-source-code-coverage>`_ files to add color lines representing code coverage on currently opened source code file.
   * - Add vscode configuration folder
     - Add **.vscode** files to the currently opened project directory. These include launch.json (for debugging), settings.json and c_cpp_properties.json for syntax highlight.
   * - Build, Flash and start a monitor on your device
     - Build the project, write binaries program to device and start a monitor terminal with a single command. Similar to ``idf.py build flash monitor``
   * - Build your project
     - Build your project using ``CMake`` and ``Ninja-build`` as explained in `ESP-IDF Build System Using Cmake Directly <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/build-system.html#using-cmake-directly>`_. You could modify the behavior of the build task with **idf.cmakeCompilerArgs** for Cmake configure step and **idf.ninjaArgs** for Ninja step. For example, using **[-j N]** where N is the number of jobs run in parallel.
   * - Clear eFuse Summary
     - Clear the eFuse Summary tree from ESP Explorer EFUSEEXPLORER
   * - Clear ESP-IDF Search Results
     - Clear results from ESP Explorer Documentation Search Results
   * - Clear Saved ESP-IDF Setups
     - Clear existing esp-idf setups saved by the extension.
   * - Configure ESP-IDF extension
     - Open a window with a setup wizard to install ESP-IDF, IDF Tools and python virtual environment.
   * - Configure Project SDKConfig for Coverage
     - Set required values in your project SDKConfig to enable Code Coverage
   * - Create project from Extension Template
     - Create ESP-IDF using one of the extension template projects.
   * - Create New ESP-IDF Component
     - Create a new component in the current directory based on ESP-IDF component template
   * - Dispose Current SDK Configuration Editor Server Process
     - If you already executed the SDK Configuration editor, a cache process will remain in the background for faster re opening. This command will dispose of such cache process.
   * - Doctor Command
     - Run a diagnostic of the extension setup settings and extension logs to provide a troubleshooting report.
   * - Troubleshoot Form
     - Launch UI for user to send a troubleshoot report with steps to reproduce, run a diagnostic of the extension setup settings and extension logs to send to telemetry backend.
   * - Encrypt and Flash your Project
     - Execute flashing the project program to device while adding **--encrypt** for partitions to be encrypted.
   * - Erase Flash Memory from Device
     - Execute esptool.py erase_flash command to erase flash chip (set to 0xFF bytes)
   * - Execute Custom Task
     - User can define a command line command or script in **idf.customTask** which can be executed with this command.
   * - Flash your project
     - Write binary data to the ESP's flash chip from your current ESP-IDF project. This command will use either UART, DFU or JTAG based on **idf.flashType**
   * - Flash (DFU) your project
     - Write binary data to the ESP's flash chip from your current ESP-IDF project using DFU. Only for ESP32-S2 and ESP32-S3.
   * - Flash (UART) your project
     - Write binary data to the ESP's flash chip from your current ESP-IDF project using esptool.py
   * - Flash (with JTag)
     - Write binary data to the ESP's flash chip from your current ESP-IDF project using OpenOCD JTAG
   * - Full Clean Project
     - Delete the current ESP-IDF project build directory.
   * - Get eFuse Summary
     - Get list of eFuse and values from currently serial port chip.
   * - Get HTML Coverage Report for project
     - Parse your project `GCOV Code coverage <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/app_trace.html#gcov-source-code-coverage>`_ files to generate a HTML coverage report.
   * - Import ESP-IDF Project
     - Import an existing ESP-IDF project and add .vscode and .devcontainer files to a new location and also able to rename the project.
   * - Install ESP-ADF
     - Clone ESP-ADF inside the selected directory and set **idf.espAdfPath** (**idf.espAdfPathWin** in Windows) configuration setting.
   * - Install ESP-IDF Python Packages (DEPRECATION NOTICE)
     - Install extension python packages. Deprecated will be removed soon.
   * - Install ESP-MDF
     - Clone ESP-MDF inside the selected directory and set **idf.espMdfPath** (**idf.espMdfPathWin** in Windows) configuration setting.
   * - Install ESP-Matter
     - Clone ESP-Matter and set **idf.espMatterPath**. The **ESP-IDF: Set ESP-MATTER Device Path (ESP_MATTER_DEVICE_PATH)** is used to define the device path for ESP-Matter. ESP-Matter is not supported in Windows.
   * - Install ESP-Rainmaker
     - Clone ESP-Rainmaker and set **idf.espRainmakerPath** (**idf.espRainmakerPathWin** in Windows) configuration setting.
   * - Install ESP-HomeKit-SDK
     - Clone ESP-HomeKit-SDK inside the selected directory and set **idf.espHomeKitSdkPath** (**idf.espHomeKitSdkPathWin** in Windows) configuration setting.
   * - Launch IDF Monitor for CoreDump / GDB-Stub Mode
     - Launch ESP-IDF Monitor with websocket capabilities. If you has configured the panic handler to gdbstub or core dump, the monitor will launch a post mortem debug session of the chip.
   * - Launch QEMU Server
     - As described in :ref:`QEMU documentation <qemu>` this command will execute ESP32 QEMU from the project Dockerfile with the current project binaries.
   * - Launch QEMU Debug Session
     - As described in :ref:`QEMU documentation <qemu>` this command will start a debug session to ESP32 QEMU from the project Dockerfile with the current project binaries.
   * - Monitor device
     - This command will execute idf.py monitor to start serial communication with Espressif device. Please take a look at the `IDF Monitor Documentation <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/tools/idf-monitor.html?highlight=monitor>`_.
   * - Monitor QEMU Device
     - As described in :ref:`QEMU documentation <qemu>` this command will start a terminal to monitor the ESP32 QEMU from the project Dockerfile with the current project binaries.
   * - New Project
     - Launch UI with a ESP-IDF project creation wizard using examples templates from ESP-IDF and ESP-ADF.
   * - NVS Partition Editor
     - Launch UI to create a CSV file for `ESP_IDF Non Volatile Storage <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/storage/nvs_flash.html>`_
   * - Open ESP-IDF Terminal
     - Open a terminal with IDF_PATH and python virtual environment activated.
   * - Partition Table Editor
     - Launch UI to manage custom partition table as described in `ESP_IDF Partition Table <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/partition-tables.html>`_
   * - Pick a workspace folder
     - When using a Visual Studio Code workspace with multiple workspace folders, this command allows you to select which workspace folder to use for this extension commands. More information in :ref:`working with multiple projects <multiple projects>`.
   * - Remove editor coverage
     - Remove editor colored lines from **Add Editor coverage** command
   * - Run idf.py reconfigure task
     - This command will execute **idf.py reconfigure** (CMake configure task). Useful when you need to generate compile_commands.json for the C/C++ language support.
   * - Run ESP-IDF-SBOM vulnerability check
     - Creates Software bill of materials (SBOM) files in the Software Package Data Exchange (SPDX) format for applications generated by the Espressif IoT Development Framework (ESP-IDF).
   * - Save Default SDKCONFIG file (save-defconfig)
     - Generate sdkconfig.defaults files using the project current sdkconfig file.
   * - SDK Configuration editor
     - Launch a UI to configure your ESP-IDF project settings. This is equivalent to **idf.py menuconfig**.
   * - Search in documentation...
     - Select some text from your source code file and search in ESP-IDF documentation with results right in the vscode ESP-IDF Explorer tab.
   * - Search Error Hint
     - Type some text to find a matching error from ESP-IDF hints dictionary.
   * - Select Flash Method
     - Select which flash method to use for **Flash your project** command. It can be ``DFU``, ``JTAG`` or ``UART``.
   * - Select port to use
     - Select which serial port to use for ESP-IDF tasks like flashing or monitor your device.
   * - Select OpenOCD Board Configuration
     - Select the OpenOCD configuration files that match your Espressif device target. For example if you are using DevKitC or ESP-Wrover-Kit. This is necessary for flashing with JTAG or debugging your device.
   * - Select where to save configuration settings
     - In Visual Studio Code settings can be saved in 3 places: User Settings (global settings), workspace ( .code-workspace file) or workspace folder (.vscode/settings.json).
   * - Select output and notification mode
     - This extension shows many notifications and output in the Output window **ESP-IDF**. This command allows you to set if to show notifications, show output, both or none of them.
   * - Set Espressif device target
     - This will set the target for the current project (IDF_TARGET). Similar to **idf.py set-target**. For example if you want to use ESP32 or ESP32-C3 you need to execute this command.
   * - Set ESP-MATTER Device Path (ESP_MATTER_DEVICE_PATH)
     - The **ESP-IDF: Set ESP-MATTER Device Path (ESP_MATTER_DEVICE_PATH)** is used to define the device path for ESP-Matter. ESP-Matter is not supported in Windows.
   * - Show Examples Projects
     - Launch UI to show examples from selected framework and allow you to create a project from them. This command will show frameworks already configured in the extension so if you want to see ESP-Rainmaker examples you need to run the **Install ESP-Rainmaker** first (or set the equivalent setting idf.espRainmakerPath) and then execute this command to see the examples.
   * - Show Ninja Build Summary
     - Execute the Chromium ninja-build-summary.py
   * - Size analysis of the binaries
     - Launch UI with the ESP-IDF project binaries size information.
   * - Unit Test: Build and flash unit test app for testing
     - Copy the unit test app in the current project, build the current project and flash the unit test application to the connected device. More information in :ref:`Unit Testing Documentation <unit testing>`.
   * - Unit Test: Install ESP-IDF PyTest requirements
     - Install the ESP-IDF Pytest requirements packages to be able to execute ESP-IDF Unit tests. More information in :ref:`Unit Testing Documentation <unit testing>`.