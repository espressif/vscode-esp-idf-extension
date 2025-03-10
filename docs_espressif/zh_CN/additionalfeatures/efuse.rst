eFuse 资源管理器
================

:link_to_translation:`en:[English]`

此功能要求 ESP-IDF 版本 ``>=v4.3``。

乐鑫芯片包含多个 eFuse，可用于存储系统参数和用户参数。每个 eFuse 都是一个一位字段，可以烧写为 1，之后就不能再恢复为 0。eFuse 资源管理器使用 ESP-IDF 提供的 `espfuse.py <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-reference/system/efuse.html#espefuse-py>`_ 脚本来读取和写入 eFuse。

1.  选择串口：

    - 前往菜单栏 ``查看`` > ``命令面板``。
    - 输入 ``ESP-IDF：选择要使用的端口`` 并选中该命令，指定设备的串口。

2.  点击 Visual Studio Code 左侧活动栏中的 ``ESP-IDF：资源管理器`` 图标，然后点击 ``eFuse 资源管理器`` 选项卡中的 ``Connect your Board First`` 选项。

    .. image:: ../../../media/tutorials/efuse/efuse_connect.png

3.  eFuse 类别列表以树形结构呈现。

    .. image:: ../../../media/tutorials/efuse/efuse_list.png

4.  点击任意类别即可查看 eFuse 及其对应的值。

    .. image:: ../../../media/tutorials/efuse/efuse_expanded.png
