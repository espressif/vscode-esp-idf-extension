Device Firmware Upgrade via USB.
=====================================

Requirements:
----------------------

- ESP32-S2 or an ESP32-S3 chip
- You will need to do some electrical connection work. `Here is a guide for the S2 board <https://blog.espressif.com/dfu-using-the-native-usb-on-esp32-s2-for-flashing-the-firmware-b2c4af3335f1>`_
- The chip needs to be in bootloader mode for it to be detected as a DFU device. This can be achieved by pressing the “reset” button, while holding the “boot” button pressed
- For Windows only: You have to register on Windows the device with the WinUSB driver.

.. note::
  The drivers can be installed by the `Zadig tool <https://zadig.akeo.ie/>`_. Please make sure that the device is in download mode before you run the tool and that it detects the ESP32-S2 device before you install the drivers. The Zadig tool might detect several USB interfaces of ESP32-S2. Please install the WinUSB driver only for the interface where there is no driver installed (probably it is Interface 2) and do not re-install the driver for the other interface.

Flashing:
~~~~~~~~~~~~

1. Select a device target which is DFU compatible (ESP32-S2/ ESP32-S3)

.. image:: ../../../media/tutorials/dfu/select_device.png

2. Select DFU as flashing method

.. image:: ../../../media/tutorials/dfu/flash_method.png

3. Build the project

.. image:: ../../../media/tutorials/dfu/build_project.png

4. Flash

.. image:: ../../../media/tutorials/dfu/flash.png

Useful Links
~~~~~~~~~~~~~~~~~~~~~

`Espressif DFU api guide <https://docs.espressif.com/projects/esp-idf/en/latest/esp32s2/api-guides/dfu.html?highlight=dfu%20util#api-guide-dfu-build>`_
