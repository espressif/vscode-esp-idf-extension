# ESPRESSIF IDF Extension for Visual Studio Code

# Table Of Contents (TOC)

1. [ Self-Configuration ](#Extension-activation-self-configuration) <br>
2. [ Setup Wizard ](#Setup-Wizard) <br>
3. [ Extension Manual Configuration Using **Preferences: Open Settings (JSON)** ](#JSON-Manual-Configuration) <br>
4. [ Extension Manual Configuration Using **Preferences: Open Settings (UI)** ](#UI-Manual-Configuration) <br>
5. [ Extension Configuration Example ](#Example-configuration-setting-values) <br>

> **NOTE:** Make sure to install the extension [prerequisites](../README.md#Prerequisites) and, if using WSL2, the required packages specified in [WSL Documentation](./WSL.md).

# Extension Activation Self Configuration

When you start ESP-IDF extension, it will try to self-configure by looking for existing ESP-IDF directory in `IDF_PATH` environment variable, `$HOME/esp/esp-idf` on MacOS/Linux and `%USERPROFILE%\esp\esp-idf` or `%USERPROFILE%\Desktop\esp-idf` in Windows. It will look for ESP-IDF Tools and ESP-IDF Python Virtual Environment in `IDF_TOOLS_PATH` environment variable, `$HOME\.espressif` on MacOS/Linux and `%USERPROFILE%\.espressif` on Windows.

If ESP-IDF and corresponding ESP-IDF Tools are found, these paths will be saved as Visual Studio Code Configuration settings, which are located in Command Palette (F1 or View Menu -> Command Palette) and type `Preferences: Open Settings (UI)` or Command Palette (F1 or View Menu -> Command Palette) and type `Preferences: Open Settings (JSON)`.

These settings, as described in [ESP-IDF Specific Settings](./SETTINGS.md#ESP-IDF-Specific-Settings), are:

- `idf.espIdfPath` for IDF_PATH,
- `idf.customExtraPaths` for ESP-IDF Tools paths to be appended to environment variable PATH,
- `idf.pythonBinPath` for absolute virtual environment python path and
- `idf.customExtraVars` for additional environment variables from ESP-IDF Tools such as OPENOCD_SCRIPTS.

> **NOTE**: Visual Studio Code has many places where to set configuration settings. This extension uses the `idf.saveScope` configuration setting to determine where to save settings, Global (User Settings), Workspace and WorkspaceFolder. Please review the [Visual Studio Code Settings Precedence](https://code.visualstudio.com/docs/getstarted/settings#_settings-precedence).

If ESP-IDF and ESP-IDF Tools are not available, you can use the [ Setup Wizard ](#Setup-Wizard) to download them and configure the extension for you or manually configure the extension as explained in [JSON Manual Configuration](#JSON-Manual-Configuration) or [ Settings UI Manual Configuration ](#UI-Manual-Configuration).

# Setup Wizard

With Visual Studio Code Command Palette (F1 or View Menu -> Command Palette) and type **ESP-IDF: Configure ESP-IDF Extension**.

Setup wizard provides 3 choices:

- **Express Install**: Fastest option.
  1.  Choose to either download selected ESP-IDF version or find ESP-IDF in your system.
  2.  Choose directory, Download and install ESP-IDF Tools. This step will use the existing value in `idf.toolsPath` or `idf.toolsPathWin` as ESP-IDF Tools directory.
  3.  Create python virtual environment with required packages on existing ESP-IDF Tools directory.
- **Advanced Install**: Configurable option.
  1.  Choose to either download selected ESP-IDF version or find ESP-IDF in your system.
  2.  Download or use existing ESP-IDF Tools:
      - Choose directory for ESP-IDF Tools and install ESP-IDF Tools. This step will update the existing value in `idf.toolsPath` or `idf.toolsPathWin`.
      - Specify directory than contains executable for each required ESP-IDF tool with matching version.
  3.  Create python virtual environment with required packages in chosen ESP-IDF Tools directory.
- **Use Existing Setup**: This option will show previous setup used in the extension and existing setup if:
  1. `esp-idf.json` is found in the current `idf.toolsPath` (MacOS/Linux users) or `idf.toolsPathWin` (Windows users). This file is generated when you install ESP-IDF with the [IDF Windows Installer](https://github.com/espressif/idf-installer) or using [IDF-ENV](https://github.com/espressif/idf-env) or this extension.

> **NOTE:** When running any of these choices, the setup wizard will install ESP-IDF Python packages and ESP-IDF debug adapter (`EXTENSION_PATH`/esp_debug_adapter/requirements.txt) python packages where `EXTENSION_PATH` is located in:

- Windows: `%USERPROFILE%\.vscode\extensions\espressif.esp-idf-extension-VERSION`
- MacOS/Linux: `$HOME/.vscode/extensions/espressif.esp-idf-extension-VERSION`

so make sure that if using an existing python virtual environment that installing these packages doesn't affect your virtual environment.

> **NOTE:** Currently the python package `pygdbmi` used by the debug adapter still depends on some Python 2.7 libraries (libpython2.7.so.1.0) so make sure that the Python executable in `idf.pythonBinPath` you use contains these libraries. This will be dropped in later versions of ESP-IDF.

> **NOTE**: If you want to use an ESP-IDF version < 5.0, make sure that IDF_PATH and IDF_TOOLS_PATH don't have any spaces since they were no suported in previous versions.

After choosing any of the previous options, a status page is displayed showing ESP-IDF, tools and python environment setup progress status. When the setup is finished, a message is shown that "All settings have been configured. You can close this window."

> **NOTE:** Check the [Troubleshooting](../README.md#Troubleshooting) section if you have any issue.

# JSON Manual Configuration

You can manually configure the extension by setting the following configuration settings with corresponding values. Please take a look at [Configuration Settings](./SETTINGS.md) for more information.

1. With Visual Studio Code Command Palette (F1 or View Menu -> Command Palette) and type **Preferences: Open Settings (JSON)**. This will open you global settings for Visual Studio Code.
   > **NOTE:** You could choose to modify its workspace settings.json for a workspace limited configuration or a project limited configuration in the project's `.vscode/settings.json`. Please take a look at [Working with multiple projects](./MULTI_PROJECTS.md).
2. Your settings.json should look like:

MacOS/Linux

```json
{
  "idf.espIdfPath": "path/to/esp-idf",
  "idf.customExtraPaths": "UPDATED_PATH",
  "idf.customExtraVars": {
    "OPENOCD_SCRIPTS": "OPENOCD_FOLDER/share/openocd/scripts"
  },
  "idf.pythonBinPath": "PYTHON_INTERPRETER",
  "idf.openOcdConfigs": [
    "interface/ftdi/esp32_devkitj_v1.cfg",
    "board/esp32-wrover.cfg"
  ],
  "idf.port": "DEVICE_PORT"
}
```

Windows

```json
{
  "idf.espIdfPathWin": "path/to/esp-idf",
  "idf.customExtraPaths": "UPDATED_PATH",
  "idf.customExtraVars": {
    "OPENOCD_SCRIPTS": "OPENOCD_FOLDER/share/openocd/scripts"
  },
  "idf.pythonBinPathWin": "PYTHON_INTERPRETER",
  "idf.openOcdConfigs": [
    "interface/ftdi/esp32_devkitj_v1.cfg",
    "board/esp32-wrover.cfg"
  ],
  "idf.portWin": "DEVICE_PORT"
}
```

where:

- **UPDATED_PATH** is the "Updated PATH variable" generated by `$IDF_PATH/export.sh`,
- **PYTHON_INTERPRETER** is the "Using Python interpreter in" value generated by `$IDF_PATH/export.sh`,
- **DEVICE_PORT** is your device serial port (i.e. COM1, /dev/cu.usbserial-1433401 or /dev/ttyUSB1)
- `idf.openOcdConfigs` are the config files used for OpenOCD for your device (relative paths to `OPENOCD_SCRIPTS` directory of OpenOCD-ESP32 tool).

**DO NOT USE `~`, `$HOME` OR `%USERPROFILE%`. ENVIRONMENT VARIABLES ARE NOT RESOLVED IN THIS CONFIGURATION SETTINGS. You must use `${env:HOME}` instead of `$HOME` (Linux/MacOS) or `%USERPROFILE%` (Windows).**

Make sure to install the extension and extension debug adapter Python requirements by running the following commands in your terminal:

```
PYTHON_INTERPRETER -m pip install --upgrade -r EXTENSION_PATH/esp_debug_adapter/requirements.txt --extra-index-url https://dl.espressif.com/pypi
```

where EXTENSION_PATH is

- `%USERPROFILE%\.vscode\extensions\espressif.esp-idf-extension-VERSION` on Windows
- `$HOME/.vscode/extensions/espressif.esp-idf-extension-VERSION` on Linux/MacOS

# UI Manual Configuration

This is the same as [JSON Manual Configuration](#JSON-Manual-Configuration) but the name of each configuration setting is the description given in the [ESP-IDF Settings](./SETTINGS.md).
This method also need to install extension and debug adapter requirements.txt as shown in the previous section.

# Example Configuration Setting Values

An example ESP-IDF path is to set `idf.espIdfPath` to `/home/myUser/to/esp-idf` (MacOS/Linux) or set `idf.espIdfPathWin` to `C:\Users\myUser\esp\esp-idf` (Windows)

An example python path for `idf.pythonBinPath` (MacOS/Linux) is

- `/home/myUser/.espressif/python_env/idf4.0_py3.5_env/bin/python`

An example python path for `idf.pythonBinPathWin` (Windows) is

- `C:\Users\myUser\.espressif\python_env\idf4.0_py3.5_env\Scripts\python.exe`

For example if required ESP-IDF Tools are:

- OpenOCD executable path is `/home/myUser/.espressif/tools/openocd-esp32/version/openocd-esp32/bin/openocd` or `C:\Users\myUser\.espressif\tools\openocd-esp32\version\openocd-esp32\bin\openocd` (Windows)
- XtensaEsp32 executable path is `/home/myUser/.espressif/tools/xtensa-esp32/version/xtensa-esp32/bin/xtensa-esp32-gcc` or `C:\Users\myUser\.espressif\tools\xtensa\version\xtensa-esp32\bin\xtensa-esp32-gcc` (Windows)

you need to set in `idf.customExtraPaths`:

- MacOS/Linux

```
/home/myUser/.espressif/tools/openocd/version/openocd-esp32/bin:/home/myUser/.espressif/tools/xtensa-esp32/version/xtensa-esp32/bin
```

- Windows

```
C:\Users\myUser\.espressif\tools\openocd-esp32\version\openocd-esp32\bin;C:\Users\myUser\.espressif\tools\xtensa-esp32\version\xtensa-esp32\bin
```

`idf.customExtraVars` is an JSON object saved in Visual Studio Code's settings.json (**Make sure to replace \${TOOL_PATH} with the existing tool directory path**):

```json
"idf.customExtraVars": {
  "OPENOCD_SCRIPTS":"/home/myUser/.espressif/tools/openocd-esp32/version/openocd-esp32/share/openocd/scripts"
  }
```

The list of required ESP-IDF Tools (`idf.customExtraPaths`) and environment variables (`idf.customExtraVars`) can be found in `$IDF_PATH/tools/tools.json`

> **NOTE:** Make sure to replace \${TOOL_PATH} of `$IDF_PATH/tools/tools.json` in`idf.customExtraPaths` and `idf.customExtraVars` with existing ESP-IDF tool directory path.

`idf.openOcdConfigs` use OpenOCD Configuration files depending on your board and chip target. More information [here](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/tips-and-quirks.html#jtag-debugging-tip-openocd-configure-target).
