# Installation

> **NOTE:** Make sure to install the extension [prerequisites](../../README.md#Prerequisites) and, if using WSL2, the required packages specified in [WSL Documentation](../WSL.md).

1. Download and install [Visual Studio Code](https://code.visualstudio.com/).
2. Open the **Extensions** view by clicking on the Extension icon in the Activity Bar on the side of Visual Studio Code or the **View: Extensions** command <kbd>⇧</kbd> <kbd>⌘</kbd> <kbd>X</kbd>.
3. Search the extension with any related keyword like `espressif`, `esp-idf`, `esp32`, `esp32s2`, etc.
4. Install the extension.

5. Install [ESP-IDF Prerequisites](../../README.md#Prerequisites).
<p>
  <img src="../../media/tutorials/setup/install-extension.png" alt="Setup wizard">
</p>

6. In Visual Studio Code, select menu "View" and "Command Palette" and type [configure esp-idf extension]. After, choose the **ESP-IDF: Configure ESP-IDF extension** option.
7. Now the setup wizard window will be shown with several setup options: **Express**, **Advanced** or **Use existing setup**.

> **NOTE**: **Use existing setup** setup mode option is only shown if:
>
> - `esp-idf.json` is found in the current `idf.toolsPath` (MacOS/Linux users) or `idf.toolsPathWin` (Windows users). This file is generated when you install ESP-IDF with the [IDF Windows installer](https://github.com/espressif/idf-installer) or using [IDF-ENV](https://github.com/espressif/idf-env).
> - ESP-IDF is found in `idf.espIdfPath` or `idf.espIdfPathWin`, `IDF_PATH` environment variable, `$HOME/esp/esp-idf` on MacOS/Linux and `%USERPROFILE%\esp\esp-idf` or `%USERPROFILE%\Desktop\esp-idf` in Windows.
> - ESP-IDF Tools and ESP-IDF Python virtual environment for the previos ESP-IDF are found in `idf.toolsPath` or`idf.toolsPathWin`, `IDF_TOOLS_PATH` environment variable, `$HOME\.espressif` on MacOS/Linux and `%USERPROFILE%\.espressif` on Windows.

<p>
  <img src="../../media/tutorials/setup/select-mode.png" alt="Select extension mode" width="950">
</p>

8. Choose **Express** for the fastest option (or **Use existing setup** if ESP-IDF is already installed)
9. If you choose **Express** setup mode:
    - Pick an ESP-IDF version to download (or find ESP-IDF in your system) and the python executable to create the virtual environment.
    - Choose the location for ESP-IDF Tools and python virtual environment (also known as `IDF_TOOLS_PATH`) which is `$HOME\.espressif` on MacOS/Linux and `%USERPROFILE%\.espressif` on Windows by default.
    > **NOTE:** Windows users don't need to select a python executable since it is part of the setup.

<p>
  <img src="../../media/tutorials/setup/select-esp-idf.png" alt="Select ESP-IDF" width="950">
</p>

10. The user will see a page showing the setup progress status showing ESP-IDF download progress, ESP-IDF Tools download and install progress as well as the creation of a python virtual environment.

<p>
  <img src="../../media/tutorials/setup/install-status.png" alt="Install status" width="950">
</p>

11. (OPTIONAL) If the user have chosen the **Advanced** option, after ESP-IDF is downloaded and extracted, select to either download ESP-IDF Tools or manually provide each ESP-IDF tool absolute path and required environment variables.
    > **NOTE:** Consider that `IDF_PATH` requires each ESP-IDF tool to be of the version described in `IDF_PATH`/tools/tools.json.
    > If it is desired to use a different ESP-IDF tool version, check [JSON Manual Configuration](../SETUP.md#JSON-Manual-Configuration)

<p>
  <img src="../../media/tutorials/setup/advanced.png" alt="Select ESP-IDF Tools" width="950">
</p>

12. (OPTIONAL) If the user has chosen the **Advanced** mode and selected to manually provide each ESP-IDF tool absolute path, please enter the executable container directory for each binary as shown below:
    > **NOTE:** Check [JSON Manual Configuration](../SETUP.md#JSON-Manual-Configuration) for more information.

<p>
  <img src="../../media/tutorials/setup/advanced-manual.png" alt="Enter ESP-IDF Tools paths manually" width="950">
</p>

12. If everything is installed correctly, the user will see a message that all settings have been configured. You can start using the extension.

<p>
  <img src="../../media/tutorials/setup/install-complete.png" alt="Install complete">
</p>

> **NOTE**: The advance mode allows the user to choose to use existing ESP-IDF tools by manually entering each ESP-IDF tool absolute path.

13. Now that the extension setup is finally done, check the [basic use](./basic_use.md) to learn how to use the SDK Configuration editor, build, flash and monitor your Espressif device.

  > **NOTE**: Visual Studio Code has many places where to set configuration settings. This extension uses the `idf.saveScope` configuration setting to determine where to save settings, Global (User Settings), Workspace and WorkspaceFolder. Please review [vscode settings precedence](https://code.visualstudio.com/docs/getstarted/settings#_settings-precedence).

# Troubleshooting

If something went wrong during the install please check for any error on one of these:

1. In Visual Studio Code select menu "View" -> Output -> ESP-IDF (or other related output like SDK Configuration Editor, OpenOCD, Debug Adapter, etc.)
2. Use the `ESP-IDF: Doctor command` to generate a report of your configuration and it will be copied in your clipboard to paste anywhere.
3. Check log file which can be obtained from:

- Windows: `%USERPROFILE%\.vscode\extensions\espressif.esp-idf-extension-VERSION\esp_idf_vsc_ext.log`
- Linux & MacOSX: `$HOME/.vscode/extensions/espressif.esp-idf-extension-VERSION/esp_idf_vsc_ext.log`

4. In Visual Studio Code, select menu "Help" -> Toggle Developer Tools and copy any error in the Console tab related to this extension.

If there is any Python package error, please try to reinstall the required python packages with the **ESP-IDF: Install ESP-IDF Python Packages** command.

If the user can't resolve the error, please search in the [github repository issues](http://github.com/espressif/vscode-esp-idf-extension/issues) for existing errors or open a new issue [here](https://github.com/espressif/vscode-esp-idf-extension/issues/new/choose).
