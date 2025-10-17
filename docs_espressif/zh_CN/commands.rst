可用命令列表
============

:link_to_translation:`en:[English]`

所有命令均以 ``ESP-IDF：`` 开头。

.. list-table::
   :header-rows: 1

   * - 命令
     - 描述
   * - 添加 Arduino ESP32 为 ESP-IDF 组件
     - 将 `Arduino-ESP32 <https://github.com/espressif/arduino-esp32>`_ 添加为当前目录中的 ESP-IDF 组件 (**${CURRENT_DIRECTORY}/components/arduino**)。
   * - 添加 Docker 容器配置
     - 将 **.devcontainer** 文件添加到当前打开的项目目录中。借助 `Dev Containers <https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers>`_ 扩展在 Docker 容器中使用 ESP-IDF 项目。
   * - 添加编辑器覆盖率
     - 解析项目的 `GCOV 代码覆盖率 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/app_trace.html#gcov>`_ 文件，并在源代码文件中用彩色高亮代码覆盖行。
   * - 添加 VS Code 配置文件夹
     - 将 **.vscode** 文件添加到当前打开的项目目录中。这些文件包括 launch.json（用于调试）、settings.json 和 c_cpp_properties.json（用于语法高亮）。
   * - 构建、烧录项目并监视设备
     - 此命令可用于构建项目、将二进制程序写入设备，并启动监视终端，效果类似于 ``idf.py build flash monitor``。
   * - 构建项目
     - 使用 ``CMake`` 和 ``Ninja-build`` 来构建项目，具体说明请参见 `ESP-IDF 构建系统直接使用 CMake <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/build-system.html#cmake>`_。若想修改构建任务的行为，可以在配置 Cmake 时使用 **idf.cmakeCompilerArgs** 命令，或在配置 Ninja 时使用 **idf.ninjaArgs** 命令。例如，可以使用 **[-j N]** 来设置并行作业数，其中 N 是并行作业的数量。
   * - 清除 eFuse 摘要
     - 从 ESP-IDF 资源管理器的 EFUSEEXPLORER 中清除 eFuse 摘要集。
   * - 清除 ESP-IDF 搜索结果
     - 从 ESP-IDF 资源管理器 ``文档搜索结果`` 选项卡中清除所有搜索结果。
   * - 清除已保存的 ESP-IDF 设置
     - 清除扩展中保留的现有 ESP-IDF 设置。
   * - 配置 ESP-IDF 扩展
     - 打开一个带有安装向导的窗口，可以安装 ESP-IDF、IDF 工具和 Python 虚拟环境。
   * - 配置 SDKConfig 文件以启用代码覆盖率
     - 在项目的 SDKConfig 文件中设置必要的值，启用代码覆盖率分析。
   * - 创建新 ESP-IDF 组件
     - 在当前目录下，基于 ESP-IDF 组件模板创建新组件。
   * - 创建新的空项目
     - 询问新项目名称，选择创建项目的目录，并显示通知以打开新创建的项目。
   * - 清理当前 SDK 配置编辑器服务器进程
     - 若先前执行过 ``SDK 配置编辑器`` 命令，则后台将保留缓存进程，以便下次更快打开编辑器。此命令将清理此类缓存进程。
   * - 诊断命令
     - 诊断扩展设置及扩展日志，提供故障排除报告。
   * - 故障排除表单
     - 启动 UI，以便用户发送故障排除报告，报告中需包含重现问题的步骤。同时系统将诊断扩展设置及扩展日志，并将信息发送到遥测后端。
   * - 加密并烧录项目
     - 执行项目烧录，同时为需要加密的分区添加 **--encrypt**。
   * - 擦除设备 flash 数据
     - 执行 ``esptool.py erase_flash`` 命令，擦除 flash，将芯片重置为 0xFF 字节。
   * - 执行自定义任务
     - 用户可以自定义 **idf.customTask** 中的命令行命令或脚本，并通过此命令执行。
   * - 烧录项目
     - 将当前项目生成的二进制文件烧录至目标设备。此命令将根据 **idf.flashType** 使用 UART、DFU 或 JTAG。
   * - 通过 DFU 接口烧录项目
     - 通过 DFU，将当前 ESP-IDF 项目的二进制文件写入 flash 芯片，此方案仅适用于 ESP32-S2 和 ESP32-S3。
   * - 通过 UART 接口烧录项目
     - 通过 esptool.py，将当前 ESP-IDF 项目的二进制文件写入 flash 芯片。
   * - 通过 JTAG 接口烧录项目
     - 通过 OpenOCD JTAG，将当前 ESP-IDF 项目的二进制文件写入 flash 芯片。
   * - 完全清理项目
     - 删除当前 ESP-IDF 项目的构建目录。
   * - 获取 eFuse 摘要
     - 从当前连接到串口的芯片中获取 eFuse 列表及其对应的数值。
   * - 生成 HTML 格式的代码覆盖率报告
     - 解析项目的 `GCOV 代码覆盖率 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/app_trace.html#gcov>`_ 文件，生成 HTML 格式的覆盖率报告。
   * - 导入 ESP-IDF 项目
     - 导入现有的 ESP-IDF 项目，在新位置添加 .vscode 和 .devcontainer 文件，同时可以重命名项目。
   * - 安装 ESP-ADF
     - 在所选目录中克隆 ESP-ADF，并配置 **idf.espAdfPath**（Windows 系统中为 **idf.espAdfPathWin**）。
   * - 安装 ESP-IDF Python 包（已弃用）
     - 安装扩展 Python 包。本命令已弃用，即将被移除。
   * - 安装 ESP-MDF
     - 在所选目录中克隆 ESP-MDF，并配置 **idf.espMdfPath**（Windows 系统中为 **idf.espMdfPathWin**）。
   * - 安装 ESP-Matter
     - 克隆 ESP-Matter 并设置 **idf.espMatterPath**。ESP-Matter 不支持 Windows。
   * - 安装 ESP-Rainmaker
     - 克隆 ESP-Rainmaker，并配置 **idf.espRainmakerPath**（Windows 系统中为 **idf.espRainmakerPathWin**）。
   * - 安装 ESP-HomeKit-SDK
     - 在所选目录中克隆 ESP-HomeKit-SDK，并配置 **idf.espHomeKitSdkPath**（Windows 系统中为 **idf.espHomeKitSdkPathWin**）。
   * - 启动 IDF 监视器以支持 Core Dump 模式/GDB Stub 模式
     - 启动支持 WebSocket 的 ESP-IDF 监控器。如果紧急处理程序已经配置为 gdbstub 或核心转储，监控器将启动芯片的事后调试会话。
   * - 启动 QEMU 服务器
     - 如 :ref:`QEMU 文档 <qemu>` 中所述，此命令将启动终端，通过使用项目的 Dockerfile 和二进制文件来监视 ESP32 QEMU。
   * - 启动 QEMU 调试会话
     - 如 :ref:`QEMU 文档 <qemu>` 中所述，此命令将使用项目的 Dockerfile 和二进制文件启动 ESP32 QEMU 的调试会话。
   * - 监控设备
     - 该命令将执行 ``idf.py monitor``，启动计算机与乐鑫设备之间的串行通信。详情请参阅 `IDF 监视器 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/tools/idf-monitor.html?highlight=monitor>`_。
   * - 监视 QEMU 设备
     - 如 :ref:`QEMU 文档 <qemu>` 中所述，此命令将启动终端，通过使用项目的 Dockerfile 和二进制文件来监视 ESP32 QEMU。
   * - 新建项目
     - 启动 UI，通过 ESP-IDF 项目创建向导，使用 ESP-IDF 中的示例模板和扩展中配置的其他框架。
   * - NVS 分区编辑器
     - 启动 UI，创建 `ESP-IDF 非易失性存储库 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-reference/storage/nvs_flash.html>`_ 的 CSV 文件。
   * - 打开 ESP-IDF 终端
     - 打开一个终端，并激活 IDF_PATH 和 Python 虚拟环境。
   * - 分区表编辑器
     - 启动 UI，如 `ESP-IDF 分区表 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/partition-tables.html>`_ 中所述，管理自定义分区表。
   * - 选择工作区文件夹
     - 在使用包含多个工作区文件夹的 VS Code 工作区时，此命令会让此扩展的命令应用于指定文件夹。详情请参阅 :ref:`处理多个项目 <multiple projects>`。
   * - 移除编辑器覆盖率
     - 移除因 **添加编辑器覆盖率** 命令而产生的彩色高亮代码行。
   * - 运行 idf.py reconfigure 任务
     - 此命令将执行 **idf.py reconfigure** （CMake 配置任务），能够帮助生成 compile_commands.json 文件以支持 C/C++ 语言特性。
   * - 运行 ESP-IDF-SBOM 漏洞检查
     - 为使用 ESP-IDF 开发框架生成的应用程序创建 SPDX 格式的软件物料清单（SBOM）文件。
   * - 保存默认 SDKCONFIG 文件 (save-defconfig)
     - 使用当前项目的 sdkconfig 文件，生成 sdkconfig.defaults 文件。
   * - SDK 配置编辑器
     - 启动 UI，进行 ESP-IDF 项目设置。该命令效果等同于 **idf.py menuconfig**。
   * - 在文档中搜索…
     - 从源代码文件中选择文本，并在 ESP-IDF 文档中进行搜索，搜索结果将显示在 VS Code ESP-IDF 资源管理器选项卡中。
   * - 搜索错误提示
     - 输入文本，在 ESP-IDF 提示库中搜索匹配的错误。
   * - 选择烧录方式
     - 选择用于 **烧录项目** 命令的烧录方法，可选择 DFU、JTAG 或 UART 接口。
   * - 选择要使用的端口
     - 选择用于 ESP-IDF 任务（如烧录或监视设备）的串口。
   * - 选择 OpenOCD 开发板配置
     - 选择与使用的乐鑫设备目标相匹配的 OpenOCD 配置文件。例如，可以选择 DevKitC 或 ESP-Wrover-Kit。使用 JTAG 接口进行烧录或对设备进行调试时，此步骤必不可缺。
   * - 选择配置存储位置
     - VS Code 中的设置可存储在三处：用户设置（全局设置）、工作区（.code-workspace 文件）或工作区文件夹（.vscode/settings.json）。
   * - 选择输出和通知模式
     - 此扩展会在输出窗口 <strong>ESP-IDF</strong> 中显示通知和输出。此命令可设置是否只显示通知、只显示输出、两者都显示或都不显示。
   * - 设置乐鑫设备目标
     - 该命令为当前项目设置目标 (IDF_TARGET)，效果等同于 **idf.py set-target**。例如，若想使用 ESP32 或 ESP32-C3，则需执行此命令。
   * - 设置 ESP-MATTER 设备路径 (ESP_MATTER_DEVICE_PATH)
     - **ESP-IDF：设置 ESP-MATTER 设备路径 (ESP_MATTER_DEVICE_PATH)** 命令用于定义 ESP-Matter 的设备路径。Windows 系统不支持 ESP-Matter。
   * - 展示示例项目
     - 启动 UI 以显示所选框架的示例，可从中创建新项目。此命令将显示扩展中已配置的框架，如果想查看 ESP-Rainmaker 示例，需要先运行 **安装 ESP-Rainmaker** 命令（或设置相应的 idf.espRainmakerPath），然后执行此命令以查看示例。
   * - 显示 Ninja 构建摘要
     - 运行 Chromium ninja-build-summary.py。
   * - 二进制文件大小分析
     - 启动 UI 以显示 ESP-IDF 项目的二进制文件大小信息。
   * - 单元测试：构建单元测试应用程序
     - 构建当前项目的单元测试应用程序。详情请参阅 :ref:`单元测试 <unit testing>`。
   * - 单元测试：烧录单元测试应用程序
     - 将当前项目的单元测试应用程序烧录到连接的设备上。详情请参阅 :ref:`单元测试 <unit testing>`。
   * - 单元测试：构建并烧录单元测试应用程序
     - 复制当前项目中的单元测试应用程序，构建当前项目并将单元测试应用程序烧录到连接的设备上。详情请参阅 :ref:`单元测试 <unit testing>`。
