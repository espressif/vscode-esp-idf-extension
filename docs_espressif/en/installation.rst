.. _installation:

Install ESP-IDF and Tools
=========================

:link_to_translation:`zh_CN:[中文]`

After installing Visual Studio Code (VS Code), install the ESP-IDF extension for VS Code.

- Navigate to ``View`` > ``Extensions`` or the keyboard shortcut :kbd:`Ctrl+Shift+X` in Windows/Linux or :kbd:`Shift+⌘+X` in macOS.

- Search for `ESP-IDF <https://marketplace.visualstudio.com/items?itemName=espressif.esp-idf-extension>`_ in the list of extensions.

1.  Install the ESP-IDF extension.

    - Navigate to ``View`` > ``Command Palette``.

    - Type ``ESP-IDF: Open ESP-IDF Install Manager`` to download and run the ESP-IDF install manager to install the ESP-IDF framework. A loading notification will appear, followed by the execution of the installer.

    .. note::

        For versions of ESP-IDF < 5.0, spaces are not supported in configured paths.

2.  Alternatively, you can download the ESP-IDF Install Manager from the following link `ESP-IDF Install Manager <https://dl.espressif.com/dl/eim/index.html>`_ among the following options:

    - ``Espressif``: Faster speed in China using Espressif download servers.
    - ``Github``: Using GitHub release links.

3.  Use the ESP-IDF Install Manager to install the ESP-IDF and tools. If necessary, here is the `ESP-IDF Install Manager Documentation <https://docs.espressif.com/projects/idf-im-ui/en/latest/general_info.html>`_.

4. In Visual Studio Code, navigate to ``View`` > ``Command Palette`` and type ``select current esp-idf version`` and select **ESP-IDF: Select Current ESP-IDF Version** from the list.
   The list of available ESP-IDF setups will be shown, select which one you want to use for the current ESP-IDF project. 
   
   - The selected setup will save a **idf.currentSetup** with selected ESP-IDF path and the extension will configure required environment variables for the current ESP-IDF project saved as workspace folder state. 

   - You can review the setup by running the **ESP-IDF: Doctor Command** by navigate to ``View`` > ``Command Palette`` and type ``doctor command`` and select **ESP-IDF: ESP-IDF: Doctor Command** from the list. 

5.  The next step is to :ref:`Create an ESP-IDF Project <create_an_esp-idf_project>`.

    .. warning::

        Check the :ref:`Troubleshooting <troubleshooting-section>` section if you encounter any issues during installation.


Uninstall ESP-IDF VS Code Extension
-----------------------------------

To uninstall the ESP-IDF VS Code extension, follow these steps:

1.  Open Command Palette (press shortcut F1) and type ``ESP-IDF: Remove ESP-IDF Settings``. Select the command to remove all ESP-IDF settings.

2.  Navigate to ``View`` > ``Extensions`` or use the keyboard shortcut :kbd:`Ctrl+Shift+X` in Windows/Linux or :kbd:`Shift+⌘+X` in macOS.

3.  Search for `ESP-IDF` and click the ``Uninstall`` button.

4.  Remove the following folders:

    - Go to your `${VSCODE_EXTENSION_DIR}` and delete the ESP-IDF plugin folder.

    - `${VSCODE_EXTENSION_DIR}` is the location of the extension:

      - **Windows**: ``%USERPROFILE%/.vscode/extensions/espressif.esp-idf-extension-VERSION/``
      - **macOS/Linux**: ``$HOME/.vscode/extensions/espressif.esp-idf-extension-VERSION/``

    .. note::

        Make sure to replace `VERSION` with the actual version number of the installed ESP-IDF extension.
