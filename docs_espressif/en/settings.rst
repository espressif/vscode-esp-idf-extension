.. _settings:

ESP-IDF Settings
================

:link_to_translation:`zh_CN:[中文]`

Visual Studio Code allows you to configure settings at different levels: **Global (User Settings)**, **Workspace** and **Workspace Folder**. Ensure your project uses the correct settings.

1.  Workspace folder configuration settings are defined in ``${workspaceFolder}/.vscode/settings.json``
2.  Workspace configuration settings are defined in the workspace's ``<name>.code-workspace`` file
3.  User settings defined in ``settings.json``

    - **Windows**: ``%APPDATA%\Code\User\settings.json``
    - **MacOS**: ``$HOME/Library/Application Support/Code/User/settings.json``
    - **Linux**: ``$HOME/.config/Code/User/settings.json``

This extension uses the **idf.saveScope** configuration setting (which can only be defined in User Settings) to specify where to save settings for features such as the Setup Wizard. You can modify this using the ``ESP-IDF: Select where to Save Configuration Settings`` command.

This extension contributes the following settings that can be later updated in ``settings.json`` or from VS Code Settings Preference Menu by:

- Navigate to **View** > **Command Palette**.

- Search for **Preferences: Open User Settings (JSON)**, **Preferences: Open Workspace Settings (JSON)** or **Preferences: Open Settings (UI)** and select the command to open the setting management window.

.. note::

    Please note that ``~``, ``%VARNAME%`` and ``$VARNAME`` are not recognized when set on ANY of this extension configuration settings. Instead, you can set any environment variable in the path using ``${env:VARNAME}``, such as ``${env:HOME}``, or refer to other configuration parameter path with ``${config:SETTINGID}``, such as ``${config:idf.buildPath}``.

.. note::

    All settings can be applied to Global (User Settings), Workspace and WorkspaceFolder unless Scope is specified.

ESP-IDF Specific Settings
-------------------------

These are the configuration settings that ESP-IDF extension contributes to your Visual Studio Code editor settings.

.. list-table::
    :widths: 10 20
    :header-rows: 1

    * - Setting ID
      - Description
    * - idf.buildPath
      - Custom build directory name for extension commands (Default: \${workspaceFolder}/build)
    * - idf.buildPathWin
      - Custom build directory name for extension commands in Windows (Default: \${workspaceFolder}\\build)
    * - idf.sdkconfigFilePath
      - Absolute path for the sdkconfig file
    * - idf.sdkconfigDefaults
      - List of sdkconfig default values for initial build configuration
    * - idf.cmakeCompilerArgs
      - Arguments for CMake compilation task
    * - idf.customExtraVars
      - Variables to be added to system environment variables
    * - idf.gitPath
      - Path to the Git executable
    * - idf.gitPathWin
      - Path to the Git executable in Windows
    * - idf.enableCCache
      - Enable CCache in build task (make sure CCache is in PATH)
    * - idf.enableIdfComponentManager
      - Enable IDF Component manager in build command
    * - idf.ninjaArgs
      - Arguments for Ninja build task

This is how the extension uses them:

1. **idf.customExtraVars** stores any custom environment variable such as OPENOCD_SCRIPTS, which is the openOCD scripts directory used in OpenOCD server startup. These variables are loaded to this extension command's process environment variables, choosing the extension variable if available, else extension commands will try to use what is already in your system PATH. **This doesn't modify your system environment outside Visual Studio Code.**
2. **idf.gitPath** (or **idf.gitPathWin** in Windows) is used in the extension to clone ESP-IDF master version or the additional supported frameworks such as ESP-ADF, ESP-MDF and Arduino-ESP32.

.. note::

    From Visual Studio Code extension context, we can't modify your system PATH or any other environment variable. We use a modified process environment in all of this extension tasks and child processes which should not affect any other system process or extension. Please review the content of **idf.customExtraVars** in case you have issues with other extensions.

Board/Chip Specific Settings
----------------------------

These settings are specific to the ESP32 Chip/Board.

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - Setting
      - Description
    * - **idf.flashBaudRate**
      - Flash Baud Rate
    * - **idf.monitorBaudRate**
      - Monitor Baud Rate (Empty by default to use SDKConfig ``CONFIG_ESP_CONSOLE_UART_BAUDRATE``)
    * - **idf.openOcdConfigs**
      - Configuration files for OpenOCD, relative to ``OPENOCD_SCRIPTS`` folder. If ``idf.openOcdLaunchArgs`` is defined this setting is ignored.
    * - **idf.openOcdLaunchArgs**
      - Custom arguments for OpenOCD. If not defined, the resulting OpenOCD launch command will be: ``openocd -d${idf.openOcdDebugLevel} -f ${idf.openOcdConfigs}``.
    * - **idf.openOcdDebugLevel**
      - Set OpenOCD Debug Level (0-4) Default: 2. From 0 (error messages only) to 4 (Verbose low-level debug message). If ``idf.openOcdLaunchArgs`` is defined this setting is ignored.
    * - **idf.port**
      - Path of selected device port
    * - **idf.monitorPort**
      - Optional Path of selected device port for monitor. If undefined, will use **idf.port** instead as monitor port.
    * - **idf.portWin**
      - Path of selected device port in Windows
    * - **idf.enableSerialPortChipIdRequest**
      - Enable detecting the chip ID and show on serial port selection list. Scope can only be **Global (User Settings)**.
    * - **idf.useSerialPortVendorProductFilter**
      - Enable use of ``idf.usbSerialPortFilters`` list to filter serial port devices list. Scope can only be **Global (User Settings)**.
    * - **idf.usbSerialPortFilters**
      - USB productID and vendorID list to filter known Espressif devices. Scope can only be **Global (User Settings)**.
    * - **idf.serialPortDetectionTimeout**
      - Timeout in seconds for serial port detection using esptool.py (Default: 60)
    * - **openocd.jtag.command.force_unix_path_separator**
      - Forced to use ``/`` instead of ``\\`` as path separator for Win32 based OS
    * - **idf.svdFilePath**
      - SVD file absolute path to resolve chip debug peripheral tree view
    * - **idf.jtagFlashCommandExtraArgs**
      - OpenOCD JTAG flash extra arguments. Default is ``["verify", "reset"]``.
    * - **idf.imageViewerConfigs**
      - Path to custom image format configurations JSON file for the Image Viewer feature. Can be relative to workspace folder or absolute path.

This is how the extension uses them:

1. **idf.flashBaudRate** is the baud rate value used for the **ESP-IDF: Flash your Project** command and `Debugging <https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/debugproject.html>`_.
2. **idf.monitorBaudRate** is the ESP-IDF Monitor baud rate value and fallback from your project's sdkconfig ``CONFIG_ESPTOOLPY_MONITOR_BAUD`` (idf.py monitor' baud rate). You can override this value by setting the ``IDF_MONITOR_BAUD`` or ``MONITORBAUD`` environment variables, or by configuring it through **idf.customExtraVars** setting of the extension.
3. **idf.openOcdConfigs** stores an string array of relative paths to OpenOCD script configuration files, which are used with OpenOCD server. (e.g.，``["interface/ftdi/esp32_devkitj_v1.cfg", "board/esp32-wrover.cfg"]``). More information can be found in `OpenOCD JTAG Target Configuration <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/tips-and-quirks.html#jtag-debugging-tip-openocd-configure-target>`_.
4. **idf.port** (or **idf.portWin** in Windows) is used as the serial port value for the extension commands.
5. **idf.openOcdDebugLevel** is the log level for OpenOCD server output from 0 (error messages only) to 4 (Verbose low-level debug message).
6. **idf.openOcdLaunchArgs** is the launch arguments string array for OpenOCD. If not defined, the resulting OpenOCD launch command looks like this: ``openocd -d${idf.openOcdDebugLevel} -f ${idf.openOcdConfigs}``.
7. **idf.jtagFlashCommandExtraArgs** is used for OpenOCD JTAG flash task. Please review `Upload application for debugging <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/index.html#upload-application-for-debugging>`.
8. **idf.serialPortDetectionTimeout** is the timeout value in seconds used for the **ESP-IDF: Select Port** command when auto-detecting serial ports using esptool.py. This setting allows users to configure how long the extension should wait when scanning for compatible devices on available serial ports.

.. note::

    * When using the command **ESP-IDF: Set Espressif Device Target**, it will override the current sdkconfig IDF_TARGET with selected Espressif chip, and it will also update **idf.openOcdConfigs** with its default OpenOCD configuration files.
    * To customize the **idf.openOcdConfigs** alone, you can use the **ESP-IDF: Select OpenOCD Board Configuration** or modify your ``settings.json`` directly.

Code Coverage Specific Settings
-------------------------------

These settings are used to configure the code coverage colors.

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - Setting ID
      - Description
    * - **idf.coveredLightTheme**
      - Background color for covered lines in light theme for gcov coverage
    * - **idf.coveredDarkTheme**
      - Background color for covered lines in dark theme for gcov coverage
    * - **idf.partialLightTheme**
      - Background color for partially covered lines in light theme for gcov coverage
    * - **idf.partialDarkTheme**
      - Background color for partially covered lines in dark theme for gcov coverage
    * - **idf.uncoveredLightTheme**
      - Background color for uncovered lines in light theme for gcov coverage
    * - **idf.uncoveredDarkTheme**
      - Background color for uncovered lines in dark theme for gcov coverage


Unit test Specific Settings
-----------------------------

These settings are used to configure unit testing.

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - Setting ID
      - Description
    * - **idf.unitTestFilePattern**
      - Glob pattern for unit test files to discover (default: ``**/test/test_*.c``)

This is how the extension uses them:

1. **idf.unitTestFilePattern** is used by the extension to discover unit test files in your project. The default pattern :code:`**/test/test_*.c` looks for C files names starting with "test" in any "test" directory.


Extension Behaviour Settings
----------------------------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - Setting ID
      - Description
    * - **idf.enableUpdateSrcsToCMakeListsFile**
      - Enable updating source files in ``CMakeLists.txt`` (default ``true``)
    * - **idf.flashType**
      - Preferred flash method. ``DFU``, ``UART`` or ``JTAG``
    * - **idf.flashPartitionToUse**
      - Specifies the partition to flash during the build and flash process. (default ``all``)
    * - **idf.launchMonitorOnDebugSession**
      - Launch ESP-IDF Monitor along with ESP-IDF debug session
    * - **idf.notificationMode**
      - ESP-IDF extension notifications and output focus mode. (default ``All``)
    * - **idf.showOnboardingOnInit**
      - Show ESP-IDF configuration window on extension activation
    * - **idf.saveScope**
      - Where to save extension settings. Scope can only be **Global (User Settings)**.
    * - **idf.saveBeforeBuild**
      - Save all the edited files before building (default ``true``)
    * - **idf.useIDFKconfigStyle**
      - Enable style validation for Kconfig files
    * - **idf.telemetry**
      - Enable telemetry
    * - **idf.extraCleanPaths**
      - Additional paths to delete on **Full Clean Project** command (default `[]`). For example, you can set it to ``["managed_components", "dependencies.lock"]`` to delete the managed_components directory and the dependencies.lock file from the current workspace folder.
    * - **idf.monitorNoReset**
      - Enable no-reset flag to IDF Monitor (default ``false``)
    * - **idf.monitorEnableTimestamps**
      - Enable timestamps in IDF Monitor (default ``false``)
    * - **idf.monitorCustomTimestampFormat**
      - Custom timestamp format in IDF Monitor
    * - **idf.monitorDelay**
      - Delay to start debug session after IDF monitor execution or breaking monitor session (milliseconds).
    * - **idf.enableStatusBar**
      - Show or hide the extension status bar items
    * - **idf.enableSizeTaskAfterBuildTask**
      - Enable IDF Size Task to be executed after IDF Build Task
    * - **idf.customTerminalExecutable**
      - Absolute path to shell terminal executable to use (default to VS Code Terminal)
    * - **idf.customTerminalExecutableArgs**
      - Shell arguments for idf.customTerminalExecutable


Custom Tasks for Build and Flash Tasks
--------------------------------------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - Setting ID
      - Description
    * - **idf.customTask**
      - Custom task to execute with **ESP-IDF: Execute Custom Task**
    * - **idf.preBuildTask**
      - Command string to execute before build task
    * - **idf.postBuildTask**
      - Command string to execute after build task
    * - **idf.preFlashTask**
      - Command string to execute before flash task
    * - **idf.postFlashTask**
      - Command string to execute after flash task


QEMU Specific Settings
----------------------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - Setting ID
      - Description
    * - **idf.qemuDebugMonitor**
      - Enable QEMU Monitor on debug session
    * - **idf.qemuExtraArgs**
      - QEMU extra arguments


Log Tracing Specific Settings
-----------------------------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - Setting
      - Description
    * - **trace.poll_period**
      - poll_period will be set for the apptrace
    * - **trace.trace_size**
      - trace_size will set for the apptrace
    * - **trace.stop_tmo**
      - stop_tmo will be set for the apptrace
    * - **trace.wait4halt**
      - wait4halt will be set for the apptrace
    * - **trace.skip_size**
      - skip_size will be set for the apptrace


Other Frameworks' Specific Settings
-----------------------------------

These settings support additional frameworks together with ESP-IDF:

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - Setting ID
      - Description
    * - **idf.sbomFilePath**
      - Path to create ESP-IDF SBOM report


Use of Environment Variables in ESP-IDF ``settings.json`` and using other ESP-IDF settings within ESP-IDF settings
----------------------------------------------------------------------------------------------------------------------

Environment (env) variables and other ESP-IDF settings (config) can be referenced in ESP-IDF settings using the syntax ``${env:VARNAME}`` and ``${config:ESPIDFSETTING}``, respectively.

You can also prepend a string to the result of the other ESP-IDF settings (config) by using the syntax ``${config:ESPIDFSETTING:prefix}``. The prefix will be added to the beginning of the variable value. For example ``${config:idf.openOcdConfigs,-f}`` will add ``-f`` to the beginning of the each string value of **idf.openOcdConfigs**.
If ``"idf.openOcdConfigs": ["interface/some.cfg", "target/some.cfg"]`` returns ``-f interface/some.cfg -f target/some.cfg``.

For example, to use ``"~/workspace/blink"``, set the value to ``"${env:HOME}/workspace/blink"``.
