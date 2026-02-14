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

The settings are grouped in the same categories as in the VS Code Settings UI (and in ``package.json``):

Setup & Installation
--------------------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - Setting ID
      - Description
    * - **idf.eimIdfJsonPath**
      - Path to the ESP-IDF Installation Manager (EIM) idf.json file. Scope: Application.
    * - **idf.eimExecutableArgs**
      - Arguments for the EIM executable (default: ``["gui"]``). Scope: Application.
    * - **idf.currentSetup**
      - Current ESP-IDF setup identifier. Scope: Resource.
    * - **idf.gitPath**
      - Path to the Git executable (default: ``/usr/bin/git``). Scope: Application.
    * - **idf.gitPathWin**
      - Path to the Git executable in Windows (default: ``${env:programfiles}\\Git\\cmd\\git.exe``). Scope: Application.
    * - **idf.extensionActivationMode**
      - Controls extension activation mode: ``"detect"`` (default), ``"always"``, or ``"never"``.

**idf.gitPath** (or **idf.gitPathWin** on Windows) is used by the extension to clone ESP-IDF or additional supported frameworks such as ESP-ADF, ESP-MDF and Arduino-ESP32.

Serial Port
-----------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - Setting ID
      - Description
    * - **idf.port**
      - Path of selected device port (default: ``detect``). Scope: Resource.
    * - **idf.portWin**
      - Path of selected device port in Windows (default: ``detect``). Scope: Resource.
    * - **idf.monitorPort**
      - Optional path of selected device port for monitor. If undefined, **idf.port** is used. Scope: Resource.
    * - **idf.flashBaudRate**
      - Flash baud rate (default: ``460800``). Used for **ESP-IDF: Flash your Project** and debugging. Scope: Resource.
    * - **idf.monitorBaudRate**
      - Monitor baud rate. Empty by default to use sdkconfig ``CONFIG_ESP_CONSOLE_UART_BAUDRATE``. Scope: Resource.
    * - **idf.enableSerialPortChipIdRequest**
      - Enable detecting the chip ID and show on serial port selection list. Scope: Application.
    * - **idf.useSerialPortVendorProductFilter**
      - Enable use of **idf.usbSerialPortFilters** to filter serial port devices list. Scope: Application.
    * - **idf.usbSerialPortFilters**
      - USB productId and vendorId map to filter known Espressif devices. Scope: Application.
    * - **idf.serialPortDetectionTimeout**
      - Timeout in seconds for serial port detection using esptool.py (default: 60). Scope: Resource.

Flash
-----

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - Setting ID
      - Description
    * - **idf.openOcdConfigs**
      - Configuration files for OpenOCD, relative to ``OPENOCD_SCRIPTS`` folder. If **idf.openOcdLaunchArgs** is defined this setting is ignored. Scope: Resource.
    * - **idf.flashType**
      - Preferred flash method: ``UART``, ``JTAG`` or ``DFU``. Scope: Resource.
    * - **idf.flashPartitionToUse**
      - Partition to flash during build and flash (default: ``all``). Options: ``all``, ``app``, ``bootloader``, ``partition-table``. Scope: Resource.
    * - **idf.jtagFlashCommandExtraArgs**
      - OpenOCD JTAG flash extra arguments (default: ``["verify", "compress", "skip_loaded", "reset"]``). Scope: Resource.
    * - **idf.preFlashTask**
      - Command string to execute before flash task. Scope: Resource.
    * - **idf.postFlashTask**
      - Command string to execute after flash task. Scope: Resource.

.. note::

    When using **ESP-IDF: Set Espressif Device Target**, the extension overrides the current sdkconfig ``IDF_TARGET`` and updates **idf.openOcdConfigs** with default OpenOCD config files. To customize **idf.openOcdConfigs** only, use **ESP-IDF: Select OpenOCD Board Configuration** or edit ``settings.json``.

Build
-----

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - Setting ID
      - Description
    * - **idf.buildPath**
      - Custom build directory for extension commands (default: ``${workspaceFolder}/build``). Scope: Resource.
    * - **idf.buildPathWin**
      - Custom build directory in Windows (default: ``${workspaceFolder}\\build``). Scope: Resource.
    * - **idf.cmakeCompilerArgs**
      - Arguments for CMake configuration (default includes ``-G Ninja``, ``-DPYTHON_DEPS_CHECKED=1``, ``-DESP_PLATFORM=1``). Scope: Resource.
    * - **idf.sdkconfigDefaults**
      - List of sdkconfig default values for initial build configuration. Scope: Resource.
    * - **idf.ninjaArgs**
      - Arguments for Ninja build task. Scope: Resource.
    * - **idf.customExtraVars**
      - Key-value object of environment variables added to extension command processes (e.g. ``OPENOCD_SCRIPTS``). Does not modify system environment outside VS Code. Scope: Resource.
    * - **idf.useIDFKconfigStyle**
      - Enable style validation for Kconfig files. Scope: Resource.
    * - **idf.saveBeforeBuild**
      - Save all edited files before building (default: ``true``). Scope: Resource.
    * - **idf.enableCCache**
      - Enable CCache in build task (ensure CCache is in PATH). Scope: Resource.
    * - **idf.extraCleanPaths**
      - Additional paths to delete on **Full Clean Project** (default: ``[]``). E.g. ``["managed_components", "dependencies.lock"]``. Scope: Resource.
    * - **idf.sdkconfigFilePath**
      - Absolute path for the sdkconfig file. Scope: Resource.
    * - **idf.enableSizeTaskAfterBuildTask**
      - Run IDF Size task after IDF Build task (default: ``true``). Scope: Resource.
    * - **idf.preBuildTask**
      - Command string to execute before build task. Scope: Resource.
    * - **idf.postBuildTask**
      - Command string to execute after build task. Scope: Resource.

Debug & OpenOCD
---------------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - Setting ID
      - Description
    * - **openocd.tcl.host**
      - OpenOCD TCL server host (default: ``localhost``). Scope: Resource.
    * - **openocd.tcl.port**
      - OpenOCD TCL server port (default: ``6666``). Scope: Resource.
    * - **openocd.jtag.command.force_unix_path_separator**
      - Use ``/`` instead of ``\\`` as path separator on Win32 (default: ``true``).
    * - **idf.launchMonitorOnDebugSession**
      - Launch ESP-IDF Monitor when starting an ESP-IDF debug session (default: ``false``). Scope: Resource.
    * - **idf.openOcdDebugLevel**
      - OpenOCD debug level 0–4 (default: 2). 0 = error only, 4 = verbose. Ignored if **idf.openOcdLaunchArgs** is set. Scope: Resource.
    * - **idf.openOcdLaunchArgs**
      - Custom arguments for OpenOCD. If set, **idf.openOcdConfigs** and **idf.openOcdDebugLevel** are ignored. Command form otherwise: ``openocd -d${idf.openOcdDebugLevel} -f ${idf.openOcdConfigs}``. Scope: Resource.
    * - **idf.svdFilePath**
      - SVD file path for chip debug peripheral tree view (default: ``${workspaceFolder}/esp32.svd``). Scope: Resource.

Monitor
-------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - Setting ID
      - Description
    * - **idf.monitorDelay**
      - Delay in milliseconds before starting debug session after IDF Monitor or when breaking monitor (default: 1000). Scope: Resource.
    * - **idf.monitorNoReset**
      - Enable no-reset flag for IDF Monitor (default: ``false``). Scope: Resource.
    * - **idf.monitorEnableTimestamps**
      - Enable timestamps in IDF Monitor (default: ``false``). Scope: Resource.
    * - **idf.monitorCustomTimestampFormat**
      - Custom timestamp format for IDF Monitor. Scope: Resource.

App Trace
---------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - Setting ID
      - Description
    * - **trace.poll_period**
      - Poll period for apptrace. Scope: Resource.
    * - **trace.trace_size**
      - Trace size for apptrace (default: 2048). Scope: Resource.
    * - **trace.stop_tmo**
      - Stop timeout for apptrace (default: 3). Scope: Resource.
    * - **trace.wait4halt**
      - Wait for halt for apptrace (0 or 1, default: 0). Scope: Resource.
    * - **trace.skip_size**
      - Skip size for apptrace (default: 0). Scope: Resource.

Tasks & Terminal
----------------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - Setting ID
      - Description
    * - **idf.customTask**
      - Custom task command for **ESP-IDF: Execute Custom Task**. Scope: Resource.
    * - **idf.customTerminalExecutable**
      - Absolute path to shell executable for extension terminals (default: VS Code default). Scope: Resource.
    * - **idf.customTerminalExecutableArgs**
      - Arguments for **idf.customTerminalExecutable**. Scope: Resource.

UI & Notifications
------------------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - Setting ID
      - Description
    * - **idf.showOnboardingOnInit**
      - Show ESP-IDF configuration/onboarding window on extension activation (default: ``true``). Scope: Window.
    * - **idf.hasWalkthroughBeenShown**
      - Whether the walkthrough has been shown. Scope: Application.
    * - **idf.notificationMode**
      - Notifications and output focus mode: ``Silent``, ``Notifications``, ``Output``, ``All`` (default: ``All``). Scope: Resource.
    * - **idf.saveScope**
      - Where to save extension settings: Global (1), Workspace (2), WorkspaceFolder (3). Scope: Application only.
    * - **idf.enableStatusBar**
      - Show or hide extension status bar items (default: ``true``). Scope: Resource.
    * - **idf.enableUpdateSrcsToCMakeListsFile**
      - Enable updating source files in ``CMakeLists.txt`` (default: ``true``). Scope: Window.

Telemetry
---------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - Setting ID
      - Description
    * - **idf.telemetry**
      - Enable telemetry (default: ``true``).

ESP Rainmaker Settings
----------------------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - Setting ID
      - Description
    * - **esp.rainmaker.api.server_url**
      - ESP Rainmaker API server URL (default: ``https://api.rainmaker.espressif.com/v1/``). Scope: Resource.
    * - **esp.rainmaker.oauth.url**
      - ESP Rainmaker OAuth URL (default: ``https://auth.rainmaker.espressif.com/oauth2/authorize``). Scope: Resource.

Coverage
--------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - Setting ID
      - Description
    * - **idf.coveredLightTheme**
      - Background color for covered lines (light theme) in gcov coverage (default: ``rgba(0,128,0,0.1)``). Scope: Resource.
    * - **idf.coveredDarkTheme**
      - Background color for covered lines (dark theme) in gcov coverage (default: ``rgba(0,128,0,0.1)``). Scope: Resource.
    * - **idf.partialLightTheme**
      - Background color for partially covered lines (light theme) (default: ``rgba(250,218,94,0.1)``). Scope: Resource.
    * - **idf.partialDarkTheme**
      - Background color for partially covered lines (dark theme) (default: ``rgba(250,218,94,0.1)``). Scope: Resource.
    * - **idf.uncoveredLightTheme**
      - Background color for uncovered lines (light theme) (default: ``rgba(255,0,0,0.1)``). Scope: Resource.
    * - **idf.uncoveredDarkTheme**
      - Background color for uncovered lines (dark theme) (default: ``rgba(255,0,0,0.1)``). Scope: Resource.

Component Manager
------------------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - Setting ID
      - Description
    * - **idf.enableIdfComponentManager**
      - Enable IDF Component Manager in build command (default: ``false``). Scope: Resource.
    * - **esp.component-manager.url**
      - ESP Component Registry URL (default: ``https://components.espressif.com``). Scope: Resource.

QEMU Settings
-------------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - Setting ID
      - Description
    * - **idf.qemuDebugMonitor**
      - Enable QEMU Monitor in debug session (default: ``true``). Scope: Resource.
    * - **idf.qemuExtraArgs**
      - Extra arguments for QEMU. Scope: Resource.

Unit Test
---------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - Setting ID
      - Description
    * - **idf.unitTestFilePattern**
      - Glob pattern for unit test file discovery (default: ``**/test/test_*.c``). Scope: Resource.

Other
------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - Setting ID
      - Description
    * - **idf.wssPort**
      - WebSocket server port (default: 49203, range 49152–65535). Scope: Resource.
    * - **idf.sbomFilePath**
      - Path for ESP-IDF SBOM report (default: ``espidf.spdx``). Scope: Resource.
    * - **idf.imageViewerConfigs**
      - Path to custom image format configurations JSON for the Image Viewer (relative to workspace or absolute). Scope: Resource.

Use of Environment Variables in ESP-IDF ``settings.json`` and using other ESP-IDF settings within ESP-IDF settings
----------------------------------------------------------------------------------------------------------------------

Environment (env) variables and other ESP-IDF settings (config) can be referenced in ESP-IDF settings using the syntax ``${env:VARNAME}`` and ``${config:ESPIDFSETTING}``, respectively.

You can also prepend a string to the result of the other ESP-IDF settings (config) by using the syntax ``${config:ESPIDFSETTING,prefix}``. The prefix will be added to the beginning of the variable value. For example ``${config:idf.openOcdConfigs,-f}`` will add ``-f`` to the beginning of the each string value of **idf.openOcdConfigs**.
If ``"idf.openOcdConfigs": ["interface/some.cfg", "target/some.cfg"]`` returns ``-f interface/some.cfg -f target/some.cfg``.

For example, to use ``"~/workspace/blink"``, set the value to ``"${env:HOME}/workspace/blink"``.
