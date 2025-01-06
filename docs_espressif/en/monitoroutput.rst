.. _monitor_the_output:

Monitor the Output
==================

:link_to_translation:`zh_CN:[中文]`

To view the serial monitor output from your device, please follow the instructions below:

1.  Select the serial port:

    - Go to ``View`` > ``Command Palette``

    - Enter ``ESP-IDF: Select Port to Use`` and choose the command to specify the serial port of your device

2.  Start monitoring:

    - Go to ``View`` > ``Command Palette``

    - Enter ``ESP-IDF: Monitor Device`` and choose the command to start monitoring your device

    .. image:: ../../media/tutorials/basic_use/monitor.png

    .. note::

        The monitor baud rate is defined with ``CONFIG_ESPTOOLPY_MONITOR_BAUD`` in the project's SDK Configuration Editor. You can override it by setting a value in ``idf.monitorBaudRate``.

Next, proceed to :doc:`debug your project <debugproject>`.