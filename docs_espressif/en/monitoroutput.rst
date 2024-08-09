.. _monitor the output:

Monitor the Output
===============================

Before monitoring the device's output, the user needs to specify the serial port of the device, select menu **View**, **Command Palette** and type **ESP-IDF: Select Port to Use** command.

To start monitoring your device, select menu **View**, **Command Palette** and type **ESP-IDF: Monitor Device** command.

.. image:: ../../media/tutorials/basic_use/monitor.png

Next step is to :ref:`Debug Your Project <debug your project>`.

.. note::
  * The monitor baud rate is defined with ``CONFIG_ESPTOOLPY_MONITOR_BAUD`` from project's SDK Configuration Editor. You can override it by setting a value in **idf.monitorBaudRate**.