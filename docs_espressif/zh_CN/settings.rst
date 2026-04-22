.. _settings:

ESP-IDF 设置
============

:link_to_translation:`en:[English]`

Visual Studio Code 允许你在不同级别配置设置：**全局（用户设置）**、**工作区**和**工作区文件夹**。请确保项目使用正确的设置。

1.  工作区文件夹配置定义在 ``${workspaceFolder}/.vscode/settings.json``
2.  工作区配置定义在工作区的 ``<name>.code-workspace`` 文件中
3.  用户设置定义在 ``settings.json`` 中

    - **Windows**：``%APPDATA%\Code\User\settings.json``
    - **MacOS**：``$HOME/Library/Application Support/Code/User/settings.json``
    - **Linux**：``$HOME/.config/Code/User/settings.json``

本扩展使用 **idf.saveScope** 配置项（仅可在用户设置中定义）来指定保存设置的位置（例如设置向导）。可使用 **ESP-IDF：选择配置存储位置** 命令进行修改。

可通过以下方式在 ``settings.json`` 或 VS Code 设置首选项菜单中更新本扩展提供的设置：

- 点击 **查看** > **命令面板**。

- 搜索 **首选项：打开用户设置 (JSON)**、**首选项：打开工作区设置 (JSON)** 或 **首选项：打开设置 (UI)**，选择相应命令打开设置窗口。

.. note::

    请注意，配置此扩展时，``~``、``%VARNAME%`` 和 ``$VARNAME`` 都无法被识别。请使用 ``${env:VARNAME}`` 来设置路径中的环境变量，例如 ``${env:HOME}``。也可以通过 ``${config:SETTINGID}`` 来引用其他配置参数，例如 ``${config:idf.buildPath}``。

.. note::

    除非指定了作用域 (Scope)，所有设置都可以应用于全局（用户设置）、工作区或工作区文件夹。

设置分组与 VS Code 设置界面（及 ``package.json``）中的类别一致：

设置与安装
----------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - 设置 ID
      - 描述
    * - **idf.eimIdfJsonPath**
      - ESP-IDF 安装管理器 (EIM) ``eim_idf.json`` 文件路径。作用域：Application。
    * - **idf.eimExecutableArgs**
      - EIM 可执行文件参数（默认：``["gui", "--idf-features ide"]``）。该值会由扩展根据检测到的 EIM 启动模式自动更新。作用域：Application。
    * - **idf.currentSetup**
      - 当前 ESP-IDF 设置标识。作用域：Resource。
    * - **idf.gitPath**
      - Git 可执行文件路径（默认：``/usr/bin/git``）。作用域：Application。
    * - **idf.gitPathWin**
      - Windows 下 Git 可执行文件路径（默认：``${env:programfiles}\\Git\\cmd\\git.exe``）。作用域：Application。
    * - **idf.extensionActivationMode**
      - 控制扩展激活模式：``"detect"``（默认）、``"always"`` 或 ``"never"``。

**idf.gitPath**（Windows 下为 **idf.gitPathWin**）在扩展中用于克隆 ESP-IDF 或 ESP-ADF、ESP-MDF、Arduino-ESP32 等支持的框架。

串口
----

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - 设置 ID
      - 描述
    * - **idf.port**
      - 所选设备端口路径（默认：``detect``）。作用域：Resource。
    * - **idf.portWin**
      - Windows 下所选设备端口路径（默认：``detect``）。作用域：Resource。
    * - **idf.monitorPort**
      - 监视器所用设备端口（可选）。未设置时使用 **idf.port**。作用域：Resource。
    * - **idf.flashBaudRate**
      - 烧录波特率（默认：``460800``）。用于 **ESP-IDF：烧录项目** 及调试。作用域：Resource。
    * - **idf.monitorBaudRate**
      - 监视器波特率。默认留空以使用 sdkconfig 中的 ``CONFIG_ESP_CONSOLE_UART_BAUDRATE``。作用域：Resource。
    * - **idf.enableSerialPortChipIdRequest**
      - 启用芯片 ID 检测并在串口选择列表中显示。作用域：Application。
    * - **idf.useSerialPortVendorProductFilter**
      - 使用 **idf.usbSerialPortFilters** 过滤串口设备列表。作用域：Application。
    * - **idf.usbSerialPortFilters**
      - 用于过滤已知乐鑫设备的 USB productId 与 vendorId 映射。作用域：Application。
    * - **idf.serialPortDetectionTimeout**
      - 使用 esptool.py 检测串口的超时时间（秒）（默认：60）。作用域：Resource。

烧录
----

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - 设置 ID
      - 描述
    * - **idf.openOcdConfigs**
      - OpenOCD 配置文件，相对于 ``OPENOCD_SCRIPTS``。若已设置 **idf.openOcdLaunchArgs** 则此项被忽略。作用域：Resource。
    * - **idf.flashType**
      - 首选烧录方式：``UART``、``JTAG`` 或 ``DFU``。作用域：Resource。
    * - **idf.flashPartitionToUse**
      - 构建与烧录时烧录的分区（默认：``all``）。可选：``all``、``app``、``bootloader``、``partition-table``。作用域：Resource。
    * - **idf.jtagFlashCommandExtraArgs**
      - OpenOCD JTAG 烧录额外参数（默认：``["verify", "compress", "skip_loaded", "reset"]``）。作用域：Resource。
    * - **idf.preFlashTask**
      - 烧录前执行的命令字符串。作用域：Resource。
    * - **idf.postFlashTask**
      - 烧录后执行的命令字符串。作用域：Resource。

.. note::

    使用 **ESP-IDF：设置乐鑫设备目标** 时，扩展会覆盖当前 sdkconfig 的 ``IDF_TARGET`` 并用默认 OpenOCD 配置更新 **idf.openOcdConfigs**。若仅需自定义 **idf.openOcdConfigs**，可使用 **ESP-IDF：选择 OpenOCD 开发板配置** 或直接编辑 ``settings.json``。

构建
----

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - 设置 ID
      - 描述
    * - **idf.buildPath**
      - 扩展命令使用的构建目录（默认：``${workspaceFolder}/build``）。作用域：Resource。
    * - **idf.buildPathWin**
      - Windows 下构建目录（默认：``${workspaceFolder}\\build``）。作用域：Resource。
    * - **idf.cmakeCompilerArgs**
      - CMake 配置参数（默认含 ``-G Ninja``、``-DPYTHON_DEPS_CHECKED=1``、``-DESP_PLATFORM=1``）。作用域：Resource。
    * - **idf.sdkconfigDefaults**
      - 初始构建配置的 sdkconfig 默认值列表。作用域：Resource。
    * - **idf.ninjaArgs**
      - Ninja 构建任务参数。作用域：Resource。
    * - **idf.customExtraVars**
      - 键值对象，将环境变量加入扩展命令进程（如 ``OPENOCD_SCRIPTS``）。不修改 VS Code 外的系统环境。作用域：Resource。
    * - **idf.useIDFKconfigStyle**
      - 启用 Kconfig 文件样式验证。作用域：Resource。
    * - **idf.saveBeforeBuild**
      - 构建前保存所有已编辑文件（默认：``true``）。作用域：Resource。
    * - **idf.enableCCache**
      - 在构建任务中启用 CCache（需确保 CCache 在 PATH 中）。作用域：Resource。
    * - **idf.extraCleanPaths**
      - **完全清理项目** 时额外删除的路径（默认：``[]``）。例如 ``["managed_components", "dependencies.lock"]``。作用域：Resource。
    * - **idf.sdkconfigFilePath**
      - sdkconfig 文件绝对路径。作用域：Resource。
    * - **idf.enableSizeTaskAfterBuildTask**
      - 在 IDF 构建任务后执行 IDF 大小任务（默认：``true``）。作用域：Resource。
    * - **idf.preBuildTask**
      - 构建前执行的命令字符串。作用域：Resource。
    * - **idf.postBuildTask**
      - 构建后执行的命令字符串。作用域：Resource。

调试与 OpenOCD
--------------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - 设置 ID
      - 描述
    * - **openocd.tcl.host**
      - OpenOCD TCL 服务器主机（默认：``localhost``）。作用域：Resource。
    * - **openocd.tcl.port**
      - OpenOCD TCL 服务器端口（默认：``6666``）。作用域：Resource。
    * - **openocd.jtag.command.force_unix_path_separator**
      - 在 Win32 上强制使用 ``/`` 作为路径分隔符（默认：``true``）。
    * - **idf.launchMonitorOnDebugSession**
      - 启动 ESP-IDF 调试会话时同时启动 ESP-IDF 监视器（默认：``false``）。作用域：Resource。
    * - **idf.openOcdDebugLevel**
      - OpenOCD 调试级别 0–4（默认：2）。0 仅错误，4 为详细。设置 **idf.openOcdLaunchArgs** 时此项无效。作用域：Resource。
    * - **idf.openOcdLaunchArgs**
      - OpenOCD 自定义参数。若已设置，则 **idf.openOcdConfigs** 与 **idf.openOcdDebugLevel** 被忽略。否则命令形式为：``openocd -d${idf.openOcdDebugLevel} -f ${idf.openOcdConfigs}``。作用域：Resource。
    * - **idf.svdFilePath**
      - 芯片调试外设树视图的 SVD 文件路径（默认：``${workspaceFolder}/esp32.svd``）。作用域：Resource。

监视器
------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - 设置 ID
      - 描述
    * - **idf.monitorDelay**
      - 在 IDF 监视器运行或中断监视器后，启动调试会话前的延迟（毫秒）（默认：1000）。作用域：Resource。
    * - **idf.monitorNoReset**
      - 为 IDF 监视器启用 no-reset 标志（默认：``false``）。作用域：Resource。
    * - **idf.monitorEnableTimestamps**
      - 在 IDF 监视器中启用时间戳（默认：``false``）。作用域：Resource。
    * - **idf.monitorCustomTimestampFormat**
      - IDF 监视器自定义时间戳格式。作用域：Resource。

应用跟踪
--------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - 设置 ID
      - 描述
    * - **trace.poll_period**
      - apptrace 的 poll_period。作用域：Resource。
    * - **trace.trace_size**
      - apptrace 的 trace_size（默认：2048）。作用域：Resource。
    * - **trace.stop_tmo**
      - apptrace 的 stop_tmo（默认：3）。作用域：Resource。
    * - **trace.wait4halt**
      - apptrace 的 wait4halt（0 或 1，默认：0）。作用域：Resource。
    * - **trace.skip_size**
      - apptrace 的 skip_size（默认：0）。作用域：Resource。

任务与终端
----------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - 设置 ID
      - 描述
    * - **idf.customTask**
      - **ESP-IDF：执行自定义任务** 使用的自定义任务命令。作用域：Resource。
    * - **idf.customTerminalExecutable**
      - 扩展终端使用的 shell 可执行文件绝对路径（默认使用 VS Code 默认）。作用域：Resource。
    * - **idf.customTerminalExecutableArgs**
      - **idf.customTerminalExecutable** 的参数。作用域：Resource。

界面与通知
----------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - 设置 ID
      - 描述
    * - **idf.showOnboardingOnInit**
      - 扩展激活时显示 ESP-IDF 配置/入门窗口（默认：``true``）。作用域：Window。
    * - **idf.hasWalkthroughBeenShown**
      - 是否已显示过入门演练。作用域：Application。
    * - **idf.notificationMode**
      - 通知与输出焦点模式：``Silent``、``Notifications``、``Output``、``All``（默认：``All``）。作用域：Resource。
    * - **idf.saveScope**
      - 扩展设置保存位置：全局 (1)、工作区 (2)、工作区文件夹 (3)。仅作用域：Application。
    * - **idf.enableStatusBar**
      - 显示或隐藏扩展状态栏项（默认：``true``）。作用域：Resource。
    * - **idf.enableUpdateSrcsToCMakeListsFile**
      - 启用在 ``CMakeLists.txt`` 中更新源文件（默认：``true``）。作用域：Window。

遥测
----

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - 设置 ID
      - 描述
    * - **idf.telemetry**
      - 启用遥测（默认：``true``）。

ESP Rainmaker 设置
------------------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - 设置 ID
      - 描述
    * - **esp.rainmaker.api.server_url**
      - ESP Rainmaker API 服务器 URL（默认：``https://api.rainmaker.espressif.com/v1/``）。作用域：Resource。
    * - **esp.rainmaker.oauth.url**
      - ESP Rainmaker OAuth URL（默认：``https://auth.rainmaker.espressif.com/oauth2/authorize``）。作用域：Resource。

覆盖率
------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - 设置 ID
      - 描述
    * - **idf.coveredLightTheme**
      - gcov 覆盖率中已覆盖行背景色（浅色主题）（默认：``rgba(0,128,0,0.1)``）。作用域：Resource。
    * - **idf.coveredDarkTheme**
      - gcov 覆盖率中已覆盖行背景色（深色主题）（默认：``rgba(0,128,0,0.1)``）。作用域：Resource。
    * - **idf.partialLightTheme**
      - 部分覆盖行背景色（浅色主题）（默认：``rgba(250,218,94,0.1)``）。作用域：Resource。
    * - **idf.partialDarkTheme**
      - 部分覆盖行背景色（深色主题）（默认：``rgba(250,218,94,0.1)``）。作用域：Resource。
    * - **idf.uncoveredLightTheme**
      - 未覆盖行背景色（浅色主题）（默认：``rgba(255,0,0,0.1)``）。作用域：Resource。
    * - **idf.uncoveredDarkTheme**
      - 未覆盖行背景色（深色主题）（默认：``rgba(255,0,0,0.1)``）。作用域：Resource。

组件管理器
----------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - 设置 ID
      - 描述
    * - **idf.enableIdfComponentManager**
      - 在构建命令中启用 IDF 组件管理器（默认：``false``）。作用域：Resource。
    * - **esp.component-manager.url**
      - ESP 组件注册表 URL（默认：``https://components.espressif.com``）。作用域：Resource。

QEMU 设置
---------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - 设置 ID
      - 描述
    * - **idf.qemuDebugMonitor**
      - 在调试会话中启用 QEMU 监视器（默认：``true``）。作用域：Resource。
    * - **idf.qemuExtraArgs**
      - QEMU 额外参数。作用域：Resource。

单元测试
--------

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - 设置 ID
      - 描述
    * - **idf.unitTestFilePattern**
      - 发现单元测试文件的 glob 模式（默认：``**/test/test_*.c``）。作用域：Resource。

其他
----

.. list-table::
    :widths: 25 75
    :header-rows: 1

    * - 设置 ID
      - 描述
    * - **idf.wssPort**
      - WebSocket 服务器端口（默认：49203，范围 49152–65535）。作用域：Resource。
    * - **idf.sbomFilePath**
      - ESP-IDF SBOM 报告路径（默认：``espidf.spdx``）。作用域：Resource。
    * - **idf.imageViewerConfigs**
      - 图像查看器自定义图像格式配置 JSON 路径（相对工作区或绝对路径）。作用域：Resource。

在 ESP-IDF ``settings.json`` 中使用环境变量及引用其他 ESP-IDF 设置
------------------------------------------------------------------

在 ESP-IDF 设置中可使用 ``${env:VARNAME}`` 引用环境变量，使用 ``${config:ESPIDFSETTING}`` 引用其他 ESP-IDF 设置。

也可使用 ``${config:ESPIDFSETTING,prefix}`` 在引用结果前添加前缀。例如 ``${config:idf.openOcdConfigs,-f}`` 会在 **idf.openOcdConfigs** 的每个字符串前加 ``-f``。
若 ``"idf.openOcdConfigs": ["interface/some.cfg", "target/some.cfg"]``，则得到 ``-finterface/some.cfg -ftarget/some.cfg``。

例如，要使用 ``"~/workspace/blink"``，可设为 ``"${env:HOME}/workspace/blink"``。
