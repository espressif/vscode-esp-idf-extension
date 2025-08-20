堆跟踪
======

:link_to_translation:`en:[English]`

堆跟踪允许跟踪分配或释放内存的代码。详情请参阅 `堆内存跟踪 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-reference/system/heap_debug.html#heap-tracing>`_ 。另请查阅 `系统行为分析 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/app_trace.html#segger-systemview>`_，以了解 SystemView 跟踪配置。

让我们打开一个 ESP-IDF 项目。本教程将使用 ``system/sysview_tracing_heap_log`` 示例。

1.  前往菜单栏 ``查看`` > ``命令面板``。

2.  输入 ``ESP-IDF：新建项目`` ，选择该命令，然后选择要使用的 ESP-IDF 版本。

    .. note::

        如果未看到该选项，请检查当前的 ESP-IDF 设置，详见 :ref:`安装 ESP-IDF 和相关工具 <installation>`。

3.  系统将弹出用于配置项目的窗口。从 ESP-IDF 示例列表中选择示例，在 ``system`` 部分选择 ``sysview_tracing_heap_log``。页面顶部会出现 ``Create Project Using Example sysview_tracing_heap_log`` 按钮，页面下方会出现项目描述，点击按钮，项目会在新窗口中打开。

    .. image:: ../../../media/tutorials/heap_trace/sysview_tracing_heap_log.png

    在此示例中，项目已配置应用程序跟踪。

    .. note::

        详情请参阅 `应用层跟踪库 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/app_trace.html>`_。

4.  按照 :ref:`构建项目 <build the project>` 中的说明来配置、构建并烧录项目。

    .. note::
    
        - OpenOCD 服务器输出会显示在菜单栏 ``查看`` > ``输出`` > ``ESP-IDF`` 中。
        - 请确保已使用 ``ESP-IDF：选择 OpenOCD 开发板配置`` 命令设置正确的 OpenOCD 配置文件。

5.  首先，点击 `Visual Studio Code 活动栏 <https://code.visualstudio.com/docs/getstarted/userinterface>`_ 中的 ``ESP-IDF Explorer``。其次， 在 ``ESP-IDF APP TRACER`` 分区中，点击 ``Start Heap Trace``。这将启动该扩展的 OpenOCD 服务器并发送相应的跟踪命令以生成跟踪日志。最后，可以在 ``APP TRACE ARCHIVES`` 中查看生成的日志，名称为 ``Heap Trace Log #1``。

    每次执行 ``Start Heap Trace`` 时，都会生成一个新的跟踪并显示在归档列表中。也可以通过运行 ``ESP-IDF：应用程序跟踪`` 命令进行跟踪。

    .. image:: ../../../media/tutorials/heap_trace/start_heap_tracing.png

6.  点击 ``Heap Trace Log #1`` ，并在 ``ESP-IDF Tracing`` 报告窗口中选择 ``Heap Tracing`` 选项。点击 ``Show Report`` 按钮，重新加载可视化界面。

    .. image:: ../../../media/tutorials/heap_trace/heap_trace_report.png

7.  点击 ``Heap Trace Log #1`` ，并在 ``ESP-IDF System View Report`` 窗口中选择 ``SystemView Tracing`` 选项。

    .. image:: ../../../media/tutorials/heap_trace/sysview_report.png
