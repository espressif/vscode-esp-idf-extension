Device Firmware Upgrade (DFU) via USB
=====================================

:link_to_translation:`zh_CN:[中文]`

Requirements
------------

- ESP32-S2 or ESP32-S3 chip.
- Complete electrical connections. Here is `a guide for the ESP32-S2 board <https://blog.espressif.com/dfu-using-the-native-usb-on-esp32-s2-for-flashing-the-firmware-b2c4af3335f1>`_.
- The chip must be in bootloader mode to be detected as a DFU device. This can be achieved by pressing the "reset" button while holding the "boot" button.
- For Windows: Register the device with the **WinUSB** driver.

    .. note::

        Install the drivers using the `Zadig tool <https://zadig.akeo.ie/>`_. Ensure the device is in download mode before running the tool. The tool should detect the ESP32-S2 device before installing the drivers. The Zadig tool may detect several USB interfaces of ESP32-S2. Install the WinUSB driver only for the interface without a driver (likely **Interface 2**) and do not reinstall the driver for other interfaces.

Flashing
~~~~~~~~

1.  Select a DFU-compatible device (ESP32-S2 or ESP32-S3).

    .. image:: ../../../media/tutorials/dfu/select_device.png

2.  Select DFU as the flashing method.

    .. image:: ../../../media/tutorials/dfu/flash_method.png

3.  Build the project.

    .. image:: ../../../media/tutorials/dfu/build_project.png

4.  Flash the firmware.

    .. image:: ../../../media/tutorials/dfu/flash.png

Useful Links
~~~~~~~~~~~~

`Espressif DFU API guide <https://docs.espressif.com/projects/esp-idf/en/latest/esp32s2/api-guides/dfu.html>`_
