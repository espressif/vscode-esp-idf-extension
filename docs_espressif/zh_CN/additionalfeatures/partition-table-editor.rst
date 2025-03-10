分区表编辑器
============

:link_to_translation:`en:[English]`

-   前往菜单栏 ``查看`` > ``命令面板``。
-   输入 ``ESP-IDF：SDK 配置编辑器`` 并选中该命令。

    .. image:: ../../../media/tutorials/partition_table/sdkconfig.png

-   搜索 ``partition_table_custom``，在 ``Partition Table`` 下拉框中选择 ``Custom partition table CSV``，并输入文件名。分区表编辑器将从当前项目目录中查找该 CSV 文件。

    .. image:: ../../../media/tutorials/partition_table/partition_table_custom.png

-   如果分区表文件不存在，执行该命令将创建新文件；如果分区表文件已存在，请确保分区表 CSV 文件的前两行符合以下格式：

    .. code-block::

        # ESP-IDF Partition Table
        # Name, Type, SubType, Offset, Size, Flag

-   打开分区表编辑器后，可以根据需要编辑分区表。更多信息请参考 ESP-IDF 编程指南的 `分区表 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/partition-tables.html>`_ 章节。

    .. image:: ../../../media/tutorials/partition_table/partition_editor.png

-   完成编辑后，点击 ``Save`` 按钮保存更改。这将覆盖原 CSV 文件的内容。

-   现在，就可以点击右上角的 ``Select Flash Method``、``Build`` 以及 ``Flash`` 按钮，编译项目并将分区表烧录到芯片中。
