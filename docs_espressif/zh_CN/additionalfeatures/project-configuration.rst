项目配置编辑器
==============

:link_to_translation:`en:[English]`

使用项目配置编辑器，可以为同一项目启用多种配置。通过定义多种设置，可以生成不同的构建结果。例如，可以参考 `多配置教程 <multiple_config>`_，利用 ESP-IDF CMake 构建系统的 `multi_config <https://github.com/espressif/esp-idf/tree/master/examples/build_system/cmake/multi_config>`_ 示例来实现这一功能。

1.  前往菜单栏 ``查看`` > ``命令面板``。
2.  输入 ``ESP-IDF：打开项目配置`` 并选择该命令。
3.  在开启的项目配置向导界面中，进行项目配置文件管理并记录以下配置：

.. list-table::
    :header-rows: 1
    :widths: 30 70

    * - 设置 ID
      - 功能描述

    * - **idf.cmakeCompilerArgs**
      - CMake 编译任务的参数

    * - **idf.ninjaArgs**
      - Ninja 构建任务的参数

    * - **idf.buildPath**
      - 扩展命令的自定义构建目录名称（默认为 \${workspaceFolder}/build）

    * - **idf.sdkconfigFilePath**
      - sdkconfig 文件的绝对路径

    * - **idf.sdkconfigDefaults**
      - 初始构建配置的 sdkconfig 默认值列表

    * - **idf.customExtraVars**
      - 添加到系统环境变量的变量

    * - **idf.flashBaudRate**
      - 烧录波特率

    * - **idf.monitorBaudRate**
      - 监视器波特率（默认为空，并使用 sdkconfig 文件中定义的 ``CONFIG_ESP_CONSOLE_UART_BAUDRATE``）

    * - **idf.openOcdDebugLevel**
      - 设置 OpenOCD 调试级别 (0～4)，默认为 2

    * - **idf.openOcdConfigs**
      - OpenOCD 的配置文件，路径相对于 OPENOCD_SCRIPTS 文件夹

    * - **idf.openOcdLaunchArgs**
      - **idf.openOcdDebugLevel** 和 **idf.openOcdConfigs** 之前的 OpenOCD 启动参数

    * - **idf.preBuildTask**
      - 构建任务之前执行的命令字符串

    * - **idf.postBuildTask**
      - 构建任务之后执行的命令字符串

    * - **idf.preFlashTask**
      - 烧录任务之前执行的命令字符串

    * - **idf.postFlashTask**
      - 烧录任务之后执行的命令字符串

4.  定义好配置文件和每个配置文件的设置后，使用：

    - 前往菜单栏 ``查看`` > ``命令面板``。
    - 输入 ``ESP-IDF：选择项目配置`` 并选择该命令，覆盖扩展设置的配置。

多配置文件有许多用例，例如统一存储设置并在不同设置之间轻松切换。下文展示了其中一个用例：创建 **development** 和 **production** 构建配置文件。

ESP-IDF 项目的开发和发布配置文件
--------------------------------

`ESP-IDF 项目结构 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/build-system.html#example-project-structure>`_ 通常如下所示：

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

在 ESP-IDF CMake 构建系统中，项目配置设置通过 SDK 配置编辑器保存，这些值存储在 ``/path/to/esp-project/sdkconfig`` 文件中。默认情况下，构建系统会在项目根目录下创建 ``/path/to/esp-project/sdkconfig`` 文件，并在 ``/path/to/esp-project/build`` 目录下生成构建目录。

若当前 ESP-IDF 项目处于版本控制中，则 ``/path/to/esp-project/sdkconfig`` 文件会随着每次构建而更新，项目的行为也会有所不同。因此，建议将特定的项目设置移至 ``sdkconfig.defaults`` 文件（或一组配置文件）中，避免构建系统对其进行修改。你可以将 ``/path/to/esp-project/sdkconfig`` 文件添加到 ``.gitignore`` 列表中。在 ESP-IDF v5.0 及更高版本中，可以通过执行 ``ESP-IDF：保存默认 SDKCONFIG 文件 (save-defconfig)`` 命令生成 ``sdkconfig.defaults`` 文件。

.. note::

    在创建 ``sdkconfig`` 文件时，构建系统会使用 ``sdkconfig.defaults`` 文件覆盖默认项目设置。详情请参阅 ESP-IDF 文档中的 `自定义 sdkconfig 的默认值 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/build-system.html#custom-sdkconfig-defaults>`_。

使用上述扩展设置，你可以修改默认的构建路径 ``/path/to/esp-project/build``、sdkconfig 文件及 ``sdkconfig.defaults`` 文件路径，将它们从项目结构中的默认位置移动到其他位置。通过 ``ESP-IDF：项目配置编辑器`` 命令，你可以使用 ``Build Directory Path`` 来定义多个构建目录位置，也可以指定 sdkconfig 文件的路径并列出 ``sdkconfig.defaults`` 文件，从而在指定的 ``SDKConfig File Path`` 中创建 sdkconfig 文件。

在此示例中，我们将创建 **development** 和 **production** 两个配置文件，并为其定义不同的构建目录和 sdkconfig 文件。

1. 前往菜单栏 ``查看`` > ``命令面板``。

2. 输入 ``ESP-IDF：保存默认 SDKCONFIG 文件 (save-defconfig)`` 并选择该命令以生成 ``sdkconfig.defaults`` 文件。此命令需 ESP-IDF v5.0 及以上版本才可使用。你也可以手动创建 ``sdkconfig.defaults`` 文件。

3. 前往菜单栏 ``查看`` > ``命令面板``。

4. 输入 ``ESP-IDF：打开项目配置`` 并选择该命令，创建一个名为 **production** 的新配置文件。将 ``SDKConfig Defaults`` 设置为已有的 ``sdkconfig.defaults`` 文件。若要区分 **production** 配置文件的构建目录与默认的 ``/path/to/esp-project/build`` 目录，可在 ``Build Directory Path`` 字段中自定义目录路径，例如 ``/path/to/esp-project/build_production``。同样地，也可以在 ``SDKConfig File Path`` 字段中设置自定义路径，例如 ``/path/to/esp-project/build_production/sdkconfig``。

5. 创建一个名为 **development** 的新配置文件。为避免混淆 **development** 和 **production** 文件，可在 ``Build Directory Path`` 字段中设置自定义路径（如 ``/path/to/esp-project/build_dev``），并将 ``SDKConfig File Path`` 设置为 ``/path/to/esp-project/build_dev/sdkconfig``。

6. 创建好两个配置文件并完成配置后，点击 ``Save`` 按钮，后续可通过 ``ESP-IDF：选择项目配置`` 命令来选择所需的配置文件。

7. 若选择 **production** 配置文件并执行 ``ESP-IDF：构建项目`` 命令，系统会在 ``/path/to/esp-project/build_production`` 目录中生成二进制文件，并创建 ``/path/to/esp-project/build_production/sdkconfig`` 文件。

8. 若选择 **development** 配置文件，系统会在 ``/path/to/esp-project/build_dev`` 目录中生成二进制文件，并创建 ``/path/to/esp-project/build_dev/sdkconfig`` 文件。

9. 这些配置文件及其设置将保存在 ``/path/to/esp-project/esp_idf_project_configuration.json`` 文件中。

如 ESP-IDF CMake `multi_config <https://github.com/espressif/esp-idf/tree/master/examples/build_system/cmake/multi_config>`_ 和 `多配置教程 <multiple_config>`_ 所示，上文提到的 **production** 配置文件可以进一步拆分为多个 **production** 配置文件。你可以将 ``sdkconfig.defaults`` 文件拆分为通用设置文件 ``sdkconfig.prod_common`` 和产品特定设置文件 ``sdkconfig.prod1`` 及 ``sdkconfig.prod2``。在项目配置编辑器中，可以在 ``SDKConfig Defaults`` 字段中指定多个 sdkconfig 默认文件并以分号隔开（如 ``sdkconfig.prod_common;sdkconfig.prod1``），这些文件将按照指定顺序依次加载。详情请参阅 `此处 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/build-system.html#custom-sdkconfig-defaults>`_。

以上示例展示了项目配置编辑器的功能之一。你也可以根据不同的开发场景（如测试、性能分析等）定义多个配置文件。
