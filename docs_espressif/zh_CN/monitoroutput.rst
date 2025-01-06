.. _monitor_the_output:

监视输出
========

:link_to_translation:`en:[English]`

 请参照以下说明，查看设备的串行监视器输出：

1.  选择串行端口：

    - 前往菜单栏 ``查看`` > ``命令面板``

    - 输入 ``ESP-IDF：选择要使用的端口``，选中该命令并指定设备的串口

2.  开始监视：

    - 前往菜单栏 ``查看`` > ``命令面板``

    - 输入 ``ESP-IDF：监视设备``，选中该命令，开始监视设备

    .. image:: ../../media/tutorials/basic_use/monitor.png

    .. note::

        可以在项目的 SDK 配置编辑器中通过 ``CONFIG_ESPTOOLPY_MONITOR_BAUD`` 配置项指定串行监视器的波特率。在 ``idf.monitorBaudRate`` 配置项中设置新的值可以覆盖 SDK 配置。

接下来请 :doc:`调试项目 <debugproject>`。
