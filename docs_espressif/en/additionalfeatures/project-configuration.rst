Project Configuration Editor
====================================

To allow you to have multiple configurations for the same project, you can define several settings to produce different build results. For example, take a look at the `Multiple configuration tutorial <multiple_config>`_ which uses the ESP-IDF CMake build system `multi_config <https://github.com/espressif/esp-idf/tree/master/examples/build_system/cmake/multi_config>`_ example.

1. Click menu **View** > **Command Palette...** 
2. Type **ESP-IDF: Open Project Configuration** and select the command. 
3. This will launch a Project configuration wizard to manage the project configuration profiles to record the following settings for each configuration:

+-----------------------------------+-------------------------------------------------------------------------------------------+
| Setting ID                        | Description                                                                               |
+===================================+===========================================================================================+
| **idf.cmakeCompilerArgs**         | Arguments for CMake compilation task                                                      |
+-----------------------------------+-------------------------------------------------------------------------------------------+
| **idf.ninjaArgs**                 | Arguments for Ninja build task                                                            |
+-----------------------------------+-------------------------------------------------------------------------------------------+
| **idf.buildPath**                 | Custom build directory name for extension commands. (Default: \${workspaceFolder}/build)  |
+-----------------------------------+-------------------------------------------------------------------------------------------+
| **idf.sdkconfigFilePath**         | Absolute path for sdkconfig file                                                          |
+-----------------------------------+-------------------------------------------------------------------------------------------+
| **idf.sdkconfigDefaults**         | List of sdkconfig default values for initial build configuration                          |
+-----------------------------------+-------------------------------------------------------------------------------------------+
| **idf.customExtraVars**           | Variables to be added to system environment variables                                     |
+-----------------------------------+-------------------------------------------------------------------------------------------+
| **idf.adapterTargetName**         | ESP-IDF Target Chip (Example: esp32)                                                      |
+-----------------------------------+-------------------------------------------------------------------------------------------+
| **idf.flashBaudRate**             | Flash Baud rate                                                                           |
+-----------------------------------+-------------------------------------------------------------------------------------------+
| **idf.monitorBaudRate**           | Monitor Baud Rate (Empty by default to use SDKConfig CONFIG_ESP_CONSOLE_UART_BAUDRATE)    |
+-----------------------------------+-------------------------------------------------------------------------------------------+
| **idf.openOcdDebugLevel**         | Set openOCD Debug Level (0-4) Default: 2                                                  |
+-----------------------------------+-------------------------------------------------------------------------------------------+
| **idf.openOcdConfigs**            | Configuration Files for OpenOCD. Relative to OPENOCD_SCRIPTS folder                       |
+-----------------------------------+-------------------------------------------------------------------------------------------+
| **idf.openOcdLaunchArgs**         | Launch Arguments for OpenOCD before idf.openOcdDebugLevel and idf.openOcdConfigs          |
+-----------------------------------+-------------------------------------------------------------------------------------------+
| **idf.preBuildTask**              | Command string to execute before build task                                               |
+-----------------------------------+-------------------------------------------------------------------------------------------+
| **idf.postBuildTask**             | Command string to execute after build task                                                |
+-----------------------------------+-------------------------------------------------------------------------------------------+
| **idf.preFlashTask**              | Command string to execute before flash task                                               |
+-----------------------------------+-------------------------------------------------------------------------------------------+
| **idf.postFlashTask**             | Command string to execute after flash task                                                |
+-----------------------------------+-------------------------------------------------------------------------------------------+

4. After defining a profile and the settings for each profile use:

- Click menu **View** > **Command Palette...** 
- Type **ESP-IDF: Select Project Configuration** command to choose the configuration to override extension configuration settings.

There are many use cases for having multiple configurations profiles. It allows you to store settings together and easily switch between one and the other. Let's explore one of this use cases here, having a development and production build profiles.

Development and Release Profiles for ESP-IDF Project
-------------------------------------------------------

A typical `ESP-IDF Project Structure <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/build-system.html#example-project>`_ is like this:

.. code-block::

    - /path/to/esp-project/
                - CMakeLists.txt
                - sdkconfig
                - components/ - component1/ - CMakeLists.txt
                                            - Kconfig
                                            - src1.c
                              - component2/ - CMakeLists.txt
                                            - Kconfig
                                            - src1.c
                                            - include/ - component2.h
                - main/       - CMakeLists.txt
                              - src1.c
                              - src2.c

                - build/

In the ESP-IDF CMake build system, the project configuration settings are saved using the SDK Configuration Editor which store these values in a ``/path/to/esp-project/sdkconfig`` file. The default case is to create an ``/path/to/esp-project/sdkconfig`` file in the ESP-IDF project root directory and a ``/path/to/esp-project/build`` directory as the build directory path.

When the current ESP-IDF project is under version control system, the ``/path/to/esp-project/sdkconfig`` can change on any user build which can alter the project expected behavior. For such a reason is better to move those project specific settings to an ``sdkconfig.defaults`` file (or list of files) which is not modified by the build system. ``/path/to/esp-project/sdkconfig`` can be added to the ``.gitignore`` list. This ``sdkconfig.defaults`` can be generated by the **ESP-IDF: Save Default SDKCONFIG file (save-defconfig)** (ESP-IDF v5.0 or higher) command.

.. note::
  The ``sdkconfig.defaults`` file is used by the build system to override defaults project settings when creating the ``sdkconfig`` file as described in the ESP-IDF documentation `custom sdkconfig defaults <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/build-system.html#custom-sdkconfig-defaults>`_.

With this extension settings, the default build path (/path/to/esp-project/build), sdkconfig file path and sdkconfig.defaults can be modified from their default location, the one described in the project structure before. With the **ESP-IDF: Project Configuration Editor** you can define multiple locations of the build directory with ``Build Directory Path``, ``SDKConfig File Path`` for the SDKConfig file and ``SDKConfig Defaults`` list of SDKConfig files to create the SDKConfig file in the specified ``SDKConfig File Path`` path. 

For this example we will create two profiles, **development** and **production**, to create 2 different build directories and 2 different sdkconfig files.

1. Click menu **View** > **Command Palette...** 
2. Type **ESP-IDF: Save Default SDKCONFIG file (save-defconfig)** select the command to generate a `sdkconfig.defaults` file. This command is added in ESP-IDF v5.0. You can also create this sdkconfig.defaults manually.
3. Click menu **View** > **Command Palette...** 
4. Type **ESP-IDF: Open Project Configuration** select the command and create a new profile with name ``production``. Set ``SDKConfig Defaults`` the previous ``sdkconfig.defaults`` file. If you want to separate the build directory of this new **production** profile from the default ``/path/to/esp-project/build`` directory, specify a build directory path using the ``Build Directory Path`` field to something like ``/path/to/esp-project/build_production`` and the ``SDKConfig file path`` field to something like ``/path/to/esp-project/build_production/sdkconfig``.

5. Create a new profile with name ``development``. You can set the build directory path using the ``Build Directory Path`` field to something like ``/path/to/esp-project/build_dev`` and the ``SDKConfig File Path`` field to something like ``/path/to/esp-project/build_dev/sdkconfig`` to avoid mixing **development** with **production** files.

6. After creating each profile and the configuration settings for each profile, click the ``Save`` button and use the extension **ESP-IDF: Select Project Configuration** command to choose desired profile.

7. When you choose the **production** profile and use the **ESP-IDF: Build your Project** the ``/path/to/esp-project/build_production/sdkconfig`` would be created and the binaries are going to be created in ``/path/to/esp-project/build_production``.

8. If you choose the **development** profile, the ``/path/to/esp-project/build_dev/sdkconfig`` would be created and the binaries are going to be created in ``/path/to/esp-project/build_dev``.

9. These profiles and each profile settings are going to be saved in the ``/path/to/esp-project/esp_idf_project_configuration.json``.

The previous production profile could be split into multiple production profiles, as it is done in the `ESP-IDF CMake Multiple configuration example <https://github.com/espressif/esp-idf/tree/master/examples/build_system/cmake/multi_config>`_ and the `Multiple configuration tutorial <multiple_config>`_ by separating ``sdkconfig.defaults`` into common SDKConfig settings in a ``sdkconfig.prod_common`` file and product specific settings in ``sdkconfig.prod1`` file and ``sdkconfig.prod2`` file respectively. Multiple SDKConfig defaults files can be specified in the project configuration editor profile ``sdkconfig defaults`` field as ``sdkconfig.prod_common;sdkconfig.prod1`` where the values are loaded in order as explained in `here <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/build-system.html?highlight=sdkconfig%20defaults#custom-sdkconfig-defaults>`_.

This is just an example of the possibility of this project configuration editor. You can define multiple settings for different kinds of development scenarios such as testing, profiling, etc.