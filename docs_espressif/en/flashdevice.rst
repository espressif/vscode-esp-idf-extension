.. _flash the device:

Flash onto the Device
===============================

1. Select the Serial Port:

- Navigate to **View** > Command Palette.

- Type **ESP-IDF: Select Port to Use** and select the command to specify the serial port of your device.

2. Start flashing the device:

- Go to **View** > **Command Palette**.

- Type **ESP-IDF: Flash your Project** and select the command to start flashing your device.

- Choose ``UART``, ``JTAG`` or ``DFU`` flash mode. 

3. The flashing task will beign on the previously selected serial port, launching a new terminal displaying the flash task output. While flashing is in progress, a notification bar will display ``ESP-IDF: Flashing project`` Once the process is complete, the message will change to ``Flash Done ⚡️``.

.. note::
  ``UART`` is the most common option for most Espressif devices.

.. note::
  * If you are using ``JTAG`` make sure to have OpenOCD properly configured using menu **View** > **Command Palette** and type **ESP-IDF: Select OpenOCD Board Configuration** to select the right configuration for your board.
  * Please review `Configuration of OpenOCD for Specific Target <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/tips-and-quirks.html#jtag-debugging-tip-openocd-configure-target>`_ to understand which board or configuration to use for your specific hardware.
  * Make sure to configure your drivers as mentioned in ESP-IDF `Configure JTAG Interface <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/configure-ft2232h-jtag.html>`_ documentation.

.. image:: ../../media/tutorials/basic_use/flash.png

.. note::
  * There is an **idf.flashBaudRate** configuration settings to modify the flashing baud rate.

Next step is to :ref:`Monitor the output <monitor the output>`.

Other flashing commands
--------------------------

You can also choose the flashing type ``UART``, ``JTAG`` or ``DFU`` (esp32s2 or esp32s3) based on your hardware connection.

- Go to **View** > **Command Palette**.

- Type **ESP-IDF: Select Flash Method and Flash** and select the flashing type for your device.
- Selected choice will be saved in the **idf.flashType** configuration setting.

You can also use these commands to flash with an specific flash type:

1. **ESP-IDF: Flash (UART) your Project** for UART flashing.
2. **ESP-IDF: Flash (DFU) your Project**  to flash using DFU (only for ESP32-S2 and ESP32-S3).
3. **ESP-IDF: Flash (with JTag)** to flash using JTAG and OpenOCD. 

Links
-------------------

* `ESP-PROG guide <https://docs.espressif.com/projects/espressif-esp-iot-solution/en/latest/hw-reference/ESP-Prog_guide.html>`_ for hardware connection and configuration.
* `Configuration of OpenOCD for Specific Target <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/tips-and-quirks.html#jtag-debugging-tip-openocd-configure-target>`_ to understand which board or configuration to use for your specific hardware.
* `Establishing serial connection <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/get-started/establish-serial-connection.html>`_ with Espressif serial device.