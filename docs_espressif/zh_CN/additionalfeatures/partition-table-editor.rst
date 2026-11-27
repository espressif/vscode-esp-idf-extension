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

-   编辑器从 ``sdkconfig`` 读取 ``CONFIG_ESPTOOLPY_FLASHSIZE`` 和 ``CONFIG_PARTITION_TABLE_OFFSET``，并绘制闪存占用图。每一块表示一个分区、启动保留区或空闲空间。摘要会显示已用、空闲和总闪存大小。

-   每个分区下方的滑块以及减号、加号按钮可以调整大小，步长为 4 KB（自定义的非 app 分区为 1 KB）。``Reclaim`` 占用该分区紧后面的空闲间隙。``Fit`` 将其扩大到剩余闪存。``Recommended`` 把 NVS、otadata、FAT、SPIFFS、LittleFS、coredump 和 phy 分区调到建议的最小大小。大小能被整除时保存为 ``K`` 或 ``M``，否则保存为十六进制。

-   留空的偏移在 CSV 中保持空白。图中会把 data 分区按 4 KB 对齐、app 分区按 64 KB 对齐，起点是分区表偏移再加上 4 KB。CSV 里已经写明的偏移保持不变。

-   预设会替换当前各行：单个 factory 应用、带 SPIFFS 的 OTA、带 FAT 的 OTA，或 Zigbee ESP-IDF。``Save`` 才会写入文件。``Keep equal OTA slots`` 默认开启，调整 ``ota_0`` 或 ``ota_1`` 时会让两者大小保持一致。

-   重叠、超出闪存、仍有空闲空间、OTA 应用缺少 ``otadata``，以及 OTA 缺少 NVS 这些警告不会阻止 ``Save``。字段校验仍然会阻止 ``Save``。``Copy CSV`` 和 ``Paste CSV`` 使用编辑器剪贴板。

-   data 子类型包含 ``littlefs`` 和 ``efuse``。选择 ``custom`` 后可以输入 ``0x40`` 到 ``0xFE`` 的类型，以及 ``0x00`` 到 ``0xFE`` 的子类型。标志可以是 ``encrypted`` 和 ``readonly``。

-   现在，就可以点击右上角的 ``Select Flash Method``、``Build`` 以及 ``Flash`` 按钮，编译项目并将分区表烧录到芯片中。

-   若要从已连接的设备读取分区，或将二进制文件烧录到某个分区，请使用 :doc:`设备分区资源管理器 <device-partition-explorer>`。
