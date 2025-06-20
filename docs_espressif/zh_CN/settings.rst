.. _settings:

ESP-IDF 设置
============

:link_to_translation:`en:[English]`

此扩展提供一些设置，可在 ``settings.json`` 文件中进行更新，或按照下列步骤在 VS Code 设置首选项菜单栏中更新：

- 点击 **查看** > **命令面板**。

- 输入 **首选项：打开设置 (UI)**，点击该命令，打开设置管理窗口。

.. note::

    请注意，配置此扩展时，``~``、``%VARNAME%`` 和 ``$VARNAME`` 都无法被识别。请使用 ``${env:VARNAME}`` 来设置路径中的环境变量，例如 ``${env:HOME}``。也可以通过 ``${config:SETTINGID}`` 来引用其他配置参数，例如 ``${config:idf.espIdfPath}``。

在运行 **设置乐鑫设备目标** 等命令时，**idf.saveScope** 可指定保存设置的位置。可选择将设置保存在全局（用户设置）、工作区或工作区文件夹。请使用 **选选择配置存储位置** 命令来选择保存设置的位置。

.. note::

    除非指定了作用域 (Scope)，所有设置都可以应用于全局（用户设置）、工作区或工作区文件夹。

ESP-IDF 相关设置
----------------

下表展示了 VS Code 编辑器设置中 ESP-IDF 扩展的配置选项。

.. list-table::
    :widths: 10 20
    :header-rows: 1

    * - 设置 ID
      - 描述
    * - idf.buildPath
      - 扩展命令的自定义构建目录名称（默认值：\${workspaceFolder}/build）
    * - idf.buildPathWin
      - Windows 系统中扩展命令的自定义构建目录名称（默认值：\${workspaceFolder}\\build）
    * - idf.sdkconfigFilePath
      - sdkconfig 文件的绝对路径
    * - idf.sdkconfigDefaults
      - 初始构建配置的 sdkconfig 默认值列表
    * - idf.cmakeCompilerArgs
      - CMake 编译任务的参数
    * - idf.customExtraVars
      - 要添加到系统环境变量中的变量
    * - idf.gitPath
      - git 可执行文件的路径
    * - idf.gitPathWin
      - Windows 系统中 git 可执行文件的路径
    * - idf.enableCCache
      - 在构建任务中启用 CCache（确保 CCache 在 PATH 中）
    * - idf.enableIdfComponentManager
      - 在构建命令中启用 IDF 组件管理器
    * - idf.espIdfPath
      - ESP-IDF 框架的位置路径 (IDF_PATH)
    * - idf.espIdfPathWin
      - Windows 系统中 ESP-IDF 框架的位置路径 (IDF_PATH)
    * - idf.ninjaArgs
      - Ninja 构建任务的参数
    * - idf.pythonInstallPath
      - 用于构建 ESP-IDF Python 虚拟环境的系统 Python 绝对路径
    * - idf.toolsPath
      - ESP-IDF 工具的位置路径 (IDF_TOOLS_PATH)
    * - idf.toolsPathWin
      - Windows 系统中 ESP-IDF 工具的位置路径 (IDF_TOOLS_PATH)

扩展将按照以下方式使用上述设置：

1. **idf.customExtraVars** 用于存储自定义环境变量，例如 OPENOCD_SCRIPTS，用于指定启动 OpenOCD 服务器时所需脚本文件的目录路径。这些变量会加载到扩展命令的进程环境变量中，优先使用扩展变量，如果没有，则扩展命令会尝试使用系统 PATH 中已有的设置。**该配置项不会改变 VS Code 之外的系统环境。**
2. **idf.espIdfPath**（Windows 系统中为 **idf.espIdfPathWin**）用于在扩展中存储 ESP-IDF 目录路径。如果该值已配置，则 VS Code 进程中原有的 IDF_PATH 会被覆盖。**该配置项不会改变 VS Code 之外的系统环境。** 此外，扩展使用 **idf.espIdfPath**，结合 **idf.toolsPath** 和 **idf.pythonInstallPath**，来确定要添加到环境变量 PATH 中的 ESP-IDF 工具路径和 Python 虚拟环境路径。
3. **idf.pythonInstallPath** 是系统 Python 的绝对路径，基于 **idf.toolsPath** 和 **idf.espIdfPath** 来生成 ESP-IDF Python 虚拟环境路径。创建虚拟环境后，ESP-IDF 的 Python 包将在该环境中安装和使用。
4. **idf.gitPath**（Windows 系统中为 **idf.gitPathWin**）在扩展中用于克隆 ESP-IDF master 版本及其他支持的框架，如 ESP-ADF、ESP-MDF 和 Arduino-ESP32。
5. **idf.toolsPath**（Windows 系统中为 **idf.toolsPathWin**）用于结合 **idf.toolsPath** 和 **idf.pythonInstallPath** 来确定要添加到环境变量 PATH 中的 ESP-IDF 工具路径和 Python 虚拟环境路径。

.. note::

    在 VS Code 扩展中，系统 PATH 及其他环境变量是无法修改的。在扩展的所有任务和子进程中，本扩展使用的是修改后的进程环境，且不应影响其他系统进程及扩展。请检查 **idf.customExtraVars** 的配置，以防与其他扩展发生冲突。

开发板/芯片相关设置
--------------------

以下是针对 ESP32 芯片/开发板的配置项。

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - 设置
      - 描述
    * - **idf.flashBaudRate**
      - 烧录速率
    * - **idf.monitorBaudRate**
      - 监视器速率（默认留空，通过 SDKConfig 中的 ``CONFIG_ESP_CONSOLE_UART_BAUDRATE`` 进行配置）
    * - **idf.openOcdConfigs**
      - OpenOCD 配置文件路径，相对路径基于 ``OPENOCD_SCRIPTS`` 文件夹
    * - **idf.openOcdLaunchArgs**
      - OpenOCD 启动参数，位于 ``idf.openOcdDebugLevel`` 和 ``idf.openOcdConfigs`` 之前
    * - **idf.openOcdDebugLevel**
      - 设置 OpenOCD 调试级别 (0-4)，默认值为 2
    * - **idf.port**
      - 选择设备端口的路径
    * - **idf.portWin**
      - Windows 系统中选择的设备端口路径
    * - **idf.enableSerialPortChipIdRequest**
      - 启用芯片 ID 检测功能，并在串口选择列表中显示 ID
    * - **idf.useSerialPortVendorProductFilter**
      - 启用 ``idf.usbSerialPortFilters`` 列表以过滤串口设备列表
    * - **idf.usbSerialPortFilters**
      - 用于过滤已知乐鑫设备的 USB productID 和 vendorID 列表
    * - **openocd.jtag.command.force_unix_path_separator**
      - 强制在 Windows 操作系统中使用 ``/`` 作为路径分隔符，而不是 ``\\``
    * - **idf.svdFilePath**
      - SVD 文件的绝对路径，用于解析芯片在调试器中的外设树视图
    * - **idf.jtagFlashCommandExtraArgs**
      - OpenOCD JTAG 闪存额外参数。默认值为 ["verify", "reset"]

扩展将按照以下方式使用上述设置：

1. **idf.flashBaudRate** 是用于 **ESP-IDF：烧录项目** 命令和 `Debugging <https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/debugproject.html>`_ 的烧录速率。
2. **idf.monitorBaudRate** 是 ESP-IDF 监视器的波特率值，默认会回退到项目的 sdkconfig 配置项 ``CONFIG_ESPTOOLPY_MONITOR_BAUD``（即 idf.py monitor 命令的波特率）。也可以通过设置 ``IDF_MONITOR_BAUD`` 或 ``MONITORBAUD`` 环境变量，或者通过扩展的 **idf.customExtraVars** 配置项来覆盖此值。
3. **idf.openOcdConfigs** 用于存储一个字符串数组，其中每个字符串都代表相对于 OpenOCD 脚本目录的配置文件路径。这些配置文件将被用来设置 OpenOCD 服务器，例如：``["interface/ftdi/esp32_devkitj_v1.cfg", "board/esp32-wrover.cfg"]``。详情请参阅 `OpenOCD JTAG 目标配置 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/jtag-debugging/tips-and-quirks.html#jtag-debugging-tip-openocd-configure-target>`_。
4. **idf.port** （Windows 系统中为 **idf.portWin**）用作扩展命令的串口值。
5. **idf.openOcdDebugLevel** 是 OpenOCD 服务器输出的日志级别，范围为 0 到 4。
6. **idf.openOcdLaunchArgs** 是用于配置 OpenOCD 启动的参数字符串数组。生成的 OpenOCD 启动命令格式如下：``openocd -d${idf.openOcdDebugLevel} -f ${idf.openOcdConfigs} ${idf.openOcdLaunchArgs}``。
7. **idf.jtagFlashCommandExtraArgs** 用于OpenCD JTAG闪存任务。请查看 `上传待调试的应用程序 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/jtag-debugging/index.html#jtag-upload-app-debug>`.

.. note::

    * 使用 **ESP-IDF：设置乐鑫设备目标** 命令时，当前 sdkconfig 文件中的 IDF_TARGET 配置项将被选中的芯片所覆盖，并将 **idf.openOcdConfigs** 设置为芯片默认的 OpenOCD 配置文件。
    * 如果只想自定义 **idf.openOcdConfigs**，可以使用 **ESP-IDF：选择 OpenOCD 开发板配置** 命令，或直接修改 ``settings.json`` 文件。

代码覆盖率相关设置
------------------

以下列表展示了代码覆盖率的颜色配置。

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - 设置 ID
      - 描述
    * - **idf.coveredLightTheme**
      - 浅色主题下 gcov 代码覆盖率报告中覆盖行的背景颜色
    * - **idf.coveredDarkTheme**
      - 深色主题下 gcov 代码覆盖率报告中覆盖行的背景颜色
    * - **idf.partialLightTheme**
      - 浅色主题下 gcov 代码覆盖率报告中部分覆盖行的背景颜色
    * - **idf.partialDarkTheme**
      - 深色主题下 gcov 代码覆盖率报告中部分覆盖行的背景颜色
    * - **idf.uncoveredLightTheme**
      - 浅色主题下 gcov 代码覆盖率报告中未覆盖行的背景颜色
    * - **idf.uncoveredDarkTheme**
      - 深色主题下 gcov 代码覆盖率报告中未覆盖行的背景颜色


PyTest 相关设置
---------------

以下设置用于配置 PyTest 单元测试。

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - 设置 ID
      - 描述
    * - **idf.unitTestFilePattern**
      - 用于发现单元测试文件的 glob 模式（默认值：``**/test/test_*.c``）
    * - **idf.pyTestEmbeddedServices**
      - pytest 执行的内嵌服务列表（默认值：``["esp", "idf"]``）

扩展将按照以下方式使用上述设置：

1. **idf.unitTestFilePattern** 用于扩展在项目中发现单元测试文件。默认模式 ``**/test/test_*.c`` 会在任何 "test" 目录中查找以 "test_" 开头的 C 文件。
2. **idf.pyTestEmbeddedServices** 指定运行 pytest 命令时使用的内嵌服务。这些服务会作为 ``--embedded-services`` 参数传递给 pytest 命令。


扩展行为设置
------------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - 设置 ID
      - 描述
    * - **idf.enableUpdateSrcsToCMakeListsFile**
      - 启用在 ``CMakeLists.txt`` 文件中更新源文件的功能（该选项默认启用）
    * - **idf.flashType**
      - 首选烧录方法：DFU、UART 或 JTAG
    * - **idf.flashPartitionToUse**
      - 在构建和烧录过程中指定要烧录的分区。默认值为 ``all``
    * - **idf.launchMonitorOnDebugSession**
      - 在 ESP-IDF 调试会话中启动 ESP-IDF 监视器
    * - **idf.notificationMode**
      - ESP-IDF 扩展通知和输出专注模式。（默认全部启用）
    * - **idf.showOnboardingOnInit**
      - 在激活扩展时显示 ESP-IDF 配置窗口
    * - **idf.saveScope**
      - 保存扩展设置的位置
    * - **idf.saveBeforeBuild**
      - 在构建之前保存所有编辑的文件（该选项默认启用）
    * - **idf.useIDFKconfigStyle**
      - 启用 Kconfig 文件的样式验证
    * - **idf.telemetry**
      - 启用遥测
    * - **idf.deleteComponentsOnFullClean**
      - 在执行 **Full Clean Project** 命令时删除 ``managed_components`` （该选项默认启用）
    * - **idf.monitorNoReset**
      - 启用 IDF 监视器的不重置标志（该选项默认禁用）
    * - **idf.monitorEnableTimestamps**
      - 启用 IDF 监视器中的时间戳（该选项默认禁用）
    * - **idf.monitorCustomTimestampFormat**
      - 在 IDF 监视器中自定义时间戳格式
    * - **idf.monitorDelay**
      - 在执行 IDF 监视器或中断监视器会话后启动调试会话的延迟（毫秒）。
    * - **idf.enableStatusBar**
      - 显示或隐藏扩展状态栏项目
    * - **idf.enableSizeTaskAfterBuildTask**
      - 在完成 IDF 构建任务后执行 IDF 计算程序大小任务
    * - **idf.customTerminalExecutable**
      - 指定要使用的 shell 终端可执行文件的绝对路径（默认使用 VS Code 终端）
    * - **idf.customTerminalExecutableArgs**
      - idf.customTerminalExecutable 的 shell 参数


自定义构建和烧录任务
--------------------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - 设置 ID
      - 描述
    * - **idf.customTask**
      - 通过 **ESP-IDF: Execute Custom Task** 命令执行的自定义任务
    * - **idf.preBuildTask**
      - 在构建任务之前执行的命令字符串
    * - **idf.postBuildTask**
      - 在构建任务之后执行的命令字符串
    * - **idf.preFlashTask**
      - 在烧录任务之前执行的命令字符串
    * - **idf.postFlashTask**
      - 在烧录任务之后执行的命令字符串


QEMU 相关设置
-------------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - 设置 ID
      - 描述
    * - **idf.qemuDebugMonitor**
      - 在调试会话中启用 QEMU 显示器
    * - **idf.qemuExtraArgs**
      - QEMU 额外的论点


日志追踪相关设置
----------------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - 设置
      - 描述
    * - **trace.poll_period**
      - 设置 apptrace 的 poll_period 参数
    * - **trace.trace_size**
      - 设置 apptrace 的 trace_size 参数
    * - **trace.stop_tmo**
      - 设置 apptrace 的 stop_tmo 参数
    * - **trace.wait4halt**
      - 设置 apptrace 的 wait4halt 参数
    * - **trace.skip_size**
      - 设置 apptrace 的 skip_size 参数


其他框架的相关设置
------------------

通过以下设置，可同时使用 ESP-IDF 及其他框架：

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - 设置 ID
      - 描述
    * - **idf.espAdfPath**
      - 定位 ESP-ADF 框架的路径 (ADF_PATH)
    * - **idf.espAdfPathWin**
      - 在 Windows 系统中定位 ESP-ADF 框架的路径 (ADF_PATH)
    * - **idf.espMdfPath**
      - 定位 ESP-MDF 框架的路径 (MDF_PATH)
    * - **idf.espMdfPathWin**
      - 在 Windows 系统中定位 ESP-MDF 框架的路径 (MDF_PATH)
    * - **idf.espMatterPath**
      - 定位 ESP-Matter 框架的路径 (ESP_MATTER_PATH)
    * - **idf.espRainmakerPath**
      - 定位 ESP-Rainmaker 框架的路径 (RMAKER_PATH)
    * - **idf.espRainmakerPathWin**
      - 在 Windows 系统中定位 ESP-Rainmaker 框架的路径 (RMAKER_PATH)
    * - **idf.sbomFilePath**
      - 创建 ESP-IDF SBOM 报告的路径


在 ESP-IDF ``settings.json`` 和 ``tasks.json`` 中使用环境变量
-------------------------------------------------------------

环境变量 (env) 和其他 ESP-IDF 设置 (config) 可以在 ESP-IDF 设置中通过 ``${env:VARNAME}`` （用于环境变量）和 ``${config:ESPIDFSETTING}`` （用于设置）进行引用。

例如，如果想要使用 ``"~/esp/esp-idf"``，可以将 **idf.espIdfPath** 设为 ``"${env:HOME}/esp/esp-idf"``。
