## ESP IDF Settings

This extension contributes the following settings that can be later updated in settings.json or from VSCode Settings Preference menu (F1 -> Preferences: Open Settings (UI)).

> **NOTE:** Please consider that `~` and `$VARNAME` are not recognized when set on ANY of this extension configuration settings. You can instead set any environment variable in the path using a `${env:VARNAME}` such as `${env:HOME}` or you can refer to other configuration parameter path with `${config:SETTINGID}` such as `${config:idf.espIdfPath}`.

### ESP-IDF Specific Settings

These are the configuration settings that ESP-IDF extension contributes to your Visual Studio Code editor settings.

| Setting ID             | Description                                                                   |
| ---------------------- | ----------------------------------------------------------------------------- |
| `idf.customExtraPaths` | Paths to be appended to \$PATH                                                |
| `idf.customExtraVars`  | Variables to be added to system environment variables                         |
| `idf.espIdfPath`       | Path to locate ESP-IDF framework (IDF_PATH)                                   |
| `idf.espIdfPathWin`    | Path to locate ESP-IDF framework in Windows (IDF_PATH)                        |
| `idf.pythonBinPath`    | Python absolute binary path used to execute ESP-IDF Python Scripts            |
| `idf.pythonBinPathWin` | Python absolute binary path used to execute ESP-IDF Python Scripts in Windows |
| `idf.toolsPath`        | Path to locate ESP-IDF Tools (IDF_TOOLS_PATH)                                 |
| `idf.toolsPathWin`     | Path to locate ESP-IDF Tools in Windows (IDF_TOOLS_PATH)                      |

This is how the extension uses them:

1. `idf.customExtraPaths` is pre-appended to your system environment variable PATH within Visual Studio Code **(not modifying your system environment)** before executing any of our extension commands such as `openocd` or `cmake` (i.e. build your current project) else extension commands will try to use what is already in your system PATH.
   > **NOTE:** In **ESP-IDF: Configure ESP-IDF extension** you can download ESP-IDF Tools or skip IDF Tools download and manually enter all required ESP-IDF Tools as explain in [SETUP](./SETUP.md) which will be saved in `idf.customExtraPaths`.
2. `idf.customExtraVars` stores any custom environment variable such as OPENOCD_SCRIPTS, which is the openOCD scripts directory used in openocd server startup. These variables are loaded to this extension commands process environment variables, choosing the extension variable if available, else extension commands will try to use what is already in your system PATH. **This doesn't modify your system environment outside Visual Studio Code.**
3. `idf.espIdfPath` (or `idf.espIdfPathWin` in Windows) is used to store ESP-IDF directory path within our extension. We override Visual Studio Code process IDF_PATH if this value is available. **This doesn't modify your system environment outside Visual Studio Code.**
4. `idf.pythonBinPath` (or `idf.espIdfPathWin` in Windows) is used to executed python scripts within the extension. In **ESP-IDF: Configure ESP-IDF extension** we first select a system-wide python executable from which to create a python virtual environment and we save the executable from this virtual environment in `idf.pythonBinPath`. All required python packages by ESP-IDF are installed in this virtual environment, if using **ESP-IDF: Configure ESP-IDF extension**

> **Note**: From Visual Studio Code extension context, we can't modify your system PATH or any other environment variable. We do override the current Visual Studio Code process environment variables which might collide with other extension you might have installed. Please review the content of `idf.customExtraPaths` and `idf.customExtraVars` in case you have issues with other extensions.

### Board/ Chip Specific Settings

These settings are specific to the ESP32 Chip/ Board

| Setting                                          | Description                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------- |
| `idf.adapterTargetName`                          | ESP-IDF target Chip (Example: esp32)                                |
| `idf.flashBaudRate`                              | Flash Baud rate                                                     |
| `idf.openOcdConfigs`                             | Configuration files for OpenOCD. Relative to OPENOCD_SCRIPTS folder |
| `openocd.jtag.command.force_unix_path_separator` | Forced to use `/` as path sep. for Win32 based OS instead of `\\`   |
| `idf.port`                                       | Path of selected device port                                        |
| `idf.portWin`                                    | Path of selected device port in Windows                             |

This is how the extension uses them:

1. `idf.adapterTargetName` is used to select the chipset (esp32, esp32 s2, etc.) on which to run our extension commands.
   > **NOTE** When you use the command **ESP-IDF: Set Espressif device target** it will override `idf.adapterTargetName` with selected chip and `idf.openOcdConfigs` with its default OpenOCD Configuration files.
   >
   > > If you want to customize the `idf.openOcdConfigs` alone, you can modify your user settings.json or use **ESP-IDF: Device configuration** and select `Enter OpenOCD Configuration File Paths list` by entering each file separated by comma ",".
2. `idf.flashBaudRate` is the baud rate value used for the **ESP-IDF: Flash your project** command and [ESP-IDF Debug](./DEBUGGING.md).
   > **NOTE** The ESP-IDF Monitor default baud rate value is taken from your project's skdconfig `CONFIG_ESPTOOLPY_MONITOR_BAUD` (idf.py monitor' baud rate). This value can be override by setting the environment variable `IDF_MONITOR_BAUD` or `MONITORBAUD` in your system environment variables or this extension's `idf.customExtraVars` configuration setting.
3. `idf.openOcdConfigs` is used to store an array of openOCD scripts directory relative path config files to use with OpenOCD server. (Example: ["interface/ftdi/esp32_devkitj_v1.cfg", "board/esp32-wrover.cfg"]). More information [here](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/tips-and-quirks.html#jtag-debugging-tip-openocd-configure-target).
4. `idf.port` (or `idf.portWin` in Windows) is used as the serial port value for the extension commands.

### Code coverage Specific Settings

These settings are used to configure the [Code coverage](./COVERAGE.md) colors.

| Setting ID                | Description                                                                   |
| ------------------------- | ----------------------------------------------------------------------------- |
| `idf.coveredLightTheme`   | Background color for covered lines in light theme for gcov coverage           |
| `idf.coveredDarkTheme`    | Background color for covered lines in dark theme for gcov coverage            |
| `idf.partialLightTheme`   | Background color for partially covered lines in light theme for gcov coverage |
| `idf.partialDarkTheme`    | Background color for partially covered lines in dark theme for gcov coverage  |
| `idf.uncoveredLightTheme` | Background color for uncovered lines in light theme for gcov coverage         |
| `idf.uncoveredDarkTheme`  | Background color for uncovered lines in dark theme for gcov coverage          |

### Extension Behaviour Settings

| Setting ID                        | Description                                                       |
| --------------------------------- | ----------------------------------------------------------------- |
| `idf.notificationSilentMode`      | Silent all notifications messages (excluding error notifications) |
| `idf.saveBeforeBuild`             | Save all the edited files before building (default `true`)        |
| `idf.showOnboardingOnInit`        | Show ESP-IDF Configuration window on extension activation         |
| `idf.useIDFKconfigStyle`          | Enable style validation for Kconfig files                         |
| `idf.saveScope`                   | Where to save extension settings                                  |
| `idf.launchMonitorOnDebugSession` | Launch ESP-IDF Monitor along with ESP-IDF Debug session           |

The `idf.saveScope` allows the user to specify where to save settings when using commands such as `Configure Paths`, `Device configuration`, `Set Espressif device target` and other commands. Possible values are Global (User Settings), Workspace and WorkspaceFolder. For more information please take a look at [Working with multiple projects](./MULTI_PROJECTS.md).

### Log Tracing Specific Settings

These settings are specific to the Log Tracing

| Setting             | Description                              |
| ------------------- | ---------------------------------------- |
| `trace.poll_period` | poll_period will be set for the apptrace |
| `trace.trace_size`  | trace_size will set for the apptrace     |
| `trace.stop_tmo`    | stop_tmo will be set for the apptrace    |
| `trace.wait4halt`   | wait4halt will be set for the apptrace   |
| `trace.skip_size`   | skip_size will be set for the apptrace   |

### Other frameworks Specific Settings

These settings allow to support additional frameworks together with ESP-IDF

| Setting ID          | Description                                            |
| ------------------- | ------------------------------------------------------ |
| `idf.espAdfPath`    | Path to locate ESP-ADF framework (ADF_PATH)            |
| `idf.espAdfPathWin` | Path to locate ESP-ADF framework in Windows (ADF_PATH) |
| `idf.espMdfPath`    | Path to locate ESP-MDF framework (MDF_PATH)            |
| `idf.espMdfPathWin` | Path to locate ESP-MDF framework in Windows (MDF_PATH) |

The **Install ESP-ADF** command will clone ESP-ADF and set `idf.espAdfPath` (`idf.espAdfPathWin` in Windows).
The **Install ESP-MDF** command will clone ESP-MDF and set `idf.espMdfPath` (`idf.espMdfPathWin` in Windows).

The **Show Examples Projects** command allows you create a new project using one of the examples in ESP-IDF, ESP-ADF or ESP-MDF directory if related configuration settings are set.

### Use of environment variables in ESP-IDF settings.json and tasks.json

Environment (env) variables and other ESP-IDF settings (config) current values strings can be used in other ESP-IDF setting as `${env:VARNAME}` and `${config:ESPIDFSETTING}`, respectively.

Example : If you want to use `"~/esp/esp-idf"` you can set the value of `idf.espIdfPath` to `"${env:HOME}/esp/esp-idf"`.
