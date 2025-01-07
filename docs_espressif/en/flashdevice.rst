.. _flash the device:

Flash onto the Device
=====================

:link_to_translation:`zh_CN:[中文]`

1.  **Select the serial port**: Go to ``View`` > ``Command Palette``, enter ``ESP-IDF: Select Port to Use``, and choose the command to specify the serial port of your device.

2.  **Start flashing the device**: Go to ``View`` > ``Command Palette``, enter ``ESP-IDF: Flash your Project``, and choose the command to start flashing your device. You can choose ``UART``, ``JTAG`` or ``DFU`` flashing method.

    .. note::

        * ``UART`` is the most common option for most Espressif devices.
        * If you are using ``JTAG``, ensure OpenOCD is properly configured. Go to ``View`` > ``Command Palette`` and enter ``ESP-IDF: Select OpenOCD Board Configuration`` to select the correct configuration for your board.

    .. note::

        There is an ``idf.flashBaudRate`` configuration setting to modify the flashing baud rate.

3.  The flashing task will begin on the selected serial port, launching a new terminal displaying the flashing task output. While flashing is in progress, a notification bar will display ``ESP-IDF: Flashing project``. Once the process is complete, the message will change to ``Flash Done ⚡️``.

    .. image:: ../../media/tutorials/basic_use/flash.png

Please refer to `Configuration of OpenOCD for Specific Target <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/tips-and-quirks.html#jtag-debugging-tip-openocd-configure-target>`_ to select the appropriate OpenOCD configuration file based on your hardware.

Make sure to configure your drivers as mentioned in `Configure JTAG Interface <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/configure-ft2232h-jtag.html>`_.

Next, proceed to :ref:`Monitor the Output <monitor_the_output>`.

Other Flashing Commands
-----------------------

You can also choose the flashing method ``UART``, ``JTAG``, or ``DFU`` (ESP32-S2 or ESP32-S3) based on your hardware connection.

- Go to ``View`` > ``Command Palette``, enter ``ESP-IDF: Select Flash Method``, and select the flashing method for your device. The selected choice will be saved in the ``idf.flashType`` configuration setting.
- You can also use the following commands to flash with a specific flashing method:

    1. ``ESP-IDF: Flash (UART) your Project`` for UART flashing
    2. ``ESP-IDF: Flash (DFU) your Project`` to flash using DFU (only for ESP32-S2 and ESP32-S3)
    3. ``ESP-IDF: Flash (with JTAG)`` to flash using JTAG and OpenOCD

Related Documentation
---------------------

* `ESP-PROG Guide <https://docs.espressif.com/projects/espressif-esp-iot-solution/en/latest/hw-reference/ESP-Prog_guide.html>`_ for hardware connection and configuration
* `Configuration of OpenOCD for Specific Target <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/tips-and-quirks.html#jtag-debugging-tip-openocd-configure-target>`_ to select the appropriate OpenOCD configuration file based on your hardware
* `Establishing Serial Connection <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/get-started/establish-serial-connection.html>`_ with Espressif serial device
