项目配置
========

:link_to_translation:`en:[English]`

本扩展提供了多个设置项，用于配置 ESP-IDF 项目。若想在同一项目中启用多种配置，可以使用 **项目配置** 来定义多个配置文件，每个配置文件包含不同的设置。本文目录如下：

.. contents::
   :local:
   :depth: 2

为单一构建配置扩展
------------------

典型的 `ESP-IDF 项目结构 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/build-system.html#example-project-structure>`_ 如下所示：

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

在 ESP-IDF CMake 构建系统中，项目配置通过 SDK 配置编辑器进行保存，这些配置值存储在 ``/path/to/esp-project/sdkconfig`` 文件中。默认情况下，该文件会在 ESP-IDF 项目根目录下创建，同时 ``/path/to/esp-project/build`` 目录被用作构建目录路径。

若当前 ESP-IDF 项目处于版本控制中，则 ``/path/to/esp-project/sdkconfig`` 可能会随着不同用户的构建发生变化，从而改变项目的预期行为。为避免这种情况，建议将项目相关的配置移动到 ``sdkconfig.defaults`` 文件（或文件列表）中，这些文件不会被构建系统修改。同时，可以将 ``/path/to/esp-project/sdkconfig`` 添加到 ``.gitignore`` 列表中。若使用 ESP-IDF v5.0 及以上版本，则 ``sdkconfig.defaults`` 文件可以通过命令 ``ESP-IDF：保存默认 SDKCONFIG 文件 (save-defconfig)`` 生成。

.. note::

    构建系统在生成 ``sdkconfig`` 文件时，会使用 ``sdkconfig.defaults`` 文件来覆盖项目的默认配置。详情请参阅 ESP-IDF 文档 `自定义 sdkconfig 的默认值 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/build-system.html#sdkconfig>`_。

通过该扩展的设置，可以修改默认的构建路径 (``/path/to/esp-project/build``)、sdkconfig 文件路径以及 ``sdkconfig.defaults`` 文件路径。

在此扩展中，你可以通过 ``idf.buildPath`` 配置项定义构建目录，以及通过 ``idf.sdkconfigDefaults`` 配置项定义 sdkconfig 默认文件列表。扩展的构建命令将使用这些定义好的值。

例如，要为产品 1 创建配置：

1.  你有 sdkconfig 文件 ``sdkconfig.prod_common`` 和 ``sdkconfig.prod1``，并希望生成的固件输出到 ``<your-project>/build_prod1``，其中 ``build_prod1`` 是自定义构建目录的名称。

2.  需要在 ``<your-project>/.vscode/settings.json`` 中添加以下配置：

    .. code-block:: JSON

        {
        // ...
        "idf.buildPath": "${workspaceFolder}/build_prod1",
        "idf.sdkconfigDefaults": ["sdkconfig.prod_common", "sdkconfig.prod1"]
        // ...
        }

3.  通过 ``ESP-IDF：构建项目`` 命令构建项目。

4.  生成的文件会存放在 ``<your-project>/build_prod1`` 中，SDK 配置编辑器使用的 sdkconfig 文件路径为 ``<your-project>/build_prod1/sdkconfig``。

    .. note::

        ESP-IDF CMake 多配置示例在 ``CMakeLists.txt`` 文件中定义了 sdkconfig 路径，这会导致 ``idf.sdkconfigFilePath`` **无效**。

5.  修改步骤 2 中的值，即可为不同产品和配置创建不同的构建。

使用 ``ESP-IDF: SDK Configuration Editor`` 命令，你可以通过 ``Build Directory Path`` 指定构建目录，通过 ``SDKConfig File Path`` 指定 SDKConfig 文件的位置，并通过 ``SDKConfig Defaults`` 指定默认配置文件，从而在所设定路径下生成 SDKConfig 文件。


为多个构建配置扩展
------------------

本扩展使用标准的 `CMake Presets <https://cmake.org/cmake/help/latest/manual/cmake-presets.7.html>`_ 格式来管理多个构建配置。配置文件定义在项目根目录下的 ``CMakePresets.json`` （以及可选的 ``CMakeUserPresets.json`` 用于用户特定的覆盖设置）中。

通过 **CMakePresets.json**，你可以使用 ``binaryDir`` 定义多个构建目录位置，使用 ``SDKCONFIG`` 指定 SDKConfig 文件路径，使用 ``SDKCONFIG_DEFAULTS`` 指定 SDKConfig 默认文件列表，从而在指定路径下创建 SDKConfig 文件。

创建多个构建配置的步骤：

1. 在项目根目录下创建或编辑 ``CMakePresets.json``。**ESP-IDF: Create Project Configuration** 命令会写入一个包含两个预设（``default`` 和 ``production``）的起始文件，你可以重命名和扩展它们。
2. 在 ``configurePresets`` 数组中定义你的配置预设。每个预设可以覆盖以下扩展设置：

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - 扩展设置
     - CMakePresets 中的位置
   * - **idf.cmakeCompilerArgs**
     - ``vendor["espressif/vscode-esp-idf"].settings`` (type: ``compileArgs``)
   * - **idf.ninjaArgs**
     - ``vendor["espressif/vscode-esp-idf"].settings`` (type: ``ninjaArgs``)
   * - **idf.buildPath**
     - ``binaryDir``
   * - **idf.sdkconfigFilePath**
     - ``cacheVariables.SDKCONFIG``
   * - **idf.sdkconfigDefaults**
     - ``cacheVariables.SDKCONFIG_DEFAULTS`` （分号分隔的字符串）
   * - **idf.customExtraVars**
     - ``environment`` （IDF_TARGET 在 ``cacheVariables.IDF_TARGET`` 中）
   * - **idf.flashBaudRate**
     - ``vendor["espressif/vscode-esp-idf"].settings`` (type: ``flashBaudRate``)
   * - **idf.monitorBaudRate**
     - ``vendor["espressif/vscode-esp-idf"].settings`` (type: ``monitorBaudRate``)
   * - **idf.openOcdDebugLevel**
     - ``vendor["espressif/vscode-esp-idf"].settings`` (type: ``openOCD``, field: ``debugLevel``)
   * - **idf.openOcdConfigs**
     - ``vendor["espressif/vscode-esp-idf"].settings`` (type: ``openOCD``, field: ``configs``)
   * - **idf.openOcdLaunchArgs**
     - ``vendor["espressif/vscode-esp-idf"].settings`` (type: ``openOCD``, field: ``args``)
   * - **idf.preBuildTask**
     - ``vendor["espressif/vscode-esp-idf"].settings`` (type: ``tasks``, field: ``preBuild``)
   * - **idf.postBuildTask**
     - ``vendor["espressif/vscode-esp-idf"].settings`` (type: ``tasks``, field: ``postBuild``)
   * - **idf.preFlashTask**
     - ``vendor["espressif/vscode-esp-idf"].settings`` (type: ``tasks``, field: ``preFlash``)
   * - **idf.postFlashTask**
     - ``vendor["espressif/vscode-esp-idf"].settings`` (type: ``tasks``, field: ``postFlash``)

3. 定义好预设后，使用 ``ESP-IDF: Select Project Configuration`` 命令选择要使用的配置。

    - 前往菜单栏 ``查看`` > ``命令面板``
    - 输入 ``ESP-IDF: Select Project Configuration`` 命令来选择要覆盖扩展设置的配置。

.. note::
   当你选择一个项目配置时，扩展会自动为所选预设附加 ``espressif/vscode-esp-idf`` 下的 vendor 设置（例如 OpenOCD 配置和 ``IDF_TARGET``），这些设置基于你当前在扩展中选择的开发板配置和目标。这些设置会与你在 CMakePresets.json 文件中定义的 vendor 设置合并。

项目配置文件保存在 ``CMakePresets.json`` 和 ``CMakeUserPresets.json`` 中
------------------------------------------------------------------------

项目配置使用标准的 CMake Presets 格式存储在 ``CMakePresets.json`` （通常提交到版本控制）和可选的 ``CMakeUserPresets.json`` （用户特定的覆盖，通常添加到 gitignore）中。

``CMakePresets.json`` 文件结构遵循 CMake Presets 模式，并包含 ESP-IDF 特有的 vendor 设置。扩展为 ``CMakePresets.json`` 和 ``CMakeUserPresets.json`` 注册了自己的模式（schema），该模式扩展了官方 CMake Presets 模式并添加了 ESP-IDF vendor 字段。打开任一文件即可获得验证和自动补全功能，无需在文件中添加 ``$schema`` 字段。

.. code-block:: JSON

    {
      "version": 3,
      "cmakeMinimumRequired": {
        "major": 3,
        "minor": 21,
        "patch": 0
      },
      "configurePresets": [
        {
          "name": "default",
          "displayName": "Default Configuration",
          "description": "Default build configuration",
          "binaryDir": "${sourceDir}/build",
          "cacheVariables": {
            "IDF_TARGET": "esp32",
            "SDKCONFIG_DEFAULTS": "sdkconfig.defaults",
            "SDKCONFIG": "${sourceDir}/build/sdkconfig"
          },
          "environment": {},
          "vendor": {
            "espressif/vscode-esp-idf": {
              "schemaVersion": 1,
              "settings": [
                {
                  "type": "compileArgs",
                  "value": []
                },
                {
                  "type": "ninjaArgs",
                  "value": []
                },
                {
                  "type": "flashBaudRate",
                  "value": "921600"
                },
                {
                  "type": "monitorBaudRate",
                  "value": ""
                },
                {
                  "type": "openOCD",
                  "value": {
                    "debugLevel": 2,
                    "configs": [],
                    "args": []
                  }
                },
                {
                  "type": "tasks",
                  "value": {
                    "preBuild": "",
                    "preFlash": "",
                    "postBuild": "",
                    "postFlash": ""
                  }
                }
              ]
            }
          }
        }
      ]
    }

预设名称（``name`` 字段）用于在使用 **ESP-IDF: Select Project Configuration** 命令时标识配置文件。预设名称也会显示在状态栏中。预设名称区分大小写。

所选配置按工作区记忆，并在重新打开时恢复，因此只需选择一次。将 **idf.saveLastProjectConfiguration** 设置为 ``false`` 可在启动时不预选任何配置。当预设文件无法读取时（例如编辑未完成或两个预设同名时），扩展会报告错误并不显示任何配置，文件恢复解析后会自动恢复选择。

隐藏预设
^^^^^^^^

设置了 ``"hidden": true`` 的预设是仅用于被继承的基础预设，与 ``cmake --list-presets`` 的行为一致。扩展不会在 **ESP-IDF: Select Project Configuration** 列表中显示它，但在 ``inherits`` 字段中列出它的预设仍会接收其所有设置。使用此功能可以将多个配置文件共享的设置放在一个地方：

.. code-block:: JSON

    {
      "version": 3,
      "cmakeMinimumRequired": {
        "major": 3,
        "minor": 21,
        "patch": 0
      },
      "configurePresets": [
        {
          "name": "common",
          "hidden": true,
          "cacheVariables": {
            "IDF_TARGET": "esp32c6"
          },
          "vendor": {
            "espressif/vscode-esp-idf": {
              "schemaVersion": 1,
              "settings": [
                {
                  "type": "monitorBaudRate",
                  "value": "115200"
                }
              ]
            }
          }
        },
        {
          "name": "prod1",
          "displayName": "Product 1",
          "inherits": "common",
          "binaryDir": "${sourceDir}/build_prod1"
        }
      ]
    }

只有 ``prod1`` 出现在配置列表中，它使用从 ``common`` 继承的 ``esp32c6`` 目标和 115200 的监视器波特率。``hidden`` 属性本身不会被继承，因此可见的预设可以自由地扩展隐藏的预设。

**CMakeUserPresets.json** 遵循相同的结构，用于存放你不想共享的设置。这使你可以：

- 将项目级配置保存在 ``CMakePresets.json`` 中（提交到版本控制）
- 将个人自定义设置保存在 ``CMakeUserPresets.json`` 中（添加到 gitignore）

预设名称在两个文件中必须唯一。CMake 在名称重复声明时会拒绝读取任何预设，扩展的行为与之相同：存在重复时不提供任何配置，并在错误信息中列出涉及的预设。要个性化一个共享预设，请使用不同的名称添加一个 ``inherits`` 该预设的新预设。

**示例：使用 CMakeUserPresets.json 进行个人覆盖**

假设你有一个项目级的 ``CMakePresets.json``，其中包含一个 ``production`` 预设：

.. code-block:: JSON

    {
      "version": 3,
      "cmakeMinimumRequired": {
        "major": 3,
        "minor": 21,
        "patch": 0
      },
      "configurePresets": [
        {
          "name": "production",
          "displayName": "Production",
          "binaryDir": "${sourceDir}/build_production",
          "cacheVariables": {
            "SDKCONFIG_DEFAULTS": "sdkconfig.defaults",
            "SDKCONFIG": "${sourceDir}/build_production/sdkconfig"
          }
        }
      ]
    }

你可以创建一个 ``CMakeUserPresets.json`` 文件，其中包含一个继承 ``production`` 的个人预设，并只修改你需要更改的内容，例如烧录波特率或监视器波特率：

.. code-block:: JSON

    {
      "version": 3,
      "configurePresets": [
        {
          "name": "production-local",
          "displayName": "Production (local)",
          "inherits": "production",
          "vendor": {
            "espressif/vscode-esp-idf": {
              "schemaVersion": 1,
              "settings": [
                {
                  "type": "flashBaudRate",
                  "value": "115200"
                },
                {
                  "type": "monitorBaudRate",
                  "value": "115200"
                }
              ]
            }
          }
        }
      ]
    }

两个预设都会出现在配置列表中。当你选择 ``production-local`` 时，扩展使用你的烧录和监视器波特率（115200），并从 ``production`` 继承构建目录和 SDKConfig 设置。这允许每个团队成员拥有自己的串口设置，而无需修改共享的项目配置。

尽管每个字段的含义大致显而易见，以下是 CMakePresets 结构与扩展设置的映射关系：

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - 扩展设置
     - CMakePresets 中的位置
   * - **idf.cmakeCompilerArgs**
     - ``configurePresets[].vendor["espressif/vscode-esp-idf"].settings[]``，其中 ``type == "compileArgs"``
   * - **idf.ninjaArgs**
     - ``configurePresets[].vendor["espressif/vscode-esp-idf"].settings[]``，其中 ``type == "ninjaArgs"``
   * - **idf.buildPath**
     - ``configurePresets[].binaryDir``
   * - **idf.sdkconfigFilePath**
     - ``configurePresets[].cacheVariables.SDKCONFIG``
   * - **idf.sdkconfigDefaults**
     - ``configurePresets[].cacheVariables.SDKCONFIG_DEFAULTS`` （分号分隔的字符串）
   * - **idf.customExtraVars**
     - ``configurePresets[].environment`` （IDF_TARGET 在 ``cacheVariables.IDF_TARGET`` 中）
   * - **idf.flashBaudRate**
     - ``configurePresets[].vendor["espressif/vscode-esp-idf"].settings[]``，其中 ``type == "flashBaudRate"``
   * - **idf.monitorBaudRate**
     - ``configurePresets[].vendor["espressif/vscode-esp-idf"].settings[]``，其中 ``type == "monitorBaudRate"``
   * - **idf.openOcdDebugLevel**
     - ``configurePresets[].vendor["espressif/vscode-esp-idf"].settings[]``，其中 ``type == "openOCD"``，field: ``debugLevel``
   * - **idf.openOcdConfigs**
     - ``configurePresets[].vendor["espressif/vscode-esp-idf"].settings[]``，其中 ``type == "openOCD"``，field: ``configs``
   * - **idf.openOcdLaunchArgs**
     - ``configurePresets[].vendor["espressif/vscode-esp-idf"].settings[]``，其中 ``type == "openOCD"``，field: ``args``
   * - **idf.preBuildTask**
     - ``configurePresets[].vendor["espressif/vscode-esp-idf"].settings[]``，其中 ``type == "tasks"``，field: ``preBuild``
   * - **idf.postBuildTask**
     - ``configurePresets[].vendor["espressif/vscode-esp-idf"].settings[]``，其中 ``type == "tasks"``，field: ``postBuild``
   * - **idf.preFlashTask**
     - ``configurePresets[].vendor["espressif/vscode-esp-idf"].settings[]``，其中 ``type == "tasks"``，field: ``preFlash``
   * - **idf.postFlashTask**
     - ``configurePresets[].vendor["espressif/vscode-esp-idf"].settings[]``，其中 ``type == "tasks"``，field: ``postFlash``


.. _multiple-configuration-tutorial:

多配置教程
----------

使用 `ESP-IDF CMake 多配置构建示例 <https://github.com/espressif/esp-idf/tree/master/examples/build_system/cmake/multi_config>`_ 来跟随本教程。

.. note::
   ESP-IDF ``multi_config`` 示例已附带可直接使用的 ``CMakePresets.json``，开箱即用。当你在此扩展中选择项目配置时，扩展会自动为所选预设附加 ``espressif/vscode-esp-idf`` 下的 vendor 设置（例如 OpenOCD 配置和 ``IDF_TARGET``），这些设置基于你当前在扩展中选择的开发板配置和目标。

要手动创建多个配置，请在项目根目录下创建或编辑 ``CMakePresets.json``，包含两个配置预设：``prod1`` 和 ``prod2``：

.. code-block:: JSON

    {
      "version": 3,
      "cmakeMinimumRequired": {
        "major": 3,
        "minor": 21,
        "patch": 0
      },
      "configurePresets": [
        {
          "name": "default",
          "displayName": "Default (development)",
          "description": "Development configuration",
          "binaryDir": "${sourceDir}/build/default",
          "cacheVariables": {
            "SDKCONFIG": "${sourceDir}/build/default/sdkconfig"
          }
        },
        {
          "name": "prod1",
          "displayName": "Product 1",
          "description": "Production configuration for product 1",
          "binaryDir": "${sourceDir}/build/prod1",
          "cacheVariables": {
            "SDKCONFIG_DEFAULTS": "sdkconfig.defaults.prod_common;sdkconfig.defaults.prod1",
            "SDKCONFIG": "${sourceDir}/build/prod1/sdkconfig"
          }
        },
        {
          "name": "prod2",
          "displayName": "Product 2",
          "description": "Production configuration for product 2",
          "binaryDir": "${sourceDir}/build/prod2",
          "cacheVariables": {
            "SDKCONFIG_DEFAULTS": "sdkconfig.defaults.prod_common;sdkconfig.defaults.prod2",
            "SDKCONFIG": "${sourceDir}/build/prod2/sdkconfig"
          }
        }
      ]
    }

在 ``SDKCONFIG_DEFAULTS`` 字段中，多个 sdkconfig 默认文件以分号分隔的字符串指定。这些值按照 `ESP-IDF 文档 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/build-system.html?highlight=sdkconfig%20defaults#custom-sdkconfig-defaults>`_ 中说明的顺序加载。

创建好 ``CMakePresets.json`` 文件后：

1. 使用 **ESP-IDF: Select Project Configuration** 命令选择要使用的配置（``default``、``prod1`` 或 ``prod2``）。
2. 选择配置文件后，所选配置将显示在状态栏中。
3. 使用 **ESP-IDF: Build your Project** 命令为所选配置构建项目。你可以在每个预设的 ``binaryDir`` 字段定义的路径中观察到为每个配置生成的二进制文件。
4. 使用 **ESP-IDF: Select Project Configuration** 命令可随时在配置之间切换。

要修改、添加或删除配置文件，请直接编辑 ``CMakePresets.json`` 文件。如果要停止使用这些配置文件，请从文件中删除预设或完全删除该文件。

ESP-IDF 项目的开发和发布配置文件
--------------------------------

在此示例中，我们将创建 **development** 和 **production** 两个配置文件，并为其定义不同的构建目录和 sdkconfig 文件。

1. 前往菜单栏 ``查看`` > ``命令面板``。
2. 输入 ``ESP-IDF：保存默认 SDKCONFIG 文件 (save-defconfig)`` 并选择该命令以生成 ``sdkconfig.defaults`` 文件。此命令需 ESP-IDF v5.0 及以上版本才可使用。你也可以手动创建 ``sdkconfig.defaults`` 文件。
3. 在项目根目录下创建或编辑 ``CMakePresets.json``，使用以下结构：

.. code-block:: JSON

    {
      "version": 3,
      "cmakeMinimumRequired": {
        "major": 3,
        "minor": 21,
        "patch": 0
      },
      "configurePresets": [
        {
          "name": "production",
          "displayName": "Production",
          "description": "Production build configuration",
          "binaryDir": "${sourceDir}/build_production",
          "cacheVariables": {
            "SDKCONFIG_DEFAULTS": "sdkconfig.defaults",
            "SDKCONFIG": "${sourceDir}/build_production/sdkconfig"
          }
        },
        {
          "name": "development",
          "displayName": "Development",
          "description": "Development build configuration",
          "binaryDir": "${sourceDir}/build_dev",
          "cacheVariables": {
            "SDKCONFIG": "${sourceDir}/build_dev/sdkconfig"
          }
        }
      ]
    }

4. 创建好 ``CMakePresets.json`` 文件后，使用 **ESP-IDF: Select Project Configuration** 命令选择所需的配置文件。

5. 当你选择 **production** 配置文件并使用 **ESP-IDF: Build your Project** 命令时，系统会创建 ``/path/to/esp-project/build_production/sdkconfig`` 并在 ``/path/to/esp-project/build_production`` 中生成二进制文件。

6. 若选择 **development** 配置文件，系统会创建 ``/path/to/esp-project/build_dev/sdkconfig`` 并在 ``/path/to/esp-project/build_dev`` 中生成二进制文件。

如 :ref:`多配置教程 <multiple-configuration-tutorial>` 所示，production 配置文件可以进一步拆分为多个 production 预设。将 ``sdkconfig.defaults`` 文件拆分为通用 SDKConfig 设置文件 ``sdkconfig.prod_common`` 和产品特定设置文件 ``sdkconfig.prod1``、``sdkconfig.prod2``。在 ``CMakePresets.json`` 中，将多个 ``SDKCONFIG_DEFAULTS`` 文件指定为分号分隔的字符串（如 ``"sdkconfig.prod_common;sdkconfig.prod1"``），这些文件将按照 `ESP-IDF 文档 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/build-system.html?highlight=sdkconfig%20defaults#custom-sdkconfig-defaults>`_ 中说明的顺序加载。

从旧版项目配置格式迁移
-----------------------

如果你有一个使用旧版 ``esp_idf_project_configuration.json`` 格式的现有项目，扩展将自动检测并提供迁移到新的 ``CMakePresets.json`` 格式的选项。

**自动迁移：**

1. 当你打开一个包含现有 ``esp_idf_project_configuration.json`` 文件的项目时，扩展会提示你进行迁移。
2. 如果接受，扩展会自动将旧格式中的所有配置文件转换为 ``CMakePresets.json``。
3. 旧文件将保留在你的项目中（你可以在验证迁移后将其删除）。

**手动迁移：**

如果你更倾向于手动迁移或需要了解转换过程：

1. 旧版 ``esp_idf_project_configuration.json`` 结构按以下方式转换为 CMakePresets 格式：

   - 旧版配置文件名 → CMakePresets ``name`` 字段
   - ``build.buildDirectoryPath`` → ``binaryDir``
   - ``build.sdkconfigFilePath`` → ``cacheVariables.SDKCONFIG``
   - ``build.sdkconfigDefaults`` （数组） → ``cacheVariables.SDKCONFIG_DEFAULTS`` （分号分隔的字符串）
   - ``idfTarget`` → ``cacheVariables.IDF_TARGET``
   - ``env`` → ``environment``
   - 所有其他设置（compileArgs、ninjaArgs、flashBaudRate、monitorBaudRate、openOCD、tasks） → ``vendor["espressif/vscode-esp-idf"].settings`` 数组

2. 按照上述示例中的结构创建 ``CMakePresets.json`` 文件。
3. 将旧格式中的每个配置文件转换为新格式。
4. 验证后删除 ``esp_idf_project_configuration.json`` 文件。

.. note::
   迁移后，扩展将使用 ``CMakePresets.json`` 进行所有配置操作。旧版文件格式不再支持新的配置。

如 ESP-IDF CMake `multi_config <https://github.com/espressif/esp-idf/tree/master/examples/build_system/cmake/multi_config>`_ 示例所示，之前的 **production** 配置文件可以拆分为多个 **production** 预设。将 ``sdkconfig.defaults`` 文件拆分为通用设置文件 (``sdkconfig.prod_common``) 和产品特定设置文件 (``sdkconfig.prod1`` 和 ``sdkconfig.prod2``)。在 ``CMakePresets.json`` 中，将多个 ``SDKCONFIG_DEFAULTS`` 文件指定为分号分隔的字符串（如 ``sdkconfig.prod_common;sdkconfig.prod1``），这些文件将按照 `此处 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/build-system.html#custom-sdkconfig-defaults>`_ 说明的顺序加载。

以上只是项目配置功能的一个示例。你也可以根据其他开发场景（如测试、性能分析等）定义多个配置文件。
