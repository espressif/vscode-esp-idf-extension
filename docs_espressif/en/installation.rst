.. _installation:

Install ESP-IDF and Tools
=========================

:link_to_translation:`zh_CN:[中文]`

After installing Visual Studio Code (VS Code), install the ESP-IDF extension for VS Code.

- Navigate to ``View`` > ``Extensions`` or the keyboard shortcut :kbd:`Ctrl+Shift+X` in Windows/Linux or :kbd:`Shift+⌘+X` in macOS.

- Search for `ESP-IDF <https://marketplace.visualstudio.com/items?itemName=espressif.esp-idf-extension>`_ in the list of extensions.

1.  Install the ESP-IDF extension.

    - Navigate to ``View`` > ``Command Palette``.

    - Type ``ESP-IDF: Configure ESP-IDF Extension`` and select the command to launch the setup wizard. A loading notification will appear, followed by the setup wizard.

    .. note::

        For versions of ESP-IDF < 5.0, spaces are not supported in configured paths.

    .. image:: ../../media/tutorials/setup/select-mode.png

2.  Choose ``Express`` and select the download server:

    - ``Espressif``: Faster speed in China using Espressif download servers.
    - ``Github``: Using GitHub release links.

3.  Pick an ESP-IDF version to download or use the ``Find ESP-IDF in your system`` option to search for an existing ESP-IDF directory.

    .. image:: ../../media/tutorials/setup/select-esp-idf.png

    Choose the location for ESP-IDF Tools (``IDF_TOOLS_PATH``), which defaults to ``%USERPROFILE%\.espressif`` on Windows and ``$HOME\.espressif`` on macOS/Linux.

    .. note::

        Make sure that ``IDF_TOOLS_PATH`` does not contain spaces to avoid build issues. Also, ensure that ``IDF_TOOLS_PATH`` is not the same directory as ``IDF_PATH``.

    .. note::

        For macOS/Linux users, select the Python executable to create the ESP-IDF Python virtual environment.

4.  Click ``Install`` to begin downloading and installing ESP-IDF and ESP-IDF Tools.

5.  A page will appear showing the setup progress status:

    - ESP-IDF download progress
    - ESP-IDF Tools download and installation progress
    - Creation of a Python virtual environment and installation of ESP-IDF Python requirements

    .. image:: ../../media/tutorials/setup/install-status.png

6.  If everything installs correctly, you will see a message indicating that all settings have been configured.

    .. image:: ../../media/tutorials/setup/install-complete.png

    .. note::

        For Linux users, a message will prompt you to add OpenOCD rules in ``/etc/udev/rules.d``. You need to run this with sudo privileges.

7.  The next step is to :ref:`Create an ESP-IDF Project <create_an_esp-idf_project>`.

    .. warning::

        Check the :ref:`Troubleshooting <troubleshooting-section>` section if you encounter any issues during installation.


Uninstall ESP-IDF VS Code Extension
-----------------------------------

To uninstall the ESP-IDF VS Code extension, follow these steps:

1.  Open Command Palette (press shortcut F1) and type ``ESP-IDF: Clear Saved ESP-IDF Setups``. Select the command to remove all ESP-IDF settings.

2.  Navigate to ``View`` > ``Extensions`` or use the keyboard shortcut :kbd:`Ctrl+Shift+X` in Windows/Linux or :kbd:`Shift+⌘+X` in macOS.

3.  Search for `ESP-IDF` and click the ``Uninstall`` button.

4.  Remove the following folders:

    - Go to your `${VSCODE_EXTENSION_DIR}` and delete the ESP-IDF plugin folder.

    - `${VSCODE_EXTENSION_DIR}` is the location of the extension:

      - **Windows**: ``%USERPROFILE%/.vscode/extensions/espressif.esp-idf-extension-VERSION/``
      - **macOS/Linux**: ``$HOME/.vscode/extensions/espressif.esp-idf-extension-VERSION/``

    .. note::

        Make sure to replace `VERSION` with the actual version number of the installed ESP-IDF extension.
