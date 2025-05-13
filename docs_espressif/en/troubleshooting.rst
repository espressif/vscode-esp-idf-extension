.. _troubleshooting-section:

Troubleshooting
===============

:link_to_translation:`zh_CN:[中文]`

.. note::

    * Set ``idf.openOcdDebugLevel`` to 4 or higher in your ``<project-directory>/.vscode/settings.json`` to enable debug level logs of OpenOCD server in ``ESP-IDF`` output.
    * Set ``verbose: true`` in your ``<project-directory>/.vscode/launch.json`` to display more debug adapter output.

In Visual Studio Code, go to ``View`` > ``Output`` and select ``ESP-IDF`` from the dropdown. This output provides useful information about the extension's activity.

In Visual Studio Code, go to ``View`` > ``Command Palette...`` and type ``ESP-IDF: Doctor Command`` to generate a report of your environment configuration. This report will be copied to your clipboard for easy pasting.

Check the log file located at:

- **Windows**: ``%USERPROFILE%\.vscode\extensions\espressif.esp-idf-extension-VERSION\esp_idf_vsc_ext.log``
- **macOS/Linux**: ``$HOME/.vscode/extensions/espressif.esp-idf-extension-VERSION/esp_idf_vsc_ext.log``

In Visual Studio Code, go to ``Help`` > ``Toggle Developer Tools`` and copy any errors from the Console tab related to this extension.

In Visual Studio Code select menu ``View`` > ``Output`` > ``Extension Host``. This output information is useful to know what is happening during the extensions activation. If no extension command work, you could share the output here to see the error stack.

Visual Studio Code allows you to configure settings at different levels: **Global (User Settings)**, **Workspace** and **Workspace Folder**. Ensure your project uses the correct settings. The output from ``ESP-IDF: Doctor command`` will show the settings currently in use.

1.  Workspace folder configuration settings are defined in ``${workspaceFolder}/.vscode/settings.json``
2.  Workspace configuration settings are defined in the workspace's ``<name>.code-workspace`` file
3.  User settings defined in ``settings.json``

    - **Windows**: ``%APPDATA%\Code\User\settings.json``
    - **MacOS**: ``$HOME/Library/Application Support/Code/User/settings.json``
    - **Linux**: ``$HOME/.config/Code/User/settings.json``

This extension uses the ``idf.saveScope`` configuration setting (which can only be defined in User Settings) to specify where to save settings for features such as the Setup Wizard. You can modify this using the ``ESP-IDF: Select where to Save Configuration Settings`` command.

Review `OpenOCD Troubleshooting FAQ <https://github.com/espressif/openocd-esp32/wiki/Troubleshooting-FAQ>`_ for information related to OpenOCD output, application tracing, debugging, or any OpenOCD issues.

.. note::

    If you receive errors like "unable to create symlink" while cloning ESP-IDF on Windows, enabling **Developer Mode** may help resolve the issue.

If you cannot resolve the error, please search the `GitHub Repository Issues <http://github.com/espressif/vscode-esp-idf-extension/issues>`_ for existing issues or create a new issue `here <https://github.com/espressif/vscode-esp-idf-extension/issues/new/choose>`_.
