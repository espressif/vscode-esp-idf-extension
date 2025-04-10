通过 USB 升级设备固件 (DFU)
===========================

:link_to_translation:`en:[English]`

准备指南
~~~~~~~~

- 准备 ESP32-S2 或 ESP32-S3 芯片。
- 确保开发板正确连接电脑或其他设备。可参考 `针对 ESP32-S2 开发板的指南 <https://blog.espressif.com/dfu-using-the-native-usb-on-esp32-s2-for-flashing-the-firmware-b2c4af3335f1>`_。
- 芯片必须处于引导加载程序模式 (bootloader mode)，才能被识别为 DFU 设备。在按住 "boot" 键的同时按下 "reset" 键可以进入引导加载程序模式。
- Windows 系统需使用 **WinUSB** 驱动程序注册设备。

    .. note::

        使用 `Zadig 工具 <https://zadig.akeo.ie/>`_ 安装驱动程序。请确保设备在下载模式下运行该工具。Zadig 工具应在安装驱动前检测到 ESP32-S2 设备，且可能会检测到 ESP32-S2 的多个 USB 接口。请注意，只需为没有驱动程序的接口（通常是 **Interface 2**）安装 WinUSB 驱动，不要为其他接口重新安装驱动程序。

固件烧录
~~~~~~~~

1.  选择支持 DFU 的设备（ESP32-S2 或 ESP32-S3）。

    .. image:: ../../../media/tutorials/dfu/select_device.png

2.  选择 DFU 作为烧录方式。

    .. image:: ../../../media/tutorials/dfu/flash_method.png

3.  编译项目。

    .. image:: ../../../media/tutorials/dfu/build_project.png

4.  烧录固件。

    .. image:: ../../../media/tutorials/dfu/flash.png

相关链接
~~~~~~~~

`乐鑫 DFU API 指南 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32s2/api-guides/dfu.html>`_
