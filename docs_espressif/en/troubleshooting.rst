.. _troubleshooting:

Troubleshooting
===============================

.. note::
  * Use **idf.openOcdDebugLevel** configuration setting to 4 or more to show debug logging in OpenOCD server output.
  * Use **logLevel** in your ``<project-directory>/.vscode/launch.json`` to 3 or more to show more debug adapter output.

In Visual Studio Code select menu **View** > **Output** > **ESP-IDF**. This output information is useful to know what is happening in the extension.

In Visual Studio Code select menu **View** > **Command Palette...** and type **ESP-IDF: Doctor Command** to generate a report of your environment configuration and it will be copied in your clipboard to paste anywhere.

Check log file which can be obtained from:

Windows 
  ``%USERPROFILE%\.vscode\extensions\espressif.esp-idf-extension-VERSION\esp_idf_vsc_ext.log``
MacOS/Linux
  ``$HOME/.vscode/extensions/espressif.esp-idf-extension-VERSION/esp_idf_vsc_ext.log``

In Visual Studio Code, select menu **Help** > **Toggle Developer Tools** and copy any error in the Console tab related to this extension.

Visual Studio Code allows the user to configure settings at different levels: **Global (User Settings)**, **Workspace** and **Workspace Folder** so make sure your project is using the right settings. The **ESP-IDF: Doctor command** output will show the settings actually being used.

Review the `OpenOCD troubleshooting FAQ <https://github.com/espressif/openocd-esp32/wiki/Troubleshooting-FAQ>`_ related to the **OpenOCD** output, for application tracing, debug or any OpenOCD related issues.

If there is any Python package error, please try to reinstall the required python packages with the **ESP-IDF: Install ESP-IDF Python Packages** command. Please consider that this extension install ESP-IDF, this extension's and ESP-IDF Debug Adapter python packages when running the **ESP-IDF: Configure ESP-IDF Extension** setup wizard.

.. note::
  * When downloading ESP-IDF using git cloning in Windows if you receive errors like "unable to create symlink", enabling **Developer Mode** while cloning ESP-IDF could help resolve the issue.

If the user can't resolve the error, please search in the `github repository issues <http://github.com/espressif/vscode-esp-idf-extension/issues>`_ for existing errors or open a new issue `here <https://github.com/espressif/vscode-esp-idf-extension/issues/new/choose>`_.