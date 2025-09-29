Heap Tracing
============

:link_to_translation:`zh_CN:[中文]`

Heap Tracing allows tracing of code that allocates or frees memory. More information is available in the `heap tracing documentation <https://docs.espressif.com/projects/esp-idf/en/latest/api-reference/system/heap_debug.html#heap-tracing>`_. Please also review `System Behavior Analysis <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/app_trace.html#system-behavior-analysis-with-segger-systemview>`_ for SystemView tracing configuration.

Let's open an ESP-IDF project. For this tutorial, we will use the ``system/sysview_tracing_heap_log`` example.

1.  Navigate to ``View`` > ``Command Palette``.

2.  Type ``ESP-IDF: New Project``, select the command, and choose the ESP-IDF version to use.

    .. note::

        If you don't see the option, please review the setup in :ref:`Install ESP-IDF and Tools <installation>`.

3.  A window will open with settings to configure the project. You can later choose from a list of ESP-IDF examples. Go to the ``system`` section and choose ``sysview_tracing_heap_log``. You will see a ``Create Project Using Example sysview_tracing_heap_log`` button at the top and a description of the project below. Click the button, and the project will open in a new window.

    .. image:: ../../../media/tutorials/heap_trace/sysview_tracing_heap_log.png

    In this example, the project is already configured for application tracing.

    .. note::

        For more information, please refer to `Application Level Tracing Library <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/app_trace.html>`_.

4.  Configure, build, and flash your project as explained in the :ref:`Build Your Project <build the project>`.

    .. note::
    
        - The OpenOCD server output is shown in the menu ``View`` > ``Output`` > ``ESP-IDF``.
        - Make sure that OpenOCD configuration files are properly set with the the ``ESP-IDF: Select OpenOCD Board Configuration`` command.

5.  First, click ``ESP-IDF Explorer`` in the `Visual Studio Code Activity Bar <https://code.visualstudio.com/docs/getstarted/userinterface>`_. Second, in the ``ESP-IDF APP TRACER`` section, click ``Start Heap Trace``. This will execute the extension's OpenOCD server and send the corresponding tracing commands to generate a tracing log. Third, you can see the generated tracing log in the ``APP TRACE ARCHIVES`` named ``Heap Trace Log #1``. 

    Each time you execute ``Start Heap Trace``, a new trace will be generated and shown in the archives list. You can also start tracing by running the ``ESP-IDF: App Trace`` command.

    .. image:: ../../../media/tutorials/heap_trace/start_heap_tracing.png

6.  Click ``Heap Trace Log #1`` and choose the ``Heap Tracing`` option for the ``ESP-IDF Tracing`` report window. Click the ``Show Report`` button to reload the visualization.

    .. image:: ../../../media/tutorials/heap_trace/heap_trace_report.png

7.  Click ``Heap Trace Log #1`` and choose the ``SystemView Tracing`` option for the ``ESP-IDF System View Report`` window.

    .. image:: ../../../media/tutorials/heap_trace/sysview_report.png
