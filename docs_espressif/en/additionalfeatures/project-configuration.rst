Project Configuration Editor
============================

:link_to_translation:`zh_CN:[中文]`

Project Configuration Editor allows you to enable multiple configurations for the same project. You can define various settings to generate different build results. For example, refer to `Multiple Configuration Tutorial <multiple_config>`_, which demonstrates how to use the ESP-IDF CMake build system with `multi_config <https://github.com/espressif/esp-idf/tree/master/examples/build_system/cmake/multi_config>`_ example.

1.  Go to ``View`` > ``Command Palette``.
2.  Type ``ESP-IDF: Open Project Configuration`` and select the command.
3.  This will launch a project configuration wizard to manage project configuration profiles and record the following settings for each configuration:

.. list-table::
    :header-rows: 1
    :widths: 30 70

    * - Setting ID
      - Description

    * - **idf.cmakeCompilerArgs**
      - Arguments for the CMake compilation task

    * - **idf.ninjaArgs**
      - Arguments for the Ninja build task

    * - **idf.buildPath**
      - Custom build directory name for extension commands (Default: \${workspaceFolder}/build)

    * - **idf.sdkconfigFilePath**
      - Absolute path for the sdkconfig file

    * - **idf.sdkconfigDefaults**
      - List of sdkconfig default values for the initial build configuration

    * - **idf.customExtraVars**
      - Variables to add to system environment variables

    * - **idf.flashBaudRate**
      - Flash baud rate

    * - **idf.monitorBaudRate**
      - Monitor baud rate (empty by default to use sdkconfig ``CONFIG_ESP_CONSOLE_UART_BAUDRATE``)

    * - **idf.openOcdDebugLevel**
      - Set OpenOCD debug level (0–4); default: 2

    * - **idf.openOcdConfigs**
      - Configuration files for OpenOCD, relative to the OPENOCD_SCRIPTS folder

    * - **idf.openOcdLaunchArgs**
      - Launch arguments for OpenOCD before **idf.openOcdDebugLevel** and **idf.openOcdConfigs**

    * - **idf.preBuildTask**
      - Command string to execute before the build task

    * - **idf.postBuildTask**
      - Command string to execute after the build task

    * - **idf.preFlashTask**
      - Command string to execute before the flash task

    * - **idf.postFlashTask**
      - Command string to execute after the flash task

4.  After defining a profile and the settings for each profile, use:

    - Go to ``View`` > ``Command Palette``.
    - Enter ``ESP-IDF: Select Project Configuration`` to choose the configuration that overrides extension configuration settings.

Multiple configuration profiles have many use cases. They allow you to store settings together and easily switch between them. The following explores one of these use cases: creating **development** and **production** build profiles.

Development and Release Profiles for ESP-IDF Project
----------------------------------------------------

A typical `ESP-IDF Project Structure <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/build-system.html#example-project>`_ looks like this:

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

In the ESP-IDF CMake build system, the project configuration settings are saved using the SDK Configuration Editor, which stores these values in the ``/path/to/esp-project/sdkconfig`` file. By default, the build system creates a ``/path/to/esp-project/sdkconfig`` file in the project root directory and a ``/path/to/esp-project/build`` directory as the build directory.

When the current ESP-IDF project is under version control, the ``/path/to/esp-project/sdkconfig`` file can change with each user build, altering the project's expected behavior. Therefore, it is better to move project-specific settings to a ``sdkconfig.defaults`` file (or a list of files) that the build system does not modify. You can add ``/path/to/esp-project/sdkconfig`` to the ``.gitignore`` list. The ``ESP-IDF: Save Default SDKCONFIG File (save-defconfig)`` command (available in ESP-IDF v5.0 or higher) can generate this ``sdkconfig.defaults`` file.

.. note::

    The ``sdkconfig.defaults`` file is used by the build system to override default project settings when creating the ``sdkconfig`` file, as described in `Custom Sdkconfig Defaults <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/build-system.html#custom-sdkconfig-defaults>`_.

With these extension settings, you can modify the default build path ``/path/to/esp-project/build``, sdkconfig file path, and ``sdkconfig.defaults`` from their default locations described in the project structure. Using the ``ESP-IDF: Project Configuration Editor``, you can define multiple build directory locations with the ``Build Directory Path``, specify the path for the sdkconfig file, and list ``sdkconfig.defaults`` files to create the sdkconfig file in the specified ``SDKConfig File Path``.

In this example, we create two profiles: **development** and **production**, to define separate build directories and sdkconfig files.

1. Go to ``View`` > ``Command Palette``.

2. Type ``ESP-IDF: Save Default SDKCONFIG file (save-defconfig)`` and select the command to generate a ``sdkconfig.defaults`` file. This command is available in ESP-IDF v5.0 or higher. You can also create this ``sdkconfig.defaults`` file manually.

3. Go to ``View`` > ``Command Palette``.

4. Type ``ESP-IDF: Open Project Configuration`` and select the command to create a new profile named **production**. Set ``SDKConfig Defaults`` to the existing ``sdkconfig.defaults`` file. If you want to separate the build directory for this new **production** profile from the default ``/path/to/esp-project/build`` directory, specify a custom path in the ``Build Directory Path`` field (e.g., ``/path/to/esp-project/build_production``). Similarly, set the ``SDKConfig File Path`` field to a custom location (e.g., ``/path/to/esp-project/build_production/sdkconfig``).

5. Create a new profile named **development**. To keep **development** and **production** files separate, set ``Build Directory Path`` to a custom location (e.g., /path/to/esp-project/build_dev) and ``SDKConfig File Path`` to ``/path/to/esp-project/build_dev/sdkconfig``.

6. After creating each profile and configuring the settings, click the ``Save`` button. Use the ``ESP-IDF: Select Project Configuration`` command to choose the desired profile.

7. When you choose the **production** profile and use the ``ESP-IDF: Build your Project`` command, the ``/path/to/esp-project/build_production/sdkconfig`` file will be created, and the binaries will be generated in ``/path/to/esp-project/build_production``.

8. If you choose the **development** profile, the ``/path/to/esp-project/build_dev/sdkconfig`` file will be created, and the binaries will be generated in ``/path/to/esp-project/build_dev``.

9. These profiles and their settings will be saved in the ``/path/to/esp-project/esp_idf_project_configuration.json``.

The previous **production** profile can be divided into multiple **production** profiles, as demonstrated in the ESP-IDF CMake `multi_config <https://github.com/espressif/esp-idf/tree/master/examples/build_system/cmake/multi_config>`_ example and `Multiple Configuration Tutorial <multiple_config>`_. This is achieved by splitting the ``sdkconfig.defaults`` file into a common settings file (``sdkconfig.prod_common``) and product-specific settings files (``sdkconfig.prod1`` and ``sdkconfig.prod2``). In the Project Configuration Editor, you can specify multiple ``SDKConfig Defaults`` files using a semicolon-separated format (e.g., ``sdkconfig.prod_common;sdkconfig.prod1``), and these files will be loaded in order as explained `here <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/build-system.html#custom-sdkconfig-defaults>`_.

This is just one example of what the Project Configuration Editor can do. You can also define multiple profiles for other development scenarios, such as testing, profiling, and more.
