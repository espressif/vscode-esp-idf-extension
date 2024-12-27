.. _multiple projects:

Working with Multiple Projects
==================================

For big projects, a user will typically have one or more projects to build, flash or monitor. The ESP-IDF Extension follows the `Visual Studio Code Workspace File Schema <https://code.visualstudio.com/docs/editor/multi-root-workspaces#_workspace-file-schema>`_ to identify all projects folders inside the current workspace (which would be the root folder). Please take a look at `Creating User and Workspace Settings <https://code.visualstudio.com/docs/getstarted/settings#_creating-user-and-workspace-settings>`_.

Configuration settings are overriden as:

1. Workspace folder configuration settings in ``${workspaceFolder}/.vscode/settings.json``
2. Workspace configuration settings defined in the workspace's ``<name>.code-workspace`` file as shown below.
3. User settings defined in

- **Windows** ``%APPDATA%\Code\User\settings.json``
- **MacOS** ``$HOME/Library/Application Support/Code/User/settings.json``
- **Linux** ``$HOME/.config/Code/User/settings.json``

This extension uses the **idf.saveScope** configuration setting to determine where to save configuration settings in features such as the Setup Wizard. You can modify this using the **ESP-IDF: Select where to Save Configuration Settings** command.

You can select the current project by clicking the **ESP-IDF Current Project** Item in the Visual Studio Code Status bar or by pressing F1 and typing **ESP-IDF: Pick a Workspace Folder** which will determine the folder where to obtain the ESP-IDF Settings such as current device USB port, ESP-IDF path, etc.

Projects folders (Known in vscode as workspace folders) and workspace level settings are defined in some ``<name>.code-workspace`` file such as:

.. code-block:: JSON

  {
    "folders": [
      {
        "path": "./project1"
      },
      {
        "path": "./project2"
      }
    ],
    "settings": {
      "idf.port": "/dev/ttyUSB1",
    }
  }

Settings in the root folder's ``.code-workspace`` can be used when your **ESP-IDF Current Project** directory doesn't contain a ``.vscode/settings.json`` file.

If you want to open a project with multiple subprojects in Visual Studio Code, click Menu **File** > **Open Workspace** which will open a window to select the ``.code-workspace`` file describing your workspace.
You can either manually create this ``.code-workspace`` file and define all sub folders (projects) or when you click Menu **File** > **Save Workspace as...** which doesn't automatically add any folder inside the current directory.
You can add a folder to the workspace when you click Menu **File** > **Add Folder to Workspace...**.

.. note::
  You still need to manually select the corresponding debug configuration in the Debug tab of your current workspace folder. There is a project directory suffix on each debug configuration.

Example
------------

Consider the following multiple projects directory tree example:

.. code-block::

  ---> /my-projects-root
  ------> /my-projects-root/project1
  ------> /my-projects-root/project2
  ------------> /my-projects-root/project2/.vscode/settings.json


and ``my-ws.code-workspace``:

.. code-block:: JSON

  {
    "folders": [
      {
        "path": "/my-projects-root/project1"
      },
      {
        "path": "/my-projects-root/project2"
      }
    ],
    "settings": {
      "idf.port": "/dev/ttyUSB1",
    }
  }

1. If you open Visual Studio Code, click Menu **File** > **Open Workspace** and open ``my-ws.code-workspace`` you will see just the folders defined in this workspace (``/my-projects-root/project1`` and ``/my-projects-root/project2``).
   - For ``project1``, Visual Studio Code will use the settings from ``my-ws.code-workspace`` first then other required settings from the User Settings.
   - For ``project2``, Visual Studio Code will use those settings from ``/my-projects-root/project2/.vscode/settings.json`` first, then all required (and not found) settings from ``my-ws.code-workspace`` and finally in the Visual Studio Code User settings.
2. If you just open the ``/my-projects-root`` or ``/my-projects-root/project1`` directory Visual Studio Code will use the User Settings.
   - If you just open the ``/my-projects-root/project2`` directory Visual Studio Code will use the ``/my-projects-root/project2/.vscode/settings.json`` then other required settings from the User Settings.

.. note::
  If you open ``/my-projects-root``, any of the sub projects will not be recognized as Workspace Folders, you need to add them to ``my-ws.code-workspace`` (manually or using **File** > **Add Folder to Workspace...**) and open this workspace as specified before.

Use multiple build configuration in the same workspace folder
-------------------------------------------------------------------

Use the `ESP-IDF CMake Multiple Configuration Example <https://github.com/espressif/esp-idf/tree/master/examples/build_system/cmake/multi_config>`_ to follow this tutorial.

Use the **ESP-IDF: Open Project Configuration** and create two configurations profiles: ``prod1`` and ``prod2`` and ``sdkconfig.prod_common;sdkconfig.prod1`` and ``sdkconfig.prod_common;sdkconfig.prod2`` on the sdkconfig defaults field as shown below:

.. image:: ../../../media/tutorials/project_conf/enterConfigName.png

.. image:: ../../../media/tutorials/project_conf/prod1.png

.. image:: ../../../media/tutorials/project_conf/prod2.png

After creating each profile and the configuration settings for each profile, click the ``Save`` button and use the **ESP-IDF: Select Project Configuration** command to choose the configuration to override extension configuration settings.

.. image:: ../../../media/tutorials/project_conf/selectConfig.png

After a configuration profile is selected, the selected profile will be shown in the status bar as shown before.

.. image:: ../../../media/tutorials/project_conf/configInStatusBar.png

Now use the **ESP-IDF: Build your Project** to build the project for ``prod1`` and ``prod2``. You can observe binaries generated for each profiles in the path defined in each profile as before. You can use **ESP-IDF: Select Project Configuration** command to switch between configurations.

Use the **ESP-IDF: Open Project Configuration** command to modify, add or delete the configuration profiles. If you want to stop using these profile, just delete all configuration profiles.

Multiple ESP-IDF Versions
--------------------------------

You can use multiple ESP-IDF versions, one for each ESP-IDF project by explicitly defining your configuration settings in your current project directory ``.vscode/settings.json``.

1. Set the ``idf.saveScope`` to WorkspaceFolder with the **ESP-IDF: Select where to Save Configuration Settings** command or directly in the ``.vscode/settings.json`` of desired project opened in Visual Studio Code.

2. Configure the extension as described in :ref:`Install ESP-IDF and Tools <installation>` documentation.

3. Make sure to delete any previous build directory since a different ESP-IDF version would not work if there is any cache of previous build.

4. Repeat from 1) on any project you would like to use a different version from the global user settings.

Using Multiple Build Configuration Manually
------------------------------------------------

As shown in the `ESP-IDF CMake Multiple Configuration example <https://github.com/espressif/esp-idf/tree/master/examples/build_system/cmake/multi_config>`_ you can use multiple build directories and multiple sdkconfig defaults files to produce different production output.

In this extension you can define the build directory with the ``idf.buildPath`` (``idf.buildPathWin`` fo Windows) configuration setting and the list of sdkconfig default files with ``idf.sdkconfigDefaults`` configuration. The value of these settings will be using by the extension build command.

Say you want to make product 1:

1. you have sdkconfig files ``sdkconfig.prod_common`` and ``sdkconfig.prod1`` and you want the resulting firmware to be generated in ``<your-project>/build_prod1`` where ``build_prod1`` is the name of the custom build folder.
2. Add these settings in ``<your-project>/.vscode/settings.json``:

.. code-block:: JSON

  {
    // ...
    "idf.buildPath": "${workspaceFolder}/build_prod1",
    "idf.sdkconfigDefaults": ["sdkconfig.prod_common", "sdkconfig.prod1"]
    // ...
  }

3. Build your project using the **ESP-IDF: Build your Project** command.

4. Your resulting files will be generated in ``<your-project>/build_prod1`` and the sdkconfig being used by the SDK Configuration Editor will be ``<your-project>/build_prod1/sdkconfig``.

5. Change values in 2) for different products and configurations.
