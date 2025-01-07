.. _flash the device:

烧录项目
========

:link_to_translation:`en:[English]`

1.  **选择串口**：前往菜单栏 ``查看`` > ``命令面板`` 并输入 ``ESP-IDF：选择要使用的端口``，选中该命令并指定设备的串口。

2.  **烧录设备**：前往菜单栏 ``查看`` > ``命令面板`` 并输入 ``ESP-IDF：烧录项目``，选中该命令以烧录设备。在开始烧录前可以选择 ``UART``、``JTAG`` 或 ``DFU`` 串口进行烧录。

    .. note::

        * 大多数乐鑫设备通常选用 ``UART`` 串口进行烧录。
        * 如果选用了 ``JTAG``，请确保正确配置 OpenOCD。前往菜单栏 ``查看`` > ``命令面板`` 并输入 ``ESP-IDF：选择 OpenOCD 开发板配置``，为你使用的开发板选择正确的配置。

    .. note::

        可以通过配置 ``idf.flashBaudRate`` 选项来修改烧录的波特率值。

3.  烧录任务将在所选的串口上开始，并启动新的终端窗口来显示烧录任务的输出信息。烧录时，通知栏将显示 ``ESP-IDF: Flashing project``；烧录完成后，消息将变为 ``Flash Done ⚡️``。

    .. image:: ../../media/tutorials/basic_use/flash.png

请查看 `根据目标芯片配置 OpenOCD <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/jtag-debugging/tips-and-quirks.html#jtag-debugging-tip-openocd-configure-target>`_，为你的硬件选择合适的 OpenOCD 配置文件。

请确保按照 `配置 JTAG 接口 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/jtag-debugging/configure-ft2232h-jtag.html>`_ 中的指导来配置驱动程序。

接下来请 :ref:`监视输出 <monitor_the_output>`。

其他烧录命令
------------

你也可以根据硬件连接方式来选择合适的烧录方式：``UART``、``JTAG`` 或 ``DFU`` （仅适用于 ESP32-S2 或 ESP32-S3）。

- 前往菜单栏 ``查看`` > ``命令面板`` 并输入 ``ESP-IDF：选择烧录方式``，为设备选择合适的烧录方式。该烧录方式将被保存在 ``idf.flashType`` 配置设置中。
- 也可以使用以下命令来选择特定的烧录方式进行烧录：

    1. ``ESP-IDF：通过 UART 接口烧录项目``
    2. ``ESP-IDF：通过 DFU 接口烧录项目`` （仅适用于 ESP32-S2 和 ESP32-S3）
    3. ``ESP-IDF：通过 JTAG 接口烧录项目`` （使用 JTAG 和 OpenOCD 进行烧录）

相关文档
--------

* 参考 `ESP-PROG 指南 <https://docs.espressif.com/projects/esp-iot-solution/zh_CN/latest/hw-reference/ESP-Prog_guide.html>`_ 进行硬件连接和配置
* `为特定目标配置 OpenOCD <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/jtag-debugging/tips-and-quirks.html#jtag-debugging-tip-openocd-configure-target>`_
* 与乐鑫串行设备 `创建串口连接 <https://docs.espressif.com/projects/esp-idf/cn/latest/esp32/get-started/establish-serial-connection.html>`_
