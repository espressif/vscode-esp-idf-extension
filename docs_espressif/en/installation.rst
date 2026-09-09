.. _installation:

Install ESP-IDF and Tools
=========================

:link_to_translation:`zh_CN:[中文]`

After installing Visual Studio Code (VS Code), install the ESP-IDF extension for VS Code.

- Navigate to ``View`` > ``Extensions`` or the keyboard shortcut :kbd:`Ctrl+Shift+X` in Windows/Linux or :kbd:`Shift+⌘+X` in macOS.

- Search for `ESP-IDF <https://marketplace.visualstudio.com/items?itemName=espressif.esp-idf-extension>`_ in the list of extensions.

1.  Install the ESP-IDF extension.

    - Navigate to ``View`` > ``Command Palette``.

    - Type ``ESP-IDF: Open ESP-IDF Installation Manager`` to download and run the ESP-IDF Installation Manager to install the ESP-IDF framework. A loading notification will appear, followed by the execution of the installer.

    .. note::

        For versions of ESP-IDF < 5.0, spaces are not supported in configured paths.

2.  Alternatively, you can download the ESP-IDF Installation Manager from the following link `ESP-IDF Installation Manager <https://dl.espressif.com/dl/eim/index.html>`_ among the following options:

    - ``Download``: Faster speed in China using Espressif download servers.
    - ``GitHub``: Using GitHub release links.

3.  Use the ESP-IDF Installation Manager to install the ESP-IDF and tools. If necessary, here is the `ESP-IDF Installation Manager Documentation <https://docs.espressif.com/projects/idf-im-ui/en/latest/general_info.html>`_.

    .. note::

        In remote or headless environments such as SSH, WSL, Dev Containers, Codespaces, or browser-based VS Code, the extension runs ``eim wizard`` instead of the GUI. When launching the wizard on Linux, the extension also adds the EIM executable directory to the remote user's shell PATH so ``eim`` can be run directly in future terminals. See the `EIM CLI Commands <https://docs.espressif.com/projects/idf-im-ui/en/latest/cli_commands.html>`_ reference for the available commands.
        
4. All ESP-IDF versions installed using the ESP-IDF Installation Manager will be automatically detected by the ESP-IDF VS Code extension by reading EIM's **eim_idf.json** file.

    .. note::

        The default **eim_idf.json** file is located at: ``C:\Espressif\tools\eim_idf.json`` for Windows and ``$HOME/.espressif/tools/eim_idf.json`` for macOS/Linux.
        If your **eim_idf.json** is not in the default location, you can define the path to the EIM **eim_idf.json** file using the ``idf.eimIdfJsonPath`` extension configuration setting in Visual Studio Code ``Preferences: Open Settings (UI)`` command.

5. In Visual Studio Code, navigate to ``View`` > ``Command Palette`` and type ``select current esp-idf version`` and select **ESP-IDF: Select Current ESP-IDF Version** from the list.

   The list of available ESP-IDF setups will be shown, select which one you want to use for the current ESP-IDF project. 
   
   - The selected setup will save a **idf.currentSetup** with selected ESP-IDF path and the extension will configure required environment variables for the current ESP-IDF project saved as workspace folder state. 

   - You can review the setup by running the **ESP-IDF: Doctor Command** by navigating to ``View`` > ``Command Palette`` and type ``doctor command`` and select **ESP-IDF: Doctor Command** from the list. 

6.  The next step is to :ref:`Create an ESP-IDF Project <create_an_esp-idf_project>`.

    .. warning::

        Check the :ref:`Troubleshooting <troubleshooting-section>` section if you encounter any issues during installation.

Manual configuration of ESP-IDF and Tools in the ESP-IDF extension for VS Code
-------------------------------------------------------------------------------

.. note::

     If you configure the extension using environment variables, the extension will use it over any selected ESP-IDF setup in ``idf.currentSetup``. So make sure to clear the environment variables if you want to use the selected ESP-IDF setup.
     If you use the ``ESP-IDF: Select Current ESP-IDF Version`` command to select an ESP-IDF setup, the extension will use the environment variables from the selected IDF setup and delete manually configured environment variables IDF_PATH, IDF_TOOLS_PATH and IDF_PYTHON_ENV_PATH.

You can manually configure the ESP-IDF extension for VS Code to use your existing ESP-IDF setup by setting required environment variables for the ESP-IDF extension in Visual Studio Code settings. You would need the ESP-IDF path (IDF_PATH), the set of ESP-IDF Tools to be appended in PATH or the ESP-IDF tools path (IDF_TOOLS_PATH), and Python environment path (IDF_PYTHON_ENV_PATH) to configure the extension.

For example, if you have ESP-IDF installed at ``/home/user/esp-idf``, and the tools are located at ``/home/user/.espressif/``, and your Python virtual environment is located at ``/home/user/.espressif/python_env/idf6.1_py3.13_env``, you can configure the extension as follows:

1. Open Command Palette (press shortcut F1) and type ``Preferences: Open Settings (JSON)`` and select the command.
2. Add the following configuration to the settings.json file, replacing the paths with the actual paths to your ESP-IDF and tools:

   .. code-block:: json

      {
        "idf.customExtraVars": {
          "IDF_PATH": "/home/user/esp-idf",
          "IDF_TOOLS_PATH": "/home/user/.espressif",
          "IDF_PYTHON_ENV_PATH": "/home/user/.espressif/python_env/idf6.1_py3.13_env"
        }
      }
3. Or alternatively you can use PATH (or Path in Windows) with list of tools to be appended to PATH:

   .. code-block:: json

      {
        "idf.customExtraVars": {
          "IDF_PATH": "/home/user/esp-idf",
          "PATH": "/home/user/.espressif/tools/xtensa-esp-elf-gdb/16.3_20250913/xtensa-esp-elf-gdb/bin:/home/user/.espressif/tools/riscv32-esp-elf-gdb/16.3_20250913/riscv32-esp-elf-gdb/bin:/home/user/.espressif/tools/xtensa-esp-elf/esp-15.2.0_20251204/xtensa-esp-elf/bin:/home/user/.espressif/tools/riscv32-esp-elf/esp-15.2.0_20251204/riscv32-esp-elf/bin:/home/user/.espressif/tools/esp32ulp-elf/2.38_20240113/esp32ulp-elf/bin:/home/user/.espressif/tools/cmake/4.0.3/CMake.app/Contents/bin:/home/user/.espressif/tools/openocd-esp32/v0.12.0-esp32-20260304/openocd-esp32/bin:/home/user/.espressif/tools/ninja/1.12.1:/home/user/.espressif/tools/esp-rom-elfs/20241011",
          "IDF_PYTHON_ENV_PATH": "/home/user/.espressif/python_env/idf6.1_py3.13_env"
        }
      }

If you are using an ESP-IDF setup not installed using ESP-IDF Installation Manager (EIM), you can use the following command to get these environment variables from your ESP-IDF setup:

.. code-block:: bash

   source /home/user/esp-idf/export.sh
   python /home/user/esp-idf/tools/idf_tools.py export --format key-value

If you installed ESP-IDF using the ESP-IDF Installation Manager (EIM) and you want to use the ESP-IDF activation script to get required environment variables, you can use the following command:

.. code-block:: bash

   /home/user/.espressif/tools/activate_idf_v6.0.sh -e

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

FAQ
----

1. **How do I know if the ESP-IDF extension is installed correctly?**

    - Open Command Palette (press shortcut F1) and type ``ESP-IDF: Doctor Command``. Select the command to run the doctor command, which will check the installation and configuration of the ESP-IDF extension and tools.

2. **When I use the ESP-IDF: Select Current ESP-IDF Version command, it shows no ESP-IDF setup available. What should I do?**

    - Make sure you have installed the ESP-IDF using the ESP-IDF Installation Manager (EIM) or manually configured the extension with the correct environment variables. If you have installed ESP-IDF using EIM, ensure that the **eim_idf.json** file is in the default location or set the path to it in the extension settings ``idf.eimIdfJsonPath``.

3. **The eim_idf.json exists and the extension does not detect any ESP-IDF setups. What should I do?**

    - Ensure that the **eim_idf.json** file is correctly formatted and contains valid paths to your ESP-IDF installations. Check that EIM installed ESP-IDF correctly.

4. **EIM didn't install ESP-IDF correctly, what should I do?**

    - Check the EIM logs for any errors during installation. You can find the logs in the `EIM logs directory <https://docs.espressif.com/projects/idf-im-ui/en/latest/issue_reporting.html#log-file-locations>`_. If you encounter issues, try reinstalling ESP-IDF using EIM or manually configuring the extension with the correct environment variables.

5. **I have multiple ESP-IDF versions installed, how do I switch between them?**

    - Use the ``ESP-IDF: Select Current ESP-IDF Version`` command in the Command Palette to select the desired ESP-IDF version for your current project.

6. **I have manually configured the extension with environment variables, but I want to switch to using a selected ESP-IDF setup. How do I do that?**

    - Clear the manually configured environment variables in the extension settings and use the ``ESP-IDF: Select Current ESP-IDF Version`` command to select the desired ESP-IDF setup.

7. **I need help with a specific issue, where can I get support?**

    - You can seek help from the `EIM GitHub <https://github.com/espressif/idf-im-ui/issues>`_ or the `ESP-IDF Extension for VS Code GitHub <https://github.com/espressif/vscode-esp-idf-extension/issues>`_.

8. **I'm using AI tools to troubleshoot my ESP-IDF installation, but it's not working. What should I do?**

    - Make sure to add the `Espressif Documentation MCP <https://mcp.espressif.com>`_ to your AI tool's knowledge base. You can alternatively just add documentation links to `EIM <https://docs.espressif.com/projects/idf-im-ui/en/latest>`_ and `ESP-IDF Extension for VS Code <https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest>`_.
    - This extension also contributes MCP Servers to the current IDE being used.



