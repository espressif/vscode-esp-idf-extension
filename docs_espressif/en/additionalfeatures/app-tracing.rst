Application Tracing
===================

This feature allows transferring arbitrary data between the host and ESP32 via the JTAG interface with small overhead on program execution.

Developers can use this library to send application-specific state of execution to the host and receive commands or other types of information in the opposite direction at runtime.

Let's open an ESP-IDF project. For this tutorial, we will use the `system/app_trace_to_host <https://github.com/espressif/esp-idf/tree/master/examples/system/app_trace_to_host>`_ example.

1.  Navigate to ``View`` > ``Command Palette``.

2.  Type ``ESP-IDF: New Project``, select the command, and choose the ESP-IDF version to use.

    .. note::

        If you don't see the option, please review the setup in :ref:`Install ESP-IDF and Tools <installation>`.

3.  A window will open with settings to configure the project. You can later choose from a list of ESP-IDF examples. Go to the ``system`` section and choose ``app_trace_to_host``. You will see a ``Create Project Using Example app_trace_to_host`` button at the top and a description of the project below. Click the button, and the project will open in a new window.

    .. image:: ../../../media/tutorials/app_trace/app_tracing.png

    For this example, the project is already configured for application tracing purposes. In other projects, you need to enable ``CONFIG_APPTRACE_DEST_TRAX`` and ``CONFIG_APPTRACE_ENABLE`` with the ``ESP-IDF: SDK Configuration Editor`` command.

4.  Configure, build, and flash your project as explained in the :ref:`Build the project <build the project>`.

5.  First, click ``ESP-IDF Explorer`` in the `Visual Studio Code Activity bar <https://code.visualstudio.com/docs/getstarted/userinterface>`_. Second, in the ``IDF APP TRACER`` section, click ``Start App Trace``. This will execute the extension's OpenOCD server and send the corresponding tracing commands to generate a tracing log. Third, you can see the generated tracing log in the ``APP TRACE ARCHIVES`` named ``Trace Log #1``. 

    Each time you execute ``Start App Trace``, a new tracing is generated and shown in the archives list. You can also start tracing by running the ``ESP-IDF: App Trace`` command.

    .. note::

        * The OpenOCD server output is shown in menu ``View`` > ``Output`` > ``ESP-IDF``.
        * Ensure that OpenOCD configuration files are properly configured with the ``ESP-IDF: Select OpenOCD Board Configuration`` command.

    .. image:: ../../../media/tutorials/app_trace/start_tracing.png

6.  Click ``Trace Log #1`` to open a window with the trace report. Click the ``Show Report`` button to see the trace output.

    .. image:: ../../../media/tutorials/app_trace/trace_report.png

For more information, please refer to `Application Level Tracing Library <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/app_trace.html>`_.
