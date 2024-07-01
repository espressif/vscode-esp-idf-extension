Installation
===============================

After installing Visual Studio Code you need to install the ESP-IDF extension for Visual Studio Code.

Open the **Extensions** view by clicking on the Extension icon in the Activity Bar on the side of Visual Studio Code or the **View: Extensions** command.
:kbd:`Ctrl+Shift+X` in Windows/Linux or :kbd:`Shift+⌘+X` in macOS.

Search for `ESP-IDF Extension <https://marketplace.visualstudio.com/items?itemName=espressif.esp-idf-extension>`_ from the list of extensions.

Install the extension.

In Visual Studio Code, select menu **View**, **Command Palette** and type **configure esp-idf extension**. 

After, choose the **ESP-IDF: Configure ESP-IDF Extension** command.

.. note::
  
  * For versions of ``ESP-IDF < 5.0``, spaces are not supported inside configured paths.

Choose **Express** and select the download server:

- **Espressif**: Faster speed in China using Espressif Download servers links.
- **Github**: Using github releases links.

Pick an ESP-IDF version to download or use the ``find ESP-IDF in your system`` option to search for existing ESP-IDF directory.

Choose the location for ESP-IDF Tools ( ``IDF_TOOLS_PATH``) which is ``$HOME\.espressif`` on MacOS/Linux and ``%USERPROFILE%\.espressif`` on Windows by default.

.. note::
  * Make sure that ``IDF_TOOLS_PATH`` doesn't have any spaces to avoid any build issues. Also make sure that ``IDF_TOOLS_PATH`` is not the same directory as ``IDF_PATH``.

.. note::
  * For MacOS or Linux users, select the Python executable to use to create ESP-IDF python virtual environment.

Click ``Install`` to begin download and install of ESP-IDF and ESP-IDF tools.

A page will appear with the setup progress status showing 
- ESP-IDF download progress, 
- ESP-IDF Tools download and install progress
- Creation of a python virtual environment and ESP-IDF python requirements.

If everything is installed correctly, the user will see a message that all settings have been configured. 

Next step is to :ref:`Start a ESP-IDF Project <start a esp-idf project>`.

.. warning::
  Check the :ref:`Troubleshooting <troubleshooting>` section if you have any issues during installation.
