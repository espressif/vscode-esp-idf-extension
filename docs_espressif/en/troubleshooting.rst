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

EIM Launch Modes (GUI vs CLI)
-----------------------------

When running the **ESP-IDF: Open ESP-IDF Installation Manager** command, the extension now selects the launch mode automatically:

-  If an existing EIM installation is found and it supports the ``gui`` subcommand, the extension opens the EIM graphical application.
-  If the detected EIM only supports CLI commands, the extension runs EIM in CLI mode inside the VS Code integrated terminal.
-  If EIM is not yet installed, the extension downloads the GUI-capable build in local desktop environments and the CLI build in remote or headless environments.

The extension updates the ``idf.eimExecutableArgs`` setting automatically based on the mode it launches.

Remote and Headless Environments
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

In remote environments (SSH, WSL, Dev Containers, Codespaces) and browser-based VS Code, the GUI cannot be displayed. The extension automatically forces CLI (wizard) mode in these cases -- no prompt is shown.

For Linux-based remote users, the extension also appends the EIM executable directory to the user's shell PATH the first time it launches ``eim wizard``. This allows running ``eim`` directly from future terminals without copying the full binary path.

After opening a new terminal, you can use the `EIM CLI Commands <https://docs.espressif.com/projects/idf-im-ui/en/latest/cli_commands.html>`_ reference to run commands such as ``eim list`` or ``eim run`` yourself.

VS Code Installed via Snap (Ubuntu)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

If you installed VS Code via snap (the default method on Ubuntu), the EIM GUI cannot be launched due to sandbox restrictions. You may see the following error:

.. code-block:: text

    The terminal process "/usr/bin/bash" terminated with exit code: 127.

When snap is detected and the resolved EIM supports the GUI, the extension shows a modal with two options:

1.  **Run EIM in Terminal** -- launches EIM in CLI mode directly in the VS Code integrated terminal.

2.  **Copy EIM Path** -- copies the EIM binary path to your clipboard so you can run the GUI manually from a system terminal (e.g., GNOME Terminal, Konsole).

    The default EIM path on Linux is:

    .. code-block:: text

        ~/.espressif/eim_gui/eim

Alternatively, you can **install VS Code via the .deb package** (recommended) to remove snap's sandbox restrictions entirely:

.. code-block:: bash

    sudo snap remove code
    # Then install the .deb package downloaded from https://code.visualstudio.com/Download

If you cannot resolve the error, please search the `GitHub Repository Issues <http://github.com/espressif/vscode-esp-idf-extension/issues>`_ for existing issues or create a new issue `here <https://github.com/espressif/vscode-esp-idf-extension/issues/new/choose>`_.

EIM Path Resolution Order
^^^^^^^^^^^^^^^^^^^^^^^^^

When the extension needs to locate the EIM binary, it checks the following locations in order, stopping at the first match:

1. **System PATH** -- runs ``which eim`` / ``where eim`` to find an EIM already on the PATH.
2. **eim_idf.json** -- reads the ``eimPath`` field from the JSON file at the path configured by ``idf.eimIdfJsonPath``. Default locations:

   - **Windows**: ``C:\Espressif\tools\eim_idf.json``
   - **macOS/Linux**: ``$HOME/.espressif/tools/eim_idf.json``

3. **EIM_PATH environment variable** -- reads the ``EIM_PATH`` environment variable.
4. **Managed install directory** -- checks the extension-managed install folders. In normal desktop environments the GUI build is preferred; in headless, remote, or snap environments the CLI build is checked first.

If the extension fails to find or launch EIM, run the **ESP-IDF: Doctor Command** and inspect the ``esp_idf_vsc_ext.log`` file. Each step above is logged with the path being checked, so you can identify exactly which location is missing or incorrect.
