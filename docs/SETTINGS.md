# ESP-IDF Settings

This extension contributes the following settings that can be later updated in settings.json or from VS Code Settings Preference Menu (Menu View -> Command Palette -> Preferences: Open Settings (UI)).

> **NOTE:** Please consider that `~`, `%VARNAME%` and `$VARNAME` are not recognized when set on ANY of this extension configuration settings. You can instead set any environment variable in the path using a `${env:VARNAME}` such as `${env:HOME}` or you can refer to other configuration parameter path with `${config:SETTINGID}` such as `${config:idf.espIdfPath}`.

The `idf.saveScope` allows you to specify where to save settings when using commands such as `Set Espressif Device Target` and other commands. Possible values are Global (User Settings), Workspace and WorkspaceFolder. For more information please take a look at [Working with Multiple Projects](./MULTI_PROJECTS.md). Use the `Select where to Save Configuration Settings` command to choose where to save settings when using this extension commands.

> **NOTE:** All settings can be applied to Global (User Settings), Workspace and WorkspaceFolder unless Scope is specified.

## ESP-IDF Specific Settings

These are the configuration settings that ESP-IDF extension contributes to your Visual Studio Code editor settings.

| Setting ID                      | Description                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------- |
| `idf.buildPath`                 | Custom build directory name for extension commands. (Default: \${workspaceFolder}/build)  |
| `idf.buildPathWin`              | Custom build directory name for extension commands. (Default: \${workspaceFolder}\\build) |
| `idf.sdkconfigDefaults`         | List of sdkconfig default values for initial build configuration                          |
| `idf.cmakeCompilerArgs`         | Arguments for CMake compilation task                                                      |
| `idf.customExtraPaths`          | Paths to be appended to \$PATH                                                            |
| `idf.customExtraVars`           | Variables to be added to system environment variables                                     |
| `idf.gitPath`                   | Path to git executable                                                                    |
| `idf.gitPathWin`                | Path to git executable in Windows                                                         |
| `idf.enableCCache`              | Enable CCache on build task (make sure CCache is in PATH)                                 |
| `idf.enableIdfComponentManager` | Enable IDF Component manager in build command                                             |
| `idf.espIdfPath`                | Path to locate ESP-IDF framework (IDF_PATH)                                               |
| `idf.espIdfPathWin`             | Path to locate ESP-IDF framework in Windows (IDF_PATH)                                    |
| `idf.ninjaArgs`                 | Arguments for Ninja build task                                                            |
| `idf.pythonBinPath`             | Python absolute binary path used to execute ESP-IDF Python Scripts                        |
| `idf.pythonBinPathWin`          | Python absolute binary path used to execute ESP-IDF Python Scripts in Windows             |
| `idf.toolsPath`                 | Path to locate ESP-IDF Tools (IDF_TOOLS_PATH)                                             |
| `idf.toolsPathWin`              | Path to locate ESP-IDF Tools in Windows (IDF_TOOLS_PATH)                                  |

This is how the extension uses them:

1. `idf.customExtraPaths` is pre-appended to your system environment variable PATH within Visual Studio Code **(not modifying your system environment)** before executing any of our extension commands such as `openocd` or `cmake` (i.e. build your current project) else extension commands will try to use what is already in your system PATH.
   > **NOTE:** In **ESP-IDF: Configure ESP-IDF Extension** you can download ESP-IDF Tools or skip IDF Tools download and manually enter all required ESP-IDF Tools as explain in [SETUP](./SETUP.md) which will be saved in `idf.customExtraPaths`.
2. `idf.customExtraVars` stores any custom environment variable such as OPENOCD_SCRIPTS, which is the OpenOCD scripts directory used in OpenOCD server startup. These variables are loaded to this extension commands process environment variables, choosing the extension variable if available, else extension commands will try to use what is already in your system PATH. **This doesn't modify your system environment outside Visual Studio Code.**
3. `idf.espIdfPath` (or `idf.espIdfPathWin` in Windows) is used to store ESP-IDF directory path within our extension. We override Visual Studio Code process IDF_PATH if this value is available. **This doesn't modify your system environment outside Visual Studio Code.**
4. `idf.pythonBinPath` (or `idf.espIdfPathWin` in Windows) is used to executed python scripts within the extension. In **ESP-IDF: Configure ESP-IDF Extension** we first select a system-wide python executable from which to create a python virtual environment and we save the executable from this virtual environment in `idf.pythonBinPath`. All required python packages by ESP-IDF are installed in this virtual environment, if using **ESP-IDF: Configure ESP-IDF Extension**
5. `idf.gitPath` (or `idf.gitPathWin` in Windows) is used in the extension to clone ESP-IDF master version or the additional supported frameworks such as ESP-ADF, ESP-MDF and Arduino-ESP32.

> **NOTE**: From Visual Studio Code extension context, we can't modify your system PATH or any other environment variable. We use a modified process environment in all of this extension tasks and child processes which should not affect any other system process or extension. Please review the content of `idf.customExtraPaths` and `idf.customExtraVars` in case you have issues with other extensions.

## Board/Chip Specific Settings

These settings are specific to the ESP32 Chip/Board

| Setting                                          | Description                                                                            | Scope                     |
| ------------------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------- |
| `idf.adapterTargetName`                          | ESP-IDF Target Chip (Example: esp32)                                                   |                           |
| `idf.customAdapterTargetName`                    | Custom Target Name for ESP-IDF Debug Adapter                                           |                           |
| `idf.flashBaudRate`                              | Flash Baud rate                                                                        |                           |
| `idf.monitorBaudRate`                            | Monitor Baud Rate (Empty by default to use SDKConfig CONFIG_ESP_CONSOLE_UART_BAUDRATE) |                           |
| `idf.openOcdConfigs`                             | Configuration Files for OpenOCD. Relative to OPENOCD_SCRIPTS folder                    |                           |
| `idf.openOcdLaunchArgs`                          | Launch Arguments for OpenOCD before idf.openOcdDebugLevel and idf.openOcdConfigs       |                           |
| `idf.openOcdDebugLevel`                          | Set OpenOCD Debug Level (0-4) Default: 2                                               |                           |
| `idf.port`                                       | Path of Selected Device port                                                           |                           |
| `idf.portWin`                                    | Path of Selected Device Port in Windows                                                |                           |
| `idf.enableSerialPortChipIdRequest`              | Enable detecting the chip id and show on serial port selection list                    |                           |
| `idf.useSerialPortVendorProductFilter`           | Enable use of idf.usbSerialPortFilters list to filter serial port devices list         |                           |
| `idf.usbSerialPortFilters`                       | USB productID and vendorID list to filter known Espressif devices                      |                           |
| `openocd.jtag.command.force_unix_path_separator` | Forced to Use `/` as Path sep. for Win32 Based OS Instead of `\\`                      | User, Remote or Workspace |
| `idf.listDfuDevices`                             | List of DFU Devices Connected to USB                                                   | User, Remote or Workspace |
| `idf.selectedDfuDevicePath`                      | Selected DFU Device Connected to USB                                                   | User, Remote or Workspace |
| `idf.svdFilePath`                                | SVD File Absolute Path to Resolve Chip Debug Peripheral Tree view                      | User, Remote or Workspace |

This is how the extension uses them:

1. `idf.adapterTargetName` is used to select the chipset (esp32, esp32s2, esp32s3, esp32c3 and custom) on which to run the extension commands.
   > **NOTE** When you use the command **ESP-IDF: Set Espressif Device Target** it will override `idf.adapterTargetName` with selected chip and `idf.openOcdConfigs` with its default OpenOCD Configuration Files.
   >
   > > If you want to customize the `idf.openOcdConfigs` alone, you can use the **ESP-IDF: Select OpenOCD Board Configuration** or modify your settings.json directly.
2. `idf.customAdapterTargetName` is used when `idf.adapterTargetName` is set to `custom`.
3. `idf.flashBaudRate` is the baud rate value used for the **ESP-IDF: Flash your Project** command and [ESP-IDF Debug](./DEBUGGING.md).
4. `idf.monitorBaudRate` is the ESP-IDF Monitor baud rate value and fallback from your project's skdconfig `CONFIG_ESPTOOLPY_MONITOR_BAUD` (idf.py monitor' baud rate). This value can also be override by setting the environment variable `IDF_MONITOR_BAUD` or `MONITORBAUD` in your system environment variables or this extension's `idf.customExtraVars` configuration setting.
5. `idf.openOcdConfigs` is used to store an string array of OpenOCD scripts directory relative path config files to use with OpenOCD server. (Example: ["interface/ftdi/esp32_devkitj_v1.cfg", "board/esp32-wrover.cfg"]). More information [here](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/tips-and-quirks.html#jtag-debugging-tip-openocd-configure-target).
6. `idf.port` (or `idf.portWin` in Windows) is used as the serial port value for the extension commands.
7. `idf.openOcdDebugLevel`: Log level for OpenOCD Server output from 0 to 4.
8. `idf.openOcdLaunchArgs`: Launch arguments string array for OpenOCD. The resulting OpenOCD launch command looks like this: `openocd -d${idf.openOcdDebugLevel} -f ${idf.openOcdConfigs} ${idf.openOcdLaunchArgs}`.

## Code Coverage Specific Settings

These settings are used to configure the [Code Coverage](./COVERAGE.md) colors.

| Setting ID                | Description                                                                   |
| ------------------------- | ----------------------------------------------------------------------------- |
| `idf.coveredLightTheme`   | Background color for covered lines in light theme for gcov coverage           |
| `idf.coveredDarkTheme`    | Background color for covered lines in dark theme for gcov coverage            |
| `idf.partialLightTheme`   | Background color for partially covered lines in light theme for gcov coverage |
| `idf.partialDarkTheme`    | Background color for partially covered lines in dark theme for gcov coverage  |
| `idf.uncoveredLightTheme` | Background color for uncovered lines in light theme for gcov coverage         |
| `idf.uncoveredDarkTheme`  | Background color for uncovered lines in dark theme for gcov coverage          |

## Extension Behaviour Settings

| Setting ID                             | Description                                                                     | Scope                     |
| -------------------------------------- | ------------------------------------------------------------------------------- | ------------------------- |
| `idf.enableUpdateSrcsToCMakeListsFile` | Enable update source files in CMakeLists.txt (default `true`)                   | User, Remote or Workspace |
| `idf.flashType`                        | Preferred flash method. DFU, UART or JTAG                                       |                           |
| `idf.launchMonitorOnDebugSession`      | Launch ESP-IDF Monitor along with ESP-IDF Debug session                         |                           |
| `idf.notificationMode`                 | ESP-IDF extension notifications and output focus mode. (default `All`)          | User, Remote or Workspace |
| `idf.showOnboardingOnInit`             | Show ESP-IDF Configuration Window on extension activation                       | User, Remote or Workspace |
| `idf.saveScope`                        | Where to save extension settings                                                | User, Remote or Workspace |
| `idf.saveBeforeBuild`                  | Save all the edited files before building (default `true`)                      |                           |
| `idf.useIDFKconfigStyle`               | Enable style validation for Kconfig files                                       |                           |
| `idf.telemetry`                        | Enable telemetry                                                                | User, Remote or Workspace |
| `idf.deleteComponentsOnFullClean`      | Delete `managed_components` on Full Clean Project command (default `false`)     | User, Remote or Workspace |
| `idf.monitorNoReset`                   | Enable no-reset flag to IDF Monitor (default `false`)                           | User, Remote or Workspace |
| `idf.monitorEnableTimestamps`          | Enable timestamps in IDF Monitor (default `false`)                              | User, Remote or Workspace |
| `idf.monitorCustomTimestampFormat`     | Custom timestamp format in IDF Monitor                                          | User, Remote or Workspace |
| `idf.monitorStartDelayBeforeDebug`     | Delay to start debug session after IDF monitor execution                        | User, Remote or Workspace |
| `idf.enableStatusBar`                  | Show or hide the extension status bar items                                     | User, Remote or Workspace |
| `idf.enableSizeTaskAfterBuildTask`     | Enable IDF Size Task to be executed after IDF Build Task                        | User, Remote or Workspace |
| `idf.customTerminalExecutable`         | Absolute path to shell terminal executable to use (default to VS Code Terminal) | User, Remote or Workspace |
| `idf.customTerminalExecutableArgs`     | Shell arguments for idf.customTerminalExecutable                                | User, Remote or Workspace |

## Custom Tasks for Build and Flash Tasks

| Setting ID          | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| `idf.customTask`    | Custom task to execute with `ESP-IDF: Execute Custom Task` |
| `idf.preBuildTask`  | Command string to execute before build task                |
| `idf.postBuildTask` | Command string to execute after build task                 |
| `idf.preFlashTask`  | Command string to execute before flash task                |
| `idf.postFlashTask` | Command string to execute after flash task                 |

### QEMU Specific Settings

| Setting ID        | Description                            |
| ----------------- | -------------------------------------- |
| `idf.qemuTcpPort` | QEMU tcp port for serial communication |

### Log Tracing Specific Settings

These settings are specific to [Application Log Tracing](./HEAP_TRACING.md).

| Setting             | Description                              |
| ------------------- | ---------------------------------------- |
| `trace.poll_period` | poll_period will be set for the apptrace |
| `trace.trace_size`  | trace_size will set for the apptrace     |
| `trace.stop_tmo`    | stop_tmo will be set for the apptrace    |
| `trace.wait4halt`   | wait4halt will be set for the apptrace   |
| `trace.skip_size`   | skip_size will be set for the apptrace   |

## Other Frameworks Specific Settings

These settings allow to support additional frameworks together with ESP-IDF:

| Setting ID                | Description                                                     |
| ------------------------- | --------------------------------------------------------------- |
| `idf.espAdfPath`          | Path to locate ESP-ADF framework (ADF_PATH)                     |
| `idf.espAdfPathWin`       | Path to locate ESP-ADF framework in Windows (ADF_PATH)          |
| `idf.espMdfPath`          | Path to locate ESP-MDF framework (MDF_PATH)                     |
| `idf.espMdfPathWin`       | Path to locate ESP-MDF framework in Windows (MDF_PATH)          |
| `idf.espMatterPath`       | Path to locate ESP-Matter framework (ESP_MATTER_PATH)           |
| `idf.espRainmakerPath`    | Path to locate ESP-Rainmaker framework in Windows (RMAKER_PATH) |
| `idf.espRainmakerPathWin` | Path to locate ESP-Rainmaker framework in Windows (RMAKER_PATH) |
| `idf.sbomFilePath`        | Path to create ESP-IDF SBOM report                              |

## Use of Environment Variables in ESP-IDF settings.json and tasks.json

Environment (env) variables and other ESP-IDF settings (config) current values strings can be used in other ESP-IDF setting as `${env:VARNAME}` and `${config:ESPIDFSETTING}`, respectively.

Example : If you want to use `"~/esp/esp-idf"` you can set the value of `idf.espIdfPath` to `"${env:HOME}/esp/esp-idf"`.
