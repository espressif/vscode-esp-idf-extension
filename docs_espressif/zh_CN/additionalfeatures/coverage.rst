代码覆盖率
==========

:link_to_translation:`en:[English]`

源代码覆盖率提供了程序运行时每条执行路径的执行次数和频率数据。`GCOV <https://en.wikipedia.org/wiki/Gcov>`_ 是一个 GCC 工具，配合编译器使用时，可生成日志文件，显示每一行源代码的执行次数。

使用 ``gcov``，配置 ESP-IDF 项目生成 ``gcda/gcno`` 覆盖率文件。请参阅 `GCOV 代码覆盖率 <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/app_trace.html#gcov-source-code-coverage>`_，以详细了解如何在 ESP-IDF 项目中使用 GCOV 的代码覆盖率功能。

可使用 ``ESP-IDF：配置 SDKConfig 文件以启用代码覆盖率`` 命令在 SDK 配置编辑器中设置所需配置。


代码覆盖率示例
--------------

本教程将围绕 ESP-IDF `GCOV 示例 <https://github.com/espressif/esp-idf/tree/master/examples/system/gcov>`_ 展开说明。

1.  前往菜单栏 ``查看`` > ``命令面板``。

2.  输入 ``ESP-IDF：新建项目`` 并选择要使用的 ESP-IDF 版本。

    .. note::

	    如果未看到该选项，请检查当前的 ESP-IDF 设置，详见 :ref:`Installation <installation>`。

3.  系统将弹出用于配置项目的窗口。从 ESP-IDF 示例列表中选择示例，在 ``system`` 部分选择 ``gcov``。页面顶部会出现 ``Create Project Using Example GCOV`` 按钮，页面下方会出现项目描述。点击 ``Create Project Using Example GCOV``。

    .. image:: ../../../media/tutorials/coverage/gcov_example.png

4.  选择容器目录用于复制示例项目。例如，如果选择 ``/Users/myUser/someFolder``，则生成的文件夹将为 ``/Users/myUser/someFolder/gcov``。该新项目目录将被创建并在 Visual Studio Code 中打开。

5.  选择乐鑫目标芯片（如 esp32，esp32s2 等）：

    - 前往菜单栏 ``查看`` > ``命令面板``。
    - 输入 ``ESP-IDF：设置乐鑫设备目标`` 命令。默认的目标是 ``esp32``，本教程将使用该目标。

6.  使用 ``ESP-IDF：配置 SDKConfig 文件以启用代码覆盖率`` 命令配置 sdkconfig 项目，或使用 ``ESP-IDF：SDK 配置编辑器`` 命令手动配置。完成所有更改后，点击 ``Save`` 并关闭窗口。

    .. image:: ../../../media/tutorials/basic_use/gui_menuconfig.png

7.  该示例默认启用以下选项：

    - 在 ``Component Config`` > ``Application Level Tracing`` > ``Data Destination`` 下选择 ``Trace Memory``，以启用应用跟踪模块。
    - 在 ``Component Config`` > ``Application Level Tracing`` > ``GCOV to Host Enable`` 下启用 GCOV 到主机接口。
    - 在 ``Component Config`` > ``ESP32-specific`` > ``OpenOCD Debug Stubs`` 下启用 OpenOCD 调试桩。

8.  通过 ``ESP-IDF：构建项目``、``ESP-IDF：烧录项目`` 和 ``ESP-IDF：监视设备`` 命令构建并烧录项目，启动 ESP-IDF 监视器。

    .. note::
  
        也可以直接使用 ``ESP-IDF：构建、烧录项目并监视设备`` 命令一次性执行三个操作。

9.  启动 OpenOCD 并发送命令。要在扩展启动 OpenOCD，请执行 ``ESP-IDF：OpenOCD 管理器`` 命令，或使用 Visual Studio Code 状态栏中的 ``OpenOCD Server（Running | Stopped）`` 按钮。OpenOCD 服务器输出在菜单栏 ``查看`` > ``输出`` > ``ESP-IDF`` 中显示。

10. 前往菜单栏 ``终端`` > ``新建终端``，执行 ``telnet <oocd_host> <oocd_port>``，默认值为 ``telnet localhost 4444``。最新版 macOS 的用户若无法使用 ``telnet``，可使用 ``nc <oocd_host> <oocd_port>``。

    .. note::
      
	    可以通过修改 ``openocd.tcl.host`` 和 ``openocd.tcl.port`` 配置项来更改上述值。

11.  发送 OpenOCD 命令 ``esp gcov dump`` 执行硬编码转储，该命令会基于此示例执行两次硬编码转储。然后发送 ``esp gcov`` 命令进行即时运行时转储。

    .. image:: ../../../media/tutorials/coverage/oocd_cmds.png

12. 数据转储完成后，在编辑器中打开所需文件并执行 ``ESP-IDF：添加编辑器覆盖率`` 命令，编辑器将高亮显示代码覆盖率。

13. 可以通过在扩展的 ``settings.json`` 配置文件中添加或修改相应的配置项，自定义高亮颜色。

    - 已覆盖的行在浅色主题中使用 ``idf.coveredLightTheme``，在深色主题中使用 ``idf.coveredDarkTheme``。
    - 部分覆盖的行在浅色主题中使用 ``idf.partialLightTheme``，在深色主题中使用 ``idf.partialDarkTheme``。
    - 未覆盖的行在浅色主题中使用 ``idf.uncoveredLightTheme``，在深色主题中使用 ``idf.uncoveredDarkTheme``。

    Visual Studio Code 支持 ``red``、``rgb(255,0,120)`` 或 ``rgba(120,0,0,0.1)`` 格式。

    .. image:: ../../../media/tutorials/coverage/editor_coverage.png

14. 配置完成后，使用 ``ESP-IDF：移除编辑器覆盖率`` 命令移除代码覆盖率。

    - 前往菜单栏 ``查看`` > ``命令面板``。
    - 输入并选择 ``ESP-IDF：生成 HTML 格式的代码覆盖率报告`` 命令。

    .. image:: ../../../media/tutorials/coverage/html_report.png

.. note::
        
    如果遇到任何问题，请查看 :ref:`故障排除 <troubleshooting-section>`。
