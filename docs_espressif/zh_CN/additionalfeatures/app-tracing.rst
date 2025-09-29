应用程序跟踪
============

应用程序跟踪功能可以通过 JTAG 接口在主机和 ESP32 之间传输任意数据，且程序的执行开销较小。

开发者可以使用该库在运行时将应用程序特定的执行状态发送至主机，并接收来自主机的命令或其他类型的信息。

打开一个 ESP-IDF 项目，本教程以 `system/app_trace_to_host <https://github.com/espressif/esp-idf/tree/master/examples/system/app_trace_to_host>`_ 示例为例。

1.  前往菜单栏 ``查看`` > ``命令面板``。

2.  输入 ``ESP-IDF：新建项目``，选择该命令，并选择要使用的 ESP-IDF 版本。

    .. note::

        如果未看到该选项，请检查当前的 ESP-IDF 设置，详见 :ref:`安装 ESP-IDF 和相关工具 <installation>`。

3.  系统将弹出用于配置项目的窗口。从 ESP-IDF 示例列表中选择示例，在 ``system`` 部分选择 ``app_trace_to_host``。页面顶部会出现 ``Create Project Using Example app_trace_to_host`` 按钮，页面下方会出现项目描述，点击按钮，项目会在新窗口中打开。

    .. image:: ../../../media/tutorials/app_trace/app_tracing.png

    在此示例中，项目已配置应用程序跟踪。在其他项目中，请使用 ``ESP-IDF：SDK 配置编辑器`` 命令启用 ``CONFIG_APPTRACE_DEST_TRAX`` 和 ``CONFIG_APPTRACE_ENABLE``。

4.  按照 :ref:`构建项目 <build the project>` 中的说明，配置、构建并烧录项目。

5.  首先，点击 `Visual Studio Code 活动栏 <https://code.visualstudio.com/docs/getstarted/userinterface>`_ 中的 ``ESP-IDF Explorer``。其次，在 ``IDF APP TRACER`` 分区中，点击 ``Start App Trace``。这将启动扩展的 OpenOCD 服务器并发送相应的跟踪命令以生成跟踪日志。最后，可以在 ``APP TRACE ARCHIVES`` 中查看生成的日志，名称为 ``Trace Log #1``。

    每次执行 ``Start App Trace`` 时，都会生成一个新的跟踪并显示在归档列表中。也可以通过运行 ``ESP-IDF：应用程序跟踪`` 命令启动跟踪。

    .. note::

        * OpenOCD 服务器输出会显示在菜单栏 ``查看`` > ``输出`` > ``ESP-IDF`` 中。
        * 请确保已使用 ``ESP-IDF：选择 OpenOCD 开发板配置`` 命令设置正确的 OpenOCD 配置文件。

    .. image:: ../../../media/tutorials/app_trace/start_tracing.png

6.  点击 ``Trace Log #1`` 打开包含跟踪报告的窗口。点击 ``Show Report`` 按钮查看跟踪输出。

    .. image:: ../../../media/tutorials/app_trace/trace_report.png

更多关于本功能的信息，请参阅 `应用层跟踪库 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/app_trace.html>`_。
